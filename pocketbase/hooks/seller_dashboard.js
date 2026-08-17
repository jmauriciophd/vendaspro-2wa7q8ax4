// Dashboard Exclusivo do Vendedor — endpoints com isolamento por req.user.id (e.auth.id).
//
// Rotas registradas:
//   GET /backend/v1/seller-dashboard               (autenticado) — resumo completo
//   GET /backend/v1/seller-dashboard/orders        (autenticado) — pedidos do vendedor
//   GET /backend/v1/seller-dashboard/commissions   (autenticado) — comissões do vendedor
//   GET /backend/v1/seller-dashboard/goals         (autenticado) — metas do vendedor
//   GET /backend/v1/seller-dashboard/top-products  (autenticado) — produtos mais vendidos do vendedor
//
// TODO o isolamento é feito no backend por e.auth.id. O vendedor nunca vê dados de outros.
// Toda lógica é inline em cada callback (top-level helpers não são acessíveis no JSVM).

// ===========================================================================
// GET /backend/v1/seller-dashboard
// Retorna resumo completo do vendedor autenticado.
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/seller-dashboard',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const sellerId = e.auth.id

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Intervalos de tempo
    const todayStart =
      now.getUTCFullYear() +
      '-' +
      String(now.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getUTCDate()).padStart(2, '0') +
      ' 00:00:00.000Z'
    const todayEnd =
      now.getUTCFullYear() +
      '-' +
      String(now.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getUTCDate()).padStart(2, '0') +
      ' 23:59:59.999Z'
    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const monthEnd =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    // --- Vendas hoje (do vendedor) ---
    let salesToday = []
    try {
      salesToday = $app.findRecordsByFilter(
        'sales',
        'seller = {:sid} && sale_date >= {:s} && sale_date <= {:e}',
        '-sale_date',
        0,
        0,
        { sid: sellerId, s: todayStart, e: todayEnd },
      )
    } catch (_) {}
    let salesTodayTotal = 0
    for (let i = 0; i < salesToday.length; i++) {
      salesTodayTotal += salesToday[i].get('total') || 0
    }

    // --- Vendas no mês (do vendedor) ---
    let salesMonth = []
    try {
      salesMonth = $app.findRecordsByFilter(
        'sales',
        'seller = {:sid} && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { sid: sellerId, s: monthStart, e: monthEnd },
      )
    } catch (_) {}
    let salesMonthTotal = 0
    const ordersMonth = salesMonth.length
    for (let i = 0; i < salesMonth.length; i++) {
      salesMonthTotal += salesMonth[i].get('total') || 0
    }
    const averageTicket = ordersMonth > 0 ? salesMonthTotal / ordersMonth : 0

    // --- Comissões no mês (do vendedor) ---
    const refMonth = year + '-' + String(month).padStart(2, '0')
    let commissionsMonth = []
    try {
      commissionsMonth = $app.findRecordsByFilter(
        'commissions',
        'seller = {:sid} && reference_month = {:rm}',
        '-created',
        0,
        0,
        { sid: sellerId, rm: refMonth },
      )
    } catch (_) {}
    let commissionMonthTotal = 0
    for (let i = 0; i < commissionsMonth.length; i++) {
      commissionMonthTotal += commissionsMonth[i].get('commission_value') || 0
    }

    // --- Meta do vendedor no mês ---
    let targetValue = 0
    try {
      const targets = $app.findRecordsByFilter(
        'sales_targets',
        'user = {:uid} && month = {:m}',
        '-created',
        1,
        0,
        { uid: sellerId, m: refMonth },
      )
      if (targets && targets.length > 0) {
        targetValue = targets[0].get('target') || 0
      }
    } catch (_) {}
    const goalPercentage = targetValue > 0 ? (salesMonthTotal / targetValue) * 100 : 0

    // --- Pedidos recentes (últimos 8) ---
    const recentOrders = []
    for (let i = 0; i < salesMonth.length && i < 8; i++) {
      const s = salesMonth[i]
      let customerName = ''
      try {
        const c = $app.findRecordById('customers', s.get('customer'))
        customerName = c.get('name') || ''
      } catch (_) {}
      recentOrders.push({
        id: s.id,
        sale_date: s.get('sale_date') || '',
        total: s.get('total') || 0,
        payment_method: s.get('payment_method') || '',
        payment_status: s.get('payment_status') || '',
        customer_name: customerName,
      })
    }

    // --- Comissões (resumo por status) ---
    let commPending = 0
    let commApproved = 0
    let commPaid = 0
    for (let i = 0; i < commissionsMonth.length; i++) {
      const st = commissionsMonth[i].get('status') || 'pending'
      const v = commissionsMonth[i].get('commission_value') || 0
      if (st === 'pending') commPending += v
      if (st === 'approved') commApproved += v
      if (st === 'paid') commPaid += v
    }

    // --- Top produtos do vendedor no mês ---
    const topProducts = []
    const productSalesMap = {} // productId -> { name, quantity, total }
    if (salesMonth.length > 0) {
      const saleIds = []
      for (let i = 0; i < salesMonth.length; i++) saleIds.push(salesMonth[i].id)
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
      for (let j = 0; j < items.length; j++) {
        const it = items[j]
        const pid = it.get('product') || ''
        if (!pid) continue
        const qty = it.get('quantity') || 0
        const lineTotal = qty * (it.get('unit_price') || 0)
        if (!productSalesMap[pid]) {
          let pname = 'Produto'
          try {
            const p = $app.findRecordById('products', pid)
            pname = p.get('name') || 'Produto'
          } catch (_) {}
          productSalesMap[pid] = { id: pid, name: pname, quantity: 0, total: 0 }
        }
        productSalesMap[pid].quantity += qty
        productSalesMap[pid].total += lineTotal
      }
    }
    const pids = Object.keys(productSalesMap)
    for (let k = 0; k < pids.length; k++) {
      topProducts.push({
        id: productSalesMap[pids[k]].id,
        name: productSalesMap[pids[k]].name,
        quantity: productSalesMap[pids[k]].quantity,
        total: Math.round(productSalesMap[pids[k]].total * 100) / 100,
      })
    }
    topProducts.sort(function (a, b) {
      return b.total - a.total
    })

    return e.json(200, {
      seller: {
        id: e.auth.id,
        name: e.auth.get('name') || e.auth.get('email') || 'Vendedor',
        email: e.auth.get('email') || '',
      },
      summary: {
        salesToday: Math.round(salesTodayTotal * 100) / 100,
        salesMonth: Math.round(salesMonthTotal * 100) / 100,
        ordersMonth: ordersMonth,
        averageTicket: Math.round(averageTicket * 100) / 100,
        commissionMonth: Math.round(commissionMonthTotal * 100) / 100,
        goalPercentage: Math.round(goalPercentage * 10) / 10,
        targetValue: Math.round(targetValue * 100) / 100,
        commissionPending: Math.round(commPending * 100) / 100,
        commissionApproved: Math.round(commApproved * 100) / 100,
        commissionPaid: Math.round(commPaid * 100) / 100,
      },
      recentOrders: recentOrders,
      commissions: {
        pending: Math.round(commPending * 100) / 100,
        approved: Math.round(commApproved * 100) / 100,
        paid: Math.round(commPaid * 100) / 100,
        total: Math.round(commissionMonthTotal * 100) / 100,
      },
      goals: {
        targetValue: Math.round(targetValue * 100) / 100,
        salesValue: Math.round(salesMonthTotal * 100) / 100,
        percentage: Math.round(goalPercentage * 10) / 10,
      },
      topProducts: topProducts.slice(0, 8),
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/seller-dashboard/orders
// Lista pedidos do vendedor (mês atual, paginado).
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/seller-dashboard/orders',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const sellerId = e.auth.id
    const query = e.requestInfo().query || {}

    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1

    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const monthEnd =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'seller = {:sid} && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        100,
        0,
        { sid: sellerId, s: monthStart, e: monthEnd },
      )
    } catch (_) {}

    const result = []
    for (let i = 0; i < sales.length; i++) {
      const s = sales[i]
      let customerName = ''
      try {
        const c = $app.findRecordById('customers', s.get('customer'))
        customerName = c.get('name') || ''
      } catch (_) {}
      result.push({
        id: s.id,
        sale_date: s.get('sale_date') || '',
        total: s.get('total') || 0,
        payment_method: s.get('payment_method') || '',
        payment_status: s.get('payment_status') || '',
        customer_name: customerName,
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/seller-dashboard/commissions
// Lista comissões do vendedor (mês atual).
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/seller-dashboard/commissions',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const sellerId = e.auth.id
    const query = e.requestInfo().query || {}

    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1
    const refMonth = year + '-' + String(month).padStart(2, '0')

    let records = []
    try {
      records = $app.findRecordsByFilter(
        'commissions',
        'seller = {:sid} && reference_month = {:rm}',
        '-created',
        100,
        0,
        { sid: sellerId, rm: refMonth },
      )
    } catch (_) {}

    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      let saleRef = ''
      let customerName = ''
      let saleDate = ''
      try {
        const sale = $app.findRecordById('sales', r.get('sale'))
        saleRef = '#' + sale.id.slice(-6).toUpperCase()
        saleDate = sale.get('sale_date') || ''
        try {
          const c = $app.findRecordById('customers', sale.get('customer'))
          customerName = c.get('name') || ''
        } catch (_) {}
      } catch (_) {}
      result.push({
        id: r.id,
        sale: r.get('sale') || '',
        sale_ref: saleRef,
        sale_date: saleDate,
        customer_name: customerName,
        sale_value: r.get('sale_value') || 0,
        commission_percentage: r.get('commission_percentage') || 0,
        commission_value: r.get('commission_value') || 0,
        status: r.get('status') || 'pending',
        reference_month: r.get('reference_month') || '',
        paid_at: r.get('paid_at') || '',
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/seller-dashboard/goals
// Metas do vendedor (mês atual).
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/seller-dashboard/goals',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const sellerId = e.auth.id
    const query = e.requestInfo().query || {}

    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1
    const refMonth = year + '-' + String(month).padStart(2, '0')

    let targetValue = 0
    let targetId = ''
    try {
      const targets = $app.findRecordsByFilter(
        'sales_targets',
        'user = {:uid} && month = {:m}',
        '-created',
        1,
        0,
        { uid: sellerId, m: refMonth },
      )
      if (targets && targets.length > 0) {
        targetId = targets[0].id
        targetValue = targets[0].get('target') || 0
      }
    } catch (_) {}

    // vendas realizadas no mês
    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const monthEnd =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'seller = {:sid} && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { sid: sellerId, s: monthStart, e: monthEnd },
      )
    } catch (_) {}
    let salesValue = 0
    for (let i = 0; i < sales.length; i++) {
      salesValue += sales[i].get('total') || 0
    }

    const percentage = targetValue > 0 ? (salesValue / targetValue) * 100 : 0

    return e.json(200, {
      id: targetId,
      month: refMonth,
      targetValue: Math.round(targetValue * 100) / 100,
      salesValue: Math.round(salesValue * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/seller-dashboard/top-products
// Produtos mais vendidos pelo vendedor (mês atual).
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/seller-dashboard/top-products',
  (e) => {
    if (!e.auth) {
      return e.json(401, { message: 'Não autenticado.' })
    }
    const sellerId = e.auth.id
    const query = e.requestInfo().query || {}

    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1

    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const monthEnd =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    let sales = []
    try {
      sales = $app.findRecordsByFilter(
        'sales',
        'seller = {:sid} && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { sid: sellerId, s: monthStart, e: monthEnd },
      )
    } catch (_) {}

    const productSalesMap = {}
    if (sales.length > 0) {
      const saleIds = []
      for (let i = 0; i < sales.length; i++) saleIds.push(sales[i].id)
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
      for (let j = 0; j < items.length; j++) {
        const it = items[j]
        const pid = it.get('product') || ''
        if (!pid) continue
        const qty = it.get('quantity') || 0
        const lineTotal = qty * (it.get('unit_price') || 0)
        if (!productSalesMap[pid]) {
          let pname = 'Produto'
          try {
            const p = $app.findRecordById('products', pid)
            pname = p.get('name') || 'Produto'
          } catch (_) {}
          productSalesMap[pid] = { id: pid, name: pname, quantity: 0, total: 0 }
        }
        productSalesMap[pid].quantity += qty
        productSalesMap[pid].total += lineTotal
      }
    }

    const result = []
    const pids = Object.keys(productSalesMap)
    for (let k = 0; k < pids.length; k++) {
      result.push({
        id: productSalesMap[pids[k]].id,
        name: productSalesMap[pids[k]].name,
        quantity: productSalesMap[pids[k]].quantity,
        total: Math.round(productSalesMap[pids[k]].total * 100) / 100,
      })
    }
    result.sort(function (a, b) {
      return b.total - a.total
    })

    return e.json(200, result.slice(0, 10))
  },
  $apis.requireAuth(),
)
