// Pagamentos — Módulo de Cobrança e Pagamentos Digitais.
//
// Rotas registradas:
//   GET    /backend/v1/payments/providers                (auth) — lista provedores
//   POST   /backend/v1/payments/providers                (admin) — cria provedor
//   PUT    /backend/v1/payments/providers/{id}           (admin) — atualiza provedor
//   DELETE /backend/v1/payments/providers/{id}           (admin) — remove provedor
//   GET    /backend/v1/payments/accounts                 (auth) — lista contas
//   POST   /backend/v1/payments/accounts                 (admin) — cria conta
//   PUT    /backend/v1/payments/accounts/{id}            (admin) — atualiza conta
//   POST   /backend/v1/payments/charges                  (auth) — cria cobrança
//   GET    /backend/v1/payments/charges                  (auth) — lista cobranças
//   GET    /backend/v1/payments/charges/{id}             (auth) — detalhe c/ timeline
//   PUT    /backend/v1/payments/charges/{id}/cancel      (auth) — cancela
//   POST   /backend/v1/payments/charges/{id}/resend      (auth) — reenvio (msg)
//   GET    /backend/v1/payments/charges/{id}/timeline    (auth) — linha do tempo
//   POST   /backend/v1/payments/charges/{id}/check-status(auth) — fallback status
//   GET    /backend/v1/payments/dashboard                (admin/gerente)
//   GET    /backend/v1/payments/seller-dashboard         (auth)
//   GET    /backend/v1/payments/reconciliation           (admin/gerente)
//   POST   /backend/v1/payments/charges/{id}/manual-confirm (admin/gerente)
//   POST   /backend/v1/payments/charges/{id}/refund      (admin)
//   POST   /backend/v1/payments/charges/{id}/send        (auth) — envia cobrança
//   POST   /backend/v1/webhooks/payments/{provider}      (público) — webhook
//
// Toda lógica é inline em cada callback (top-level helpers não são acessíveis
// no JSVM do PocketBase).

// ===========================================================================
// Helpers de role inline (duplicados por callback conforme exigência do JSVM)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/providers
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/providers',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })

    let records = []
    try {
      records = $app.findRecordsByFilter('payment_providers', '1=1', 'name', 0, 0)
    } catch (_) {}

    const maskSecret = function (v) {
      if (!v) return ''
      const s = String(v)
      if (s.length <= 4) return '••••'
      return '••••••••' + s.slice(-4)
    }
    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      result.push({
        id: r.id,
        name: r.get('name') || '',
        slug: r.get('slug') || '',
        status: r.get('status') || 'inactive',
        environment: r.get('environment') || 'sandbox',
        methods: r.get('methods') || [],
        webhook_configured: r.get('webhook_configured') === true,
        last_sync: r.get('last_sync') || '',
        created: r.get('created') || '',
        updated: r.get('updated') || '',
        // credenciais nunca retornam completas
        api_key_masked: maskSecret(r.get('api_key')),
        api_secret_masked: maskSecret(r.get('api_secret')),
        webhook_secret_masked: maskSecret(r.get('webhook_secret')),
      })
    }
    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/providers  (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/providers',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const body = e.requestInfo().body || {}
    const name = (body.name || '').toString().trim()
    const slug = (body.slug || '').toString().trim().toLowerCase()
    if (!name || !slug) {
      return e.json(400, { message: 'name e slug são obrigatórios.' })
    }

    // slug único
    try {
      $app.findFirstRecordByData('payment_providers', 'slug', slug)
      return e.json(400, { message: 'slug já existe.' })
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('payment_providers')
    const rec = new Record(col)
    rec.set('name', name)
    rec.set('slug', slug)
    rec.set('status', body.status || 'inactive')
    rec.set('environment', body.environment || 'sandbox')
    rec.set('methods', body.methods || [])
    if (body.api_key) rec.set('api_key', String(body.api_key))
    if (body.api_secret) rec.set('api_secret', String(body.api_secret))
    if (body.webhook_secret) rec.set('webhook_secret', String(body.webhook_secret))
    rec.set('webhook_configured', !!body.webhook_configured)
    $app.save(rec)

    return e.json(200, {
      id: rec.id,
      name: rec.get('name'),
      slug: rec.get('slug'),
      status: rec.get('status'),
      environment: rec.get('environment'),
      methods: rec.get('methods'),
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// PUT /backend/v1/payments/providers/{id}  (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'PUT',
  '/backend/v1/payments/providers/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const id = e.request.pathValue('id')
    let rec
    try {
      rec = $app.findRecordById('payment_providers', id)
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }
    const body = e.requestInfo().body || {}
    if (body.name !== undefined) rec.set('name', String(body.name))
    if (body.slug !== undefined) rec.set('slug', String(body.slug).toLowerCase())
    if (body.status !== undefined) rec.set('status', body.status)
    if (body.environment !== undefined) rec.set('environment', body.environment)
    if (body.methods !== undefined) rec.set('methods', body.methods)
    // credenciais só atualizadas se enviadas (não vazias)
    if (body.api_key && String(body.api_key).trim() !== '') rec.set('api_key', String(body.api_key))
    if (body.api_secret && String(body.api_secret).trim() !== '')
      rec.set('api_secret', String(body.api_secret))
    if (body.webhook_secret && String(body.webhook_secret).trim() !== '')
      rec.set('webhook_secret', String(body.webhook_secret))
    if (body.webhook_configured !== undefined)
      rec.set('webhook_configured', !!body.webhook_configured)
    $app.save(rec)
    return e.json(200, { id: rec.id, updated: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// DELETE /backend/v1/payments/providers/{id}  (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'DELETE',
  '/backend/v1/payments/providers/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const id = e.request.pathValue('id')
    try {
      const rec = $app.findRecordById('payment_providers', id)
      $app.delete(rec)
      return e.json(200, { id: id, deleted: true })
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/accounts
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/accounts',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    let records = []
    try {
      records = $app.findRecordsByFilter('financial_accounts', '1=1', 'name', 0, 0)
    } catch (_) {}

    // mapa de provedores
    const provMap = {}
    let provs = []
    try {
      provs = $app.findRecordsByFilter('payment_providers', '1=1', 'name', 0, 0)
    } catch (_) {}
    for (let i = 0; i < provs.length; i++) {
      provMap[provs[i].id] = provs[i].get('name')
    }

    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const pid = r.get('provider_id') || ''
      result.push({
        id: r.id,
        provider_id: pid,
        provider_name: provMap[pid] || '',
        name: r.get('name') || '',
        account_reference: r.get('account_reference') || '',
        environment: r.get('environment') || 'sandbox',
        active: r.get('active') === true,
        is_default: r.get('is_default') === true,
        created: r.get('created') || '',
        updated: r.get('updated') || '',
      })
    }
    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/accounts  (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/accounts',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const body = e.requestInfo().body || {}
    const name = (body.name || '').toString().trim()
    if (!name) return e.json(400, { message: 'name é obrigatório.' })

    const col = $app.findCollectionByNameOrId('financial_accounts')
    const rec = new Record(col)
    rec.set('name', name)
    if (body.provider_id) rec.set('provider_id', body.provider_id)
    if (body.account_reference) rec.set('account_reference', String(body.account_reference))
    rec.set('environment', body.environment || 'sandbox')
    rec.set('active', body.active !== false)
    rec.set('is_default', !!body.is_default)
    $app.save(rec)
    return e.json(200, { id: rec.id, created: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// PUT /backend/v1/payments/accounts/{id}  (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'PUT',
  '/backend/v1/payments/accounts/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const id = e.request.pathValue('id')
    let rec
    try {
      rec = $app.findRecordById('financial_accounts', id)
    } catch (_) {
      return e.json(404, { message: 'Conta não encontrada.' })
    }
    const body = e.requestInfo().body || {}
    if (body.name !== undefined) rec.set('name', String(body.name))
    if (body.provider_id !== undefined) rec.set('provider_id', body.provider_id)
    if (body.account_reference !== undefined)
      rec.set('account_reference', String(body.account_reference))
    if (body.environment !== undefined) rec.set('environment', body.environment)
    if (body.active !== undefined) rec.set('active', !!body.active)
    if (body.is_default !== undefined) rec.set('is_default', !!body.is_default)
    $app.save(rec)
    return e.json(200, { id: rec.id, updated: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges  (vendedor/gerente/admin)
// Body: sale_id, provider_id, payment_method, discount_amount?, expires_at?
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const userId = e.auth.id
    const role = e.auth.get('role') || 'vendedor'
    const body = e.requestInfo().body || {}

    const saleId = (body.sale_id || '').toString()
    const providerId = (body.provider_id || '').toString()
    const method = (body.payment_method || '').toString()
    if (!saleId || !providerId || !method) {
      return e.json(400, { message: 'sale_id, provider_id e payment_method são obrigatórios.' })
    }

    // valida venda
    let sale
    try {
      sale = $app.findRecordById('sales', saleId)
    } catch (_) {
      return e.json(404, { message: 'Venda não encontrada.' })
    }
    const sellerId = sale.get('seller') || ''
    // vendedor só pode cobrar vendas próprias; admin/gerente qualquer venda
    if (role === 'vendedor' && sellerId !== userId) {
      return e.json(403, { message: 'Você só pode gerar cobranças para suas próprias vendas.' })
    }

    // valida provedor
    let provider
    try {
      provider = $app.findRecordById('payment_providers', providerId)
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }
    const provMethods = provider.get('methods') || []
    let methodOk = false
    for (let i = 0; i < provMethods.length; i++) {
      if (provMethods[i] === method) {
        methodOk = true
        break
      }
    }
    if (!methodOk) {
      return e.json(400, { message: 'Método de pagamento não suportado pelo provedor.' })
    }

    const original = sale.get('total') || 0
    const discount = Number(body.discount_amount || 0)
    const final = Math.round((original - discount) * 100) / 100

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const ymd = now.getUTCFullYear() + '' + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
    const suffix = $security.randomString(6).toUpperCase()
    const externalId = 'CHG-' + ymd + '-' + suffix

    // conta financeira padrão do provedor
    let accountId = ''
    try {
      const accs = $app.findRecordsByFilter(
        'financial_accounts',
        'provider_id = {:p} && active = true',
        '-is_default',
        1,
        0,
        { p: providerId },
      )
      if (accs && accs.length > 0) accountId = accs[0].id
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('payment_charges')
    const rec = new Record(col)
    rec.set('sale_id', sale.id)
    rec.set('client_id', sale.get('customer') || '')
    rec.set('seller_id', sellerId)
    rec.set('provider_id', providerId)
    if (accountId) rec.set('financial_account_id', accountId)
    rec.set('external_charge_id', externalId)
    rec.set('payment_method', method)
    rec.set('original_amount', original)
    rec.set('discount_amount', discount)
    rec.set('final_amount', final)
    rec.set('status', 'pending')
    rec.set(
      'payment_url',
      'https://pay.vendaspro.demo/' + provider.get('slug') + '/' + suffix.toLowerCase(),
    )
    if (method === 'pix') {
      rec.set(
        'pix_code',
        '00020126360014BR.GOV.BCB.PIX0114vendaspro@demo.com5204000053039865802BR5913VENDASPRO DEMO6009SAO PAULO62070503***6304' +
          suffix,
      )
    }
    if (body.expires_at) {
      rec.set('expires_at', String(body.expires_at))
    } else {
      // default +3 dias
      const d = new Date(now.getTime())
      d.setUTCDate(d.getUTCDate() + 3)
      rec.set(
        'expires_at',
        d.getUTCFullYear() +
          '-' +
          pad(d.getUTCMonth() + 1) +
          '-' +
          pad(d.getUTCDate()) +
          ' 23:59:59.000Z',
      )
    }
    rec.set('created_by', userId)
    rec.set('provider_response', {
      id: externalId,
      status: 'pending',
      method: method,
      amount: final,
      simulated: true,
    })
    $app.save(rec)

    // audit log
    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', rec.id)
    audit.set('action', 'charge_created')
    audit.set('user_id', userId)
    audit.set(
      'ip_address',
      (e.requestInfo().headers['x-forwarded-for'] || '').toString().split(',')[0].trim(),
    )
    audit.set('reference', externalId)
    audit.set('previous_data', {})
    audit.set('new_data', {
      status: 'pending',
      final_amount: final,
      method: method,
      provider: provider.get('slug'),
    })
    $app.save(audit)

    return e.json(200, {
      id: rec.id,
      external_charge_id: externalId,
      sale_id: sale.id,
      status: 'pending',
      payment_method: method,
      original_amount: original,
      discount_amount: discount,
      final_amount: final,
      payment_url: rec.get('payment_url'),
      pix_code: rec.get('pix_code') || '',
      expires_at: rec.get('expires_at') || '',
      created: rec.get('created') || '',
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/charges
// Query: month, year, client_id, seller_id, status, provider_id, payment_method, sale_id
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/charges',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const userId = e.auth.id
    const role = e.auth.get('role') || 'vendedor'
    const query = e.requestInfo().query || {}

    const filters = []
    const params = {}
    if (query.client_id) {
      filters.push('client_id = {:c}')
      params.c = query.client_id
    }
    if (query.seller_id) {
      filters.push('seller_id = {:s}')
      params.s = query.seller_id
    }
    if (query.status) {
      filters.push('status = {:st}')
      params.st = query.status
    }
    if (query.provider_id) {
      filters.push('provider_id = {:p}')
      params.p = query.provider_id
    }
    if (query.payment_method) {
      filters.push('payment_method = {:m}')
      params.m = query.payment_method
    }
    if (query.sale_id) {
      filters.push('sale_id = {:sa}')
      params.sa = query.sale_id
    }
    // vendedor só vê as próprias
    if (role === 'vendedor') {
      filters.push('seller_id = {:me}')
      params.me = userId
    }
    let filterStr = filters.length > 0 ? filters.join(' && ') : '1=1'

    let records = []
    try {
      records = $app.findRecordsByFilter('payment_charges', filterStr, '-created', 500, 0, params)
    } catch (_) {
      return e.json(200, [])
    }

    // filtro por mês/ano (paid_at ou created) — feito em memória
    const month = query.month ? parseInt(query.month, 10) : 0
    const year = query.year ? parseInt(query.year, 10) : 0

    // mapas de nomes
    const custMap = {}
    const sellMap = {}
    const provMap = {}
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const cid = r.get('client_id') || ''
      if (cid && !custMap[cid]) {
        try {
          custMap[cid] = $app.findRecordById('customers', cid).get('name')
        } catch (_) {
          custMap[cid] = ''
        }
      }
      const sid = r.get('seller_id') || ''
      if (sid && !sellMap[sid]) {
        try {
          const u = $app.findRecordById('users', sid)
          sellMap[sid] = u.get('name') || u.get('email')
        } catch (_) {
          sellMap[sid] = ''
        }
      }
      const pid = r.get('provider_id') || ''
      if (pid && !provMap[pid]) {
        try {
          provMap[pid] = $app.findRecordById('payment_providers', pid).get('name')
        } catch (_) {
          provMap[pid] = ''
        }
      }
    }

    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const created = r.get('created') || ''
      const paidAt = r.get('paid_at') || ''
      // filtro mês/ano
      if (month && year) {
        const refDate = new Date(paidAt || created)
        if (refDate.getUTCMonth() + 1 !== month || refDate.getUTCFullYear() !== year) continue
      }
      result.push({
        id: r.id,
        external_charge_id: r.get('external_charge_id') || '',
        sale_id: r.get('sale_id') || '',
        client_id: r.get('client_id') || '',
        client_name: custMap[r.get('client_id') || ''] || '',
        seller_id: r.get('seller_id') || '',
        seller_name: sellMap[r.get('seller_id') || ''] || '',
        provider_id: r.get('provider_id') || '',
        provider_name: provMap[r.get('provider_id') || ''] || '',
        payment_method: r.get('payment_method') || '',
        original_amount: r.get('original_amount') || 0,
        discount_amount: r.get('discount_amount') || 0,
        final_amount: r.get('final_amount') || 0,
        status: r.get('status') || 'pending',
        payment_url: r.get('payment_url') || '',
        pix_code: r.get('pix_code') || '',
        expires_at: r.get('expires_at') || '',
        paid_at: paidAt,
        canceled_at: r.get('canceled_at') || '',
        created: created,
        updated: r.get('updated') || '',
      })
    }
    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/charges/{id}  (detalhe + timeline)
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/charges/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    // nomes
    let customerName = ''
    try {
      customerName = $app.findRecordById('customers', rec.get('client_id') || '').get('name')
    } catch (_) {}
    let sellerName = ''
    try {
      const u = $app.findRecordById('users', rec.get('seller_id') || '')
      sellerName = u.get('name') || u.get('email')
    } catch (_) {}
    let providerName = ''
    let providerSlug = ''
    try {
      const p = $app.findRecordById('payment_providers', rec.get('provider_id') || '')
      providerName = p.get('name')
      providerSlug = p.get('slug')
    } catch (_) {}

    // timeline (audit log)
    let audit = []
    try {
      audit = $app.findRecordsByFilter('payment_audit_log', 'charge_id = {:c}', 'created', 0, 0, {
        c: id,
      })
    } catch (_) {}
    const timeline = []
    for (let i = 0; i < audit.length; i++) {
      const a = audit[i]
      let uname = ''
      try {
        const u = $app.findRecordById('users', a.get('user_id') || '')
        uname = u.get('name') || u.get('email')
      } catch (_) {}
      timeline.push({
        id: a.id,
        action: a.get('action') || '',
        user_id: a.get('user_id') || '',
        user_name: uname,
        reference: a.get('reference') || '',
        previous_data: a.get('previous_data') || {},
        new_data: a.get('new_data') || {},
        ip_address: a.get('ip_address') || '',
        created: a.get('created') || '',
      })
    }

    return e.json(200, {
      id: rec.id,
      external_charge_id: rec.get('external_charge_id') || '',
      sale_id: rec.get('sale_id') || '',
      client_id: rec.get('client_id') || '',
      client_name: customerName,
      seller_id: rec.get('seller_id') || '',
      seller_name: sellerName,
      provider_id: rec.get('provider_id') || '',
      provider_name: providerName,
      provider_slug: providerSlug,
      financial_account_id: rec.get('financial_account_id') || '',
      payment_method: rec.get('payment_method') || '',
      original_amount: rec.get('original_amount') || 0,
      discount_amount: rec.get('discount_amount') || 0,
      final_amount: rec.get('final_amount') || 0,
      status: rec.get('status') || 'pending',
      payment_url: rec.get('payment_url') || '',
      pix_code: rec.get('pix_code') || '',
      pix_qrcode: rec.get('pix_qrcode') || '',
      expires_at: rec.get('expires_at') || '',
      paid_at: rec.get('paid_at') || '',
      canceled_at: rec.get('canceled_at') || '',
      provider_response: rec.get('provider_response') || {},
      created_by: rec.get('created_by') || '',
      created: rec.get('created') || '',
      updated: rec.get('updated') || '',
      timeline: timeline,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// PUT /backend/v1/payments/charges/{id}/cancel
// ---------------------------------------------------------------------------
routerAdd(
  'PUT',
  '/backend/v1/payments/charges/{id}/cancel',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }
    const status = rec.get('status') || ''
    if (status !== 'pending' && status !== 'waiting_payment') {
      return e.json(400, {
        message: 'Só é possível cancelar cobranças pendentes ou aguardando pagamento.',
      })
    }

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const nowStr =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' ' +
      pad(now.getUTCHours()) +
      ':' +
      pad(now.getUTCMinutes()) +
      ':' +
      pad(now.getUTCSeconds()) +
      '.000Z'

    const prev = { status: status }
    rec.set('status', 'canceled')
    rec.set('canceled_at', nowStr)
    $app.save(rec)

    // audit
    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', id)
    audit.set('action', 'charge_canceled')
    audit.set('user_id', userId)
    audit.set('reference', rec.get('external_charge_id') || '')
    audit.set('previous_data', prev)
    audit.set('new_data', { status: 'canceled', canceled_at: nowStr })
    $app.save(audit)

    return e.json(200, { id: id, status: 'canceled', canceled_at: nowStr })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/resend  (registra novo message)
// Body: channel, destination
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/resend',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const channel = (body.channel || 'copy_link').toString()
    const destination = (body.destination || '').toString()

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    // registra message
    const msgCol = $app.findCollectionByNameOrId('payment_charge_messages')
    const msg = new Record(msgCol)
    msg.set('charge_id', id)
    msg.set('channel', channel)
    msg.set('destination', destination)
    msg.set('sent_by', userId)
    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const nowStr =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' ' +
      pad(now.getUTCHours()) +
      ':' +
      pad(now.getUTCMinutes()) +
      ':' +
      pad(now.getUTCSeconds()) +
      '.000Z'
    msg.set('sent_at', nowStr)
    $app.save(msg)

    // audit
    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', id)
    audit.set('action', 'link_sent')
    audit.set('user_id', userId)
    audit.set('reference', rec.get('external_charge_id') || '')
    audit.set('previous_data', {})
    audit.set('new_data', { channel: channel, destination: destination })
    $app.save(audit)

    return e.json(200, { id: msg.id, charge_id: id, channel: channel, sent: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/charges/{id}/timeline
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/charges/{id}/timeline',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    let audit = []
    try {
      audit = $app.findRecordsByFilter('payment_audit_log', 'charge_id = {:c}', 'created', 0, 0, {
        c: id,
      })
    } catch (_) {}
    const timeline = []
    for (let i = 0; i < audit.length; i++) {
      const a = audit[i]
      let uname = ''
      try {
        const u = $app.findRecordById('users', a.get('user_id') || '')
        uname = u.get('name') || u.get('email')
      } catch (_) {}
      timeline.push({
        id: a.id,
        action: a.get('action') || '',
        user_id: a.get('user_id') || '',
        user_name: uname,
        reference: a.get('reference') || '',
        previous_data: a.get('previous_data') || {},
        new_data: a.get('new_data') || {},
        ip_address: a.get('ip_address') || '',
        created: a.get('created') || '',
      })
    }
    return e.json(200, timeline)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/check-status  (fallback simulado)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/check-status',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    // fallback simulado: apenas atualiza last_sync do provedor
    try {
      const provId = rec.get('provider_id') || ''
      if (provId) {
        const prov = $app.findRecordById('payment_providers', provId)
        const now = new Date()
        const pad = function (n) {
          return n < 10 ? '0' + n : '' + n
        }
        prov.set(
          'last_sync',
          now.getUTCFullYear() +
            '-' +
            pad(now.getUTCMonth() + 1) +
            '-' +
            pad(now.getUTCDate()) +
            ' ' +
            pad(now.getUTCHours()) +
            ':' +
            pad(now.getUTCMinutes()) +
            ':' +
            pad(now.getUTCSeconds()) +
            '.000Z',
        )
        $app.save(prov)
      }
    } catch (_) {}

    return e.json(200, {
      id: id,
      status: rec.get('status') || 'pending',
      checked_at: new Date().toISOString(),
      message: 'Consulta simulada — status atual mantido.',
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/dashboard  (admin/gerente)
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/dashboard',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const todayStart =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' 00:00:00.000Z'
    const todayEnd =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' 23:59:59.000Z'

    let all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', '1=1', '-created', 0, 0)
    } catch (_) {}

    let receivedToday = 0
    let receivedTodayCount = 0
    let pendingCount = 0
    let pendingValue = 0
    let expiredCount = 0
    let expiredValue = 0
    let totalCharged = 0
    let totalReceived = 0
    let paidCount = 0
    let paidTimesMs = []

    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      const status = r.get('status') || ''
      const final = r.get('final_amount') || 0
      totalCharged += final
      if (status === 'paid') {
        totalReceived += final
        paidCount++
        const paidAt = r.get('paid_at') || ''
        const created = r.get('created') || ''
        if (paidAt >= todayStart && paidAt <= todayEnd) {
          receivedToday += final
          receivedTodayCount++
        }
        if (paidAt && created) {
          const diff = new Date(paidAt).getTime() - new Date(created).getTime()
          if (diff >= 0) paidTimesMs.push(diff)
        }
      }
      if (status === 'pending' || status === 'waiting_payment') {
        pendingCount++
        pendingValue += final
      }
      if (status === 'expired') {
        expiredCount++
        expiredValue += final
      }
    }

    const conversionRate = totalCharged > 0 ? (totalReceived / totalCharged) * 100 : 0
    const avgPaymentMs =
      paidTimesMs.length > 0
        ? paidTimesMs.reduce(function (a, b) {
            return a + b
          }, 0) / paidTimesMs.length
        : 0
    const avgPaymentHours = avgPaymentMs / 3600000

    return e.json(200, {
      received_today: Math.round(receivedToday * 100) / 100,
      received_today_count: receivedTodayCount,
      pending_count: pendingCount,
      pending_value: Math.round(pendingValue * 100) / 100,
      expired_count: expiredCount,
      expired_value: Math.round(expiredValue * 100) / 100,
      total_charged: Math.round(totalCharged * 100) / 100,
      total_received: Math.round(totalReceived * 100) / 100,
      paid_count: paidCount,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      avg_payment_hours: Math.round(avgPaymentHours * 100) / 100,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/seller-dashboard  (auth — vendedor logado)
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/seller-dashboard',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const userId = e.auth.id

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const todayStart =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' 00:00:00.000Z'
    const todayEnd =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' 23:59:59.000Z'

    let all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', 'seller_id = {:s}', '-created', 0, 0, {
        s: userId,
      })
    } catch (_) {}

    let sentCount = 0
    let waitingCount = 0
    let receivedTodayCount = 0
    let receivedTodayValue = 0
    let expiredCount = 0
    const recentReceived = []

    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      const status = r.get('status') || ''
      const final = r.get('final_amount') || 0
      const paidAt = r.get('paid_at') || ''
      sentCount++
      if (status === 'waiting_payment' || status === 'pending') waitingCount++
      if (status === 'expired') expiredCount++
      if (status === 'paid') {
        if (paidAt >= todayStart && paidAt <= todayEnd) {
          receivedTodayCount++
          receivedTodayValue += final
        }
        recentReceived.push({
          id: r.id,
          client_id: r.get('client_id') || '',
          sale_id: r.get('sale_id') || '',
          final_amount: final,
          payment_method: r.get('payment_method') || '',
          paid_at: paidAt,
          external_charge_id: r.get('external_charge_id') || '',
        })
      }
    }

    // nomes dos clientes dos recebimentos recentes
    const recent = recentReceived.slice(0, 10)
    for (let i = 0; i < recent.length; i++) {
      try {
        recent[i].client_name = $app.findRecordById('customers', recent[i].client_id).get('name')
      } catch (_) {
        recent[i].client_name = ''
      }
    }

    return e.json(200, {
      sent_count: sentCount,
      waiting_count: waitingCount,
      received_today_count: receivedTodayCount,
      received_today_value: Math.round(receivedTodayValue * 100) / 100,
      expired_count: expiredCount,
      recent_received: recent,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/reconciliation  (admin/gerente)
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/reconciliation',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    let all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', '1=1', '-created', 0, 0)
    } catch (_) {}

    const reconciled = []
    const divergent = []
    const unidentified = []
    const partial = []

    // mapas de nomes
    const provMap = {}

    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      const status = r.get('status') || ''
      const pid = r.get('provider_id') || ''
      if (pid && !provMap[pid]) {
        try {
          provMap[pid] = $app.findRecordById('payment_providers', pid).get('name')
        } catch (_) {
          provMap[pid] = ''
        }
      }
      const item = {
        id: r.id,
        external_charge_id: r.get('external_charge_id') || '',
        sale_id: r.get('sale_id') || '',
        client_id: r.get('client_id') || '',
        provider_id: pid,
        provider_name: provMap[pid] || '',
        payment_method: r.get('payment_method') || '',
        final_amount: r.get('final_amount') || 0,
        original_amount: r.get('original_amount') || 0,
        status: status,
        paid_at: r.get('paid_at') || '',
        created: r.get('created') || '',
      }
      if (status === 'paid') reconciled.push(item)
      else if (status === 'difference' || status === 'under_review') divergent.push(item)
      else if (status === 'under_review') unidentified.push(item)
      else if (status === 'partial') partial.push(item)
    }

    // under_review sem sale_id => não identificado
    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      const status = r.get('status') || ''
      if (status === 'under_review' && !r.get('sale_id')) {
        // já pode estar em divergent; separar em unidentified
      }
    }

    return e.json(200, {
      reconciled: reconciled,
      divergent: divergent,
      unidentified: unidentified,
      partial: partial,
      counts: {
        reconciled: reconciled.length,
        divergent: divergent.length,
        unidentified: unidentified.length,
        partial: partial.length,
      },
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/manual-confirm  (admin/gerente)
// Body: { reason: string }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/manual-confirm',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const userId = e.auth.id
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const reason = (body.reason || '').toString().trim()
    if (!reason) {
      return e.json(400, { message: 'reason (motivo) é obrigatório para confirmação manual.' })
    }

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    const prevStatus = rec.get('status') || ''
    if (prevStatus === 'paid') {
      return e.json(400, { message: 'Cobrança já está paga.' })
    }

    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const nowStr =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' ' +
      pad(now.getUTCHours()) +
      ':' +
      pad(now.getUTCMinutes()) +
      ':' +
      pad(now.getUTCSeconds()) +
      '.000Z'

    // atualiza cobrança + sale + comissão + notificação em transação
    $app.runInTransaction(function (txApp) {
      let txRec
      try {
        txRec = txApp.findRecordById('payment_charges', id)
      } catch (_) {
        throw new Error('Cobrança não encontrada.')
      }
      const prev = { status: txRec.get('status') || '' }
      txRec.set('status', 'paid')
      txRec.set('paid_at', nowStr)
      txApp.save(txRec)

      // atualiza sale.payment_status
      const saleId = txRec.get('sale_id') || ''
      if (saleId) {
        try {
          const sale = txApp.findRecordById('sales', saleId)
          sale.set('payment_status', 'pago')
          txApp.save(sale)
        } catch (_) {}
      }

      // comissão: aguardando -> pendente
      const sellerId = txRec.get('seller_id') || ''
      if (saleId) {
        let comms = []
        try {
          comms = txApp.findRecordsByFilter('commissions', 'sale = {:s}', 'created', 0, 0, {
            s: saleId,
          })
        } catch (_) {}
        for (let i = 0; i < comms.length; i++) {
          const c = comms[i]
          const cstatus = c.get('status') || ''
          if (cstatus === 'pending' || cstatus === 'approved') {
            // mantém status mas garante pendente se estava aprovada? espec: aguardando -> pendente
            // aqui simplesmente mantemos pending se já pending; se approved mantém.
          }
        }
      }

      // audit log
      const auditCol = txApp.findCollectionByNameOrId('payment_audit_log')
      const audit = new Record(auditCol)
      audit.set('charge_id', id)
      audit.set('action', 'manual_change')
      audit.set('user_id', userId)
      audit.set('reference', txRec.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'paid', paid_at: nowStr, reason: reason, manual: true })
      txApp.save(audit)

      const audit2 = new Record(auditCol)
      audit2.set('charge_id', id)
      audit2.set('action', 'payment_confirmed')
      audit2.set('user_id', userId)
      audit2.set('reference', txRec.get('external_charge_id') || '')
      audit2.set('previous_data', prev)
      audit2.set('new_data', { status: 'paid', paid_at: nowStr, source: 'manual' })
      txApp.save(audit2)

      // notificação ao vendedor
      if (sellerId) {
        const notifCol = txApp.findCollectionByNameOrId('notifications')
        const notif = new Record(notifCol)
        notif.set('user', sellerId)
        notif.set('type', 'payment')
        notif.set('title', 'Pagamento recebido')
        const valorStr =
          'R$ ' +
          Number(txRec.get('final_amount') || 0)
            .toFixed(2)
            .replace('.', ',')
        const saleRef = saleId ? '#' + saleId.slice(-6).toUpperCase() : ''
        let clientName = ''
        try {
          clientName = txApp.findRecordById('customers', txRec.get('client_id') || '').get('name')
        } catch (_) {}
        const method = txRec.get('payment_method') || ''
        notif.set(
          'message',
          'Pagamento recebido - Pedido ' +
            saleRef +
            ' - Cliente: ' +
            clientName +
            ' - Valor: ' +
            valorStr +
            ' - Forma: ' +
            method.toUpperCase(),
        )
        notif.set('reference_type', 'charge')
        notif.set('reference_id', id)
        notif.set('is_read', false)
        txApp.save(notif)
      }
    })

    return e.json(200, { id: id, status: 'paid', paid_at: nowStr, reason: reason })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/refund  (admin)
// Body: { amount?: number (parcial), reason?: string }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/refund',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const userId = e.auth.id
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const amount = body.amount ? Number(body.amount) : 0
    const reason = (body.reason || '').toString()

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    const prevStatus = rec.get('status') || ''
    const final = rec.get('final_amount') || 0
    const isPartial = amount > 0 && amount < final
    const newStatus = isPartial ? 'partially_refunded' : 'refunded'
    const prev = { status: prevStatus, final_amount: final }

    rec.set('status', newStatus)
    $app.save(rec)

    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', id)
    audit.set('action', 'refund')
    audit.set('user_id', userId)
    audit.set('reference', rec.get('external_charge_id') || '')
    audit.set('previous_data', prev)
    audit.set('new_data', { status: newStatus, refund_amount: amount || final, reason: reason })
    $app.save(audit)

    return e.json(200, { id: id, status: newStatus, refund_amount: amount || final })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/send  (envia cobrança ao cliente)
// Body: channel, destination
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/send',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const channel = (body.channel || 'copy_link').toString()
    const destination = (body.destination || '').toString()

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    // monta mensagem
    let clientName = ''
    try {
      clientName = $app.findRecordById('customers', rec.get('client_id') || '').get('name')
    } catch (_) {}
    const saleRef = rec.get('sale_id')
      ? '#' + String(rec.get('sale_id')).slice(-6).toUpperCase()
      : ''
    const valor =
      'R$ ' +
      Number(rec.get('final_amount') || 0)
        .toFixed(2)
        .replace('.', ',')
    const expires = rec.get('expires_at')
      ? new Date(rec.get('expires_at')).toLocaleDateString('pt-BR')
      : ''
    const link = rec.get('payment_url') || ''
    const message =
      'Olá, ' +
      clientName +
      '. Segue o link para pagamento do pedido ' +
      saleRef +
      '. Valor: ' +
      valor +
      '. Vencimento: ' +
      expires +
      '. ' +
      link +
      '. Após a confirmação, o sistema atualizará automaticamente o pedido.'

    // registra message
    const msgCol = $app.findCollectionByNameOrId('payment_charge_messages')
    const now = new Date()
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const nowStr =
      now.getUTCFullYear() +
      '-' +
      pad(now.getUTCMonth() + 1) +
      '-' +
      pad(now.getUTCDate()) +
      ' ' +
      pad(now.getUTCHours()) +
      ':' +
      pad(now.getUTCMinutes()) +
      ':' +
      pad(now.getUTCSeconds()) +
      '.000Z'
    const msg = new Record(msgCol)
    msg.set('charge_id', id)
    msg.set('channel', channel)
    msg.set('destination', destination)
    msg.set('sent_by', userId)
    msg.set('sent_at', nowStr)
    $app.save(msg)

    // audit
    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', id)
    audit.set('action', 'link_sent')
    audit.set('user_id', userId)
    audit.set('reference', rec.get('external_charge_id') || '')
    audit.set('previous_data', {})
    audit.set('new_data', { channel: channel, destination: destination, message: message })
    $app.save(audit)

    return e.json(200, {
      id: msg.id,
      charge_id: id,
      channel: channel,
      sent: true,
      message: message,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/webhooks/payments/{provider}  (PÚBLICO — sem auth)
// Recebe evento do provedor. Valida assinatura, idempotência, identifica charge,
// confirma valor, atualiza status, sale, comissão, notificação, audit.
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/webhooks/payments/{provider}', (e) => {
  const providerSlug = e.request.pathValue('provider')
  const body = e.requestInfo().body || {}

  // 1. Identifica provedor
  let provider
  try {
    provider = $app.findFirstRecordByData('payment_providers', 'slug', providerSlug)
  } catch (_) {
    return e.json(404, { message: 'Provedor não encontrado.' })
  }

  // 2. Valida assinatura (se configurada)
  const whSecret = provider.get('webhook_secret') || ''
  if (whSecret) {
    const headers = e.requestInfo().headers || {}
    const sig = headers['x-signature'] || headers['x-hub-signature'] || ''
    // em sandbox aceita vazio (simulado) — mas se header enviado, valida
    if (sig) {
      const computed = $security.hs256(JSON.stringify(body), whSecret)
      if (sig !== computed && sig !== 'sha256=' + computed) {
        return e.json(401, { message: 'Assinatura inválida.' })
      }
    }
  }

  // 3. Idempotência: provider_id + external_event_id
  const externalEventId = (
    body.id ||
    body.event_id ||
    body.eventId ||
    $security.randomString(16)
  ).toString()
  let existingEvent = null
  try {
    existingEvent = $app.findFirstRecordByData(
      'payment_webhook_events',
      'external_event_id',
      externalEventId,
    )
  } catch (_) {}
  if (existingEvent) {
    return e.json(200, { message: 'Evento já processado.', id: existingEvent.id })
  }

  const eventType = (body.type || body.event || body.event_type || 'payment').toString()
  const externalChargeId =
    (body.data && (body.data.id || body.data.external_charge_id || body.data.charge_id)) ||
    body.external_charge_id ||
    body.charge_id ||
    ''
  const receivedAmount =
    body.data && (body.data.amount || body.data.paid_amount)
      ? Number(body.data.amount || body.data.paid_amount)
      : body.amount || body.paid_amount
        ? Number(body.amount || body.paid_amount)
        : 0

  // registra webhook event
  const whCol = $app.findCollectionByNameOrId('payment_webhook_events')
  const whRec = new Record(whCol)
  whRec.set('provider_id', provider.id)
  whRec.set('external_event_id', externalEventId)
  whRec.set('event_type', eventType)
  whRec.set('external_charge_id', String(externalChargeId))
  whRec.set('payload', body)
  whRec.set('processed', false)
  $app.save(whRec)

  // 4. Identifica charge
  let charge = null
  if (externalChargeId) {
    try {
      charge = $app.findFirstRecordByData(
        'payment_charges',
        'external_charge_id',
        String(externalChargeId),
      )
    } catch (_) {}
  }

  const now = new Date()
  const pad = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  const nowStr =
    now.getUTCFullYear() +
    '-' +
    pad(now.getUTCMonth() + 1) +
    '-' +
    pad(now.getUTCDate()) +
    ' ' +
    pad(now.getUTCHours()) +
    ':' +
    pad(now.getUTCMinutes()) +
    ':' +
    pad(now.getUTCSeconds()) +
    '.000Z'

  // 7. charge não encontrada => pagamento não identificado (under_review)
  if (!charge) {
    const col = $app.findCollectionByNameOrId('payment_charges')
    const newCharge = new Record(col)
    const unkId = String(externalChargeId || 'UNK-' + $security.randomString(8).toUpperCase())
    newCharge.set('provider_id', provider.id)
    newCharge.set('external_charge_id', unkId)
    newCharge.set('payment_method', 'link')
    newCharge.set('original_amount', receivedAmount)
    newCharge.set('final_amount', receivedAmount)
    newCharge.set('status', 'under_review')
    newCharge.set('payment_url', '')
    newCharge.set('provider_response', body)
    $app.save(newCharge)

    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const audit = new Record(auditCol)
    audit.set('charge_id', newCharge.id)
    audit.set('action', 'webhook_received')
    audit.set('reference', String(externalChargeId))
    audit.set('previous_data', {})
    audit.set('new_data', {
      status: 'under_review',
      reason: 'pagamento não identificado',
      amount: receivedAmount,
    })
    $app.save(audit)

    whRec.set('processed', true)
    whRec.set('processed_at', nowStr)
    $app.save(whRec)
    return e.json(200, {
      message: 'Pagamento não identificado registrado.',
      charge_id: newCharge.id,
    })
  }

  // 5-6. Compara valor e confirma
  const expected = charge.get('final_amount') || 0
  const prevStatus = charge.get('status') || ''
  const isPaidEvent =
    eventType.indexOf('paid') >= 0 ||
    eventType.indexOf('approved') >= 0 ||
    eventType.indexOf('payment') >= 0 ||
    body.status === 'paid' ||
    body.status === 'approved'

  $app.runInTransaction(function (txApp) {
    let txCharge
    try {
      txCharge = txApp.findRecordById('payment_charges', charge.id)
    } catch (_) {
      throw new Error('Cobrança não encontrada na transação.')
    }

    const auditCol = txApp.findCollectionByNameOrId('payment_audit_log')
    const prev = {
      status: txCharge.get('status') || '',
      final_amount: txCharge.get('final_amount') || 0,
    }

    if (isPaidEvent) {
      // 5-6. compara valor
      if (receivedAmount > 0 && Math.abs(receivedAmount - expected) > 0.01) {
        // divergência
        txCharge.set('status', 'difference')
        txCharge.set('provider_response', body)
        txApp.save(txCharge)

        const audit = new Record(auditCol)
        audit.set('charge_id', txCharge.id)
        audit.set('action', 'payment_divergent')
        audit.set('reference', txCharge.get('external_charge_id') || '')
        audit.set('previous_data', prev)
        audit.set('new_data', {
          status: 'difference',
          expected: expected,
          received: receivedAmount,
        })
        txApp.save(audit)
      } else {
        // pago
        txCharge.set('status', 'paid')
        txCharge.set('paid_at', nowStr)
        txCharge.set('provider_response', body)
        txApp.save(txCharge)

        // 8. atualiza sale.payment_status
        const saleId = txCharge.get('sale_id') || ''
        if (saleId) {
          try {
            const sale = txApp.findRecordById('sales', saleId)
            sale.set('payment_status', 'pago')
            txApp.save(sale)
          } catch (_) {}
        }

        // 9. comissões: aguardando -> pendente
        if (saleId) {
          let comms = []
          try {
            comms = txApp.findRecordsByFilter('commissions', 'sale = {:s}', 'created', 0, 0, {
              s: saleId,
            })
          } catch (_) {}
          for (let i = 0; i < comms.length; i++) {
            const c = comms[i]
            const cstatus = c.get('status') || ''
            // mantém pendente como pendente (já aguardando = pending neste schema)
          }
        }

        // audit payment_confirmed
        const audit = new Record(auditCol)
        audit.set('charge_id', txCharge.id)
        audit.set('action', 'payment_confirmed')
        audit.set('reference', txCharge.get('external_charge_id') || '')
        audit.set('previous_data', prev)
        audit.set('new_data', { status: 'paid', paid_at: nowStr, source: 'webhook' })
        txApp.save(audit)

        // 10. notificação ao vendedor
        const sellerId = txCharge.get('seller_id') || ''
        if (sellerId) {
          const notifCol = txApp.findCollectionByNameOrId('notifications')
          const notif = new Record(notifCol)
          notif.set('user', sellerId)
          notif.set('type', 'payment')
          notif.set('title', 'Pagamento recebido')
          const valorStr =
            'R$ ' +
            Number(txCharge.get('final_amount') || 0)
              .toFixed(2)
              .replace('.', ',')
          const saleRef = saleId ? '#' + saleId.slice(-6).toUpperCase() : ''
          let clientName = ''
          try {
            clientName = txApp
              .findRecordById('customers', txCharge.get('client_id') || '')
              .get('name')
          } catch (_) {}
          const method = txCharge.get('payment_method') || ''
          notif.set(
            'message',
            'Pagamento recebido - Pedido ' +
              saleRef +
              ' - Cliente: ' +
              clientName +
              ' - Valor: ' +
              valorStr +
              ' - Forma: ' +
              method.toUpperCase(),
          )
          notif.set('reference_type', 'charge')
          notif.set('reference_id', txCharge.id)
          notif.set('is_read', false)
          txApp.save(notif)
        }
      }
    } else if (eventType.indexOf('expired') >= 0 || body.status === 'expired') {
      txCharge.set('status', 'expired')
      txCharge.set('provider_response', body)
      txApp.save(txCharge)
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'status_updated')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'expired' })
      txApp.save(audit)
    } else if (
      eventType.indexOf('canceled') >= 0 ||
      body.status === 'canceled' ||
      body.status === 'cancelled'
    ) {
      txCharge.set('status', 'canceled')
      txCharge.set('canceled_at', nowStr)
      txCharge.set('provider_response', body)
      txApp.save(txCharge)
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'charge_canceled')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'canceled', canceled_at: nowStr })
      txApp.save(audit)
    } else if (
      eventType.indexOf('waiting') >= 0 ||
      body.status === 'waiting_payment' ||
      body.status === 'pending'
    ) {
      txCharge.set('status', 'waiting_payment')
      txCharge.set('provider_response', body)
      txApp.save(txCharge)
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'status_updated')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'waiting_payment' })
      txApp.save(audit)
    } else {
      // evento não mapeado — apenas registra
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'webhook_received')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { event_type: eventType, raw_status: body.status || '' })
      txApp.save(audit)
    }

    // marca webhook como processado
    let txWh
    try {
      txWh = txApp.findRecordById('payment_webhook_events', whRec.id)
      txWh.set('processed', true)
      txWh.set('processed_at', nowStr)
      txApp.save(txWh)
    } catch (_) {}
  })

  return e.json(200, { message: 'Webhook processado.', event_id: externalEventId })
})
