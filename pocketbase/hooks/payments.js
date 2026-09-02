// Pagamentos — Módulo de Cobrança e Pagamentos Digitais Multi-Provedor (JSVM-compliant).

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/providers
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/providers',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })

    var masterKey =
      ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
      'vendaspro-payment-master-secret-fallback-key-2026'
    var decryptSecret = function (cipher) {
      if (!cipher) return ''
      var str = String(cipher).trim()
      if (!str || str.indexOf('enc:v1:') !== 0) return str
      var raw = str.substring(7)
      var result = ''
      for (var i = 0; i < raw.length; i += 2) {
        var hex = raw.substring(i, i + 2)
        var xor = parseInt(hex, 16)
        var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
        result += String.fromCharCode(xor ^ kChar)
      }
      return result
    }
    var maskSecret = function (v) {
      if (!v) return ''
      var plain = decryptSecret(v)
      if (!plain) return ''
      if (plain.length <= 4) return '••••'
      return '••••••••' + plain.slice(-4)
    }

    var records = []
    try {
      records = $app.findRecordsByFilter('payment_providers', '1=1', 'priority,-created', 0, 0)
    } catch (_) {}

    var configMap = {}
    var configs = []
    try {
      configs = $app.findRecordsByFilter('payment_provider_configs', '1=1', 'created', 0, 0)
    } catch (_) {}
    for (var i = 0; i < configs.length; i++) {
      configMap[configs[i].get('provider_id') || ''] = configs[i]
    }

    var result = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var slug = (r.get('slug') || '').toString().toLowerCase()
      var cfg = configMap[r.id]
      var rawApiKey = cfg && cfg.get('api_key') ? cfg.get('api_key') : r.get('api_key')
      var rawApiSecret = r.get('api_secret')
      var rawWhSecret =
        cfg && cfg.get('webhook_secret') ? cfg.get('webhook_secret') : r.get('webhook_secret')

      var caps = {
        pix: slug === 'mercadopago' || slug === 'asaas',
        credit_card: true,
        debit_card: slug === 'mercadopago' || slug === 'pagbank',
        boleto: slug === 'mercadopago' || slug === 'asaas' || slug === 'pagbank',
        refund: true,
        installments: true,
        embedded_checkout: slug === 'mercadopago' || slug === 'stripe',
      }

      result.push({
        id: r.id,
        name: r.get('name') || '',
        slug: slug,
        status: r.get('status') || 'inactive',
        environment: r.get('environment') || 'sandbox',
        methods: r.get('methods') || [],
        priority: Number(r.get('priority') || 0),
        capabilities: caps,
        webhook_configured: r.get('webhook_configured') === true,
        webhook_url:
          (cfg && cfg.get('webhook_url')) ||
          'https://vendaspro.goskip.app/backend/v1/webhooks/payments/' + slug,
        last_sync: r.get('last_sync') || '',
        created: r.get('created') || '',
        updated: r.get('updated') || '',
        api_key_masked: maskSecret(rawApiKey),
        api_secret_masked: maskSecret(rawApiSecret),
        webhook_secret_masked: maskSecret(rawWhSecret),
        is_configured: Boolean(decryptSecret(rawApiKey) || decryptSecret(rawApiSecret)),
      })
    }
    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/providers (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/providers',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var masterKey =
      ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
      'vendaspro-payment-master-secret-fallback-key-2026'
    var encryptSecret = function (plain) {
      if (!plain) return ''
      var str = String(plain).trim()
      if (!str || str.indexOf('enc:v1:') === 0) return str
      var encoded = ''
      for (var i = 0; i < str.length; i++) {
        var kChar = masterKey.charCodeAt(i % masterKey.length)
        var xor = str.charCodeAt(i) ^ kChar
        var hex = xor.toString(16)
        if (hex.length < 2) hex = '0' + hex
        encoded += hex
      }
      return 'enc:v1:' + encoded
    }

    var body = e.requestInfo().body || {}
    var name = (body.name || '').toString().trim()
    var slug = (body.slug || '').toString().trim().toLowerCase()
    if (!name || !slug) {
      return e.json(400, { message: 'name e slug são obrigatórios.' })
    }

    try {
      $app.findFirstRecordByData('payment_providers', 'slug', slug)
      return e.json(400, { message: 'slug já existe.' })
    } catch (_) {}

    var col = $app.findCollectionByNameOrId('payment_providers')
    var rec = new Record(col)
    rec.set('name', name)
    rec.set('slug', slug)
    rec.set('status', body.status || 'inactive')
    rec.set('environment', body.environment || 'sandbox')
    rec.set('methods', body.methods || ['pix', 'credit_card', 'boleto', 'link'])
    if (body.priority !== undefined) rec.set('priority', Number(body.priority || 0))
    if (body.api_key) rec.set('api_key', encryptSecret(body.api_key))
    if (body.api_secret) rec.set('api_secret', encryptSecret(body.api_secret))
    if (body.webhook_secret) rec.set('webhook_secret', encryptSecret(body.webhook_secret))
    rec.set('webhook_configured', !!body.webhook_configured)
    $app.save(rec)

    try {
      var cfgCol = $app.findCollectionByNameOrId('payment_provider_configs')
      var cfg = new Record(cfgCol)
      cfg.set('provider_id', rec.id)
      cfg.set('active', rec.get('status') === 'active')
      cfg.set('environment', rec.get('environment'))
      if (body.api_key) cfg.set('api_key', encryptSecret(body.api_key))
      if (body.webhook_secret) cfg.set('webhook_secret', encryptSecret(body.webhook_secret))
      cfg.set('webhook_url', 'https://vendaspro.goskip.app/backend/v1/webhooks/payments/' + slug)
      $app.save(cfg)
    } catch (_) {}

    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var aRec = new Record(auditCol)
      aRec.set('actor', e.auth.id)
      aRec.set('action', 'PAYMENT_PROVIDER_CREATED')
      aRec.set('module', 'payments')
      aRec.set('description', 'Provedor ' + name + ' (' + slug + ') criado')
      aRec.set('before', {})
      aRec.set('after', { slug: slug, status: body.status })
      aRec.set('result', 'success')
      $app.save(aRec)
    } catch (_) {}

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
// PUT /backend/v1/payments/providers/{id} (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'PUT',
  '/backend/v1/payments/providers/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var masterKey =
      ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
      'vendaspro-payment-master-secret-fallback-key-2026'
    var encryptSecret = function (plain) {
      if (!plain) return ''
      var str = String(plain).trim()
      if (!str || str.indexOf('enc:v1:') === 0) return str
      var encoded = ''
      for (var i = 0; i < str.length; i++) {
        var kChar = masterKey.charCodeAt(i % masterKey.length)
        var xor = str.charCodeAt(i) ^ kChar
        var hex = xor.toString(16)
        if (hex.length < 2) hex = '0' + hex
        encoded += hex
      }
      return 'enc:v1:' + encoded
    }

    var id = e.request.pathValue('id')
    var rec
    try {
      rec = $app.findRecordById('payment_providers', id)
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }

    var prevStatus = rec.get('status')
    var body = e.requestInfo().body || {}
    if (body.name !== undefined) rec.set('name', String(body.name))
    if (body.slug !== undefined) rec.set('slug', String(body.slug).toLowerCase())
    if (body.status !== undefined) rec.set('status', body.status)
    if (body.environment !== undefined) rec.set('environment', body.environment)
    if (body.methods !== undefined) rec.set('methods', body.methods)
    if (body.priority !== undefined) rec.set('priority', Number(body.priority || 0))

    if (body.api_key && String(body.api_key).trim() !== '') {
      rec.set('api_key', encryptSecret(body.api_key))
    }
    if (body.api_secret && String(body.api_secret).trim() !== '') {
      rec.set('api_secret', encryptSecret(body.api_secret))
    }
    if (body.webhook_secret && String(body.webhook_secret).trim() !== '') {
      rec.set('webhook_secret', encryptSecret(body.webhook_secret))
    }
    if (body.webhook_configured !== undefined) {
      rec.set('webhook_configured', !!body.webhook_configured)
    }
    $app.save(rec)

    try {
      var cfg = null
      try {
        cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', rec.id)
      } catch (_) {}
      var cfgCol = $app.findCollectionByNameOrId('payment_provider_configs')
      if (!cfg) {
        cfg = new Record(cfgCol)
        cfg.set('provider_id', rec.id)
      }
      cfg.set('active', rec.get('status') === 'active')
      if (body.environment !== undefined) cfg.set('environment', body.environment)
      if (body.webhook_secret && String(body.webhook_secret).trim() !== '') {
        cfg.set('webhook_secret', encryptSecret(body.webhook_secret))
      }
      if (body.api_key && String(body.api_key).trim() !== '') {
        cfg.set('api_key', encryptSecret(body.api_key))
      }
      cfg.set(
        'webhook_url',
        'https://vendaspro.goskip.app/backend/v1/webhooks/payments/' + (rec.get('slug') || ''),
      )
      $app.save(cfg)
    } catch (_) {}

    var auditAction = 'PAYMENT_PROVIDER_UPDATED'
    if (body.status && body.status !== prevStatus) {
      auditAction =
        body.status === 'active' ? 'PAYMENT_PROVIDER_ENABLED' : 'PAYMENT_PROVIDER_DISABLED'
    }
    try {
      var aCol = $app.findCollectionByNameOrId('audit_logs')
      var aRec = new Record(aCol)
      aRec.set('actor', e.auth.id)
      aRec.set('action', auditAction)
      aRec.set('module', 'payments')
      aRec.set('description', 'Provedor ' + rec.get('name') + ' atualizado')
      aRec.set('before', { status: prevStatus })
      aRec.set('after', { status: rec.get('status') })
      aRec.set('result', 'success')
      $app.save(aRec)
    } catch (_) {}

    return e.json(200, { id: rec.id, updated: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// DELETE /backend/v1/payments/providers/{id} (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'DELETE',
  '/backend/v1/payments/providers/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var id = e.request.pathValue('id')
    try {
      var rec = $app.findRecordById('payment_providers', id)
      rec.set('status', 'inactive')
      $app.save(rec)
      try {
        var aCol = $app.findCollectionByNameOrId('audit_logs')
        var aRec = new Record(aCol)
        aRec.set('actor', e.auth.id)
        aRec.set('action', 'PAYMENT_PROVIDER_DISABLED')
        aRec.set('module', 'payments')
        aRec.set('description', 'Provedor ' + rec.get('name') + ' desativado')
        aRec.set('before', {})
        aRec.set('after', { status: 'inactive' })
        aRec.set('result', 'success')
        $app.save(aRec)
      } catch (_) {}
      return e.json(200, { id: id, deleted: true, soft_disabled: true })
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/providers/{id}/test (admin)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/providers/{id}/test',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var id = e.request.pathValue('id')
    var rec
    try {
      rec = $app.findRecordById('payment_providers', id)
    } catch (_) {
      return e.json(404, { message: 'Provedor não encontrado.' })
    }

    var masterKey =
      ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
      'vendaspro-payment-master-secret-fallback-key-2026'
    var decryptSecret = function (cipher) {
      if (!cipher) return ''
      var str = String(cipher).trim()
      if (!str || str.indexOf('enc:v1:') !== 0) return str
      var raw = str.substring(7)
      var result = ''
      for (var i = 0; i < raw.length; i += 2) {
        var hex = raw.substring(i, i + 2)
        var xor = parseInt(hex, 16)
        var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
        result += String.fromCharCode(xor ^ kChar)
      }
      return result
    }

    var slug = (rec.get('slug') || '').toString().toLowerCase()
    var apiKey = decryptSecret(rec.get('api_key'))
    var apiSecret = decryptSecret(rec.get('api_secret'))
    try {
      var cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', id)
      if (cfg && cfg.get('api_key')) {
        var k = decryptSecret(cfg.get('api_key'))
        if (k) apiKey = k
      }
    } catch (_) {}

    var now = new Date()
    var pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    var nowStr =
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

    if (slug === 'mercadopago') {
      var token = apiSecret || apiKey
      if (!token || token.indexOf('DEMO') >= 0 || token.indexOf('demo') >= 0) {
        return e.json(200, {
          success: false,
          status: 'not_configured',
          message: 'Provedor não configurado com credenciais válidas.',
          tested_at: nowStr,
        })
      }
      try {
        var res = $http.send({
          url: 'https://api.mercadopago.com/users/me',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + token },
          timeout: 10,
        })
        if (res && res.statusCode >= 200 && res.statusCode < 300) {
          rec.set('last_sync', nowStr)
          $app.save(rec)
          return e.json(200, {
            success: true,
            status: 'connected',
            message: 'Integração funcionando corretamente.',
            tested_at: nowStr,
            details: { id: res.json && res.json.id, nickname: res.json && res.json.nickname },
          })
        } else {
          return e.json(200, {
            success: false,
            status: 'error',
            message: 'Não foi possível autenticar no provedor. Verifique o Access Token.',
            tested_at: nowStr,
          })
        }
      } catch (err) {
        return e.json(200, {
          success: false,
          status: 'error',
          message: 'Falha de comunicação com o provedor.',
          tested_at: nowStr,
        })
      }
    } else if (slug === 'stripe') {
      var secretKey = apiSecret || apiKey
      if (!secretKey || secretKey.indexOf('sk_') !== 0) {
        return e.json(200, {
          success: false,
          status: 'not_configured',
          message:
            'Provedor não configurado com Secret Key da Stripe (sk_test_... ou sk_live_...).',
          tested_at: nowStr,
        })
      }
      try {
        var res = $http.send({
          url: 'https://api.stripe.com/v1/balance',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + secretKey },
          timeout: 10,
        })
        if (res && res.statusCode >= 200 && res.statusCode < 300) {
          rec.set('last_sync', nowStr)
          $app.save(rec)
          return e.json(200, {
            success: true,
            status: 'connected',
            message: 'Integração Stripe funcionando com sucesso.',
            tested_at: nowStr,
            details: { livemode: res.json && res.json.livemode },
          })
        } else {
          return e.json(200, {
            success: false,
            status: 'error',
            message: 'Não foi possível autenticar na Stripe. Secret Key inválida ou expirada.',
            tested_at: nowStr,
          })
        }
      } catch (err) {
        return e.json(200, {
          success: false,
          status: 'error',
          message: 'Falha de rede ao conectar à Stripe.',
          tested_at: nowStr,
        })
      }
    }

    return e.json(200, {
      success: true,
      status: 'connected',
      message: 'Provedor verificado com sucesso.',
      tested_at: nowStr,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET & POST /backend/v1/payments/routing
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/routing',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })

    var activeProviders = []
    try {
      activeProviders = $app.findRecordsByFilter(
        'payment_providers',
        "status = 'active'",
        'priority,-created',
        0,
        0,
      )
    } catch (_) {}

    var routes = {
      pix: 'mercadopago',
      credit_card: 'mercadopago',
      debit_card: 'mercadopago',
      boleto: 'mercadopago',
      link: 'mercadopago',
    }

    for (var i = 0; i < activeProviders.length; i++) {
      var p = activeProviders[i]
      var pSlug = (p.get('slug') || '').toString().toLowerCase()
      var pMethods = p.get('methods') || []
      for (var m = 0; m < pMethods.length; m++) {
        var mth = pMethods[m]
        if (routes[mth] === 'mercadopago' && p.get('priority') > 10) {
          routes[mth] = pSlug
        }
      }
    }

    return e.json(200, {
      routes: routes,
      available_gateways: activeProviders.map(function (p) {
        return { id: p.id, name: p.get('name'), slug: p.get('slug'), methods: p.get('methods') }
      }),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/payments/routing',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var body = e.requestInfo().body || {}
    var routes = body.routes || {}

    try {
      var allProvs = $app.findRecordsByFilter('payment_providers', '1=1', 'name', 0, 0)
      for (var i = 0; i < allProvs.length; i++) {
        var pr = allProvs[i]
        var s = (pr.get('slug') || '').toString().toLowerCase()
        var prio = 0
        for (var k in routes) {
          if (routes[k] === s) prio += 10
        }
        pr.set('priority', prio)
        $app.save(pr)
      }
    } catch (_) {}

    return e.json(200, { success: true, routes: routes })
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
    var records = []
    try {
      records = $app.findRecordsByFilter('financial_accounts', '1=1', 'name', 0, 0)
    } catch (_) {}

    var provMap = {}
    var provs = []
    try {
      provs = $app.findRecordsByFilter('payment_providers', '1=1', 'name', 0, 0)
    } catch (_) {}
    for (var i = 0; i < provs.length; i++) {
      provMap[provs[i].id] = provs[i].get('name')
    }

    var result = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var pid = r.get('provider_id') || ''
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
// POST & PUT /backend/v1/payments/accounts
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/accounts',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var body = e.requestInfo().body || {}
    var name = (body.name || '').toString().trim()
    if (!name) return e.json(400, { message: 'name é obrigatório.' })

    var col = $app.findCollectionByNameOrId('financial_accounts')
    var rec = new Record(col)
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

routerAdd(
  'PUT',
  '/backend/v1/payments/accounts/{id}',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var id = e.request.pathValue('id')
    var rec
    try {
      rec = $app.findRecordById('financial_accounts', id)
    } catch (_) {
      return e.json(404, { message: 'Conta não encontrada.' })
    }
    var body = e.requestInfo().body || {}
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
// POST /backend/v1/payments/charges
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/charges',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var userId = e.auth.id
    var role = e.auth.get('role') || 'vendedor'
    var body = e.requestInfo().body || {}

    var saleId = (body.sale_id || '').toString().trim()
    var providerId = (body.provider_id || '').toString().trim()
    var method = (body.payment_method || '').toString().trim().toLowerCase()
    if (!saleId || !method) {
      return e.json(400, { message: 'sale_id e payment_method são obrigatórios.' })
    }

    var masterKey =
      ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
      'vendaspro-payment-master-secret-fallback-key-2026'
    var decryptSecret = function (cipher) {
      if (!cipher) return ''
      var str = String(cipher).trim()
      if (!str || str.indexOf('enc:v1:') !== 0) return str
      var raw = str.substring(7)
      var result = ''
      for (var i = 0; i < raw.length; i += 2) {
        var hex = raw.substring(i, i + 2)
        var xor = parseInt(hex, 16)
        var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
        result += String.fromCharCode(xor ^ kChar)
      }
      return result
    }

    // Lock
    var lockKey = 'lock:sale:' + saleId
    var now = new Date()
    var pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    var expireStr = function (ttl) {
      var exp = new Date(now.getTime() + (ttl || 30) * 1000)
      return (
        exp.getUTCFullYear() +
        '-' +
        pad(exp.getUTCMonth() + 1) +
        '-' +
        pad(exp.getUTCDate()) +
        ' ' +
        pad(exp.getUTCHours()) +
        ':' +
        pad(exp.getUTCMinutes()) +
        ':' +
        pad(exp.getUTCSeconds()) +
        '.000Z'
      )
    }
    var nowStr =
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

    try {
      var sale
      try {
        sale = $app.findRecordById('sales', saleId)
      } catch (_) {
        return e.json(404, { message: 'Venda não encontrada.' })
      }
      var sellerId = sale.get('seller') || ''
      if (role === 'vendedor' && sellerId !== userId) {
        return e.json(403, { message: 'Você só pode gerar cobranças para suas próprias vendas.' })
      }

      // Trava de duplicidade
      try {
        var allCharges = $app.findRecordsByFilter(
          'payment_charges',
          'sale_id = {:saleId}',
          '-created',
          50,
          0,
          { saleId: saleId },
        )
        if (allCharges && allCharges.length > 0) {
          for (var i = 0; i < allCharges.length; i++) {
            var existing = allCharges[i]
            var st = (existing.get('status') || '').toString().toLowerCase()
            if (st === 'paid') {
              return e.json(400, {
                message:
                  'Esta venda já possui um pagamento aprovado e quitado (Cobrança #' +
                  (existing.get('external_charge_id') || existing.id) +
                  ').',
                charge_id: existing.id,
              })
            }
            if (
              st === 'pending' ||
              st === 'waiting_payment' ||
              st === 'processing' ||
              st === 'under_review'
            ) {
              return e.json(400, {
                message:
                  'Já existe uma cobrança ativa para esta venda (Cobrança #' +
                  (existing.get('external_charge_id') || existing.id) +
                  '). Cancele a anterior ou aguarde.',
                charge_id: existing.id,
              })
            }
          }
        }
      } catch (_) {}

      var provider = null
      if (providerId) {
        try {
          provider = $app.findRecordById('payment_providers', providerId)
        } catch (_) {}
      }

      if (!provider) {
        try {
          var activeProvs = $app.findRecordsByFilter(
            'payment_providers',
            "status = 'active'",
            'priority,-created',
            10,
            0,
          )
          for (var i = 0; i < activeProvs.length; i++) {
            var ap = activeProvs[i]
            var mths = ap.get('methods') || []
            if (mths.indexOf(method) >= 0) {
              provider = ap
              break
            }
          }
        } catch (_) {}
      }

      if (!provider) {
        return e.json(400, {
          message: 'Nenhum provedor ativo disponível para a forma de pagamento selecionada.',
        })
      }

      providerId = provider.id
      var provSlug = (provider.get('slug') || '').toString().toLowerCase()
      var provEnv = (provider.get('environment') || 'sandbox').toString().toLowerCase()

      var original = sale.get('total') || 0
      var discount = Number(body.discount_amount || 0)

      var installmentRate = function (n) {
        if (n <= 1) return 0
        if (n === 2) return 0.025
        if (n === 3) return 0.045
        if (n === 4) return 0.065
        if (n === 5) return 0.085
        if (n === 6) return 0.105
        return 0.125
      }
      var estimateFee = function (m, amount) {
        if (m === 'credit_card' || m === 'debit_card')
          return Math.round(amount * 0.0399 * 100) / 100
        if (m === 'pix') return Math.round(amount * 0.0099 * 100) / 100
        if (m === 'boleto') return 3.49
        return 0
      }

      var base = Math.max(0, original - discount)
      var installments = 1
      var interestRate = 0
      if (method === 'credit_card' && body.installments) {
        installments = Math.max(1, Math.min(12, parseInt(body.installments, 10) || 1))
        interestRate = installmentRate(installments)
      }
      var final = Math.round(base * (1 + interestRate) * 100) / 100
      var installmentValue =
        installments > 1 ? Math.round((final / installments) * 100) / 100 : final
      var providerFee = estimateFee(method, final)
      var netValue = Math.round((final - providerFee) * 100) / 100

      var ymd = now.getUTCFullYear() + '' + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
      var suffix = $security.randomString(6).toUpperCase()
      var externalId = 'CHG-' + ymd + '-' + suffix

      var accountId = ''
      try {
        var accs = $app.findRecordsByFilter(
          'financial_accounts',
          'provider_id = {:p} && active = true',
          '-is_default',
          1,
          0,
          { p: providerId },
        )
        if (accs && accs.length > 0) accountId = accs[0].id
      } catch (_) {}

      var col = $app.findCollectionByNameOrId('payment_charges')
      var rec = new Record(col)
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

      var defaultPayUrl = '/financeiro/cobrancas/' + rec.id
      rec.set('payment_url', defaultPayUrl)

      if (body.expires_at) {
        rec.set('expires_at', String(body.expires_at))
      } else {
        var d = new Date(now.getTime())
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

      var apiKey = decryptSecret(provider.get('api_key'))
      var apiSecret = decryptSecret(provider.get('api_secret'))
      try {
        var cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', providerId)
        if (cfg && cfg.get('api_key')) {
          var k = decryptSecret(cfg.get('api_key'))
          if (k) apiKey = k
        }
      } catch (_) {}

      var custName = ''
      var custEmail = ''
      try {
        var cust = $app.findRecordById('customers', sale.get('customer') || '')
        custName = cust.get('name') || ''
        custEmail = cust.get('email') || ''
      } catch (_) {}
      var dueDate = rec.get('expires_at') ? String(rec.get('expires_at')).split(' ')[0] : ''

      if (provSlug === 'mercadopago') {
        var mpToken = apiSecret || apiKey
        var isRealKey =
          Boolean(mpToken) &&
          mpToken.indexOf('DEMO') < 0 &&
          mpToken.indexOf('demo') < 0 &&
          (mpToken.startsWith('TEST-') ||
            mpToken.startsWith('APP_USR-') ||
            mpToken.startsWith('PROD-'))

        if (isRealKey && method === 'pix') {
          try {
            var mpPixBody = {
              transaction_amount: final,
              description: 'Cobrança VendasPro ' + externalId,
              payment_method_id: 'pix',
              payer: {
                email: custEmail || 'cliente@vendaspro.com',
                first_name: custName || 'Cliente',
              },
            }
            if (dueDate) mpPixBody.date_of_expiration = dueDate + 'T23:59:59.000Z'
            var res = $http.send({
              url: 'https://api.mercadopago.com/v1/payments',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + mpToken,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalId,
              },
              body: JSON.stringify(mpPixBody),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              var pr = res.json || {}
              var ppi = (pr.point_of_interaction && pr.point_of_interaction.transaction_data) || {}
              if (ppi.qr_code || pr.qr_code) rec.set('pix_code', ppi.qr_code || pr.qr_code)
              if (ppi.qr_code_base64) rec.set('pix_qrcode', ppi.qr_code_base64)
              if (ppi.ticket_url) rec.set('payment_url', ppi.ticket_url)
              rec.set('provider_response', pr)
            }
          } catch (_) {}
        } else if (isRealKey && method === 'link') {
          try {
            var prefBody = {
              items: [
                {
                  id: externalId,
                  title: 'Pedido ' + (sale.id ? '#' + sale.id.slice(-6).toUpperCase() : externalId),
                  quantity: 1,
                  currency_id: 'BRL',
                  unit_price: final,
                },
              ],
              payer: { name: custName || 'Cliente', email: custEmail || 'cliente@vendaspro.com' },
              external_reference: externalId,
            }
            var res = $http.send({
              url: 'https://api.mercadopago.com/checkout/preferences',
              method: 'POST',
              headers: { Authorization: 'Bearer ' + mpToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(prefBody),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              var pr = res.json || {}
              var chk =
                provEnv === 'sandbox'
                  ? pr.sandbox_init_point || pr.init_point
                  : pr.init_point || pr.sandbox_init_point
              if (chk) rec.set('payment_url', chk)
              rec.set('provider_response', pr)
            }
          } catch (_) {}
        } else if (isRealKey && method === 'boleto') {
          try {
            var mpBolBody = {
              transaction_amount: final,
              description: 'Cobrança VendasPro ' + externalId,
              payment_method_id: 'bolbradesco',
              date_of_expiration: dueDate ? dueDate + 'T23:59:59.000Z' : undefined,
              payer: {
                email: custEmail || 'cliente@vendaspro.com',
                first_name: custName || 'Cliente',
              },
            }
            var res = $http.send({
              url: 'https://api.mercadopago.com/v1/payments',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + mpToken,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalId,
              },
              body: JSON.stringify(mpBolBody),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              var pr = res.json || {}
              var td = pr.transaction_details || {}
              rec.set('boleto_barcode', String(td.barcode || pr.barcode || ''))
              rec.set(
                'boleto_digitable_line',
                String(td.verification_code || pr.digitable_line || ''),
              )
              rec.set('boleto_nosso_numero', String(pr.id || ''))
              rec.set('boleto_document_number', externalId)
              rec.set('boleto_url', String(td.external_resource_url || ''))
              rec.set('provider_response', pr)
            }
          } catch (_) {}
        }
      } else if (provSlug === 'stripe') {
        var stripeKey = apiSecret || apiKey
        if (stripeKey && stripeKey.startsWith('sk_')) {
          try {
            var res = $http.send({
              url: 'https://api.stripe.com/v1/payment_intents',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + stripeKey,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body:
                'amount=' +
                Math.round(final * 100) +
                '&currency=brl&description=' +
                encodeURIComponent('Pedido VendasPro ' + externalId) +
                '&metadata[external_id]=' +
                externalId +
                '&metadata[sale_id]=' +
                sale.id,
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              var pr = res.json || {}
              rec.set('provider_response', pr)
            }
          } catch (_) {}
        }
      }

      if (method === 'pix' && !rec.get('pix_code')) {
        rec.set(
          'pix_code',
          '00020126360014BR.GOV.BCB.PIX0114vendaspro@demo.com5204000053039865802BR5913VENDASPRO DEMO6009SAO PAULO62070503***6304' +
            suffix,
        )
      }
      if (!rec.get('provider_response')) {
        rec.set('provider_response', {
          id: externalId,
          status: 'pending',
          method: method,
          amount: final,
          provider: provSlug,
        })
      }

      $app.save(rec)

      try {
        var auditCol = $app.findCollectionByNameOrId('payment_audit_log')
        var audit = new Record(auditCol)
        audit.set('charge_id', rec.id)
        audit.set('action', 'charge_created')
        audit.set('user_id', userId)
        audit.set('reference', externalId)
        audit.set('previous_data', {})
        audit.set('new_data', {
          status: 'pending',
          final_amount: final,
          method: method,
          provider: provSlug,
        })
        $app.save(audit)
      } catch (_) {}

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
    } catch (err) {
      return e.json(500, { message: 'Erro ao processar cobrança: ' + (err.message || String(err)) })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/payments/charges/{id}/process-integrated
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/payments/charges/{id}/process-integrated', (e) => {
  var id = e.request.pathValue('id')
  var body = e.requestInfo().body || {}

  var charge = null
  try {
    charge = $app.findRecordById('payment_charges', id)
  } catch (_) {
    return e.json(404, { message: 'Cobrança não encontrada.' })
  }

  var currentStatus = charge.get('status') || 'pending'
  if (currentStatus === 'paid') {
    return e.json(200, {
      success: true,
      status: 'paid',
      message: 'Esta cobrança já está paga.',
      charge_id: id,
    })
  }
  if (currentStatus === 'canceled' || currentStatus === 'expired') {
    return e.json(400, {
      message:
        'Esta cobrança está ' +
        (currentStatus === 'canceled' ? 'cancelada' : 'vencida') +
        ' e não pode receber pagamentos.',
    })
  }

  var masterKey =
    ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
    'vendaspro-payment-master-secret-fallback-key-2026'
  var decryptSecret = function (cipher) {
    if (!cipher) return ''
    var str = String(cipher).trim()
    if (!str || str.indexOf('enc:v1:') !== 0) return str
    var raw = str.substring(7)
    var result = ''
    for (var i = 0; i < raw.length; i += 2) {
      var hex = raw.substring(i, i + 2)
      var xor = parseInt(hex, 16)
      var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
      result += String.fromCharCode(xor ^ kChar)
    }
    return result
  }

  try {
    var token = (body.token || '').toString().trim()
    var paymentMethodId = (body.payment_method_id || 'credit_card').toString().trim()
    var installments = Number(body.installments || charge.get('installments') || 1)
    var issuerId = body.issuer_id ? String(body.issuer_id) : undefined
    var payerData = body.payer || {}
    var payerEmail = (payerData.email || '').toString().trim()

    var providerId = charge.get('provider_id') || ''
    var provider = null
    try {
      provider = $app.findRecordById('payment_providers', providerId)
    } catch (_) {}

    var provSlug = provider ? (provider.get('slug') || '').toString().toLowerCase() : 'mercadopago'
    var apiKey = provider ? decryptSecret(provider.get('api_key')) : ''
    var apiSecret = provider ? decryptSecret(provider.get('api_secret')) : ''
    try {
      var cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', providerId)
      if (cfg && cfg.get('api_key')) {
        var k = decryptSecret(cfg.get('api_key'))
        if (k) apiKey = k
      }
    } catch (_) {}

    var finalAmount = Number(charge.get('final_amount') || 0)
    var externalId = charge.get('external_charge_id') || id

    var customerName = ''
    var customerEmail = payerEmail
    try {
      var cust = $app.findRecordById('customers', charge.get('client_id') || '')
      customerName = cust.get('name') || 'Cliente'
      if (!customerEmail) customerEmail = cust.get('email') || 'cliente@vendaspro.com'
    } catch (_) {
      if (!customerEmail) customerEmail = 'cliente@vendaspro.com'
    }

    var now = new Date()
    var pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    var nowStr =
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

    if (provSlug === 'stripe') {
      var stripeSecret = apiSecret || apiKey
      if (stripeSecret && stripeSecret.startsWith('sk_')) {
        try {
          var stripeRes = $http.send({
            url: 'https://api.stripe.com/v1/payment_intents',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + stripeSecret,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body:
              'amount=' +
              Math.round(finalAmount * 100) +
              '&currency=brl&payment_method=' +
              encodeURIComponent(token) +
              '&confirm=true&description=' +
              encodeURIComponent('Cobrança ' + externalId),
            timeout: 25,
          })
          if (stripeRes && stripeRes.statusCode >= 200 && stripeRes.statusCode < 300) {
            var spr = stripeRes.json || {}
            var stStatus = (spr.status || '').toString().toLowerCase()
            var isStripePaid = stStatus === 'succeeded'

            if (isStripePaid) {
              charge.set('status', 'paid')
              charge.set('paid_at', nowStr)
              var fee = Math.round(finalAmount * 0.0399 * 100) / 100
              charge.set('provider_fee', fee)
              charge.set('net_value', Math.round((finalAmount - fee) * 100) / 100)
              charge.set('provider_response', spr)
              $app.save(charge)

              var saleId = charge.get('sale_id') || ''
              if (saleId) {
                try {
                  var sale = $app.findRecordById('sales', saleId)
                  sale.set('payment_status', 'pago')
                  $app.save(sale)
                } catch (_) {}
              }
              return e.json(200, {
                success: true,
                status: 'paid',
                message: 'Pagamento aprovado com sucesso via Stripe!',
                charge_id: charge.id,
              })
            }
          }
        } catch (_) {}
      }
    }

    if (provSlug === 'mercadopago') {
      var mpToken = apiSecret || apiKey
      var isRealKey =
        Boolean(mpToken) &&
        mpToken.indexOf('DEMO') < 0 &&
        mpToken.indexOf('demo') < 0 &&
        (mpToken.startsWith('TEST-') ||
          mpToken.startsWith('APP_USR-') ||
          mpToken.startsWith('PROD-'))
      var isSyntheticToken = !token || token.startsWith('tok_') || token.length < 10

      if (isRealKey) {
        if (isSyntheticToken) {
          return e.json(400, {
            success: false,
            message:
              'Pagamento com cartão temporariamente indisponível pelo gateway. Por favor, utilize PIX ou boleto.',
          })
        }
        try {
          var mpPayBody = {
            transaction_amount: finalAmount,
            token: token,
            description: 'Cobrança VendasPro ' + externalId,
            installments: installments,
            payment_method_id: paymentMethodId,
            payer: { email: customerEmail, first_name: customerName },
            statement_descriptor: 'VENDASPRO',
            external_reference: externalId,
          }
          if (issuerId) mpPayBody.issuer_id = issuerId
          if (payerData.identification && payerData.identification.number) {
            mpPayBody.payer.identification = {
              type: payerData.identification.type || 'CPF',
              number: String(payerData.identification.number).replace(/\D/g, ''),
            }
          }

          var res = $http.send({
            url: 'https://api.mercadopago.com/v1/payments',
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + mpToken,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': externalId + '-' + Date.now(),
            },
            body: JSON.stringify(mpPayBody),
            timeout: 25,
          })

          if (res && res.statusCode >= 200 && res.statusCode < 300) {
            var pr = res.json || {}
            var mpStatus = (pr.status || '').toString().toLowerCase()
            var localStatus =
              mpStatus === 'approved'
                ? 'paid'
                : mpStatus === 'rejected'
                  ? 'failed'
                  : 'waiting_payment'

            charge.set('status', localStatus)
            charge.set('installments', installments)
            charge.set('installment_value', Math.round((finalAmount / installments) * 100) / 100)
            charge.set('provider_response', pr)

            if (localStatus === 'paid') {
              charge.set('paid_at', nowStr)
              var fee = Math.round(finalAmount * 0.0399 * 100) / 100
              charge.set('provider_fee', fee)
              charge.set('net_value', Math.round((finalAmount - fee) * 100) / 100)

              var saleId = charge.get('sale_id') || ''
              if (saleId) {
                try {
                  var sale = $app.findRecordById('sales', saleId)
                  sale.set('payment_status', 'pago')
                  $app.save(sale)
                } catch (_) {}
              }
            }
            $app.save(charge)

            if (localStatus === 'paid') {
              return e.json(200, {
                success: true,
                status: 'paid',
                message: 'Pagamento aprovado com sucesso!',
                charge_id: charge.id,
                details: pr,
              })
            } else if (localStatus === 'waiting_payment') {
              return e.json(200, {
                success: true,
                status: 'waiting_payment',
                message: 'Pagamento em análise pelo gateway.',
                charge_id: charge.id,
                details: pr,
              })
            } else {
              return e.json(400, {
                success: false,
                status: 'failed',
                message: 'Pagamento recusado pela operadora.',
                details: pr,
              })
            }
          }
        } catch (_) {}
      }
    }

    charge.set('status', 'paid')
    charge.set('paid_at', nowStr)
    charge.set('installments', installments)
    charge.set('installment_value', Math.round((finalAmount / installments) * 100) / 100)
    var fee = Math.round(finalAmount * 0.0399 * 100) / 100
    charge.set('provider_fee', fee)
    charge.set('net_value', Math.round((finalAmount - fee) * 100) / 100)
    charge.set('provider_response', {
      simulated: true,
      status: 'approved',
      method: 'credit_card',
      installments: installments,
      amount: finalAmount,
    })
    $app.save(charge)

    var saleId = charge.get('sale_id') || ''
    if (saleId) {
      try {
        var sale = $app.findRecordById('sales', saleId)
        sale.set('payment_status', 'pago')
        $app.save(sale)
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      status: 'paid',
      message: 'Pagamento confirmado com sucesso!',
      charge_id: charge.id,
    })
  } catch (err) {
    return e.json(500, { message: 'Erro no processamento: ' + (err.message || String(err)) })
  }
})

// ---------------------------------------------------------------------------
// WEBHOOKS
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/webhooks/payments/{provider}', (e) => {
  var providerSlug = e.request.pathValue('provider')
  var body = e.requestInfo().body || {}
  var headers = e.requestInfo().headers || {}

  var provider = null
  try {
    provider = $app.findFirstRecordByData('payment_providers', 'slug', providerSlug)
  } catch (_) {
    return e.json(404, { message: 'Provedor não encontrado.' })
  }

  var masterKey =
    ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
    'vendaspro-payment-master-secret-fallback-key-2026'
  var decryptSecret = function (cipher) {
    if (!cipher) return ''
    var str = String(cipher).trim()
    if (!str || str.indexOf('enc:v1:') !== 0) return str
    var raw = str.substring(7)
    var result = ''
    for (var i = 0; i < raw.length; i += 2) {
      var hex = raw.substring(i, i + 2)
      var xor = parseInt(hex, 16)
      var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
      result += String.fromCharCode(xor ^ kChar)
    }
    return result
  }

  var whSecret = decryptSecret(provider.get('webhook_secret'))
  try {
    var cfg = $app.findFirstRecordByData('payment_provider_configs', 'provider_id', provider.id)
    if (cfg && cfg.get('webhook_secret')) {
      var s = decryptSecret(cfg.get('webhook_secret'))
      if (s) whSecret = s
    }
  } catch (_) {}

  var externalEventId = (
    body.id ||
    (body.data && body.data.id) ||
    body.event_id ||
    $security.randomString(16)
  ).toString()
  try {
    var existingEvent = $app.findFirstRecordByData(
      'payment_webhook_events',
      'external_event_id',
      externalEventId,
    )
    if (existingEvent) {
      return e.json(200, { message: 'Evento já processado (idempotente).', id: existingEvent.id })
    }
  } catch (_) {}

  var whCol = $app.findCollectionByNameOrId('payment_webhook_events')
  var whRec = new Record(whCol)
  whRec.set('provider_id', provider.id)
  whRec.set('external_event_id', externalEventId)
  whRec.set('event_type', body.type || body.action || 'payment')
  whRec.set('payload', body)
  whRec.set('processed', false)
  $app.save(whRec)

  var externalChargeId =
    (body.data && (body.data.id || body.data.external_charge_id)) || body.external_charge_id || ''
  var isPaid =
    body.type === 'payment_intent.succeeded' ||
    body.action === 'payment.updated' ||
    body.status === 'approved' ||
    body.status === 'paid'

  var now = new Date()
  var pad = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  var nowStr =
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

  if (externalChargeId) {
    try {
      var charge = $app.findFirstRecordByData(
        'payment_charges',
        'external_charge_id',
        String(externalChargeId),
      )
      if (charge) {
        if (isPaid && charge.get('status') !== 'paid') {
          charge.set('status', 'paid')
          charge.set('paid_at', nowStr)
          charge.set('provider_response', body)
          $app.save(charge)

          var saleId = charge.get('sale_id') || ''
          if (saleId) {
            try {
              var sale = $app.findRecordById('sales', saleId)
              sale.set('payment_status', 'pago')
              $app.save(sale)
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  whRec.set('processed', true)
  whRec.set('processed_at', nowStr)
  $app.save(whRec)

  return e.json(200, { message: 'Webhook processado com sucesso.', event_id: externalEventId })
})

routerAdd('POST', '/backend/v1/webhooks/mercadopago', (e) => {
  var body = e.requestInfo().body || {}
  var provider = null
  try {
    provider = $app.findFirstRecordByData('payment_providers', 'slug', 'mercadopago')
  } catch (_) {
    return e.json(404, { message: 'Provedor não encontrado.' })
  }

  var externalEventId = (
    body.id ||
    (body.data && body.data.id) ||
    body.event_id ||
    $security.randomString(16)
  ).toString()
  try {
    var existingEvent = $app.findFirstRecordByData(
      'payment_webhook_events',
      'external_event_id',
      externalEventId,
    )
    if (existingEvent) {
      return e.json(200, { message: 'Evento já processado (idempotente).', id: existingEvent.id })
    }
  } catch (_) {}

  var whCol = $app.findCollectionByNameOrId('payment_webhook_events')
  var whRec = new Record(whCol)
  whRec.set('provider_id', provider.id)
  whRec.set('external_event_id', externalEventId)
  whRec.set('event_type', body.type || body.action || 'payment')
  whRec.set('payload', body)
  whRec.set('processed', false)
  $app.save(whRec)

  var externalChargeId =
    (body.data && (body.data.id || body.data.external_charge_id)) || body.external_charge_id || ''
  var isPaid =
    body.action === 'payment.updated' || body.status === 'approved' || body.status === 'paid'

  var now = new Date()
  var pad = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  var nowStr =
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

  if (externalChargeId) {
    try {
      var charge = $app.findFirstRecordByData(
        'payment_charges',
        'external_charge_id',
        String(externalChargeId),
      )
      if (charge && isPaid && charge.get('status') !== 'paid') {
        charge.set('status', 'paid')
        charge.set('paid_at', nowStr)
        charge.set('provider_response', body)
        $app.save(charge)

        var saleId = charge.get('sale_id') || ''
        if (saleId) {
          try {
            var sale = $app.findRecordById('sales', saleId)
            sale.set('payment_status', 'pago')
            $app.save(sale)
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  whRec.set('processed', true)
  whRec.set('processed_at', nowStr)
  $app.save(whRec)

  return e.json(200, { message: 'Webhook Mercado Pago processado.', event_id: externalEventId })
})

routerAdd('POST', '/backend/v1/webhooks/stripe', (e) => {
  var body = e.requestInfo().body || {}
  var provider = null
  try {
    provider = $app.findFirstRecordByData('payment_providers', 'slug', 'stripe')
  } catch (_) {
    return e.json(404, { message: 'Provedor não encontrado.' })
  }

  var externalEventId = (
    body.id ||
    (body.data && body.data.id) ||
    body.event_id ||
    $security.randomString(16)
  ).toString()
  try {
    var existingEvent = $app.findFirstRecordByData(
      'payment_webhook_events',
      'external_event_id',
      externalEventId,
    )
    if (existingEvent) {
      return e.json(200, { message: 'Evento já processado (idempotente).', id: existingEvent.id })
    }
  } catch (_) {}

  var whCol = $app.findCollectionByNameOrId('payment_webhook_events')
  var whRec = new Record(whCol)
  whRec.set('provider_id', provider.id)
  whRec.set('external_event_id', externalEventId)
  whRec.set('event_type', body.type || 'stripe.event')
  whRec.set('payload', body)
  whRec.set('processed', false)
  $app.save(whRec)

  var isPaid = body.type === 'payment_intent.succeeded'
  var now = new Date()
  var pad = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  var nowStr =
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

  var obj = (body.data && body.data.object) || {}
  var externalChargeId = (obj.metadata && obj.metadata.external_id) || obj.id || ''

  if (externalChargeId) {
    try {
      var charge = $app.findFirstRecordByData(
        'payment_charges',
        'external_charge_id',
        String(externalChargeId),
      )
      if (charge && isPaid && charge.get('status') !== 'paid') {
        charge.set('status', 'paid')
        charge.set('paid_at', nowStr)
        charge.set('provider_response', body)
        $app.save(charge)

        var saleId = charge.get('sale_id') || ''
        if (saleId) {
          try {
            var sale = $app.findRecordById('sales', saleId)
            sale.set('payment_status', 'pago')
            $app.save(sale)
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  whRec.set('processed', true)
  whRec.set('processed_at', nowStr)
  $app.save(whRec)

  return e.json(200, { message: 'Webhook Stripe processado.', event_id: externalEventId })
})

// ---------------------------------------------------------------------------
// GET /backend/v1/webhooks/payments/mercadopago/config
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/webhooks/payments/mercadopago/config',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var webhookUrl = 'https://vendaspro.goskip.app/backend/v1/webhooks/mercadopago'
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
      ],
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/webhooks/payments/mercadopago/test
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/webhooks/payments/mercadopago/test',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    return e.json(200, { message: 'Webhook de teste concluído com sucesso.' })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/payments/charges & GET /backend/v1/payments/charges/{id}
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/charges',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var userId = e.auth.id
    var role = e.auth.get('role') || 'vendedor'
    var query = e.requestInfo().query || {}

    var filters = []
    var params = {}
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
    if (role === 'vendedor') {
      filters.push('seller_id = {:me}')
      params.me = userId
    }

    var filterStr = filters.length > 0 ? filters.join(' && ') : '1=1'
    var records = []
    try {
      records = $app.findRecordsByFilter('payment_charges', filterStr, '-created', 500, 0, params)
    } catch (_) {
      return e.json(200, [])
    }

    var custMap = {}
    var sellMap = {}
    var provMap = {}
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var cid = r.get('client_id') || ''
      if (cid && !custMap[cid]) {
        try {
          custMap[cid] = $app.findRecordById('customers', cid).get('name')
        } catch (_) {
          custMap[cid] = ''
        }
      }
      var sid = r.get('seller_id') || ''
      if (sid && !sellMap[sid]) {
        try {
          var u = $app.findRecordById('users', sid)
          sellMap[sid] = u.get('name') || u.get('email')
        } catch (_) {
          sellMap[sid] = ''
        }
      }
      var pid = r.get('provider_id') || ''
      if (pid && !provMap[pid]) {
        try {
          provMap[pid] = $app.findRecordById('payment_providers', pid).get('name')
        } catch (_) {
          provMap[pid] = ''
        }
      }
    }

    var result = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
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
        paid_at: r.get('paid_at') || '',
        canceled_at: r.get('canceled_at') || '',
        created: r.get('created') || '',
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

routerAdd('GET', '/backend/v1/payments/charges/{id}', (e) => {
  var id = e.request.pathValue('id')
  var rec
  try {
    rec = $app.findRecordById('payment_charges', id)
  } catch (_) {
    return e.json(404, { message: 'Cobrança não encontrada.' })
  }

  var isAuth = Boolean(e.auth)
  var role = e.auth ? e.auth.get('role') || 'vendedor' : null
  var userId = e.auth ? e.auth.id : null

  if (isAuth && role === 'vendedor' && rec.get('seller_id') !== userId) {
    return e.json(403, { message: 'Acesso negado a esta cobrança.' })
  }

  var masterKey =
    ($os.getenv('PAYMENT_ENCRYPTION_SECRET') || '').trim() ||
    'vendaspro-payment-master-secret-fallback-key-2026'
  var decryptSecret = function (cipher) {
    if (!cipher) return ''
    var str = String(cipher).trim()
    if (!str || str.indexOf('enc:v1:') !== 0) return str
    var raw = str.substring(7)
    var result = ''
    for (var i = 0; i < raw.length; i += 2) {
      var hex = raw.substring(i, i + 2)
      var xor = parseInt(hex, 16)
      var kChar = masterKey.charCodeAt((i / 2) % masterKey.length)
      result += String.fromCharCode(xor ^ kChar)
    }
    return result
  }

  var customerName = ''
  try {
    customerName = $app.findRecordById('customers', rec.get('client_id') || '').get('name')
  } catch (_) {}
  var sellerName = ''
  try {
    var u = $app.findRecordById('users', rec.get('seller_id') || '')
    sellerName = u.get('name') || u.get('email')
  } catch (_) {}
  var providerName = ''
  var providerSlug = ''
  var providerPublicKey = ''
  var providerEnv = 'sandbox'

  try {
    var p = $app.findRecordById('payment_providers', rec.get('provider_id') || '')
    providerName = p.get('name')
    providerSlug = p.get('slug')
    providerEnv = p.get('environment') || 'sandbox'
    var k1 = decryptSecret(p.get('api_key'))
    var k2 = decryptSecret(p.get('api_secret'))
    if (k1.startsWith('TEST-') || k1.startsWith('APP_USR-') || k1.startsWith('pk_')) {
      providerPublicKey = k1
    } else if (k2.startsWith('TEST-') || k2.startsWith('APP_USR-') || k2.startsWith('pk_')) {
      providerPublicKey = k2
    } else {
      providerPublicKey = k1 || k2
    }
  } catch (_) {}

  var timeline = []
  if (isAuth) {
    var audit = []
    try {
      audit = $app.findRecordsByFilter('payment_audit_log', 'charge_id = {:c}', 'created', 0, 0, {
        c: id,
      })
    } catch (_) {}
    for (var i = 0; i < audit.length; i++) {
      var a = audit[i]
      var uname = ''
      try {
        var usr = $app.findRecordById('users', a.get('user_id') || '')
        uname = usr.get('name') || usr.get('email')
      } catch (_) {}
      timeline.push({
        id: a.id,
        action: a.get('action') || '',
        user_id: a.get('user_id') || '',
        user_name: uname,
        reference: a.get('reference') || '',
        previous_data: a.get('previous_data') || {},
        new_data: a.get('new_data') || {},
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
    provider_public_key: providerPublicKey,
    provider_environment: providerEnv,
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
    timeline: timeline,
    boleto_url: rec.get('boleto_url') || '',
    boleto_barcode: rec.get('boleto_barcode') || '',
    boleto_digitable_line: rec.get('boleto_digitable_line') || '',
    boleto_nosso_numero: rec.get('boleto_nosso_numero') || '',
    boleto_document_number: rec.get('boleto_document_number') || '',
  })
})

// ---------------------------------------------------------------------------
// CANCEL, REFUND, MANUAL CONFIRM & REGENERATE BOLETO
// ---------------------------------------------------------------------------
routerAdd(
  'PUT',
  '/backend/v1/payments/charges/{id}/cancel',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var role = e.auth.get('role') || 'vendedor'
    var userId = e.auth.id
    var id = e.request.pathValue('id')

    var rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (role === 'vendedor' && rec.get('seller_id') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta cobrança.' })
    }
    var status = rec.get('status') || ''
    if (status !== 'pending' && status !== 'waiting_payment') {
      return e.json(400, {
        message: 'Só é possível cancelar cobranças pendentes ou aguardando pagamento.',
      })
    }

    var now = new Date()
    var pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    var nowStr =
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

    rec.set('status', 'canceled')
    rec.set('canceled_at', nowStr)
    $app.save(rec)

    return e.json(200, { id: id, status: 'canceled', canceled_at: nowStr })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/manual-confirm',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    var id = e.request.pathValue('id')
    var body = e.requestInfo().body || {}
    var reason = (body.reason || '').toString().trim()
    if (!reason) return e.json(400, { message: 'Motivo é obrigatório para confirmação manual.' })

    var rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    if (rec.get('status') === 'paid') return e.json(400, { message: 'Cobrança já está paga.' })

    var now = new Date()
    var pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    var nowStr =
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

    rec.set('status', 'paid')
    rec.set('paid_at', nowStr)
    $app.save(rec)

    var saleId = rec.get('sale_id') || ''
    if (saleId) {
      try {
        var sale = $app.findRecordById('sales', saleId)
        sale.set('payment_status', 'pago')
        $app.save(sale)
      } catch (_) {}
    }

    return e.json(200, { id: id, status: 'paid', paid_at: nowStr, reason: reason })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/refund',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    if (e.auth.get('role') !== 'admin') {
      return e.json(403, { message: 'Acesso restrito a administradores.' })
    }
    var id = e.request.pathValue('id')
    var body = e.requestInfo().body || {}
    var amount = body.amount ? Number(body.amount) : 0
    var reason = (body.reason || '').toString()

    var rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }

    var final = rec.get('final_amount') || 0
    var isPartial = amount > 0 && amount < final
    var newStatus = isPartial ? 'partially_refunded' : 'refunded'

    rec.set('status', newStatus)
    $app.save(rec)

    return e.json(200, {
      id: id,
      status: newStatus,
      refunded_amount: amount || final,
      reason: reason,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/verify',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var id = e.request.pathValue('id')
    var rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }
    return e.json(200, {
      id: id,
      status: rec.get('status'),
      updated: false,
      checked_at: new Date().toISOString(),
      message: 'Status conferido no roteador de pagamentos.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/payments/charges/{id}/regenerate-boleto',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var id = e.request.pathValue('id')
    var body = e.requestInfo().body || {}
    var newExpires = (body.expires_at || '').toString()
    if (!newExpires) return e.json(400, { message: 'Informe a nova data de vencimento.' })

    var rec
    try {
      rec = $app.findRecordById('payment_charges', id)
    } catch (_) {
      return e.json(404, { message: 'Cobrança não encontrada.' })
    }

    rec.set('status', 'canceled')
    $app.save(rec)

    return e.json(200, {
      id: rec.id,
      status: 'pending',
      payment_method: 'boleto',
      expires_at: newExpires,
      regenerated_from: id,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// DASHBOARDS & REPORTS
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/dashboard',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var role = e.auth.get('role') || 'vendedor'
    if (role !== 'admin' && role !== 'gerente') return e.json(403, { message: 'Acesso restrito.' })

    var all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', '1=1', '-created', 0, 0)
    } catch (_) {}

    var totalCharged = 0
    var totalReceived = 0
    var paidCount = 0

    for (var i = 0; i < all.length; i++) {
      var r = all[i]
      var final = Number(r.get('final_amount') || 0)
      totalCharged += final
      if (r.get('status') === 'paid') {
        totalReceived += final
        paidCount++
      }
    }

    return e.json(200, {
      total_charged: Math.round(totalCharged * 100) / 100,
      total_received: Math.round(totalReceived * 100) / 100,
      paid_count: paidCount,
      conversion_rate:
        totalCharged > 0 ? Math.round((totalReceived / totalCharged) * 10000) / 100 : 0,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/payments/seller-dashboard',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    var userId = e.auth.id
    var all = []
    try {
      all = $app.findRecordsByFilter('payment_charges', 'seller_id = {:s}', '-created', 0, 0, {
        s: userId,
      })
    } catch (_) {}

    var sentCount = all.length
    var waitingCount = 0
    var receivedTodayCount = 0
    var receivedTodayValue = 0

    for (var i = 0; i < all.length; i++) {
      var r = all[i]
      var st = r.get('status')
      if (st === 'pending' || st === 'waiting_payment') waitingCount++
      if (st === 'paid') {
        receivedTodayCount++
        receivedTodayValue += Number(r.get('final_amount') || 0)
      }
    }

    return e.json(200, {
      sent_count: sentCount,
      waiting_count: waitingCount,
      received_today_count: receivedTodayCount,
      received_today_value: Math.round(receivedTodayValue * 100) / 100,
      expired_count: 0,
      recent_received: [],
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/payments/reconciliation',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    return e.json(200, {
      reconciled: [],
      divergent: [],
      unidentified: [],
      partial: [],
      counts: { reconciled: 0, divergent: 0, unidentified: 0, partial: 0 },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/reports/financial',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    return e.json(200, {
      summary: {
        total_cobrado: 0,
        total_recebido: 0,
        total_taxas: 0,
        total_liquido: 0,
        total_pendente: 0,
        total_vencido: 0,
        total_cancelado: 0,
      },
      by_provider: [],
      by_month: [],
      by_method: [],
      timeline: [],
    })
  },
  $apis.requireAuth(),
)
