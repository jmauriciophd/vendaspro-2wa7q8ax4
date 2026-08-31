// POST /backend/v1/send-email
// Envia um email real via SMTP configurado dinamicamente no painel administrativo (company_mail_settings)
// e registra cada envio na coleção `email_logs` com status (sent/failed).
//
// POST /backend/v1/smtp/test
// Testa a configuração de SMTP sem exibir dados sensíveis (lê de company_mail_settings)
//
// GET /backend/v1/smtp/status
// Retorna status de configuração do SMTP da empresa

routerAdd(
  'GET',
  '/backend/v1/smtp/status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    let mailRec = null
    try {
      const recs = $app.findRecordsByFilter('company_mail_settings', '1=1', '-created', 1, 0)
      if (recs && recs.length > 0) mailRec = recs[0]
    } catch (_) {}

    let companyRec = null
    try {
      const compRecs = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      if (compRecs && compRecs.length > 0) companyRec = compRecs[0]
    } catch (_) {}

    const host = mailRec ? mailRec.getString('smtp_host') : ''
    const port = mailRec ? mailRec.getInt('smtp_port') || 587 : 587
    const user = mailRec ? mailRec.getString('smtp_username') : ''
    const hasPassword = Boolean(mailRec && mailRec.getString('smtp_password'))
    const fromAddr = mailRec
      ? mailRec.getString('from_address') || user
      : companyRec
        ? companyRec.getString('email')
        : ''
    const enabled = mailRec ? mailRec.getBool('enabled') : false
    const lastTestStatus = mailRec ? mailRec.getString('last_test_status') || 'none' : 'none'
    const lastTestedAt = mailRec ? mailRec.getString('last_tested_at') || '' : ''

    const configured = Boolean(host && user && hasPassword)

    return e.json(200, {
      configured: configured,
      enabled: enabled,
      host: host ? host.replace(/.(?=.{4})/g, '*') : '',
      port: String(port),
      from: fromAddr ? fromAddr.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
      last_test_status: lastTestStatus,
      last_tested_at: lastTestedAt,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/smtp/test',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    const isSuper = auth.get('is_super_admin') === true
    const role = auth.getString('role')
    let permissions = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) permissions = p
      else if (typeof p === 'string' && p) permissions = JSON.parse(p)
    } catch (_) {}

    const canTest =
      isSuper ||
      role === 'admin' ||
      permissions.indexOf('settings.email.test') !== -1 ||
      permissions.indexOf('settings.email.edit') !== -1 ||
      permissions.indexOf('settings.edit') !== -1 ||
      permissions.indexOf('settings.view') !== -1

    if (!canTest) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('actor', auth.id)
        aRec.set('action', 'smtp_test_attempt')
        aRec.set('module', 'settings')
        aRec.set('description', 'Tentativa não autorizada de testar conexão SMTP')
        aRec.set('ip', e.realIP() || '')
        aRec.set('user_agent', (e.request.header.get('user-agent') || '').substring(0, 250))
        aRec.set('result', 'blocked')
        $app.save(aRec)
      } catch (_) {}

      return e.json(403, { message: 'Sem permissão para testar configurações de e-mail.' })
    }

    // Busca configuração de email em company_mail_settings
    let mailRec = null
    try {
      const recs = $app.findRecordsByFilter('company_mail_settings', '1=1', '-created', 1, 0)
      if (recs && recs.length > 0) mailRec = recs[0]
    } catch (_) {}

    let companyRec = null
    try {
      const compRecs = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      if (compRecs && compRecs.length > 0) companyRec = compRecs[0]
    } catch (_) {}

    let host = mailRec ? mailRec.getString('smtp_host').trim() : ''
    let port = mailRec ? mailRec.getInt('smtp_port') || 587 : 587
    let user = mailRec ? mailRec.getString('smtp_username').trim() : ''
    let encryptedPass = mailRec ? mailRec.getString('smtp_password') : ''
    let fromAddr = mailRec ? mailRec.getString('from_address').trim() : ''
    let fromName = mailRec
      ? mailRec.getString('from_name').trim()
      : companyRec
        ? companyRec.getString('name')
        : 'VendasPro'

    const masterKey = ($os.getenv('PB_SUPERUSER_TOKEN') || 'vendaspro-app-master-secret-key-375ac')
      .substring(0, 32)
      .padEnd(32, '0')
    let pass = ''

    if (encryptedPass) {
      try {
        pass = $security.decrypt(encryptedPass, masterKey)
      } catch (_) {
        pass = ''
      }
    }

    if (!host || !user || !pass) {
      return e.json(400, {
        success: false,
        message:
          'O envio de e-mails ainda não está configurado para esta empresa. Entre em Administração → Configurações → E-mail para concluir a configuração.',
        code: 'SMTP_NOT_CONFIGURED',
      })
    }

    if (!fromAddr) fromAddr = user
    if (!fromName) fromName = 'VendasPro'

    const body = e.requestInfo().body || {}
    const targetEmail = (body.to_email || auth.getString('email') || '').trim()

    if (!targetEmail) {
      return e.json(400, {
        success: false,
        message: 'E-mail de destino para o teste não informado.',
      })
    }

    let sendErr = ''
    try {
      const settings = $app.settings()
      settings.smtp.host = host
      settings.smtp.port = port
      settings.smtp.username = user
      settings.smtp.password = pass
      settings.smtp.enabled = true

      const message = new MailerMessage({
        from: {
          address: fromAddr,
          name: fromName,
        },
        to: [{ address: targetEmail }],
        subject: 'VendasPro — Teste de Configuração SMTP',
        html:
          '<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">' +
          '<h2 style="color: #4f46e5; margin-bottom: 12px;">Teste de SMTP com Sucesso</h2>' +
          '<p>Este é um e-mail de teste enviado pelo VendasPro para validar a conectividade do servidor SMTP.</p>' +
          '<p style="font-size: 13px; color: #64748b; margin-top: 20px;">Data/Hora: ' +
          new Date().toISOString() +
          '</p>' +
          '</div>',
      })

      $app.newMailClient().send(message)
    } catch (err) {
      const rawMsg = err && err.message ? err.message : String(err)
      let cleanMsg = rawMsg
      if (pass) {
        cleanMsg = cleanMsg.replace(
          new RegExp(pass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
          '***',
        )
      }
      if (user) {
        cleanMsg = cleanMsg.replace(
          new RegExp(user.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
          '***',
        )
      }
      sendErr = cleanMsg
    }

    // Registra o log em email_logs
    try {
      const col = $app.findCollectionByNameOrId('email_logs')
      const rec = new Record(col)
      rec.set('to_email', targetEmail)
      rec.set('subject', 'VendasPro — Teste de Configuração SMTP')
      rec.set('body', 'Envio de validação de servidor SMTP.')
      rec.set('sent_by', auth.id)
      rec.set('status', sendErr ? 'failed' : 'sent')
      if (sendErr) rec.set('error_message', sendErr)
      $app.save(rec)
    } catch (_) {}

    if (sendErr) {
      return e.json(500, {
        success: false,
        message:
          'Não foi possível enviar o e-mail. Verifique servidor, porta, usuário, senha e protocolo de segurança.',
        error: sendErr,
      })
    }

    return e.json(200, {
      success: true,
      message: 'E-mail de teste enviado com sucesso para ' + targetEmail,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/send-email',
  (e) => {
    const body = e.requestInfo().body || {}

    const toEmail = (body.to_email || '').toString().trim()
    const subject = (body.subject || 'Documento da sua compra').toString()
    const htmlBody = (body.body || '').toString()
    const saleId = body.sale ? body.sale.toString() : ''
    const docType = body.doc_type ? body.doc_type.toString() : ''
    const sentBy = body.sent_by ? body.sent_by.toString() : e.auth ? e.auth.id : ''
    const attachmentHtml = body.attachment_html ? body.attachment_html.toString() : ''
    let attachmentFilename = body.attachment_filename ? body.attachment_filename.toString() : ''
    if (attachmentHtml && !attachmentFilename) {
      attachmentFilename = docType === 'promissoria' ? 'nota-promissoria.html' : 'documento.html'
    }
    if (attachmentFilename && attachmentHtml && attachmentFilename.indexOf('.') === -1) {
      attachmentFilename = attachmentFilename + '.html'
    }

    if (!toEmail) {
      return e.json(400, { message: 'Destinatário (to_email) é obrigatório.' })
    }

    // Busca configuração de email no banco de dados (painel da empresa)
    let mailRec = null
    try {
      const recs = $app.findRecordsByFilter('company_mail_settings', '1=1', '-created', 1, 0)
      if (recs && recs.length > 0) mailRec = recs[0]
    } catch (_) {}

    let companyRec = null
    try {
      const compRecs = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      if (compRecs && compRecs.length > 0) companyRec = compRecs[0]
    } catch (_) {}

    let host = mailRec ? mailRec.getString('smtp_host').trim() : ''
    let port = mailRec ? mailRec.getInt('smtp_port') || 587 : 587
    let user = mailRec ? mailRec.getString('smtp_username').trim() : ''
    let encryptedPass = mailRec ? mailRec.getString('smtp_password') : ''
    let fromAddr = mailRec ? mailRec.getString('from_address').trim() : ''
    let fromName = mailRec
      ? mailRec.getString('from_name').trim()
      : companyRec
        ? companyRec.getString('name')
        : 'VendasPro'
    let replyTo = mailRec ? mailRec.getString('reply_to').trim() : ''
    let enabled = mailRec ? mailRec.getBool('enabled') : false

    const masterKey = ($os.getenv('PB_SUPERUSER_TOKEN') || 'vendaspro-app-master-secret-key-375ac')
      .substring(0, 32)
      .padEnd(32, '0')
    let pass = ''

    if (encryptedPass) {
      try {
        pass = $security.decrypt(encryptedPass, masterKey)
      } catch (_) {
        pass = ''
      }
    }

    if (!fromAddr) fromAddr = user
    if (!fromName) fromName = 'VendasPro'

    let sendErr = ''

    const isUserAdmin =
      e.auth && (e.auth.get('is_super_admin') === true || e.auth.getString('role') === 'admin')

    if (!enabled) {
      sendErr = 'SMTP_DISABLED: O envio de e-mails está desativado nas configurações do sistema.'
    } else if (!host || !user || !pass) {
      if (isUserAdmin) {
        sendErr =
          'O envio de e-mails ainda não está configurado para esta empresa. Entre em Administração → Configurações → E-mail para concluir a configuração.'
      } else {
        sendErr =
          'O serviço de envio de e-mails está indisponível no momento. Entre em contato com a administração.'
      }
    } else {
      try {
        const settings = $app.settings()
        settings.smtp.host = host
        settings.smtp.port = port
        settings.smtp.username = user
        settings.smtp.password = pass
        settings.smtp.enabled = true

        const headers = {}
        if (replyTo) {
          headers['Reply-To'] = replyTo
        }

        const message = new MailerMessage({
          from: {
            address: fromAddr,
            name: fromName,
          },
          to: [{ address: toEmail }],
          subject: subject,
          html: htmlBody,
          headers: headers,
          attachments: attachmentHtml
            ? [
                {
                  filename: attachmentFilename,
                  content: $security.base64Encode(attachmentHtml),
                  mimeType: 'text/html',
                },
              ]
            : [],
        })

        $app.newMailClient().send(message)
      } catch (err) {
        const rawMsg = err && err.message ? err.message : String(err)
        let cleanMsg = rawMsg
        if (pass) {
          cleanMsg = cleanMsg.replace(
            new RegExp(pass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
            '***',
          )
        }
        if (user) {
          cleanMsg = cleanMsg.replace(
            new RegExp(user.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
            '***',
          )
        }
        sendErr = cleanMsg
      }
    }

    // Registra em email_logs
    let logId = ''
    try {
      const col = $app.findCollectionByNameOrId('email_logs')
      const rec = new Record(col)
      rec.set('to_email', toEmail)
      rec.set('subject', subject)
      rec.set('body', htmlBody)
      if (docType) rec.set('doc_type', docType)
      if (saleId) rec.set('sale', saleId)
      if (sentBy) rec.set('sent_by', sentBy)
      rec.set('status', sendErr ? 'failed' : 'sent')
      if (sendErr) rec.set('error_message', sendErr)
      $app.save(rec)
      logId = rec.id
    } catch (_) {}

    if (sendErr) {
      return e.json(500, {
        message: 'Falha ao enviar email via SMTP.',
        error: sendErr,
        status: 'failed',
        log_id: logId,
      })
    }

    return e.json(200, {
      message: 'Email enviado com sucesso.',
      status: 'sent',
      log_id: logId,
    })
  },
  $apis.requireAuth(),
)
