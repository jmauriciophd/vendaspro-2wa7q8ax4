// POST /backend/v1/send-email
// Envia um email real via SMTP (configurado por variáveis de ambiente SMTP_*)
// e registra cada envio na coleção `email_logs` com status (sent/failed).
//
// Body JSON:
//   - to_email: string (obrigatório)
//   - subject:  string
//   - body:     string (HTML ou texto)
//   - sale:     string (id da venda, opcional)
//   - doc_type: string ("nfe" | "promissoria", opcional)
//   - sent_by:  string (id do usuário, opcional — default auth.id)
//   - attachment_html:      string (HTML do documento a anexar, opcional)
//   - attachment_filename:  string (nome do arquivo anexo, opcional)
//
// Quando `attachment_html` é informado, o documento é anexado como um arquivo
// .html (que pode ser aberto e impresso como PDF pelo destinatário).
//
// Requer autenticação.
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
    // garante extensão .html no anexo
    if (attachmentFilename && attachmentHtml && attachmentFilename.indexOf('.') === -1) {
      attachmentFilename = attachmentFilename + '.html'
    }

    if (!toEmail) {
      return e.json(400, { message: 'Destinatário (to_email) é obrigatório.' })
    }

    // --- Configura SMTP a partir das variáveis de ambiente, se definidas ---
    const host = $os.getenv('SMTP_HOST') || ''
    const port = parseInt($os.getenv('SMTP_PORT') || '587', 10)
    const user = $os.getenv('SMTP_USER') || ''
    const pass = $os.getenv('SMTP_PASSWORD') || ''
    const fromAddr = $os.getenv('SMTP_FROM') || user || 'noreply@exemplo.com'

    let sendErr = ''

    try {
      if (host) {
        // Ajusta as configurações SMTP em memória para este envio
        const settings = $app.settings()
        settings.smtp.host = host
        settings.smtp.port = port
        settings.smtp.username = user
        settings.smtp.password = pass
        settings.smtp.enabled = true
      }

      const message = new MailerMessage({
        from: {
          address: fromAddr,
          name: $app.settings().meta.senderName || 'CRM de Vendas',
        },
        to: [{ address: toEmail }],
        subject: subject,
        html: htmlBody,
        // Anexa o documento (NF-e / Nota Promissória) como HTML, que pode ser
        // aberto pelo cliente de email e impresso/salvo como PDF.
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
      sendErr = err && err.message ? err.message : String(err)
    }

    // --- Registra o envio em email_logs ---
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
    } catch (logErr) {
      // não impedir resposta se falhar o log
      console.log('Falha ao registrar email_logs: ' + ((logErr && logErr.message) || logErr))
    }

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
