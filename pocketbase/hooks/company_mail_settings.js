// Endpoints para gerenciamento seguro de configurações de Email/SMTP da empresa:
//   GET  /backend/v1/settings/email       - Visualiza configurações atuais (sem senha) [settings.email.view]
//   PUT  /backend/v1/settings/email       - Salva configurações de SMTP [settings.email.edit]
//   POST /backend/v1/settings/email/test  - Testa conexão e envio de email de teste [settings.email.test]
//
// Endpoints legados mantidos com redirecionamento de lógica segura para retrocompatibilidade:
//   GET  /backend/v1/smtp/status
//   POST /backend/v1/smtp/test
//   POST /backend/v1/send-email

// ===========================================================================
// GET /backend/v1/settings/email
// Visualizar configurações de SMTP (NUNCA retorna a senha em texto puro)
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/settings/email',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    const isSuper = auth.get('is_super_admin') === true
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canView =
      isSuper ||
      role === 'admin' ||
      perms.indexOf('settings.email.view') !== -1 ||
      perms.indexOf('settings.view') !== -1

    if (!canView) {
      // Registrar tentativa bloqueada em audit log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('actor', auth.id)
        aRec.set('action', 'smtp_view_attempt')
        aRec.set('module', 'settings')
        aRec.set('description', 'Tentativa não autorizada de visualizar configurações de SMTP')
        aRec.set('ip', e.realIP() || '')
        aRec.set('user_agent', (e.request.header.get('user-agent') || '').substring(0, 250))
        aRec.set('result', 'blocked')
        $app.save(aRec)
      } catch (_) {}

      return e.json(403, {
        message:
          'Sem permissão para visualizar configurações de e-mail (settings.email.view necessária).',
      })
    }

    let mailRec = null
    try {
      const recs = $app.findRecordsByFilter('company_mail_settings', '1=1', '-created', 1, 0)
      if (recs && recs.length > 0) {
        mailRec = recs[0]
      }
    } catch (_) {}

    let companyRec = null
    try {
      const compRecs = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      if (compRecs && compRecs.length > 0) {
        companyRec = compRecs[0]
      }
    } catch (_) {}

    const hasPassword = Boolean(mailRec && mailRec.getString('smtp_password'))
    const host = mailRec ? mailRec.getString('smtp_host') : ''
    const port = mailRec ? mailRec.getInt('smtp_port') || 587 : 587
    const username = mailRec ? mailRec.getString('smtp_username') : ''
    const securityType = mailRec ? mailRec.getString('security_type') || 'tls' : 'tls'
    const fromAddress = mailRec
      ? mailRec.getString('from_address')
      : companyRec
        ? companyRec.getString('email')
        : ''
    const fromName = mailRec
      ? mailRec.getString('from_name')
      : companyRec
        ? companyRec.getString('name')
        : 'VendasPro'
    const replyTo = mailRec ? mailRec.getString('reply_to') : ''
    const enabled = mailRec ? mailRec.getBool('enabled') : false
    const lastTestStatus = mailRec ? mailRec.getString('last_test_status') || 'none' : 'none'
    const lastTestedAt = mailRec ? mailRec.getString('last_tested_at') || '' : ''
    const lastTestError = mailRec ? mailRec.getString('last_test_error') || '' : ''

    const isConfigured = Boolean(host && username && hasPassword)

    return e.json(200, {
      id: mailRec ? mailRec.id : '',
      company: mailRec ? mailRec.getString('company') : companyRec ? companyRec.id : '',
      smtp_host: host,
      smtp_port: port,
      smtp_username: username,
      smtp_password_configured: hasPassword,
      security_type: securityType,
      from_address: fromAddress,
      from_name: fromName,
      reply_to: replyTo,
      enabled: enabled,
      is_configured: isConfigured,
      last_test_status: lastTestStatus,
      last_tested_at: lastTestedAt,
      last_test_error: lastTestError,
      created: mailRec ? mailRec.getString('created') : '',
      updated: mailRec ? mailRec.getString('updated') : '',
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// PUT /backend/v1/settings/email
// Salvar configurações de SMTP (com criptografia reversível da senha)
// ===========================================================================
routerAdd(
  'PUT',
  '/backend/v1/settings/email',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    const isSuper = auth.get('is_super_admin') === true
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canEdit =
      isSuper ||
      role === 'admin' ||
      perms.indexOf('settings.email.edit') !== -1 ||
      perms.indexOf('settings.edit') !== -1

    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canEdit) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('actor', auth.id)
        aRec.set('action', 'smtp_edit_attempt')
        aRec.set('module', 'settings')
        aRec.set('description', 'Tentativa não autorizada de alterar configurações de SMTP')
        aRec.set('ip', ip)
        aRec.set('user_agent', ua)
        aRec.set('result', 'blocked')
        $app.save(aRec)
      } catch (_) {}

      return e.json(403, {
        message:
          'Sem permissão para alterar configurações de e-mail (settings.email.edit necessária).',
      })
    }

    const body = e.requestInfo().body || {}
    const smtpHost = (body.smtp_host || '').toString().trim()
    const smtpPortRaw = parseInt(body.smtp_port, 10)
    const smtpPort = isNaN(smtpPortRaw) || smtpPortRaw <= 0 ? 587 : smtpPortRaw
    const smtpUsername = (body.smtp_username || '').toString().trim()
    const newPasswordRaw = (body.smtp_password || '').toString()
    const securityType = (body.security_type || 'tls').toString().trim().toLowerCase()
    const fromAddress = (body.from_address || '').toString().trim()
    const fromName = (body.from_name || '').toString().trim()
    const replyTo = (body.reply_to || '').toString().trim()
    const enabled = body.enabled === true || body.enabled === 'true'

    // Validações básicas de formato (não bloqueia salvamento de parâmetros incompletos se disabled, mas valida tipos)
    const allowedSecurity = ['tls', 'ssl', 'starttls', 'none']
    const safeSecurity = allowedSecurity.indexOf(securityType) !== -1 ? securityType : 'tls'

    if (fromAddress && !/\S+@\S+\.\S+/.test(fromAddress)) {
      return e.json(400, { message: 'E-mail do remetente inválido.' })
    }
    if (replyTo && !/\S+@\S+\.\S+/.test(replyTo)) {
      return e.json(400, { message: 'E-mail Reply-To inválido.' })
    }

    // Busca empresa e registro de mail_settings atual
    let companyRec = null
    try {
      const compRecs = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      if (compRecs && compRecs.length > 0) companyRec = compRecs[0]
    } catch (_) {}

    let mailRec = null
    let isCreated = false
    try {
      const recs = $app.findRecordsByFilter('company_mail_settings', '1=1', '-created', 1, 0)
      if (recs && recs.length > 0) {
        mailRec = recs[0]
      }
    } catch (_) {}

    const mailCol = $app.findCollectionByNameOrId('company_mail_settings')
    if (!mailRec) {
      mailRec = new Record(mailCol)
      isCreated = true
    }

    // Dados anteriores para auditoria
    const prevData = {
      smtp_host: mailRec.getString('smtp_host'),
      smtp_port: mailRec.getInt('smtp_port') || 587,
      smtp_username: mailRec.getString('smtp_username'),
      smtp_password_configured: Boolean(mailRec.getString('smtp_password')),
      security_type: mailRec.getString('security_type') || 'tls',
      from_address: mailRec.getString('from_address'),
      from_name: mailRec.getString('from_name'),
      reply_to: mailRec.getString('reply_to'),
      enabled: mailRec.getBool('enabled'),
    }

    if (companyRec && !mailRec.getString('company')) {
      mailRec.set('company', companyRec.id)
    }

    mailRec.set('smtp_host', smtpHost)
    mailRec.set('smtp_port', smtpPort)
    mailRec.set('smtp_username', smtpUsername)
    mailRec.set('security_type', safeSecurity)
    mailRec.set('from_address', fromAddress)
    mailRec.set('from_name', fromName)
    mailRec.set('reply_to', replyTo)
    mailRec.set('enabled', enabled)

    // Tratamento de criptografia da senha:
    // Chave de encriptação mestra interna do Skip Cloud/PocketBase
    const masterKey = ($os.getenv('PB_SUPERUSER_TOKEN') || 'vendaspro-app-master-secret-key-375ac')
      .substring(0, 32)
      .padEnd(32, '0')
    let passwordChanged = false

    if (newPasswordRaw && newPasswordRaw.trim() !== '') {
      try {
        const encryptedPass = $security.encrypt(newPasswordRaw, masterKey)
        mailRec.set('smtp_password', encryptedPass)
        passwordChanged = true
      } catch (encErr) {
        return e.json(500, { message: 'Erro ao criptografar senha SMTP de forma segura.' })
      }
    }

    $app.save(mailRec)

    // Auditoria de alterações (NUNCA expor senhas)
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('module', 'settings')
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'success')

      const diffParts = []
      if (prevData.smtp_host !== smtpHost) diffParts.push('Servidor SMTP alterado')
      if (prevData.smtp_port !== smtpPort) diffParts.push('Porta SMTP alterada (' + smtpPort + ')')
      if (prevData.smtp_username !== smtpUsername) diffParts.push('Usuário SMTP alterado')
      if (prevData.security_type !== safeSecurity)
        diffParts.push('Segurança alterada (' + safeSecurity + ')')
      if (prevData.from_address !== fromAddress) diffParts.push('E-mail remetente alterado')
      if (prevData.from_name !== fromName) diffParts.push('Nome remetente alterado')
      if (prevData.reply_to !== replyTo) diffParts.push('Reply-To alterado')
      if (prevData.enabled !== enabled)
        diffParts.push(enabled ? 'Envio ativado' : 'Envio desativado')
      if (passwordChanged) diffParts.push('Senha SMTP: alterada')

      let action = isCreated ? 'SMTP_SETTINGS_CREATED' : 'SMTP_SETTINGS_UPDATED'
      if (prevData.enabled !== enabled) {
        action = enabled ? 'SMTP_ENABLED' : 'SMTP_DISABLED'
      }

      audit.set('action', action)
      audit.set(
        'description',
        diffParts.length > 0
          ? 'Configurações de SMTP da empresa atualizadas (' + diffParts.join(', ') + ')'
          : 'Configurações de SMTP salvas',
      )

      audit.set('before', {
        smtp_host: prevData.smtp_host,
        smtp_port: prevData.smtp_port,
        smtp_username: prevData.smtp_username,
        smtp_password: prevData.smtp_password_configured ? 'configured' : 'not_configured',
        security_type: prevData.security_type,
        from_address: prevData.from_address,
        from_name: prevData.from_name,
        reply_to: prevData.reply_to,
        enabled: prevData.enabled,
      })

      audit.set('after', {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUsername,
        smtp_password: Boolean(mailRec.getString('smtp_password'))
          ? 'configured'
          : 'not_configured',
        security_type: safeSecurity,
        from_address: fromAddress,
        from_name: fromName,
        reply_to: replyTo,
        enabled: enabled,
      })

      $app.save(audit)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Configurações de e-mail salvas com sucesso.',
      settings: {
        id: mailRec.id,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUsername,
        smtp_password_configured: Boolean(mailRec.getString('smtp_password')),
        security_type: safeSecurity,
        from_address: fromAddress,
        from_name: fromName,
        reply_to: replyTo,
        enabled: enabled,
        is_configured: Boolean(smtpHost && smtpUsername && mailRec.getString('smtp_password')),
        last_test_status: mailRec.getString('last_test_status') || 'none',
        last_tested_at: mailRec.getString('last_tested_at') || '',
      },
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// POST /backend/v1/settings/email/test
// Executar teste de envio e conectividade SMTP
// ===========================================================================
routerAdd(
  'POST',
  '/backend/v1/settings/email/test',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { message: 'Autenticação necessária.' })
    }

    const isSuper = auth.get('is_super_admin') === true
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canTest =
      isSuper ||
      role === 'admin' ||
      perms.indexOf('settings.email.test') !== -1 ||
      perms.indexOf('settings.email.edit') !== -1 ||
      perms.indexOf('settings.edit') !== -1 ||
      perms.indexOf('settings.view') !== -1

    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canTest) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('actor', auth.id)
        aRec.set('action', 'SMTP_TEST_ATTEMPT')
        aRec.set('module', 'settings')
        aRec.set('description', 'Tentativa não autorizada de testar conexão SMTP')
        aRec.set('ip', ip)
        aRec.set('user_agent', ua)
        aRec.set('result', 'blocked')
        $app.save(aRec)
      } catch (_) {}

      return e.json(403, {
        message:
          'Sem permissão para testar configurações de e-mail (settings.email.test necessária).',
      })
    }

    const body = e.requestInfo().body || {}
    const targetEmail = (body.to_email || auth.getString('email') || '').trim()

    if (!targetEmail || !/\S+@\S+\.\S+/.test(targetEmail)) {
      return e.json(400, {
        success: false,
        message: 'E-mail de destino válido para o teste não informado.',
      })
    }

    // Busca configuração de email persistida na tabela company_mail_settings como fallback
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

    const masterKey = ($os.getenv('PB_SUPERUSER_TOKEN') || 'vendaspro-app-master-secret-key-375ac')
      .substring(0, 32)
      .padEnd(32, '0')

    // Valores prioritários vêm do body (permitindo testar antes de salvar), com fallback para o banco
    const host =
      body.smtp_host !== undefined && body.smtp_host !== null
        ? String(body.smtp_host).trim()
        : mailRec
          ? mailRec.getString('smtp_host').trim()
          : ''

    const rawPort =
      body.smtp_port !== undefined && body.smtp_port !== null
        ? parseInt(body.smtp_port, 10)
        : mailRec
          ? mailRec.getInt('smtp_port') || 587
          : 587
    const port = isNaN(rawPort) || rawPort <= 0 ? 587 : rawPort

    const user =
      body.smtp_username !== undefined && body.smtp_username !== null
        ? String(body.smtp_username).trim()
        : mailRec
          ? mailRec.getString('smtp_username').trim()
          : ''

    let pass = ''
    if (
      body.smtp_password !== undefined &&
      body.smtp_password !== null &&
      String(body.smtp_password).trim() !== ''
    ) {
      pass = String(body.smtp_password)
    } else if (mailRec && mailRec.getString('smtp_password')) {
      try {
        pass = $security.decrypt(mailRec.getString('smtp_password'), masterKey)
      } catch (decErr) {
        pass = ''
      }
    }

    let fromAddr =
      body.from_address !== undefined && body.from_address !== null
        ? String(body.from_address).trim()
        : mailRec
          ? mailRec.getString('from_address').trim()
          : ''
    if (!fromAddr) {
      fromAddr = user || (companyRec ? companyRec.getString('email') : '')
    }

    let fromName =
      body.from_name !== undefined && body.from_name !== null
        ? String(body.from_name).trim()
        : mailRec
          ? mailRec.getString('from_name').trim()
          : ''
    if (!fromName) {
      fromName = companyRec ? companyRec.getString('name') : 'VendasPro'
    }

    let replyTo =
      body.reply_to !== undefined && body.reply_to !== null
        ? String(body.reply_to).trim()
        : mailRec
          ? mailRec.getString('reply_to').trim()
          : ''

    // Se não houver configurações mínimas válidas
    if (!host || !user || !pass) {
      return e.json(400, {
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'Preencha Servidor SMTP, Usuário SMTP e Senha antes de realizar o teste.',
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

      const headers = {}
      if (replyTo) {
        headers['Reply-To'] = replyTo
      }

      const message = new MailerMessage({
        from: {
          address: fromAddr,
          name: fromName,
        },
        to: [{ address: targetEmail }],
        subject: 'VendasPro — Teste de Configuração SMTP (' + fromName + ')',
        headers: headers,
        html:
          '<div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">' +
          '<div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px;">' +
          '<h2 style="color: #4f46e5; margin: 0; font-size: 20px;">' +
          fromName +
          ' — Teste de SMTP</h2>' +
          '<p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Validação de envio dinâmico do painel administrativo</p>' +
          '</div>' +
          '<p style="font-size: 14px; line-height: 1.5;">Olá!</p>' +
          '<p style="font-size: 14px; line-height: 1.5;">Este é um e-mail de teste enviado pelo <strong>VendasPro</strong> para validar com sucesso as credenciais SMTP configuradas no painel.</p>' +
          '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">' +
          '<tr><td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Servidor Host</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' +
          host +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Porta</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' +
          port +
          '</td></tr>' +
          '<tr><td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Remetente</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' +
          fromName +
          ' &lt;' +
          fromAddr +
          '&gt;</td></tr>' +
          (replyTo
            ? '<tr><td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Reply-To</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' +
              replyTo +
              '</td></tr>'
            : '') +
          '</table>' +
          '<p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">Enviado por ' +
          (auth.getString('name') || auth.getString('email')) +
          ' em ' +
          new Date().toISOString() +
          '</p>' +
          '</div>',
      })

      $app.newMailClient().send(message)
    } catch (err) {
      const rawMsg = err && err.message ? err.message : String(err)
      // Sanitização estrita: remover senhas, connection strings e usuário
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

    const testPassed = !sendErr
    const nowIso = new Date().toISOString()

    // Atualiza status do último teste em company_mail_settings
    if (mailRec) {
      try {
        mailRec.set('last_test_status', testPassed ? 'success' : 'failed')
        mailRec.set('last_tested_at', nowIso)
        mailRec.set('last_test_error', testPassed ? '' : sendErr.substring(0, 600))
        $app.save(mailRec)
      } catch (_) {}
    }

    // Registra envio em email_logs
    try {
      const col = $app.findCollectionByNameOrId('email_logs')
      const rec = new Record(col)
      rec.set('to_email', targetEmail)
      rec.set('subject', 'VendasPro — Teste de Configuração SMTP')
      rec.set('body', 'Envio de teste de validação SMTP executado pelo painel.')
      rec.set('sent_by', auth.id)
      rec.set('status', testPassed ? 'sent' : 'failed')
      if (!testPassed) rec.set('error_message', sendErr)
      $app.save(rec)
    } catch (_) {}

    // Registra log de auditoria do teste
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('action', testPassed ? 'SMTP_TEST_SUCCESS' : 'SMTP_TEST_FAILED')
      audit.set('module', 'settings')
      audit.set(
        'description',
        testPassed
          ? 'Teste de conexão SMTP executado com sucesso para ' + targetEmail
          : 'Falha no teste de conexão SMTP para ' + targetEmail + ': ' + sendErr.substring(0, 150),
      )
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', testPassed ? 'success' : 'error')
      audit.set('before', { destination: targetEmail, host: host, port: port })
      audit.set('after', { status: testPassed ? 'success' : 'failed' })
      $app.save(audit)
    } catch (_) {}

    if (!testPassed) {
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
      tested_at: nowIso,
    })
  },
  $apis.requireAuth(),
)
