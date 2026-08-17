// Metas por Categoria de Produto — endpoints para CRUD e performance.
//
// Rotas registradas:
//   GET    /backend/v1/category-goals/list            (autenticado) — metas + vendas calculadas
//   GET    /backend/v1/category-goals/performance     (autenticado) — performance por categoria
//   POST   /backend/v1/category-goals/create          (autenticado) — criar meta
//   PUT    /backend/v1/category-goals/{id}            (autenticado) — atualizar meta
//   DELETE /backend/v1/category-goals/{id}            (autenticado) — remover meta
//
// O valor vendido é calculado no backend a partir de vendas pagas (sales + sale_items + products).
// Toda lógica é inline em cada callback (top-level helpers não são acessíveis no JSVM).

// ===========================================================================
// Função utilitária inline: calcula vendas por categoria para um mês/ano.
// Retorna { categoria: { salesValue, quantity } }
// (definida dentro de cada callback que precisa — regra de escopo do JSVM)
// ===========================================================================

// ===========================================================================
// GET /backend/v1/category-goals/list?month=X&year=Y
// Lista metas + vendas calculadas + % atingido
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/category-goals/list',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const query = e.requestInfo().query || {}

    const now = new Date()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()

    if (!month || month < 1 || month > 12 || !year) {
      return e.json(400, { message: 'month (1-12) e year são obrigatórios.' })
    }

    // 1. Busca metas do período
    let goals = []
    try {
      goals = $app.findRecordsByFilter(
        'category_goals',
        'month = {:m} && year = {:y}',
        'category',
        0,
        0,
        { m: month, y: year },
      )
    } catch (_) {}

    // 2. Calcula vendas pagas por categoria no período
    const startStr = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const endStr =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'payment_status = "pago" && sale_date >= {:s} && sale_date < {:e}',
        'sale_date',
        0,
        0,
        { s: startStr, e: endStr },
      )
    } catch (_) {}

    // Map: saleId -> sale (para resolver itens)
    const salesMap = {}
    for (let i = 0; i < sales.length; i++) {
      salesMap[sales[i].id] = sales[i]
    }

    // Busca todos os sale_items dessas vendas + produtos
    const salesByCategory = {} // category -> { salesValue, quantity }
    if (sales.length > 0) {
      // Constrói filtro de sale_ids: sale = "id1" || sale = "id2" ...
      const saleIds = Object.keys(salesMap)
      const chunks = []
      for (let i = 0; i < saleIds.length; i++) {
        chunks.push('sale = {:sid' + i + '}')
      }
      const itemsFilter = chunks.length > 0 ? chunks.join(' || ') : '1=0'
      const itemsParams = {}
      for (let i = 0; i < saleIds.length; i++) {
        itemsParams['sid' + i] = saleIds[i]
      }

      let items = []
      try {
        items = $app.findRecordsByFilter('sale_items', itemsFilter, 'created', 0, 0, itemsParams)
      } catch (_) {}

      // cache de produtos
      const productCache = {}
      for (let j = 0; j < items.length; j++) {
        const it = items[j]
        const saleId = it.get('sale') || ''
        if (!salesMap[saleId]) continue
        const productId = it.get('product') || ''
        if (!productId) continue

        let category = 'outros'
        if (productCache[productId]) {
          category = productCache[productId]
        } else {
          try {
            const p = $app.findRecordById('products', productId)
            category = p.get('category') || 'outros'
          } catch (_) {}
          productCache[productId] = category
        }

        const qty = it.get('quantity') || 0
        const unitPrice = it.get('unit_price') || 0
        const lineTotal = qty * unitPrice

        if (!salesByCategory[category]) {
          salesByCategory[category] = { salesValue: 0, quantity: 0 }
        }
        salesByCategory[category].salesValue += lineTotal
        salesByCategory[category].quantity += qty
      }
    }

    // 3. Monta resultado
    const result = []
    for (let k = 0; k < goals.length; k++) {
      const g = goals[k]
      const category = g.get('category') || ''
      const targetValue = g.get('target_value') || 0
      const salesData = salesByCategory[category] || { salesValue: 0, quantity: 0 }
      const salesValue = Math.round(salesData.salesValue * 100) / 100
      const percentage = targetValue > 0 ? Math.round((salesValue / targetValue) * 1000) / 10 : 0
      const remaining = Math.round((targetValue - salesValue) * 100) / 100

      result.push({
        id: g.id,
        category: category,
        target_value: Math.round(targetValue * 100) / 100,
        month: g.get('month'),
        year: g.get('year'),
        active: g.get('active') !== false,
        created: g.get('created') || '',
        updated: g.get('updated') || '',
        sales_value: salesValue,
        percentage: percentage,
        remaining: remaining,
        quantity: salesData.quantity,
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/category-goals/performance?month=X&year=Y
// Retorna performance detalhada por categoria
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/category-goals/performance',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const query = e.requestInfo().query || {}

    const now = new Date()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()

    if (!month || month < 1 || month > 12 || !year) {
      return e.json(400, { message: 'month (1-12) e year são obrigatórios.' })
    }

    // Busca metas
    let goals = []
    try {
      goals = $app.findRecordsByFilter(
        'category_goals',
        'month = {:m} && year = {:y}',
        'category',
        0,
        0,
        { m: month, y: year },
      )
    } catch (_) {}

    // Calcula vendas pagas por categoria
    const startStr = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const endStr =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'payment_status = "pago" && sale_date >= {:s} && sale_date < {:e}',
        'sale_date',
        0,
        0,
        { s: startStr, e: endStr },
      )
    } catch (_) {}

    const salesMap = {}
    for (let i = 0; i < sales.length; i++) {
      salesMap[sales[i].id] = sales[i]
    }

    const salesByCategory = {}
    if (sales.length > 0) {
      const saleIds = Object.keys(salesMap)
      const chunks = []
      for (let i = 0; i < saleIds.length; i++) {
        chunks.push('sale = {:sid' + i + '}')
      }
      const itemsFilter = chunks.length > 0 ? chunks.join(' || ') : '1=0'
      const itemsParams = {}
      for (let i = 0; i < saleIds.length; i++) {
        itemsParams['sid' + i] = saleIds[i]
      }

      let items = []
      try {
        items = $app.findRecordsByFilter('sale_items', itemsFilter, 'created', 0, 0, itemsParams)
      } catch (_) {}

      const productCache = {}
      for (let j = 0; j < items.length; j++) {
        const it = items[j]
        const saleId = it.get('sale') || ''
        if (!salesMap[saleId]) continue
        const productId = it.get('product') || ''
        if (!productId) continue

        let category = 'outros'
        if (productCache[productId]) {
          category = productCache[productId]
        } else {
          try {
            const p = $app.findRecordById('products', productId)
            category = p.get('category') || 'outros'
          } catch (_) {}
          productCache[productId] = category
        }

        const qty = it.get('quantity') || 0
        const unitPrice = it.get('unit_price') || 0
        const lineTotal = qty * unitPrice

        if (!salesByCategory[category]) {
          salesByCategory[category] = { salesValue: 0, quantity: 0 }
        }
        salesByCategory[category].salesValue += lineTotal
        salesByCategory[category].quantity += qty
      }
    }

    const result = []
    for (let k = 0; k < goals.length; k++) {
      const g = goals[k]
      const category = g.get('category') || ''
      const targetValue = g.get('target_value') || 0
      const salesData = salesByCategory[category] || { salesValue: 0, quantity: 0 }
      const salesValue = Math.round(salesData.salesValue * 100) / 100
      const percentage = targetValue > 0 ? Math.round((salesValue / targetValue) * 1000) / 10 : 0
      const remaining = Math.round((targetValue - salesValue) * 100) / 100

      result.push({
        category: category,
        targetValue: Math.round(targetValue * 100) / 100,
        salesValue: salesValue,
        percentage: percentage,
        remaining: remaining,
        quantity: salesData.quantity,
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// POST /backend/v1/category-goals/create
// Body: { category, target_value, month, year, active }
// ===========================================================================
routerAdd(
  'POST',
  '/backend/v1/category-goals/create',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const body = e.requestInfo().body || {}

    const category = (body.category || '').toString().trim()
    const targetValue = parseFloat(body.target_value)
    const month = parseInt(body.month, 10)
    const year = parseInt(body.year, 10)

    if (!category) {
      return e.json(400, { message: 'category é obrigatória.' })
    }
    if (isNaN(targetValue) || targetValue < 0) {
      return e.json(400, { message: 'target_value inválido.' })
    }
    if (!month || month < 1 || month > 12) {
      return e.json(400, { message: 'month (1-12) inválido.' })
    }
    if (!year) {
      return e.json(400, { message: 'year inválido.' })
    }

    // Verifica duplicidade (índice único também protege, mas damos msg amigável)
    let existing = []
    try {
      existing = $app.findRecordsByFilter(
        'category_goals',
        'category = {:c} && month = {:m} && year = {:y}',
        'created',
        1,
        0,
        { c: category, m: month, y: year },
      )
    } catch (_) {}
    if (existing && existing.length > 0) {
      return e.json(409, {
        message: 'Já existe uma meta para esta categoria neste período.',
      })
    }

    const col = $app.findCollectionByNameOrId('category_goals')
    const rec = new Record(col)
    rec.set('category', category)
    rec.set('target_value', targetValue)
    rec.set('month', month)
    rec.set('year', year)
    rec.set('active', body.active !== false ? true : false)
    $app.save(rec)

    return e.json(200, {
      id: rec.id,
      category: rec.get('category'),
      target_value: rec.get('target_value'),
      month: rec.get('month'),
      year: rec.get('year'),
      active: rec.get('active') !== false,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// PUT /backend/v1/category-goals/{id}
// Body: { category?, target_value?, month?, year?, active? }
// ===========================================================================
routerAdd(
  'PUT',
  '/backend/v1/category-goals/{id}',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}

    let rec
    try {
      rec = $app.findRecordById('category_goals', id)
    } catch (_) {
      return e.json(404, { message: 'Meta não encontrada.' })
    }

    if (body.category !== undefined) {
      rec.set('category', (body.category || '').toString().trim())
    }
    if (body.target_value !== undefined) {
      const tv = parseFloat(body.target_value)
      if (isNaN(tv) || tv < 0) {
        return e.json(400, { message: 'target_value inválido.' })
      }
      rec.set('target_value', tv)
    }
    if (body.month !== undefined) {
      const m = parseInt(body.month, 10)
      if (!m || m < 1 || m > 12) {
        return e.json(400, { message: 'month (1-12) inválido.' })
      }
      rec.set('month', m)
    }
    if (body.year !== undefined) {
      const y = parseInt(body.year, 10)
      if (!y) {
        return e.json(400, { message: 'year inválido.' })
      }
      rec.set('year', y)
    }
    if (body.active !== undefined) {
      rec.set('active', body.active === true)
    }

    $app.save(rec)

    return e.json(200, {
      id: rec.id,
      category: rec.get('category'),
      target_value: rec.get('target_value'),
      month: rec.get('month'),
      year: rec.get('year'),
      active: rec.get('active') !== false,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// DELETE /backend/v1/category-goals/{id}
// ===========================================================================
routerAdd(
  'DELETE',
  '/backend/v1/category-goals/{id}',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const id = e.request.pathValue('id')

    let rec
    try {
      rec = $app.findRecordById('category_goals', id)
    } catch (_) {
      return e.json(404, { message: 'Meta não encontrada.' })
    }

    $app.delete(rec)

    return e.json(200, { id: id, deleted: true })
  },
  $apis.requireAuth(),
)
