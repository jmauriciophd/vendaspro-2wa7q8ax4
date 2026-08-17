migrate(
  (app) => {
    // 1) Add `logo` file field to company_settings (empresa logo for NF-e / promissória)
    const companyCol = app.findCollectionByNameOrId('company_settings')
    if (!companyCol.fields.getByName('logo')) {
      companyCol.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 2097152, // 2MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
    }
    app.save(companyCol)

    // 2) Add `status` select + `error_message` text to email_logs
    const logsCol = app.findCollectionByNameOrId('email_logs')
    if (!logsCol.fields.getByName('status')) {
      logsCol.fields.add(
        new SelectField({
          name: 'status',
          values: ['sent', 'failed'],
          maxSelect: 1,
        }),
      )
    }
    if (!logsCol.fields.getByName('error_message')) {
      logsCol.fields.add(new TextField({ name: 'error_message' }))
    }
    app.save(logsCol)
  },
  (app) => {
    const companyCol = app.findCollectionByNameOrId('company_settings')
    const logoField = companyCol.fields.getByName('logo')
    if (logoField) {
      companyCol.fields.remove(logoField)
      app.save(companyCol)
    }

    const logsCol = app.findCollectionByNameOrId('email_logs')
    const statusField = logsCol.fields.getByName('status')
    if (statusField) {
      logsCol.fields.remove(statusField)
    }
    const errField = logsCol.fields.getByName('error_message')
    if (errField) {
      logsCol.fields.remove(errField)
    }
    app.save(logsCol)
  },
)
