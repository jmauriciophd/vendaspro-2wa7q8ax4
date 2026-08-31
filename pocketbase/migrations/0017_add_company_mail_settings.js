migrate(
  (app) => {
    // 1. Criar collection `company_mail_settings`
    // Tabela associada à empresa para guardar configurações de SMTP dinâmicas de forma segura
    // Campos:
    // - company: relation -> company_settings (opcional/1)
    // - smtp_host: text
    // - smtp_port: number
    // - smtp_username: text
    // - smtp_password: text (criptografada com $security.encrypt)
    // - security_type: select ('tls', 'ssl', 'starttls', 'none')
    // - from_address: text
    // - from_name: text
    // - reply_to: text
    // - enabled: bool (toggle ativar envio de e-mails)
    // - last_test_status: select ('none', 'success', 'failed')
    // - last_tested_at: date
    // - last_test_error: text
    // - created: autodate
    // - updated: autodate

    let companySettingsId = ''
    try {
      companySettingsId = app.findCollectionByNameOrId('company_settings').id
    } catch (_) {}

    const mailSettingsCol = new Collection({
      name: 'company_mail_settings',
      type: 'base',
      listRule: null, // superuser/hooks only por segurança extrema — endpoints dedicados com RBAC
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        ...(companySettingsId
          ? [
              {
                name: 'company',
                type: 'relation',
                required: false,
                collectionId: companySettingsId,
                cascadeDelete: false,
                maxSelect: 1,
              },
            ]
          : []),
        {
          name: 'smtp_host',
          type: 'text',
          required: false,
        },
        {
          name: 'smtp_port',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'smtp_username',
          type: 'text',
          required: false,
        },
        {
          name: 'smtp_password',
          type: 'text',
          required: false,
        },
        {
          name: 'security_type',
          type: 'select',
          required: false,
          values: ['tls', 'ssl', 'starttls', 'none'],
          maxSelect: 1,
        },
        {
          name: 'from_address',
          type: 'text',
          required: false,
        },
        {
          name: 'from_name',
          type: 'text',
          required: false,
        },
        {
          name: 'reply_to',
          type: 'text',
          required: false,
        },
        {
          name: 'enabled',
          type: 'bool',
          required: false,
        },
        {
          name: 'last_test_status',
          type: 'select',
          required: false,
          values: ['none', 'success', 'failed'],
          maxSelect: 1,
        },
        {
          name: 'last_tested_at',
          type: 'date',
          required: false,
        },
        {
          name: 'last_test_error',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_mail_settings_created ON company_mail_settings (created DESC)',
        'CREATE INDEX idx_mail_settings_enabled ON company_mail_settings (enabled)',
      ],
    })

    app.save(mailSettingsCol)

    // Seed inicial: criar registro padrão associado à empresa existente (se houver)
    try {
      const companyRecs = app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
      const targetCompany = companyRecs && companyRecs.length > 0 ? companyRecs[0] : null

      const rec = new Record(mailSettingsCol)
      if (targetCompany) {
        rec.set('company', targetCompany.id)
        rec.set('from_name', targetCompany.getString('name') || 'VendasPro')
        rec.set('from_address', targetCompany.getString('email') || 'contato@minhaempresa.com.br')
      } else {
        rec.set('from_name', 'VendasPro')
      }
      rec.set('smtp_port', 587)
      rec.set('security_type', 'tls')
      rec.set('enabled', false)
      rec.set('last_test_status', 'none')
      app.save(rec)
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('company_mail_settings')
      app.delete(col)
    } catch (_) {}
  },
)
