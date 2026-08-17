// 0010 — Módulo de Cobrança e Pagamentos Digitais.
//
// Cria as collections: payment_providers, financial_accounts, payment_charges,
// payment_charge_messages, payment_webhook_events, payment_audit_log.
// Também adiciona o valor "payment" à lista de tipos da collection notifications
// e semeia dados de demonstração (3 provedores, 3 contas, 8 cobranças).
//
// Idempotente: as collections usam try/catch findCollectionByNameOrId; o seed
// de cobranças pula se já existirem cobranças no banco.

migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const salesId = app.findCollectionByNameOrId('sales').id
    const customersId = app.findCollectionByNameOrId('customers').id

    // =======================================================================
    // 1. payment_providers
    // =======================================================================
    let providersCol
    try {
      providersCol = app.findCollectionByNameOrId('payment_providers')
    } catch (_) {
      providersCol = new Collection({
        name: 'payment_providers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true, max: 100 },
          { name: 'slug', type: 'text', required: true, max: 60 },
          {
            name: 'status',
            type: 'select',
            values: ['active', 'inactive', 'incomplete', 'error'],
            maxSelect: 1,
          },
          {
            name: 'environment',
            type: 'select',
            values: ['sandbox', 'production'],
            maxSelect: 1,
          },
          { name: 'methods', type: 'json', maxSize: 2000000 },
          { name: 'api_key', type: 'text', max: 500 },
          { name: 'api_secret', type: 'text', max: 500 },
          { name: 'webhook_secret', type: 'text', max: 500 },
          { name: 'webhook_configured', type: 'bool' },
          { name: 'last_sync', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_payment_providers_slug ON payment_providers (slug)'],
      })
      app.save(providersCol)
    }

    // =======================================================================
    // 2. financial_accounts
    // =======================================================================
    let accountsCol
    try {
      accountsCol = app.findCollectionByNameOrId('financial_accounts')
    } catch (_) {
      accountsCol = new Collection({
        name: 'financial_accounts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'provider_id',
            type: 'relation',
            required: false,
            collectionId: providersCol.id,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true, max: 120 },
          { name: 'account_reference', type: 'text', max: 200 },
          {
            name: 'environment',
            type: 'select',
            values: ['sandbox', 'production'],
            maxSelect: 1,
          },
          { name: 'active', type: 'bool' },
          { name: 'is_default', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_financial_accounts_provider ON financial_accounts (provider_id)',
        ],
      })
      app.save(accountsCol)
    }

    // =======================================================================
    // 3. payment_charges
    // =======================================================================
    let chargesCol
    try {
      chargesCol = app.findCollectionByNameOrId('payment_charges')
    } catch (_) {
      chargesCol = new Collection({
        name: 'payment_charges',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'sale_id',
            type: 'relation',
            required: false,
            collectionId: salesId,
            maxSelect: 1,
          },
          { name: 'invoice_id', type: 'text', max: 100 },
          {
            name: 'client_id',
            type: 'relation',
            required: false,
            collectionId: customersId,
            maxSelect: 1,
          },
          {
            name: 'seller_id',
            type: 'relation',
            required: false,
            collectionId: usersId,
            maxSelect: 1,
          },
          {
            name: 'provider_id',
            type: 'relation',
            required: false,
            collectionId: providersCol.id,
            maxSelect: 1,
          },
          {
            name: 'financial_account_id',
            type: 'relation',
            required: false,
            collectionId: accountsCol.id,
            maxSelect: 1,
          },
          { name: 'external_charge_id', type: 'text', max: 100 },
          {
            name: 'payment_method',
            type: 'select',
            values: ['pix', 'credit_card', 'debit_card', 'boleto', 'link'],
            maxSelect: 1,
          },
          { name: 'original_amount', type: 'number', min: 0 },
          { name: 'discount_amount', type: 'number', min: 0 },
          { name: 'final_amount', type: 'number', min: 0 },
          {
            name: 'status',
            type: 'select',
            values: [
              'pending',
              'waiting_payment',
              'paid',
              'expired',
              'canceled',
              'refunded',
              'partially_refunded',
              'failed',
              'under_review',
              'difference',
              'partial',
            ],
            maxSelect: 1,
          },
          { name: 'payment_url', type: 'text', max: 1000 },
          { name: 'pix_code', type: 'text', max: 1000 },
          { name: 'pix_qrcode', type: 'text', max: 5000 },
          { name: 'expires_at', type: 'date' },
          { name: 'paid_at', type: 'date' },
          { name: 'canceled_at', type: 'date' },
          { name: 'provider_response', type: 'json', maxSize: 2000000 },
          {
            name: 'created_by',
            type: 'relation',
            required: false,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_payment_charges_external ON payment_charges (external_charge_id)',
          'CREATE INDEX idx_payment_charges_sale ON payment_charges (sale_id)',
          'CREATE INDEX idx_payment_charges_client ON payment_charges (client_id)',
          'CREATE INDEX idx_payment_charges_seller ON payment_charges (seller_id)',
          'CREATE INDEX idx_payment_charges_provider ON payment_charges (provider_id)',
          'CREATE INDEX idx_payment_charges_status ON payment_charges (status)',
          'CREATE INDEX idx_payment_charges_paid ON payment_charges (paid_at)',
        ],
      })
      app.save(chargesCol)
    }

    // =======================================================================
    // 4. payment_charge_messages
    // =======================================================================
    let messagesCol
    try {
      messagesCol = app.findCollectionByNameOrId('payment_charge_messages')
    } catch (_) {
      messagesCol = new Collection({
        name: 'payment_charge_messages',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'charge_id',
            type: 'relation',
            required: true,
            collectionId: chargesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'channel',
            type: 'select',
            values: ['email', 'whatsapp', 'copy_link', 'sms'],
            maxSelect: 1,
          },
          { name: 'destination', type: 'text', max: 200 },
          {
            name: 'sent_by',
            type: 'relation',
            required: false,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'sent_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_payment_charge_messages_charge ON payment_charge_messages (charge_id)',
        ],
      })
      app.save(messagesCol)
    }

    // =======================================================================
    // 5. payment_webhook_events
    // =======================================================================
    let webhookCol
    try {
      webhookCol = app.findCollectionByNameOrId('payment_webhook_events')
    } catch (_) {
      webhookCol = new Collection({
        name: 'payment_webhook_events',
        type: 'base',
        // Webhooks são gravados por rota pública (sem auth); leitura apenas auth.
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'provider_id',
            type: 'relation',
            required: false,
            collectionId: providersCol.id,
            maxSelect: 1,
          },
          { name: 'external_event_id', type: 'text', max: 200 },
          { name: 'event_type', type: 'text', max: 200 },
          { name: 'external_charge_id', type: 'text', max: 200 },
          { name: 'payload', type: 'json', maxSize: 2000000 },
          { name: 'processed', type: 'bool' },
          { name: 'processed_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_payment_webhook_unique ON payment_webhook_events (provider_id, external_event_id)',
          'CREATE INDEX idx_payment_webhook_charge ON payment_webhook_events (external_charge_id)',
        ],
      })
      app.save(webhookCol)
    }

    // =======================================================================
    // 6. payment_audit_log
    // =======================================================================
    let auditCol
    try {
      auditCol = app.findCollectionByNameOrId('payment_audit_log')
    } catch (_) {
      auditCol = new Collection({
        name: 'payment_audit_log',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'charge_id',
            type: 'relation',
            required: false,
            collectionId: chargesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'action',
            type: 'select',
            values: [
              'charge_created',
              'link_sent',
              'webhook_received',
              'status_updated',
              'payment_confirmed',
              'payment_divergent',
              'charge_canceled',
              'refund',
              'manual_change',
              'reconciliation',
            ],
            maxSelect: 1,
          },
          {
            name: 'user_id',
            type: 'relation',
            required: false,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'ip_address', type: 'text', max: 100 },
          { name: 'reference', type: 'text', max: 200 },
          { name: 'previous_data', type: 'json', maxSize: 2000000 },
          { name: 'new_data', type: 'json', maxSize: 2000000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_payment_audit_charge ON payment_audit_log (charge_id)',
          'CREATE INDEX idx_payment_audit_created ON payment_audit_log (created DESC)',
        ],
      })
      app.save(auditCol)
    }

    // =======================================================================
    // 7. Adiciona o valor "payment" à lista de tipos da collection notifications.
    // =======================================================================
    try {
      const notifCol = app.findCollectionByNameOrId('notifications')
      const typeField = notifCol.fields.getByName('type')
      let changed = false
      if (typeField) {
        // SelectField em goja expõe um método para ler os valores; tentamos
        // várias formas conhecidas de forma defensiva.
        let currentValues = null
        try {
          currentValues = typeField.get('values')
        } catch (_) {}
        if (!currentValues) {
          try {
            currentValues = typeField.values
          } catch (_) {}
        }
        let hasPayment = false
        if (currentValues && currentValues.length) {
          for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i] === 'payment') hasPayment = true
          }
        }
        if (!hasPayment) {
          const newValues =
            currentValues && currentValues.length
              ? currentValues.concat(['payment'])
              : ['commission', 'order', 'quote', 'stock', 'system', 'payment']
          try {
            typeField.set('values', newValues)
            changed = true
          } catch (_) {
            try {
              typeField.values = newValues
              changed = true
            } catch (_) {}
          }
        }
      }
      if (changed) {
        app.save(notifCol)
      }
    } catch (err) {
      console.log('0010: não foi possível adicionar tipo "payment" ao notifications: ' + err)
    }

    // =======================================================================
    // 8. Seed de dados de demonstração.
    // =======================================================================
    // 8.1 Provedores
    const providersSeed = [
      {
        name: 'Mercado Pago',
        slug: 'mercadopago',
        status: 'active',
        environment: 'sandbox',
        methods: ['pix', 'credit_card', 'debit_card', 'boleto'],
        api_key: 'APP_USR_DEMO_8291',
        api_secret: 'sk_demo_a93f72bf',
        webhook_secret: 'whsec_mp_demo_4471',
        webhook_configured: true,
      },
      {
        name: 'Asaas',
        slug: 'asaas',
        status: 'active',
        environment: 'sandbox',
        methods: ['pix', 'boleto', 'credit_card'],
        api_key: '$aact_demo_5521',
        api_secret: 'sk_demo_asaas_99c1',
        webhook_secret: 'whsec_asaas_demo_7732',
        webhook_configured: true,
      },
      {
        name: 'PagBank',
        slug: 'pagbank',
        status: 'active',
        environment: 'sandbox',
        methods: ['pix', 'credit_card', 'link'],
        api_key: 'PAGBANK_DEMO_3310',
        api_secret: 'sk_demo_pagbank_22ab',
        webhook_secret: 'whsec_pagbank_demo_1190',
        webhook_configured: true,
      },
    ]

    const providerIds = {}
    for (let i = 0; i < providersSeed.length; i++) {
      const sp = providersSeed[i]
      let exists = []
      try {
        exists = app.findRecordsByFilter('payment_providers', 'slug = {:s}', 'created', 1, 0, {
          s: sp.slug,
        })
      } catch (_) {}
      if (exists && exists.length > 0) {
        providerIds[sp.slug] = exists[0].id
        continue
      }
      const rec = new Record(providersCol)
      rec.set('name', sp.name)
      rec.set('slug', sp.slug)
      rec.set('status', sp.status)
      rec.set('environment', sp.environment)
      rec.set('methods', sp.methods)
      rec.set('api_key', sp.api_key)
      rec.set('api_secret', sp.api_secret)
      rec.set('webhook_secret', sp.webhook_secret)
      rec.set('webhook_configured', sp.webhook_configured)
      app.save(rec)
      providerIds[sp.slug] = rec.id
    }

    // 8.2 Contas financeiras (1 por provedor)
    const accountsSeed = [
      {
        name: 'Conta Mercado Pago - Sandbox',
        provider_slug: 'mercadopago',
        account_reference: 'MP-ACC-001',
        environment: 'sandbox',
        is_default: true,
      },
      {
        name: 'Conta Asaas - Sandbox',
        provider_slug: 'asaas',
        account_reference: 'ASAAS-ACC-001',
        environment: 'sandbox',
        is_default: false,
      },
      {
        name: 'Conta PagBank - Sandbox',
        provider_slug: 'pagbank',
        account_reference: 'PAG-ACC-001',
        environment: 'sandbox',
        is_default: false,
      },
    ]

    const accountIds = {}
    for (let i = 0; i < accountsSeed.length; i++) {
      const sa = accountsSeed[i]
      const pid = providerIds[sa.provider_slug]
      if (!pid) continue
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'financial_accounts',
          'account_reference = {:r}',
          'created',
          1,
          0,
          { r: sa.account_reference },
        )
      } catch (_) {}
      if (exists && exists.length > 0) {
        accountIds[sa.provider_slug] = exists[0].id
        continue
      }
      const rec = new Record(accountsCol)
      rec.set('provider_id', pid)
      rec.set('name', sa.name)
      rec.set('account_reference', sa.account_reference)
      rec.set('environment', sa.environment)
      rec.set('active', true)
      rec.set('is_default', sa.is_default)
      app.save(rec)
      accountIds[sa.provider_slug] = rec.id
    }

    // 8.3 Cobranças demo — só cria se ainda não houver cobranças.
    let chargesCount = 0
    try {
      chargesCount = app.countRecords('payment_charges')
    } catch (_) {}
    if (chargesCount > 0) {
      console.log('0010: cobranças já existem (' + chargesCount + ') — seed de cobranças ignorado.')
      return
    }

    let sales = []
    try {
      sales = app.findRecordsByFilter('sales', '1=1', '-sale_date', 50, 0)
    } catch (_) {}
    if (!sales || sales.length === 0) {
      console.log('0010: nenhuma venda encontrada para vincular cobranças demo.')
      return
    }

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const dateStr = function (d) {
      return (
        d.getUTCFullYear() +
        '-' +
        pad(d.getUTCMonth() + 1) +
        '-' +
        pad(d.getUTCDate()) +
        ' ' +
        pad(d.getUTCHours()) +
        ':' +
        pad(d.getUTCMinutes()) +
        ':' +
        pad(d.getUTCSeconds()) +
        '.000Z'
      )
    }
    const daysFromNow = function (days) {
      const d = new Date(now.getTime())
      d.setUTCDate(d.getUTCDate() + days)
      return dateStr(d)
    }

    // 8 cobranças distribuídas entre as vendas existentes.
    const chargesPlan = [
      {
        saleIdx: 0,
        provider: 'mercadopago',
        method: 'pix',
        status: 'paid',
        discount: 0,
        expires: -5,
        paid: -3,
      },
      {
        saleIdx: 1,
        provider: 'asaas',
        method: 'boleto',
        status: 'waiting_payment',
        discount: 0,
        expires: 3,
        paid: 0,
      },
      {
        saleIdx: 2,
        provider: 'pagbank',
        method: 'credit_card',
        status: 'paid',
        discount: 50,
        expires: -2,
        paid: -2,
      },
      {
        saleIdx: 3,
        provider: 'mercadopago',
        method: 'link',
        status: 'pending',
        discount: 0,
        expires: 4,
        paid: 0,
      },
      {
        saleIdx: 4,
        provider: 'asaas',
        method: 'pix',
        status: 'expired',
        discount: 0,
        expires: -10,
        paid: 0,
      },
      {
        saleIdx: 5,
        provider: 'pagbank',
        method: 'pix',
        status: 'canceled',
        discount: 0,
        expires: 2,
        paid: 0,
      },
      {
        saleIdx: 6,
        provider: 'mercadopago',
        method: 'credit_card',
        status: 'paid',
        discount: 0,
        expires: -1,
        paid: -1,
      },
      {
        saleIdx: 7,
        provider: 'asaas',
        method: 'boleto',
        status: 'waiting_payment',
        discount: 100,
        expires: 7,
        paid: 0,
      },
    ]

    const methodLabel = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      boleto: 'Boleto',
      link: 'Link de Pagamento',
    }

    let createdCharges = 0
    for (let i = 0; i < chargesPlan.length; i++) {
      const p = chargesPlan[i]
      const sale = sales[p.saleIdx % sales.length]
      const providerId = providerIds[p.provider]
      const accountId = accountIds[p.provider]
      if (!providerId) continue

      const original = sale.get('total') || 0
      const discount = p.discount || 0
      const final = Math.round((original - discount) * 100) / 100

      const ymd = now.getUTCFullYear() + '' + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
      const suffix = $security.randomString(6).toUpperCase()
      const externalId = 'CHG-' + ymd + '-' + suffix

      const rec = new Record(chargesCol)
      rec.set('sale_id', sale.id)
      rec.set('client_id', sale.get('customer') || '')
      rec.set('seller_id', sale.get('seller') || '')
      rec.set('provider_id', providerId)
      if (accountId) rec.set('financial_account_id', accountId)
      rec.set('external_charge_id', externalId)
      rec.set('payment_method', p.method)
      rec.set('original_amount', original)
      rec.set('discount_amount', discount)
      rec.set('final_amount', final)
      rec.set('status', p.status)
      rec.set(
        'payment_url',
        'https://pay.vendaspro.demo/' + p.provider + '/' + suffix.toLowerCase(),
      )
      if (p.method === 'pix') {
        rec.set(
          'pix_code',
          '00020126360014BR.GOV.BCB.PIX0114vendaspro@demo.com5204000053039865802BR5913VENDASPRO DEMO6009SAO PAULO62070503***6304' +
            suffix,
        )
      }
      if (p.expires !== 0) rec.set('expires_at', daysFromNow(p.expires))
      if (p.paid && p.status === 'paid') rec.set('paid_at', daysFromNow(p.paid))
      if (p.status === 'canceled') rec.set('canceled_at', daysFromNow(-1))
      rec.set('created_by', sale.get('seller') || '')
      rec.set('provider_response', {
        id: externalId,
        status: p.status,
        method: p.method,
        amount: final,
      })
      app.save(rec)
      createdCharges++

      // audit log: charge_created
      const auditRec = new Record(auditCol)
      auditRec.set('charge_id', rec.id)
      auditRec.set('action', 'charge_created')
      auditRec.set('reference', externalId)
      auditRec.set('previous_data', {})
      auditRec.set('new_data', {
        status: p.status,
        final_amount: final,
        method: p.method,
        provider: p.provider,
      })
      app.save(auditRec)

      // Se paga, registra payment_confirmed
      if (p.status === 'paid') {
        const confRec = new Record(auditCol)
        confRec.set('charge_id', rec.id)
        confRec.set('action', 'payment_confirmed')
        confRec.set('reference', externalId)
        confRec.set('previous_data', { status: 'waiting_payment' })
        confRec.set('new_data', { status: 'paid', paid_at: daysFromNow(p.paid) })
        app.save(confRec)
      }
    }

    console.log('0010: seed de cobranças concluído — ' + createdCharges + ' cobranças demo.')
  },
  (app) => {
    // best-effort revert
    try {
      app.delete(app.findCollectionByNameOrId('payment_audit_log'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('payment_webhook_events'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('payment_charge_messages'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('payment_charges'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('financial_accounts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('payment_providers'))
    } catch (_) {}
  },
)
