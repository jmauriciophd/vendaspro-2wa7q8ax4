migrate(
  (app) => {
    // ---- 1. Add fiscal fields to `products` (code, stock, ncm, cfop) ----
    const products = app.findCollectionByNameOrId('products')
    if (!products.fields.getByName('code')) {
      products.fields.add(new TextField({ name: 'code' }))
    }
    if (!products.fields.getByName('stock')) {
      products.fields.add(new NumberField({ name: 'stock', min: 0 }))
    }
    if (!products.fields.getByName('ncm')) {
      products.fields.add(new TextField({ name: 'ncm' }))
    }
    if (!products.fields.getByName('cfop')) {
      products.fields.add(new TextField({ name: 'cfop' }))
    }
    app.save(products)

    // ---- 2. Add fiscal fields to `customers` (ie, phone_whatsapp, telegram) ----
    const customers = app.findCollectionByNameOrId('customers')
    if (!customers.fields.getByName('ie')) {
      customers.fields.add(new TextField({ name: 'ie' }))
    }
    if (!customers.fields.getByName('phone_whatsapp')) {
      customers.fields.add(new TextField({ name: 'phone_whatsapp' }))
    }
    if (!customers.fields.getByName('telegram')) {
      customers.fields.add(new TextField({ name: 'telegram' }))
    }
    app.save(customers)

    // ---- 3. Add role + status fields to `users` (auth collection) ----
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'gerente', 'vendedor'],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('active')) {
      users.fields.add(new BoolField({ name: 'active' }))
    }
    app.save(users)

    // ---- 4. company_settings collection (single record of fiscal company data) ----
    let companySettings
    try {
      companySettings = app.findCollectionByNameOrId('company_settings')
    } catch (_) {
      companySettings = new Collection({
        name: 'company_settings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'cnpj', type: 'text' },
          { name: 'ie', type: 'text' },
          { name: 'im', type: 'text' },
          { name: 'address', type: 'text' },
          { name: 'number', type: 'text' },
          { name: 'neighborhood', type: 'text' },
          { name: 'city', type: 'text' },
          { name: 'state', type: 'text' },
          { name: 'cep', type: 'text' },
          { name: 'phone', type: 'text' },
          { name: 'email', type: 'text' },
          { name: 'email_subject', type: 'text' },
          { name: 'email_body', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(companySettings)
    }

    // ---- 5. email_logs collection (history of document sends) ----
    try {
      app.findCollectionByNameOrId('email_logs')
    } catch (_) {
      const salesId = app.findCollectionByNameOrId('sales').id
      const emailLogs = new Collection({
        name: 'email_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'sale',
            type: 'relation',
            collectionId: salesId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'to_email', type: 'text', required: true },
          { name: 'subject', type: 'text' },
          { name: 'body', type: 'text' },
          {
            name: 'doc_type',
            type: 'select',
            values: ['nfe', 'promissoria'],
            maxSelect: 1,
          },
          {
            name: 'sent_by',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_email_logs_sale ON email_logs (sale)'],
      })
      app.save(emailLogs)
    }

    // ---- 6. Seed a default company_settings record (idempotent) ----
    let existingCompany = []
    try {
      existingCompany = app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
    } catch (_) {}
    if (!existingCompany || existingCompany.length === 0) {
      const record = new Record(companySettings)
      record.set('name', 'Minha Empresa LTDA')
      record.set('cnpj', '12.345.678/0001-90')
      record.set('ie', '123.456.789.111')
      record.set('address', 'Av. Paulista')
      record.set('number', '1000')
      record.set('neighborhood', 'Bela Vista')
      record.set('city', 'São Paulo')
      record.set('state', 'SP')
      record.set('cep', '01310-100')
      record.set('phone', '(11) 3000-0000')
      record.set('email', 'contato@minhaempresa.com.br')
      record.set('email_subject', 'Documento Fiscal da sua compra - {empresa}')
      record.set(
        'email_body',
        'Olá {cliente},\n\nSegue em anexo o documento fiscal referente à sua compra.\n\nResumo da venda:\nValor total: R$ {total}\nData: {data}\n\nEm caso de dúvidas, entre em contato.\n\nAtenciosamente,\n{empresa}',
      )
      app.save(record)
    }

    // ---- 7. Backfill role for existing users -> admin (so current user keeps full access) ----
    try {
      const existingUsers = app.findRecordsByFilter('users', '1=1', 'created', 500, 0)
      for (const u of existingUsers) {
        if (!u.getString('role')) {
          u.set('role', 'admin')
        }
        if (u.get('active') === null) {
          u.set('active', true)
        }
        app.save(u)
      }
    } catch (_) {}
  },
  (app) => {
    // best-effort revert
    try {
      const products = app.findCollectionByNameOrId('products')
      for (const f of ['code', 'stock', 'ncm', 'cfop']) {
        const field = products.fields.getByName(f)
        if (field) products.fields.remove(field)
      }
      app.save(products)
    } catch (_) {}

    try {
      const customers = app.findCollectionByNameOrId('customers')
      for (const f of ['ie', 'phone_whatsapp', 'telegram']) {
        const field = customers.fields.getByName(f)
        if (field) customers.fields.remove(field)
      }
      app.save(customers)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      for (const f of ['role', 'active']) {
        const field = users.fields.getByName(f)
        if (field) users.fields.remove(field)
      }
      app.save(users)
    } catch (_) {}

    try {
      app.delete(app.findCollectionByNameOrId('email_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('company_settings'))
    } catch (_) {}
  },
)
