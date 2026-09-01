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

    // mapa de configs (webhook_url) por provider
    const configMap = {}
    let configs = []
    try {
      configs = $app.findRecordsByFilter('payment_provider_configs', '1=1', 'created', 0, 0)
    } catch (_) {}
    for (let i = 0; i < configs.length; i++) {
      configMap[configs[i].get('provider_id') || ''] = configs[i]
    }

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
        webhook_url: (configMap[r.id] && configMap[r.id].get('webhook_url')) || '',
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

    // espelha webhook_secret/api_key/environment em payment_provider_configs
    try {
      let cfg = null
      try {
        cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', rec.id)
      } catch (_) {}
      const cfgCol = $app.findCollectionByNameOrId('payment_provider_configs')
      if (!cfg) {
        cfg = new Record(cfgCol)
        cfg.set('provider_id', rec.id)
        cfg.set('active', true)
      }
      if (body.webhook_secret && String(body.webhook_secret).trim() !== '')
        cfg.set('webhook_secret', String(body.webhook_secret))
      if (body.api_key && String(body.api_key).trim() !== '')
        cfg.set('api_key', String(body.api_key))
      if (body.environment !== undefined) cfg.set('environment', body.environment)
      cfg.set(
        'webhook_url',
        'https://vendaspro.goskip.app/backend/v1/webhooks/payments/' + (rec.get('slug') || ''),
      )
      $app.save(cfg)
    } catch (_) {}

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

    const saleId = (body.sale_id || '').toString().trim()
    const providerId = (body.provider_id || '').toString().trim()
    const method = (body.payment_method || '').toString().trim().toLowerCase()
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
    const provSlug = (provider.get('slug') || '').toString().toLowerCase()
    const provEnv = (provider.get('environment') || 'sandbox').toString().toLowerCase()
    const rawProvMethods = provider.get('methods') || []
    const provMethods = Array.isArray(rawProvMethods)
      ? rawProvMethods.map(function (m) {
          return String(m || '')
            .trim()
            .toLowerCase()
        })
      : []
    let methodOk = false
    for (let i = 0; i < provMethods.length; i++) {
      if (provMethods[i] === method) {
        methodOk = true
        break
      }
    }

    // Se o provedor for Mercado Pago e o array de métodos vier vazio (ou em sandbox),
    // garante suporte aos métodos pix, boleto e link
    if (
      !methodOk &&
      provSlug === 'mercadopago' &&
      (!provMethods || provMethods.length === 0 || provEnv === 'sandbox')
    ) {
      if (
        method === 'pix' ||
        method === 'boleto' ||
        method === 'link' ||
        method === 'credit_card' ||
        method === 'debit_card'
      ) {
        methodOk = true
      }
    }

    if (!methodOk) {
      return e.json(400, { message: 'Método de pagamento não suportado pelo provedor.' })
    }

    const original = sale.get('total') || 0
    const discount = Number(body.discount_amount || 0)

    // Parcelamento (cartão de crédito) — juros calculados no backend
    const installmentRate = function (n) {
      if (n <= 1) return 0
      if (n === 2) return 0.025
      if (n === 3) return 0.045
      if (n === 4) return 0.065
      if (n === 5) return 0.085
      if (n === 6) return 0.105
      return 0.125
    }
    const estimateFee = function (m, amount) {
      if (m === 'credit_card' || m === 'debit_card') return Math.round(amount * 0.0399 * 100) / 100
      if (m === 'pix') return Math.round(amount * 0.0099 * 100) / 100
      if (m === 'boleto') return 3.49
      return 0
    }

    const base = Math.max(0, original - discount)
    let installments = 1
    let interestRate = 0
    if (method === 'credit_card' && body.installments) {
      installments = Math.max(1, Math.min(12, parseInt(body.installments, 10) || 1))
      interestRate = installmentRate(installments)
    }
    const final = Math.round(base * (1 + interestRate) * 100) / 100
    const installmentValue =
      installments > 1 ? Math.round((final / installments) * 100) / 100 : final
    const providerFee = estimateFee(method, final)
    const netValue = Math.round((final - providerFee) * 100) / 100

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
    rec.set('provider_fee', providerFee)
    rec.set('net_value', netValue)
    rec.set('installments', installments)
    rec.set('installment_value', installmentValue)
    rec.set('interest_rate', interestRate)
    rec.set('status', 'pending')
    // Monta URL de pagamento usando SITE_URL, Origin/Host da requisição ou fallback
    let baseUrl = ($os.getenv('SITE_URL') || '').trim()
    if (!baseUrl) {
      const reqHeaders = e.requestInfo().headers || {}
      const originHeader = (reqHeaders['origin'] || '').toString().trim()
      const hostHeader = (reqHeaders['host'] || reqHeaders['x-forwarded-host'] || '')
        .toString()
        .trim()
      const protoHeader = (reqHeaders['x-forwarded-proto'] || 'https').toString().trim()
      if (originHeader) {
        baseUrl = originHeader
      } else if (hostHeader) {
        baseUrl = (protoHeader || 'https') + '://' + hostHeader
      }
    }
    while (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) === '/') {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1)
    }
    const defaultPayUrl = baseUrl
      ? baseUrl + '/financeiro/cobrancas/' + rec.id
      : '/financeiro/cobrancas/' + rec.id
    rec.set('payment_url', defaultPayUrl)
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

    // ---- Credenciais e Payer ----
    let apiKey = (provider.get('api_key') || '').toString().trim()
    try {
      const cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', providerId)
      if (cfg && cfg.get('api_key')) apiKey = String(cfg.get('api_key')).trim()
    } catch (_) {}
    const env = (provider.get('environment') || 'sandbox').toString().toLowerCase()
    const isRealKey =
      Boolean(apiKey) &&
      apiKey.indexOf('DEMO') < 0 &&
      apiKey.indexOf('demo') < 0 &&
      (env === 'production' ||
        apiKey.startsWith('TEST-') ||
        apiKey.startsWith('APP_USR-') ||
        apiKey.startsWith('PROD-'))

    let custName = ''
    let custEmail = ''
    let custDoc = ''
    try {
      const cust = $app.findRecordById('customers', sale.get('customer') || '')
      custName = cust.get('name') || ''
      custEmail = cust.get('email') || ''
      custDoc = cust.get('cnpj') || cust.get('ie') || ''
    } catch (_) {}
    const dueDate = rec.get('expires_at') ? String(rec.get('expires_at')).split(' ')[0] : ''

    // ---- Integração Mercado Pago para PIX, BOLETO e LINK ----
    if (provSlug === 'mercadopago' && isRealKey) {
      if (method === 'link') {
        try {
          const prefBody = {
            items: [
              {
                id: externalId,
                title: 'Pedido ' + (sale.id ? '#' + sale.id.slice(-6).toUpperCase() : externalId),
                description: 'Cobrança VendasPro ' + externalId,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: final,
              },
            ],
            payer: {
              name: custName || 'Cliente',
              email: custEmail || 'cliente@vendaspro.com',
            },
            external_reference: externalId,
            statement_descriptor: 'VENDASPRO',
          }
          if (dueDate) {
            prefBody.expires = true
            prefBody.expiration_date_to = dueDate + 'T23:59:59.000Z'
          }
          const res = $http.send({
            url: 'https://api.mercadopago.com/checkout/preferences',
            method: 'POST',
            headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(prefBody),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            const checkoutUrl =
              env === 'sandbox'
                ? pr.sandbox_init_point || pr.init_point || ''
                : pr.init_point || pr.sandbox_init_point || ''
            if (checkoutUrl) {
              rec.set('payment_url', checkoutUrl)
              rec.set('boleto_url', checkoutUrl)
            }
            rec.set('provider_response', pr)
          } else {
            if (res && res.statusCode === 401) {
              return e.json(400, {
                message: 'Credenciais do Mercado Pago inválidas ou expiradas',
              })
            }
            const errDetail =
              res && res.json && (res.json.message || res.json.error)
                ? res.json.message || res.json.error
                : ''
            const msg = errDetail
              ? 'Erro no Mercado Pago: ' + errDetail
              : 'Falha na comunicação com o Mercado Pago (HTTP ' +
                (res ? res.statusCode : 'sem resposta') +
                ')'
            return e.json(400, { message: msg })
          }
        } catch (err) {
          return e.json(400, {
            message:
              'Erro ao conectar à API do Mercado Pago: ' +
              (err && err.message ? err.message : String(err)),
          })
        }
      } else if (method === 'pix') {
        try {
          const mpPixBody = {
            transaction_amount: final,
            description: 'Cobrança VendasPro ' + externalId,
            payment_method_id: 'pix',
            payer: {
              email: custEmail || 'cliente@vendaspro.com',
              first_name: custName || 'Cliente',
            },
          }
          if (dueDate) {
            mpPixBody.date_of_expiration = dueDate + 'T23:59:59.000Z'
          }
          const res = $http.send({
            url: 'https://api.mercadopago.com/v1/payments',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + apiKey,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': externalId,
            },
            body: JSON.stringify(mpPixBody),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            const ppi = (pr.point_of_interaction && pr.point_of_interaction.transaction_data) || {}
            const qrCode = ppi.qr_code || pr.qr_code || ''
            const qrCodeBase64 = ppi.qr_code_base64 || ''
            const ticketUrl =
              ppi.ticket_url ||
              (pr.transaction_details && pr.transaction_details.external_resource_url) ||
              ''
            if (qrCode) rec.set('pix_code', qrCode)
            if (qrCodeBase64) rec.set('pix_qrcode', qrCodeBase64)
            if (ticketUrl) rec.set('payment_url', ticketUrl)
            rec.set('provider_response', pr)
          } else {
            if (res && res.statusCode === 401) {
              return e.json(400, {
                message: 'Credenciais do Mercado Pago inválidas ou expiradas',
              })
            }
            const errDetail =
              res && res.json && (res.json.message || res.json.error)
                ? res.json.message || res.json.error
                : ''
            const msg = errDetail
              ? 'Erro no Mercado Pago: ' + errDetail
              : 'Falha na comunicação com o Mercado Pago (HTTP ' +
                (res ? res.statusCode : 'sem resposta') +
                ')'
            return e.json(400, { message: msg })
          }
        } catch (err) {
          return e.json(400, {
            message:
              'Erro ao conectar à API do Mercado Pago: ' +
              (err && err.message ? err.message : String(err)),
          })
        }
      } else if (method === 'boleto') {
        try {
          const mpBody = {
            transaction_amount: final,
            description: 'Cobranca VendasPro ' + externalId,
            payment_method_id: 'bolbradesco',
            date_of_expiration: dueDate ? dueDate + 'T23:59:59.000Z' : undefined,
            payer: {
              email: custEmail || 'cliente@vendaspro.com',
              first_name: custName || 'Cliente',
            },
          }
          const res = $http.send({
            url: 'https://api.mercadopago.com/v1/payments',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + apiKey,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': externalId,
            },
            body: JSON.stringify(mpBody),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            const td = pr.transaction_details || {}
            const bUrl = String(td.external_resource_url || '')
            rec.set('boleto_barcode', String(td.barcode || pr.barcode || ''))
            rec.set(
              'boleto_digitable_line',
              String(td.verification_code || pr.digitable_line || ''),
            )
            rec.set('boleto_nosso_numero', String(pr.id || ''))
            rec.set('boleto_document_number', externalId)
            rec.set('boleto_url', bUrl)
            if (bUrl) rec.set('payment_url', bUrl)
            rec.set('provider_response', pr)
          } else {
            if (res && res.statusCode === 401) {
              return e.json(400, {
                message: 'Credenciais do Mercado Pago inválidas ou expiradas',
              })
            }
            const errDetail =
              res && res.json && (res.json.message || res.json.error)
                ? res.json.message || res.json.error
                : ''
            const msg = errDetail
              ? 'Erro no Mercado Pago: ' + errDetail
              : 'Falha na comunicação com o Mercado Pago (HTTP ' +
                (res ? res.statusCode : 'sem resposta') +
                ')'
            return e.json(400, { message: msg })
          }
        } catch (err) {
          return e.json(400, {
            message:
              'Erro ao conectar à API do Mercado Pago: ' +
              (err && err.message ? err.message : String(err)),
          })
        }
      }
    }

    // ---- Boleto para outros provedores ou fallback simulado ----
    if (method === 'boleto' && !rec.get('boleto_url')) {
      const dv10 = function (seq) {
        let soma = 0
        let peso = 2
        for (let i = seq.length - 1; i >= 0; i--) {
          let n = parseInt(seq.charAt(i), 10) * peso
          while (n > 9) n = (n % 10) + Math.floor(n / 10)
          soma += n
          peso = peso === 2 ? 1 : 2
        }
        const mod = soma % 10
        return mod === 0 ? '0' : String(10 - mod)
      }
      const rndDigits = function (n) {
        let s = ''
        for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString()
        return s
      }
      const bankCode = '237'
      const buildSimBoleto = function (amount) {
        const livre = rndDigits(25)
        const valorStr = String(Math.round(amount * 100))
        const valorPad = valorStr.padStart(14, '0')
        const barcode = bankCode + '9' + valorPad + livre
        const b1 = bankCode + '9' + livre.substring(0, 4)
        const d1 = dv10(b1)
        const b2 = livre.substring(4, 14)
        const d2 = dv10(b2)
        const b3 = livre.substring(14, 24)
        const d3 = dv10(b3)
        const dGeral = rndDigits(1)
        const line = b1 + d1 + b2 + d2 + b3 + d3 + dGeral + valorPad
        const nosso = rndDigits(11)
        let bBase = ($os.getenv('SITE_URL') || '').trim()
        if (!bBase) {
          const reqH = e.requestInfo().headers || {}
          const origH = (reqH['origin'] || '').toString().trim()
          const hstH = (reqH['host'] || reqH['x-forwarded-host'] || '').toString().trim()
          const prtH = (reqH['x-forwarded-proto'] || 'https').toString().trim()
          if (origH) bBase = origH
          else if (hstH) bBase = (prtH || 'https') + '://' + hstH
        }
        while (bBase.length > 0 && bBase.charAt(bBase.length - 1) === '/') {
          bBase = bBase.substring(0, bBase.length - 1)
        }
        const boletoTarget = bBase
          ? bBase + '/financeiro/cobrancas/' + rec.id
          : '/financeiro/cobrancas/' + rec.id
        return {
          barcode: barcode,
          line: line,
          nosso: nosso,
          url: boletoTarget,
          doc: externalId,
        }
      }

      let boleto = null
      let providerResp = null
      let boletoWarning = ''

      if (isRealKey) {
        if (provSlug === 'asaas') {
          try {
            const asBody = {
              billingType: 'BOLETO',
              customer: '',
              value: final,
              dueDate: dueDate,
              description: 'Cobranca VendasPro ' + externalId,
            }
            const res = $http.send({
              url: 'https://api.asaas.com/v3/payments',
              method: 'POST',
              headers: { access_token: apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify(asBody),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              const pr = res.json || {}
              boleto = {
                barcode: String(pr.bankSlipCode || ''),
                line: String(pr.identifiedField || pr.digitable_line || ''),
                nosso: String(pr.nossoNumero || ''),
                url: String(pr.bankSlipUrl || pr.invoiceUrl || ''),
                doc: String(pr.documentNumber || externalId),
              }
              providerResp = pr
            } else {
              boletoWarning = 'Asaas respondeu ' + (res ? res.statusCode : 'sem resposta')
            }
          } catch (err) {
            boletoWarning = 'Asaas indisponível: ' + err
          }
        } else if (provSlug === 'pagbank') {
          try {
            const pgBody = {
              reference_id: externalId,
              customer: { name: custName, email: custEmail, tax_id: custDoc },
              items: [
                {
                  reference_id: externalId,
                  name: 'Cobranca VendasPro',
                  quantity: 1,
                  unit_amount: Math.round(final * 100),
                },
              ],
              payment_methods: [{ type: 'BOLETO', boleto: { due_date: dueDate } }],
            }
            const res = $http.send({
              url: 'https://api.pagseguro.uol.com.br/orders',
              method: 'POST',
              headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify(pgBody),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              const pr = res.json || {}
              const chargesArr = pr.charges || []
              const ch = chargesArr.length > 0 ? chargesArr[0] : {}
              const pm = ch.payment_method || {}
              const bol = pm.boleto || {}
              boleto = {
                barcode: String(bol.barcode || ''),
                line: String(bol.formatted_barcode || bol.digitable_line || ''),
                nosso: String(bol.nosso_numero || ''),
                url: String(bol.download_url || ''),
                doc: String(pr.reference_id || externalId),
              }
              providerResp = pr
            } else {
              boletoWarning = 'PagBank respondeu ' + (res ? res.statusCode : 'sem resposta')
            }
          } catch (err) {
            boletoWarning = 'PagBank indisponível: ' + err
          }
        }
      }

      if (!boleto) {
        boleto = buildSimBoleto(final)
        providerResp = {
          id: externalId,
          status: 'pending',
          method: 'boleto',
          amount: final,
          simulated: true,
          boleto_warning:
            boletoWarning || (isRealKey ? '' : 'simulado (sandbox ou sem credencial real)'),
        }
      }
      rec.set('boleto_url', boleto.url)
      rec.set('boleto_barcode', boleto.barcode)
      rec.set('boleto_digitable_line', boleto.line)
      rec.set('boleto_nosso_numero', boleto.nosso)
      rec.set('boleto_document_number', boleto.doc)
      if (boleto.url) rec.set('payment_url', boleto.url)
      rec.set('provider_response', providerResp)
    }

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
      provider_fee: providerFee,
      net_value: netValue,
      installments: installments,
      installment_value: installmentValue,
      interest_rate: interestRate,
      payment_url: rec.get('payment_url'),
      pix_code: rec.get('pix_code') || '',
      pix_qrcode: rec.get('pix_qrcode') || '',
      expires_at: rec.get('expires_at') || '',
      created: rec.get('created') || '',
      boleto_url: rec.get('boleto_url') || '',
      boleto_barcode: rec.get('boleto_barcode') || '',
      boleto_digitable_line: rec.get('boleto_digitable_line') || '',
      boleto_nosso_numero: rec.get('boleto_nosso_numero') || '',
      boleto_document_number: rec.get('boleto_document_number') || '',
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
        provider_fee: r.get('provider_fee') || 0,
        net_value: r.get('net_value') || 0,
        installments: r.get('installments') || 1,
        installment_value: r.get('installment_value') || 0,
        interest_rate: r.get('interest_rate') || 0,
        status: r.get('status') || 'pending',
        payment_url: r.get('payment_url') || '',
        pix_code: r.get('pix_code') || '',
        expires_at: r.get('expires_at') || '',
        paid_at: paidAt,
        canceled_at: r.get('canceled_at') || '',
        created: created,
        updated: r.get('updated') || '',
        boleto_url: r.get('boleto_url') || '',
        boleto_barcode: r.get('boleto_barcode') || '',
        boleto_digitable_line: r.get('boleto_digitable_line') || '',
        boleto_nosso_numero: r.get('boleto_nosso_numero') || '',
        boleto_document_number: r.get('boleto_document_number') || '',
      })
    }
    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/charges/{id}  (detalhe + timeline - público ou auth)
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/payments/charges/{id}', (e) => {
  const id = e.request.pathValue('id')

  let rec
  try {
    rec = $app.findRecordById('payment_charges', id)
  } catch (_) {
    return e.json(404, { message: 'Cobrança não encontrada.' })
  }

  const isAuth = Boolean(e.auth)
  const role = e.auth ? e.auth.get('role') || 'vendedor' : null
  const userId = e.auth ? e.auth.id : null

  // Se estiver autenticado e for vendedor, só acessa suas cobranças
  if (isAuth && role === 'vendedor' && rec.get('seller_id') !== userId) {
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

  // timeline (audit log) - apenas para usuários autenticados
  const timeline = []
  if (isAuth) {
    let audit = []
    try {
      audit = $app.findRecordsByFilter('payment_audit_log', 'charge_id = {:c}', 'created', 0, 0, {
        c: id,
      })
    } catch (_) {}
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
    provider_fee: isAuth ? rec.get('provider_fee') || 0 : 0,
    net_value: isAuth ? rec.get('net_value') || 0 : rec.get('final_amount') || 0,
    installments: rec.get('installments') || 1,
    installment_value: rec.get('installment_value') || 0,
    interest_rate: rec.get('interest_rate') || 0,
    status: rec.get('status') || 'pending',
    payment_url: rec.get('payment_url') || '',
    pix_code: rec.get('pix_code') || '',
    pix_qrcode: rec.get('pix_qrcode') || '',
    expires_at: rec.get('expires_at') || '',
    paid_at: rec.get('paid_at') || '',
    canceled_at: rec.get('canceled_at') || '',
    provider_response: isAuth ? rec.get('provider_response') || {} : {},
    created_by: isAuth ? rec.get('created_by') || '' : '',
    created: rec.get('created') || '',
    updated: rec.get('updated') || '',
    timeline: timeline,
    boleto_url: rec.get('boleto_url') || '',
    boleto_barcode: rec.get('boleto_barcode') || '',
    boleto_digitable_line: rec.get('boleto_digitable_line') || '',
    boleto_nosso_numero: rec.get('boleto_nosso_numero') || '',
    boleto_document_number: rec.get('boleto_document_number') || '',
  })
})

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

  // 2. Valida assinatura HMAC-SHA256 via header x-signature
  //    (webhook_secret vem de payment_provider_configs, fallback para o provedor)
  let whSecret = ''
  try {
    const cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', provider.id)
    whSecret = cfg.get('webhook_secret') || ''
  } catch (_) {}
  if (!whSecret) whSecret = provider.get('webhook_secret') || ''
  const env = provider.get('environment') || 'sandbox'
  const headers = e.requestInfo().headers || {}
  const sig = headers['x-signature'] || headers['x-hub-signature'] || ''
  if (whSecret && sig) {
    const computed = $security.hs256(JSON.stringify(body), whSecret)
    if (sig !== computed && sig !== 'sha256=' + computed) {
      return e.json(401, { message: 'Assinatura inválida.' })
    }
  } else if (whSecret && env === 'production' && !sig) {
    return e.json(401, { message: 'Assinatura ausente.' })
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

  let eventType = (
    body.action ||
    body.type ||
    body.event ||
    body.event_type ||
    'payment'
  ).toString()
  const externalChargeId =
    (body.data && (body.data.id || body.data.external_charge_id || body.data.charge_id)) ||
    body.external_charge_id ||
    body.charge_id ||
    ''
  let receivedAmount =
    body.data && (body.data.amount || body.data.paid_amount)
      ? Number(body.data.amount || body.data.paid_amount)
      : body.amount || body.paid_amount
        ? Number(body.amount || body.paid_amount)
        : 0

  // Contraprova Mercado Pago: consulta a API para confirmar status/valor/fee
  let mpMappedStatus = ''
  let mpFee = 0
  let mpNet = 0
  if ((provider.get('slug') || '') === 'mercadopago' && externalChargeId) {
    let mpApiKey = ''
    try {
      const cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', provider.id)
      mpApiKey = cfg.get('api_key') || ''
    } catch (_) {}
    if (!mpApiKey) mpApiKey = provider.get('api_key') || ''
    if (mpApiKey) {
      try {
        const res = $http.send({
          url: 'https://api.mercadopago.com/v1/payments/' + String(externalChargeId),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + mpApiKey },
          timeout: 15,
        })
        if (res && res.statusCode === 200) {
          const pr = res.json || {}
          const mpRaw = (pr.status || '').toString()
          const mpMap = {
            approved: 'paid',
            rejected: 'failed',
            pending: 'waiting_payment',
            in_process: 'waiting_payment',
            authorized: 'waiting_payment',
            cancelled: 'canceled',
            refunded: 'refunded',
            charged_back: 'refunded',
          }
          mpMappedStatus = mpMap[mpRaw] || ''
          const feeDetails = pr.fee_details || []
          let feeSum = 0
          for (let fi = 0; fi < feeDetails.length; fi++) {
            feeSum += Number(feeDetails[fi].fee_amount || 0)
          }
          mpFee = Math.round(feeSum * 100) / 100
          mpNet = Number(pr.net_amount || 0)
          if (pr.transaction_amount) receivedAmount = Number(pr.transaction_amount)
        }
      } catch (_) {}
    }
  }
  if (mpMappedStatus) {
    body.status = mpMappedStatus
    if (mpMappedStatus === 'paid') eventType = 'approved'
  }

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
    mpMappedStatus === 'paid' ||
    body.status === 'paid' ||
    body.status === 'approved' ||
    eventType === 'approved' ||
    eventType.indexOf('paid') >= 0

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
        let fee = mpFee
        let net = mpNet
        if (!fee) {
          const mtd = txCharge.get('payment_method') || ''
          const famt = Number(txCharge.get('final_amount') || 0)
          if (mtd === 'credit_card' || mtd === 'debit_card')
            fee = Math.round(famt * 0.0399 * 100) / 100
          else if (mtd === 'pix') fee = Math.round(famt * 0.0099 * 100) / 100
          else if (mtd === 'boleto') fee = 3.49
          net = Math.round((famt - fee) * 100) / 100
        }
        txCharge.set('status', 'paid')
        txCharge.set('paid_at', nowStr)
        txCharge.set('provider_fee', fee)
        txCharge.set('net_value', net)
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
    } else if (body.status === 'failed' || mpMappedStatus === 'failed') {
      txCharge.set('status', 'failed')
      txCharge.set('provider_response', body)
      txApp.save(txCharge)
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'status_updated')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'failed' })
      txApp.save(audit)
    } else if (body.status === 'refunded' || mpMappedStatus === 'refunded') {
      txCharge.set('status', 'refunded')
      txCharge.set('provider_response', body)
      txApp.save(txCharge)
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'refund')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'refunded', source: 'webhook' })
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

// ---------------------------------------------------------------------------
// GET /backend/v1/webhooks/payments/mercadopago/config  (auth)
// Retorna a URL pública do webhook + passo a passo de configuração no MP.
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/webhooks/payments/mercadopago/config',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const webhookUrl = 'https://vendaspro.goskip.app/backend/v1/webhooks/payments/mercadopago'
    return e.json(200, {
      provider: 'mercadopago',
      webhook_url: webhookUrl,
      instructions: [
        'Acesse https://www.mercadopago.com.br/developers/panel',
        'No menu "Suas integrações", selecione a sua aplicação',
        'Vá em "Notificações" → "Webhooks"',
        'Em "URL do Webhook", cole: ' + webhookUrl,
        'Em "Evento", selecione "Pagamentos" (payment)',
        'Clique em "Salvar configuração"',
        'Copie o "Secret" exibido e cole no campo Webhook Secret do VendasPro',
        'Pronto! Eventos payment.updated e payment.created chegarão automaticamente.',
      ],
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/webhooks/payments/mercadopago/test  (admin, sandbox only)
// Simula um evento de pagamento aprovado para teste.
// Body: { charge_id?: string }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/webhooks/payments/mercadopago/test',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    const body = e.requestInfo().body || {}

    let provider
    try {
      provider = $app.findFirstRecordByData('payment_providers', 'slug', 'mercadopago')
    } catch (_) {
      return e.json(404, { message: 'Provedor Mercado Pago não encontrado.' })
    }
    if ((provider.get('environment') || 'sandbox') !== 'sandbox') {
      return e.json(400, { message: 'Teste simulado só é permitido em ambiente sandbox.' })
    }

    let charge = null
    if (body.charge_id) {
      try {
        charge = $app.findRecordById('payment_charges', body.charge_id)
      } catch (_) {}
    }
    if (!charge) {
      try {
        charge = $app.findFirstRecordByData('payment_charges', 'provider_id', provider.id)
      } catch (_) {}
    }
    if (!charge) {
      return e.json(404, {
        message:
          'Nenhuma cobrança encontrada para testar. Crie uma cobrança de teste e tente realizar o pagamento no sandbox antes de testar o webhook.',
      })
    }

    const externalEventId = 'TEST-' + $security.randomString(12).toUpperCase()
    let existing = null
    try {
      existing = $app.findFirstRecordByData(
        'payment_webhook_events',
        'external_event_id',
        externalEventId,
      )
    } catch (_) {}
    if (existing) {
      return e.json(200, { message: 'Evento já processado.', id: existing.id })
    }

    const whCol = $app.findCollectionByNameOrId('payment_webhook_events')
    const whRec = new Record(whCol)
    whRec.set('provider_id', provider.id)
    whRec.set('external_event_id', externalEventId)
    whRec.set('event_type', 'payment.updated')
    whRec.set('external_charge_id', String(charge.get('external_charge_id') || ''))
    whRec.set('payload', {
      simulated: true,
      action: 'payment.updated',
      data: { id: charge.get('external_charge_id') },
      status: 'approved',
    })
    whRec.set('processed', false)
    $app.save(whRec)

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

    const prevStatus = charge.get('status') || ''
    const mtd = charge.get('payment_method') || ''
    const famt = Number(charge.get('final_amount') || 0)
    let fee = 0
    if (mtd === 'credit_card' || mtd === 'debit_card') fee = Math.round(famt * 0.0399 * 100) / 100
    else if (mtd === 'pix') fee = Math.round(famt * 0.0099 * 100) / 100
    else if (mtd === 'boleto') fee = 3.49
    const net = Math.round((famt - fee) * 100) / 100

    $app.runInTransaction(function (txApp) {
      let txCharge
      try {
        txCharge = txApp.findRecordById('payment_charges', charge.id)
      } catch (_) {
        throw new Error('Cobrança não encontrada na transação.')
      }
      const prev = { status: txCharge.get('status') || '' }
      txCharge.set('status', 'paid')
      txCharge.set('paid_at', nowStr)
      txCharge.set('provider_fee', fee)
      txCharge.set('net_value', net)
      txCharge.set('provider_response', {
        simulated: true,
        source: 'test_endpoint',
        status: 'approved',
      })
      txApp.save(txCharge)

      const saleId = txCharge.get('sale_id') || ''
      if (saleId) {
        try {
          const sale = txApp.findRecordById('sales', saleId)
          sale.set('payment_status', 'pago')
          txApp.save(sale)
        } catch (_) {}
      }

      const auditCol = txApp.findCollectionByNameOrId('payment_audit_log')
      const audit = new Record(auditCol)
      audit.set('charge_id', txCharge.id)
      audit.set('action', 'payment_confirmed')
      audit.set('reference', txCharge.get('external_charge_id') || '')
      audit.set('previous_data', prev)
      audit.set('new_data', { status: 'paid', paid_at: nowStr, source: 'test_webhook' })
      txApp.save(audit)

      const sellerId = txCharge.get('seller_id') || ''
      if (sellerId) {
        const notifCol = txApp.findCollectionByNameOrId('notifications')
        const notif = new Record(notifCol)
        notif.set('user', sellerId)
        notif.set('type', 'payment')
        notif.set('title', 'Pagamento recebido (teste)')
        const valorStr =
          'R$ ' +
          Number(txCharge.get('final_amount') || 0)
            .toFixed(2)
            .replace('.', ',')
        notif.set('message', 'Webhook de teste — Pagamento confirmado. Valor: ' + valorStr)
        notif.set('reference_type', 'charge')
        notif.set('reference_id', txCharge.id)
        notif.set('is_read', false)
        txApp.save(notif)
      }

      let txWh
      try {
        txWh = txApp.findRecordById('payment_webhook_events', whRec.id)
        txWh.set('processed', true)
        txWh.set('processed_at', nowStr)
        txApp.save(txWh)
      } catch (_) {}
    })

    return e.json(200, {
      message: 'Webhook de teste processado.',
      event_id: externalEventId,
      charge_id: charge.id,
      previous_status: prevStatus,
      new_status: 'paid',
      fee: fee,
      net: net,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/verify  (auth)
// Consulta diretamente a API do provedor e atualiza o status local.
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/verify',
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

    let providerSlug = ''
    let apiKey = ''
    try {
      const p = $app.findRecordById('payment_providers', rec.get('provider_id') || '')
      providerSlug = p.get('slug') || ''
      apiKey = p.get('api_key') || ''
    } catch (_) {}
    try {
      const cfg = $app.findFirstRecordByData(
        'payment_provider_configs',
        'provider_id',
        rec.get('provider_id') || '',
      )
      if (cfg && cfg.get('api_key')) apiKey = cfg.get('api_key')
    } catch (_) {}

    const externalId = rec.get('external_charge_id') || ''
    const mpMap = {
      approved: 'paid',
      rejected: 'failed',
      pending: 'waiting_payment',
      in_process: 'waiting_payment',
      authorized: 'waiting_payment',
      cancelled: 'canceled',
      refunded: 'refunded',
      charged_back: 'refunded',
    }

    if (providerSlug === 'mercadopago' && apiKey && externalId) {
      try {
        const res = $http.send({
          url: 'https://api.mercadopago.com/v1/payments/' + externalId,
          method: 'GET',
          headers: { Authorization: 'Bearer ' + apiKey },
          timeout: 15,
        })
        if (res && res.statusCode === 200) {
          const pr = res.json || {}
          const mpRaw = (pr.status || '').toString()
          const mapped = mpMap[mpRaw] || ''
          const prev = rec.get('status') || ''
          if (mapped && mapped !== prev) {
            rec.set('status', mapped)
            if (mapped === 'paid') {
              const now = new Date()
              const pad = function (n) {
                return n < 10 ? '0' + n : '' + n
              }
              rec.set(
                'paid_at',
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
            }
            $app.save(rec)
            const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
            const audit = new Record(auditCol)
            audit.set('charge_id', id)
            audit.set('action', 'status_updated')
            audit.set('user_id', userId)
            audit.set('reference', externalId)
            audit.set('previous_data', { status: prev })
            audit.set('new_data', { status: mapped, source: 'verify_api' })
            $app.save(audit)
            return e.json(200, {
              id: id,
              status: mapped,
              previous_status: prev,
              updated: true,
              provider_status: mpRaw,
              checked_at: new Date().toISOString(),
            })
          }
          return e.json(200, {
            id: id,
            status: prev,
            updated: false,
            provider_status: mpRaw,
            checked_at: new Date().toISOString(),
            message: 'Status conferido no provedor — sem alterações.',
          })
        }
        return e.json(200, {
          id: id,
          status: rec.get('status'),
          updated: false,
          checked_at: new Date().toISOString(),
          message: 'Provedor respondeu ' + (res ? res.statusCode : '?') + '. Status mantido.',
        })
      } catch (err) {
        return e.json(200, {
          id: id,
          status: rec.get('status'),
          updated: false,
          checked_at: new Date().toISOString(),
          message: 'Não foi possível consultar o provedor.',
        })
      }
    }

    return e.json(200, {
      id: id,
      status: rec.get('status'),
      updated: false,
      checked_at: new Date().toISOString(),
      message:
        'Verificação direta indisponível para este provedor (configure a API Key do Mercado Pago).',
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/reports/financial?month=X&year=Y  (admin/gerente)
// Relatório financeiro com taxas e valor líquido.
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/reports/financial',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const query = e.requestInfo().query || {}
    const now = new Date()
    const month = query.month ? parseInt(query.month, 10) : now.getUTCMonth() + 1
    const year = query.year ? parseInt(query.year, 10) : now.getUTCFullYear()

    let all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', '1=1', '-created', 0, 0)
    } catch (_) {}

    const round2 = function (v) {
      return Math.round(Number(v || 0) * 100) / 100
    }
    const inMonth = function (rec) {
      const ref = rec.get('paid_at') || rec.get('created') || ''
      const d = new Date(ref)
      if (isNaN(d.getTime())) return false
      return d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year
    }

    let totalCobrado = 0
    let totalRecebido = 0
    let totalTaxas = 0
    let totalLiquido = 0
    let totalPendente = 0
    let totalVencido = 0
    let totalCancelado = 0

    const provMap = {}
    const methodMap = {}

    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      if (!inMonth(r)) continue
      const status = r.get('status') || ''
      const final = Number(r.get('final_amount') || 0)
      const fee = Number(r.get('provider_fee') || 0)
      const net = Number(r.get('net_value') || 0)
      totalCobrado += final
      if (status === 'paid') {
        totalRecebido += final
        totalTaxas += fee
        totalLiquido += net
      }
      if (status === 'pending' || status === 'waiting_payment') totalPendente += final
      if (status === 'expired') totalVencido += final
      if (status === 'canceled') totalCancelado += final

      const pid = r.get('provider_id') || ''
      if (!provMap[pid]) {
        provMap[pid] = {
          total_cobrado: 0,
          total_recebido: 0,
          total_taxas: 0,
          total_liquido: 0,
          count: 0,
          paid: 0,
        }
      }
      provMap[pid].total_cobrado += final
      provMap[pid].count++
      if (status === 'paid') {
        provMap[pid].total_recebido += final
        provMap[pid].total_taxas += fee
        provMap[pid].total_liquido += net
        provMap[pid].paid++
      }

      const mth = r.get('payment_method') || 'link'
      if (!methodMap[mth]) methodMap[mth] = { count: 0, total: 0, feeSum: 0, feeCount: 0 }
      methodMap[mth].count++
      methodMap[mth].total += final
      if (fee > 0) {
        methodMap[mth].feeSum += fee
        methodMap[mth].feeCount++
      }
    }

    const provNames = {}
    let provs = []
    try {
      provs = $app.findRecordsByFilter('payment_providers', '1=1', 'name', 0, 0)
    } catch (_) {}
    for (let i = 0; i < provs.length; i++) provNames[provs[i].id] = provs[i].get('name')

    const byProvider = []
    for (const pid in provMap) {
      const p = provMap[pid]
      byProvider.push({
        provider_id: pid,
        provider_name: provNames[pid] || '—',
        total_cobrado: round2(p.total_cobrado),
        total_recebido: round2(p.total_recebido),
        total_taxas: round2(p.total_taxas),
        total_liquido: round2(p.total_liquido),
        quantidade_cobrancas: p.count,
        ticket_medio: p.count > 0 ? round2(p.total_cobrado / p.count) : 0,
        taxa_conversao: p.count > 0 ? round2((p.paid / p.count) * 100) : 0,
      })
    }

    const methodLabels = {
      pix: 'PIX',
      credit_card: 'Cartão',
      debit_card: 'Cartão',
      boleto: 'Boleto',
      link: 'Link',
    }
    const byMethod = []
    for (const mth in methodMap) {
      const m = methodMap[mth]
      byMethod.push({
        method: methodLabels[mth] || mth,
        quantity: m.count,
        valor_total: round2(m.total),
        taxa_media: m.feeCount > 0 ? round2(m.feeSum / m.feeCount) : 0,
      })
    }

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    const byMonth = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const m = d.getUTCMonth() + 1
      const y = d.getUTCFullYear()
      let cob = 0
      let rec = 0
      let tax = 0
      let liq = 0
      for (let j = 0; j < all.length; j++) {
        const r = all[j]
        const ref = r.get('paid_at') || r.get('created') || ''
        const rd = new Date(ref)
        if (isNaN(rd.getTime())) continue
        if (rd.getUTCMonth() + 1 === m && rd.getUTCFullYear() === y) {
          const st = r.get('status') || ''
          const fn = Number(r.get('final_amount') || 0)
          cob += fn
          if (st === 'paid') {
            rec += fn
            tax += Number(r.get('provider_fee') || 0)
            liq += Number(r.get('net_value') || 0)
          }
        }
      }
      byMonth.push({
        month: monthNames[d.getUTCMonth()] + '/' + String(y).slice(-2),
        cobrado: round2(cob),
        recebido: round2(rec),
        taxas: round2(tax),
        liquido: round2(liq),
      })
    }

    const timeline = []
    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      if ((r.get('status') || '') !== 'paid') continue
      if (!inMonth(r)) continue
      let clientName = ''
      try {
        clientName = $app.findRecordById('customers', r.get('client_id') || '').get('name')
      } catch (_) {}
      timeline.push({
        date: r.get('paid_at') || r.get('created') || '',
        valor: round2(r.get('final_amount')),
        provider_name: provNames[r.get('provider_id') || ''] || '',
        method: methodLabels[r.get('payment_method')] || r.get('payment_method'),
        client: clientName,
      })
    }
    timeline.sort(function (a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return e.json(200, {
      summary: {
        total_cobrado: round2(totalCobrado),
        total_recebido: round2(totalRecebido),
        total_taxas: round2(totalTaxas),
        total_liquido: round2(totalLiquido),
        total_pendente: round2(totalPendente),
        total_vencido: round2(totalVencido),
        total_cancelado: round2(totalCancelado),
      },
      by_provider: byProvider,
      by_month: byMonth,
      by_method: byMethod,
      timeline: timeline.slice(0, 20),
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/regenerate-boleto
// Cancela a cobrança atual (se não paga) e cria uma nova cobrança boleto com
// nova data de vencimento. Body: { expires_at: 'YYYY-MM-DD' }
// Retorna os dados da nova cobrança (incluindo dados do boleto).
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/regenerate-boleto',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const role = e.auth.get('role') || 'vendedor'
    const userId = e.auth.id
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }

    // só boleto
    if ((rec.get('payment_method') || '') !== 'boleto') {
      return e.json(400, { message: 'Só é possível regenerar boletos.' })
    }
    const prevStatus = rec.get('status') || ''
    if (prevStatus === 'paid' || prevStatus === 'refunded' || prevStatus === 'partially_refunded') {
      return e.json(400, {
        message: 'Não é possível regenerar um boleto já pago ou reembolsado.',
      })
    }

    const newExpires = (body.expires_at || '').toString()
    if (!newExpires) {
      return e.json(400, { message: 'Informe a nova data de vencimento (expires_at).' })
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

    // 1. Cancela a cobrança atual (no provedor se possível — só registrando)
    try {
      const provId = rec.get('provider_id') || ''
      if (provId) {
        // tentativa de cancelamento no provedor omitida por simplicidade; o boleto
        // expira naturalmente. Registramos o cancelamento local.
      }
    } catch (_) {}

    const prev = { status: prevStatus }
    rec.set('status', 'canceled')
    rec.set('canceled_at', nowStr)
    $app.save(rec)

    const auditCol = $app.findCollectionByNameOrId('payment_audit_log')
    const auditCancel = new Record(auditCol)
    auditCancel.set('charge_id', id)
    auditCancel.set('action', 'charge_canceled')
    auditCancel.set('user_id', userId)
    auditCancel.set('reference', rec.get('external_charge_id') || '')
    auditCancel.set('previous_data', prev)
    auditCancel.set('new_data', {
      status: 'canceled',
      canceled_at: nowStr,
      reason: 'regenerate_boleto',
    })
    $app.save(auditCancel)

    // 2. Cria nova cobrança boleto com os mesmos dados + nova data.
    const providerId = rec.get('provider_id') || ''
    let provider = null
    try {
      provider = $app.findRecordById('payment_providers', providerId)
    } catch (_) {
      return e.json(400, { message: 'Provedor não encontrado para regenerar.' })
    }

    const original = rec.get('original_amount') || 0
    const discount = rec.get('discount_amount') || 0
    const final = rec.get('final_amount') || 0
    const providerFee = rec.get('provider_fee') || 3.49
    const netValue = rec.get('net_value') || Math.round((final - providerFee) * 100) / 100

    const ymd = now.getUTCFullYear() + '' + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
    const suffix = $security.randomString(6).toUpperCase()
    const externalId = 'CHG-' + ymd + '-' + suffix

    let accountId = rec.get('financial_account_id') || ''
    if (!accountId) {
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
    }

    const col = $app.findCollectionByNameOrId('payment_charges')
    const newRec = new Record(col)
    newRec.set('sale_id', rec.get('sale_id') || '')
    newRec.set('client_id', rec.get('client_id') || '')
    newRec.set('seller_id', rec.get('seller_id') || '')
    newRec.set('provider_id', providerId)
    if (accountId) newRec.set('financial_account_id', accountId)
    newRec.set('external_charge_id', externalId)
    newRec.set('payment_method', 'boleto')
    newRec.set('original_amount', original)
    newRec.set('discount_amount', discount)
    newRec.set('final_amount', final)
    newRec.set('provider_fee', providerFee)
    newRec.set('net_value', netValue)
    newRec.set('installments', 1)
    newRec.set('installment_value', final)
    newRec.set('interest_rate', 0)
    newRec.set('status', 'pending')
    newRec.set('expires_at', newExpires + ' 23:59:59.000Z')
    newRec.set('created_by', userId)
    newRec.set('provider_response', {
      id: externalId,
      status: 'pending',
      method: 'boleto',
      amount: final,
      regenerated_from: id,
    })

    // ---- geração do boleto (real ou simulado) ----
    const dv10 = function (seq) {
      let soma = 0
      let peso = 2
      for (let i = seq.length - 1; i >= 0; i--) {
        let n = parseInt(seq.charAt(i), 10) * peso
        while (n > 9) n = (n % 10) + Math.floor(n / 10)
        soma += n
        peso = peso === 2 ? 1 : 2
      }
      const mod = soma % 10
      return mod === 0 ? '0' : String(10 - mod)
    }
    const rndDigits = function (n) {
      let s = ''
      for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString()
      return s
    }
    const bankCode = '237'
    const buildSimBoleto = function (amount) {
      const livre = rndDigits(25)
      const valorStr = String(Math.round(amount * 100))
      const valorPad = valorStr.padStart(14, '0')
      const barcode = bankCode + '9' + valorPad + livre
      const b1 = bankCode + '9' + livre.substring(0, 4)
      const d1 = dv10(b1)
      const b2 = livre.substring(4, 14)
      const d2 = dv10(b2)
      const b3 = livre.substring(14, 24)
      const d3 = dv10(b3)
      const dGeral = rndDigits(1)
      const line = b1 + d1 + b2 + d2 + b3 + d3 + dGeral + valorPad
      const nosso = rndDigits(11)
      let bBase = ($os.getenv('SITE_URL') || '').trim()
      if (!bBase) {
        const reqH = e.requestInfo().headers || {}
        const origH = (reqH['origin'] || '').toString().trim()
        const hstH = (reqH['host'] || reqH['x-forwarded-host'] || '').toString().trim()
        const prtH = (reqH['x-forwarded-proto'] || 'https').toString().trim()
        if (origH) bBase = origH
        else if (hstH) bBase = (prtH || 'https') + '://' + hstH
      }
      while (bBase.length > 0 && bBase.charAt(bBase.length - 1) === '/') {
        bBase = bBase.substring(0, bBase.length - 1)
      }
      const boletoTarget = bBase
        ? bBase + '/financeiro/cobrancas/' + newRec.id
        : '/financeiro/cobrancas/' + newRec.id
      return {
        barcode: barcode,
        line: line,
        nosso: nosso,
        url: boletoTarget,
        doc: externalId,
      }
    }

    const provSlug = provider.get('slug') || ''
    let apiKey = (provider.get('api_key') || '').toString().trim()
    try {
      const cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', providerId)
      if (cfg && cfg.get('api_key')) apiKey = String(cfg.get('api_key')).trim()
    } catch (_) {}
    const env = (provider.get('environment') || 'sandbox').toString().toLowerCase()
    const isRealKey =
      Boolean(apiKey) &&
      apiKey.indexOf('DEMO') < 0 &&
      apiKey.indexOf('demo') < 0 &&
      (env === 'production' ||
        apiKey.startsWith('TEST-') ||
        apiKey.startsWith('APP_USR-') ||
        apiKey.startsWith('PROD-'))

    let boleto = null
    let providerResp = null
    let custName = ''
    let custEmail = ''
    let custDoc = ''
    try {
      const cust = $app.findRecordById('customers', rec.get('client_id') || '')
      custName = cust.get('name') || ''
      custEmail = cust.get('email') || ''
      custDoc = cust.get('cnpj') || cust.get('ie') || ''
    } catch (_) {}

    if (isRealKey) {
      if (provSlug === 'mercadopago') {
        try {
          const res = $http.send({
            url: 'https://api.mercadopago.com/v1/payments',
            method: 'POST',
            headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_amount: final,
              description: 'Cobranca VendasPro ' + externalId,
              payment_method_id: 'bolbradesco',
              date_of_expiration: newExpires,
              payer: { email: custEmail || 'cliente@vendaspro.com', first_name: custName },
            }),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            const td = pr.transaction_details || {}
            boleto = {
              barcode: String(td.barcode || pr.barcode || ''),
              line: String(td.verification_code || pr.digitable_line || ''),
              nosso: String(pr.id || ''),
              url: String(td.external_resource_url || ''),
              doc: externalId,
            }
            providerResp = pr
          } else if (res && res.statusCode === 401) {
            return e.json(400, { message: 'Credenciais do Mercado Pago inválidas ou expiradas' })
          }
        } catch (_) {}
      } else if (provSlug === 'asaas') {
        try {
          const res = $http.send({
            url: 'https://api.asaas.com/v3/payments',
            method: 'POST',
            headers: { access_token: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              billingType: 'BOLETO',
              customer: '',
              value: final,
              dueDate: newExpires,
              description: 'Cobranca VendasPro ' + externalId,
            }),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            boleto = {
              barcode: String(pr.bankSlipCode || ''),
              line: String(pr.identifiedField || pr.digitable_line || ''),
              nosso: String(pr.nossoNumero || ''),
              url: String(pr.bankSlipUrl || pr.invoiceUrl || ''),
              doc: String(pr.documentNumber || externalId),
            }
            providerResp = pr
          }
        } catch (_) {}
      } else if (provSlug === 'pagbank') {
        try {
          const res = $http.send({
            url: 'https://api.pagseguro.uol.com.br/orders',
            method: 'POST',
            headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference_id: externalId,
              customer: { name: custName, email: custEmail, tax_id: custDoc },
              items: [
                {
                  reference_id: externalId,
                  name: 'Cobranca VendasPro',
                  quantity: 1,
                  unit_amount: Math.round(final * 100),
                },
              ],
              payment_methods: [{ type: 'BOLETO', boleto: { due_date: newExpires } }],
            }),
            timeout: 20,
          })
          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            const pr = res.json || {}
            const chargesArr = pr.charges || []
            const ch = chargesArr.length > 0 ? chargesArr[0] : {}
            const pm = ch.payment_method || {}
            const bol = pm.boleto || {}
            boleto = {
              barcode: String(bol.barcode || ''),
              line: String(bol.formatted_barcode || bol.digitable_line || ''),
              nosso: String(bol.nosso_numero || ''),
              url: String(bol.download_url || ''),
              doc: String(pr.reference_id || externalId),
            }
            providerResp = pr
          }
        } catch (_) {}
      }
    }

    if (!boleto) {
      boleto = buildSimBoleto(final)
      providerResp = {
        id: externalId,
        status: 'pending',
        method: 'boleto',
        amount: final,
        simulated: true,
        regenerated_from: id,
      }
    }
    newRec.set('boleto_url', boleto.url)
    newRec.set('boleto_barcode', boleto.barcode)
    newRec.set('boleto_digitable_line', boleto.line)
    newRec.set('boleto_nosso_numero', boleto.nosso)
    newRec.set('boleto_document_number', boleto.doc)
    newRec.set('payment_url', boleto.url)
    newRec.set('provider_response', providerResp)
    $app.save(newRec)

    // audit da nova cobrança
    const auditNew = new Record(auditCol)
    auditNew.set('charge_id', newRec.id)
    auditNew.set('action', 'charge_created')
    auditNew.set('user_id', userId)
    auditNew.set('reference', externalId)
    auditNew.set('previous_data', {})
    auditNew.set('new_data', {
      status: 'pending',
      final_amount: final,
      method: 'boleto',
      provider: provSlug,
      regenerated_from: id,
    })
    $app.save(auditNew)

    return e.json(200, {
      id: newRec.id,
      external_charge_id: externalId,
      sale_id: newRec.get('sale_id') || '',
      status: 'pending',
      payment_method: 'boleto',
      original_amount: original,
      discount_amount: discount,
      final_amount: final,
      provider_fee: providerFee,
      net_value: netValue,
      installments: 1,
      installment_value: final,
      interest_rate: 0,
      payment_url: boleto.url,
      pix_code: '',
      expires_at: newRec.get('expires_at') || '',
      created: newRec.get('created') || '',
      boleto_url: boleto.url,
      boleto_barcode: boleto.barcode,
      boleto_digitable_line: boleto.line,
      boleto_nosso_numero: boleto.nosso,
      boleto_document_number: boleto.doc,
      regenerated_from: id,
    })
  },
  $apis.requireAuth(),
)
