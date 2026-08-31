// POST /backend/v1/send-email
// Envia um email real via SMTP (configurado por variáveis de ambiente SMTP_*)
// e registra cada envio na coleção `email_logs` com status (sent/failed).
//
// POST /backend/v1/smtp/test
// Testa a configuração de SMTP existente sem exibir dados sensíveis
//
// GET /backend/v1/smtp/status
// Retorna se o SMTP está configurado (sem revelar senhas/usuários)

routerAdd(
  'GET',
  '/backend/v1/smtp/status',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    const host = ($os.getenv('SMTP_HOST') || '').trim()
    const portStr = ($os.getenv('SMTP_PORT') || '').trim()
    const user = ($os.getenv('SMTP_USER') || '').trim()
    const pass = ($os.getenv('SMTP_PASSWORD') || '').trim()
    const fromAddr = ($os.getenv('SMTP_FROM') || '').trim()

    const configured = Boolean(host && user && pass)

    return e.json(200, {
      configured: configured,
      host: host ? host.replace(/.(?=.{4})/g, '*') : '',
      port: portStr || '587',
      from: fromAddr ? fromAddr.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
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

    // Apenas quem tiver permissão settings.edit ou admin ou super_admin pode testar SMTP
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
      permissions.indexOf('settings.edit') !== -1 ||
      permissions.indexOf('settings.view') !== -1

    if (!canTest) {
      // Registrar tentativa bloqueada em audit log
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

    const host = ($os.getenv('SMTP_HOST') || '').trim()
    const port = parseInt($os.getenv('SMTP_PORT') || '587', 10)
    const user = ($os.getenv('SMTP_USER') || '').trim()
    const pass = ($os.getenv('SMTP_PASSWORD') || '').trim()
    const fromAddr = ($os.getenv('SMTP_FROM') || user || 'noreply@vendaspro.com').trim()

    if (!host || !user || !pass) {
      return e.json(400, {
        success: false,
        message:
          'O servidor SMTP não está configurado. Preencha as variáveis SMTP_HOST, SMTP_USER, SMTP_PASSWORD e SMTP_PORT nos segredos do sistema.',
        code: 'SMTP_NOT_CONFIGURED',
      })
    }

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
          name: $app.settings().meta.senderName || 'VendasPro',
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
      // Garantir que a mensagem de erro não contenha credenciais ou senhas
      const rawMsg = err && err.message ? err.message : String(err)
      sendErr = rawMsg
        .replace(new RegExp(pass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '***')
        .replace(new RegExp(user.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '***')
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
        message: 'Falha ao conectar ou autenticar no servidor SMTP.',
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

    const host = ($os.getenv('SMTP_HOST') || '').trim()
    const port = parseInt($os.getenv('SMTP_PORT') || '587', 10)
    const user = ($os.getenv('SMTP_USER') || '').trim()
    const pass = ($os.getenv('SMTP_PASSWORD') || '').trim()
    const fromAddr = ($os.getenv('SMTP_FROM') || user || 'noreply@vendaspro.com').trim()

    let sendErr = ''

    if (!host || !user || !pass) {
      sendErr = 'SMTP_NOT_CONFIGURED: Servidor SMTP não configurado.'
    } else {
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
            name: $app.settings().meta.senderName || 'VendasPro',
          },
          to: [{ address: toEmail }],
          subject: subject,
          html: htmlBody,
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
        sendErr = rawMsg
          .replace(new RegExp(pass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '***')
          .replace(new RegExp(user.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '***')
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
