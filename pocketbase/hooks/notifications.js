// Notificações — endpoints para listar, contar não lidas e marcar como lidas.
//
// Rotas registradas:
//   GET /backend/v1/notifications/list            (autenticado) — lista notificações do usuário
//   GET /backend/v1/notifications/unread-count    (autenticado) — { count: N }
//   PUT /backend/v1/notifications/{id}/read       (autenticado) — marca uma como lida
//   PUT /backend/v1/notifications/read-all        (autenticado) — marca todas como lidas
//
// O usuário só vê suas próprias notificações (filtrado por e.auth.id).
// Toda lógica é inline em cada callback (top-level helpers não são acessíveis no JSVM).

// ===========================================================================
// GET /backend/v1/notifications/list
// Query: unread=1 (opcional) — lista apenas não lidas
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/notifications/list',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const userId = e.auth.id
    const query = e.requestInfo().query || {}

    const filters = ['user = {:uid}']
    const params = { uid: userId }
    if (query.unread === '1' || query.unread === 'true') {
      filters.push('is_read = false')
    }
    const filterStr = filters.join(' && ')

    let records = []
    try {
      records = $app.findRecordsByFilter('notifications', filterStr, '-created', 200, 0, params)
    } catch (_) {}

    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      result.push({
        id: r.id,
        user: r.get('user') || userId,
        type: r.get('type') || 'system',
        title: r.get('title') || '',
        message: r.get('message') || '',
        reference_type: r.get('reference_type') || '',
        reference_id: r.get('reference_id') || '',
        is_read: r.get('is_read') === true,
        created: r.get('created') || '',
        updated: r.get('updated') || '',
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/notifications/unread-count
// Retorna { count: N }
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/notifications/unread-count',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const userId = e.auth.id

    let records = []
    try {
      records = $app.findRecordsByFilter(
        'notifications',
        'user = {:uid} && is_read = false',
        '-created',
        0,
        0,
        { uid: userId },
      )
    } catch (_) {}

    return e.json(200, { count: records.length })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// PUT /backend/v1/notifications/{id}/read
// Marca uma notificação específica como lida (apenas se pertencer ao usuário).
// ===========================================================================
routerAdd(
  'PUT',
  '/backend/v1/notifications/{id}/read',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const userId = e.auth.id
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('notifications', id)
    } catch (_) {
      return e.json(404, { message: 'Notificação não encontrada.' })
    }

    if (rec.get('user') !== userId) {
      return e.json(403, { message: 'Acesso negado a esta notificação.' })
    }

    rec.set('is_read', true)
    $app.save(rec)

    return e.json(200, { id: rec.id, is_read: true })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// PUT /backend/v1/notifications/read-all
// Marca todas as notificações não lidas do usuário como lidas.
// ===========================================================================
routerAdd(
  'PUT',
  '/backend/v1/notifications/read-all',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const userId = e.auth.id

    let records = []
    try {
      records = $app.findRecordsByFilter(
        'notifications',
        'user = {:uid} && is_read = false',
        '-created',
        0,
        0,
        { uid: userId },
      )
    } catch (_) {}

    let updated = 0
    for (let i = 0; i < records.length; i++) {
      records[i].set('is_read', true)
      $app.save(records[i])
      updated++
    }

    return e.json(200, { updated: updated })
  },
  $apis.requireAuth(),
)
