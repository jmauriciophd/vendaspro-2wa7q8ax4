// 0011 — Webhook real do Mercado Pago + Relatório Financeiro + Parcelamento.
//
// 1. Cria a collection `payment_provider_configs` (webhook_secret, api_key,
//    environment, webhook_url, active, provider_id).
// 2. Adiciona em `payment_charges` os campos:
//      provider_fee       (number) — taxa cobrada pelo provedor
//      net_value          (number) — valor líquido repassado
//      installments       (number) — qtd de parcelas (default 1)
//      installment_value  (number) — valor de cada parcela
//      interest_rate      (number) — taxa de juros do parcelamento (0..1)
// 3. Backfill: popula provider_fee/net_value das cobranças demo existentes
//    usando a estimativa (cartão 3.99%, pix 0.99%, boleto R$ 3,49 fixo).
//    Também garante installments=1 para cobranças sem parcelamento.

migrate(
  (app) => {
    const providersCol = app.findCollectionByNameOrId('payment_providers')

    // =====================================================================
    // 1. payment_provider_configs
    // =====================================================================
    let configsCol
    try {
      configsCol = app.findCollectionByNameOrId('payment_provider_configs')
    } catch (_) {
      configsCol = new Collection({
        name: 'payment_provider_configs',
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
            required: true,
            collectionId: providersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'webhook_secret', type: 'text', max: 500 },
          { name: 'api_key', type: 'text', max: 500 },
          {
            name: 'environment',
            type: 'select',
            values: ['sandbox', 'production'],
            maxSelect: 1,
          },
          { name: 'webhook_url', type: 'text', max: 1000 },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_payment_provider_configs_provider ON payment_provider_configs (provider_id)',
        ],
      })
      app.save(configsCol)
    }

    // =====================================================================
    // 2. Novos campos em payment_charges
    // =====================================================================
    const chargesCol = app.findCollectionByNameOrId('payment_charges')

    const addField = function (name, ctor) {
      if (!chargesCol.fields.getByName(name)) {
        chargesCol.fields.add(ctor)
      }
    }

    addField('provider_fee', new NumberField({ name: 'provider_fee', min: 0 }))
    addField('net_value', new NumberField({ name: 'net_value', min: 0 }))
    addField('installments', new NumberField({ name: 'installments', min: 1, onlyInt: true }))
    addField('installment_value', new NumberField({ name: 'installment_value', min: 0 }))
    addField('interest_rate', new NumberField({ name: 'interest_rate', min: 0 }))
    app.save(chargesCol)

    // =====================================================================
    // 3. Backfill de taxas estimadas para cobranças já existentes
    // =====================================================================
    // Estimativas: cartão 3.99%, pix 0.99%, boleto R$ 3,49 fixo, link 0%.
    let charges = []
    try {
      charges = app.findRecordsByFilter('payment_charges', '1=1', 'created', 0, 0)
    } catch (_) {}

    for (let i = 0; i < charges.length; i++) {
      const c = charges[i]
      const method = c.get('payment_method') || ''
      const final = Number(c.get('final_amount') || 0)
      let fee = Number(c.get('provider_fee') || 0)
      let net = Number(c.get('net_value') || 0)

      // só recalcula se não houver taxa já definida
      if (!fee && final > 0) {
        if (method === 'credit_card' || method === 'debit_card') {
          fee = Math.round(final * 0.0399 * 100) / 100
        } else if (method === 'pix') {
          fee = Math.round(final * 0.0099 * 100) / 100
        } else if (method === 'boleto') {
          fee = 3.49
        } else {
          fee = 0
        }
        net = Math.round((final - fee) * 100) / 100
        c.set('provider_fee', fee)
        c.set('net_value', net)
      }

      // garante installments padrão
      if (!c.get('installments')) {
        c.set('installments', 1)
        c.set('installment_value', final)
        c.set('interest_rate', 0)
      }
      app.save(c)
    }

    // =====================================================================
    // 4. Seed: cria um payment_provider_configs para cada provedor existente,
    //    copiando webhook_secret/api_key do próprio provedor (compatibilidade).
    // =====================================================================
    let providers = []
    try {
      providers = app.findRecordsByFilter('payment_providers', '1=1', 'created', 0, 0)
    } catch (_) {}

    for (let i = 0; i < providers.length; i++) {
      const p = providers[i]
      const pid = p.id
      // já existe config?
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'payment_provider_configs',
          'provider_id = {:p}',
          'created',
          1,
          0,
          { p: pid },
        )
      } catch (_) {}
      if (exists && exists.length > 0) continue

      const rec = new Record(configsCol)
      rec.set('provider_id', pid)
      rec.set('webhook_secret', p.get('webhook_secret') || '')
      rec.set('api_key', p.get('api_key') || '')
      rec.set('environment', p.get('environment') || 'sandbox')
      rec.set(
        'webhook_url',
        'https://vendaspro.goskip.app/backend/v1/webhooks/payments/' + (p.get('slug') || ''),
      )
      rec.set('active', true)
      app.save(rec)
    }

    console.log('0011: payment_provider_configs criada; campos de taxa/parcelamento adicionados.')
  },
  (app) => {
    // best-effort revert
    try {
      app.delete(app.findCollectionByNameOrId('payment_provider_configs'))
    } catch (_) {}
    const chargesCol = app.findCollectionByNameOrId('payment_charges')
    const removeField = function (name) {
      try {
        const f = chargesCol.fields.getByName(name)
        if (f) chargesCol.fields.remove(f)
      } catch (_) {}
    }
    removeField('provider_fee')
    removeField('net_value')
    removeField('installments')
    removeField('installment_value')
    removeField('interest_rate')
    try {
      app.save(chargesCol)
    } catch (_) {}
  },
)
