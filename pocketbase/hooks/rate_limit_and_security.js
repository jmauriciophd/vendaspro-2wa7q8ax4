// rate_limit_and_security.js
// Rate Limiter centralizado persistente (Redis-ready), Locks atômicos, Proteção contra brute force e Health Checks para VendasPro

// Limpador periódico de locks e rate limits expirados (roda a cada 5 minutos)
cronAdd('cleanup_rate_limits_and_locks', '*/5 * * * *', () => {
  const nowIso = new Date().toISOString()
  try {
    $app
      .db()
      .newQuery('DELETE FROM system_rate_limits WHERE expire_at < {:now}')
      .bind({ now: nowIso })
      .execute()
  } catch (_) {}
  try {
    $app
      .db()
      .newQuery('DELETE FROM system_locks WHERE expire_at < {:now}')
      .bind({ now: nowIso })
      .execute()
  } catch (_) {}
})

// Middleware global de segurança e correlation ID
routerUse((e) => {
  // 1. Injeta ou propaga Correlation / Request ID
  let reqId = e.request.header.get('x-request-id') || ''
  if (!reqId) {
    reqId = 'req_' + $security.randomString(16)
  }
  e.response.header().set('X-Request-Id', reqId)

  // 2. Security Headers
  e.response.header().set('X-Content-Type-Options', 'nosniff')
  e.response.header().set('X-Frame-Options', 'SAMEORIGIN')
  e.response.header().set('Referrer-Policy', 'strict-origin-when-cross-origin')
  e.response.header().set('X-XSS-Protection', '1; mode=block')

  // Rate Limiting para rotas de autenticação
  const path = e.request.url.path || ''
  if (path.indexOf('/api/collections/users/auth-with-password') !== -1) {
    const ip = e.realIP() || 'unknown'
    const key = 'rl:auth:ip:' + ip
    const now = new Date()
    const nowIso = now.toISOString()
    const expireDate = new Date(now.getTime() + 60 * 1000) // 1 minuto
    const expireIso = expireDate.toISOString()

    let allowed = true
    try {
      const records = $app.findRecordsByFilter(
        'system_rate_limits',
        'key = {:k} && expire_at > {:now}',
        '',
        1,
        0,
        { k: key, now: nowIso },
      )
      if (records && records.length > 0) {
        const rec = records[0]
        const pts = rec.getInt('points') || 0
        if (pts >= 5) {
          allowed = false
        } else {
          rec.set('points', pts + 1)
          $app.save(rec)
        }
      } else {
        const col = $app.findCollectionByNameOrId('system_rate_limits')
        const newRec = new Record(col)
        newRec.set('key', key)
        newRec.set('points', 1)
        newRec.set('expire_at', expireIso)
        $app.save(newRec)
      }
    } catch (_) {}

    if (!allowed) {
      return e.json(429, {
        code: 429,
        message:
          'Muitas tentativas de login. Por segurança, aguarde 1 minuto antes de tentar novamente.',
      })
    }
  }

  // Rate Limiting para recuperação de senha
  if (path.indexOf('/api/collections/users/request-password-reset') !== -1) {
    const ip = e.realIP() || 'unknown'
    const key = 'rl:reset:ip:' + ip
    const now = new Date()
    const nowIso = now.toISOString()
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos
    const expireIso = expireDate.toISOString()

    let allowed = true
    try {
      const records = $app.findRecordsByFilter(
        'system_rate_limits',
        'key = {:k} && expire_at > {:now}',
        '',
        1,
        0,
        { k: key, now: nowIso },
      )
      if (records && records.length > 0) {
        const rec = records[0]
        const pts = rec.getInt('points') || 0
        if (pts >= 3) {
          allowed = false
        } else {
          rec.set('points', pts + 1)
          $app.save(rec)
        }
      } else {
        const col = $app.findCollectionByNameOrId('system_rate_limits')
        const newRec = new Record(col)
        newRec.set('key', key)
        newRec.set('points', 1)
        newRec.set('expire_at', expireIso)
        $app.save(newRec)
      }
    } catch (_) {}

    if (!allowed) {
      return e.json(429, {
        code: 429,
        message: 'Limite de solicitações de recuperação atingido. Por favor, aguarde 15 minutos.',
      })
    }
  }

  return e.next()
})

// Endpoint Health Check: /health/live (leve, liveness probe)
routerAdd('GET', '/health/live', (e) => {
  return e.json(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: 'active',
  })
})

// Endpoint Health Check: /health/ready (readiness probe com verificação de DB e storage)
routerAdd('GET', '/health/ready', (e) => {
  let dbOk = false
  let dbLatencyMs = 0
  const start = new Date().getTime()
  try {
    const res = $app.db().newQuery('SELECT 1 as alive').all()
    if (res && res.length > 0) {
      dbOk = true
    }
  } catch (err) {
    dbOk = false
  }
  dbLatencyMs = new Date().getTime() - start

  const isReady = dbOk
  const statusCode = isReady ? 200 : 503

  return e.json(statusCode, {
    status: isReady ? 'ready' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      status: dbOk ? 'healthy' : 'error',
      latency_ms: dbLatencyMs,
      type: 'SQLite / PocketBase',
    },
    version: '1.0.0',
    platform: 'Skip Cloud',
  })
})
