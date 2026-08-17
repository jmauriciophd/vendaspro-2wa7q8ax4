// Dashboard Admin — endpoints para as novas seções do dashboard de admin/gerente.
//
// Rotas registradas:
//   GET /backend/v1/admin-dashboard/team-performance  (admin/gerente) — ranking vendedores + metas + comissões
//   GET /backend/v1/admin-dashboard/categories-below  (admin/gerente) — categorias abaixo da meta
//
// Toda lógica é inline em cada callback (top-level helpers não são acessíveis no JSVM).

// ===========================================================================
// GET /backend/v1/admin-dashboard/team-performance?month=X&year=Y
// Retorna ranking de vendedores por valor de vendas no mês, comissões pendentes
// e quantos bateram a meta.
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/admin-dashboard/team-performance',
  (e) => {
    if (!e.auth) {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const role = e.auth.get('role')
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    const query = e.requestInfo().query || {}
    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1
    const refMonth = year + '-' + String(month).padStart(2, '0')

    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const monthEnd =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    // Vendas pagas no mês
    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'payment_status = "pago" && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { s: monthStart, e: monthEnd },
      )
    } catch (_) {}

    // Agrupa por vendedor
    const sellerMap = {} // sellerId -> { salesValue, count }
    for (let i = 0; i < sales.length; i++) {
      const sid = sales[i].get('seller') || ''
      if (!sid) continue
      if (!sellerMap[sid]) sellerMap[sid] = { salesValue: 0, count: 0 }
      sellerMap[sid].salesValue += sales[i].get('total') || 0
      sellerMap[sid].count += 1
    }

    // Metas do mês
    let targets = []
    try {
      targets = $app.findRecordsByFilter('sales_targets', 'month = {:m}', 'user', 0, 0, {
        m: refMonth,
      })
    } catch (_) {}
    const targetByUser = {}
    for (let i = 0; i < targets.length; i++) {
      targetByUser[targets[i].get('user')] = targets[i].get('target') || 0
    }

    // Comissões pendentes (qualquer mês) — contagem
    let pendingCommissions = []
    try {
      pendingCommissions = $app.findRecordsByFilter(
        'commissions',
        'status = "pending"',
        '-created',
        0,
        0,
      )
    } catch (_) {}
    const pendingCount = pendingCommissions.length

    // Comissões pendentes por vendedor (valor) + valor total pendente
    let pendingCommissionsValue = 0
    const pendingBySeller = {}
    for (let i = 0; i < pendingCommissions.length; i++) {
      const sid = pendingCommissions[i].get('seller') || ''
      const v = pendingCommissions[i].get('commission_value') || 0
      pendingBySeller[sid] = (pendingBySeller[sid] || 0) + v
      pendingCommissionsValue += v
    }

    // Monta ranking
    const ranking = []
    const sids = Object.keys(sellerMap)
    for (let i = 0; i < sids.length; i++) {
      const sid = sids[i]
      let name = 'Vendedor'
      let email = ''
      try {
        const u = $app.findRecordById('users', sid)
        name = u.get('name') || u.get('email') || 'Vendedor'
        email = u.get('email') || ''
      } catch (_) {}
      const salesValue = sellerMap[sid].salesValue
      const target = targetByUser[sid] || 0
      const pct = target > 0 ? (salesValue / target) * 100 : 0
      ranking.push({
        seller: sid,
        name: name,
        email: email,
        salesValue: Math.round(salesValue * 100) / 100,
        ordersCount: sellerMap[sid].count,
        target: Math.round(target * 100) / 100,
        percentage: Math.round(pct * 10) / 10,
        pendingCommission: Math.round((pendingBySeller[sid] || 0) * 100) / 100,
        reachedGoal: target > 0 && salesValue >= target,
      })
    }
    ranking.sort(function (a, b) {
      return b.salesValue - a.salesValue
    })

    const goalsReached = ranking.filter(function (r) {
      return r.reachedGoal
    }).length

    return e.json(200, {
      reference_month: refMonth,
      ranking: ranking,
      pending_commissions_count: pendingCount,
      pending_commissions_value: Math.round(pendingCommissionsValue * 100) / 100,
      goals_reached: goalsReached,
      total_sellers: ranking.length,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/admin-dashboard/categories-below?month=X&year=Y
// Retorna categorias com meta abaixo do esperado (< 100%).
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/admin-dashboard/categories-below',
  (e) => {
    if (!e.auth) {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const role = e.auth.get('role')
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    const query = e.requestInfo().query || {}
    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1

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

    // Calcula vendas pagas por categoria no período
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
      const params = {}
      for (let i = 0; i < saleIds.length; i++) {
        chunks.push('sale = {:sid' + i + '}')
        params['sid' + i] = saleIds[i]
      }
      const itemsFilter = chunks.length > 0 ? chunks.join(' || ') : '1=0'

      let items = []
      try {
        items = $app.findRecordsByFilter('sale_items', itemsFilter, 'created', 0, 0, params)
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

      // Apenas categorias abaixo da meta
      if (percentage < 100) {
        result.push({
          category: category,
          targetValue: Math.round(targetValue * 100) / 100,
          salesValue: salesValue,
          percentage: percentage,
          remaining: Math.round((targetValue - salesValue) * 100) / 100,
        })
      }
    }

    result.sort(function (a, b) {
      return a.percentage - b.percentage
    })

    return e.json(200, {
      month: month,
      year: year,
      categories_below: result,
      count: result.length,
    })
  },
  $apis.requireAuth(),
)
