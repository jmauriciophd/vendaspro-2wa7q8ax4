// Comissões — endpoints para cálculo, listagem, resumo e gestão de status.
//
// Rotas registradas:
//   POST /backend/v1/commissions/calculate         (Admin/Gerente) — calcula comissões do período
//   GET  /backend/v1/commissions/list              (autenticado)   — lista comissões com filtros
//   GET  /backend/v1/commissions/summary           (autenticado)   — totais/cards de resumo
//   PUT  /backend/v1/commissions/{id}/status       (Admin/Gerente) — atualiza status
//   GET  /backend/v1/commissions/sellers           (autenticado)   — vendedores + regras ativas
//
// NOTA: toda lógica é inline em cada callback (top-level helpers não são
// acessíveis dentro dos callbacks no JSVM do PocketBase).

// ===========================================================================
// POST /backend/v1/commissions/calculate
// Body: { month: number (1-12), year: number }
// ===========================================================================
routerAdd(
  'POST',
  '/backend/v1/commissions/calculate',
  (e) => {
    // --- verifica role admin/gerente ---
    if (!e.auth) {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const role = e.auth.get('role')
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    const body = e.requestInfo().body || {}
    const month = parseInt(body.month, 10)
    const year = parseInt(body.year, 10)

    if (!month || !year || month < 1 || month > 12) {
      return e.json(400, { message: 'month (1-12) e year são obrigatórios.' })
    }

    const refMonth = year + '-' + String(month).padStart(2, '0')
    const startStr = year + '-' + String(month).padStart(2, '0') + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const endStr =
      endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-01 00:00:00.000Z'

    // Busca vendas pagas do período
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

    const commissionsCol = $app.findCollectionByNameOrId('commissions')
    let created = 0
    let updated = 0
    const details = []

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i]
      const sellerId = sale.get('seller') || ''
      if (!sellerId) {
        details.push({ sale: sale.id, status: 'skipped', reason: 'Sem vendedor vinculado' })
        continue
      }

      // busca regra ativa do vendedor
      let rule = null
      try {
        const rules = $app.findRecordsByFilter(
          'commission_rules',
          'seller = {:sid} && active = true',
          '-created',
          1,
          0,
          { sid: sellerId },
        )
        if (rules && rules.length > 0) rule = rules[0]
      } catch (_) {}

      if (!rule) {
        details.push({ sale: sale.id, status: 'skipped', reason: 'Sem regra de comissão ativa' })
        continue
      }

      const saleValue = sale.get('total') || 0
      const percentage = rule.get('percentage') || 0
      const commissionValue = Math.round(saleValue * percentage) / 100

      // upsert por sale (índice único em sale)
      let existing = []
      try {
        existing = $app.findRecordsByFilter('commissions', 'sale = {:sid}', 'created', 1, 0, {
          sid: sale.id,
        })
      } catch (_) {}

      if (existing && existing.length > 0) {
        const rec = existing[0]
        rec.set('seller', sellerId)
        rec.set('sale_value', saleValue)
        rec.set('commission_percentage', percentage)
        rec.set('commission_value', commissionValue)
        rec.set('reference_month', refMonth)
        $app.save(rec)
        updated++
        details.push({ sale: sale.id, status: 'updated' })
      } else {
        const rec = new Record(commissionsCol)
        rec.set('seller', sellerId)
        rec.set('sale', sale.id)
        rec.set('sale_value', saleValue)
        rec.set('commission_percentage', percentage)
        rec.set('commission_value', commissionValue)
        rec.set('status', 'pending')
        rec.set('reference_month', refMonth)
        $app.save(rec)
        created++
        details.push({ sale: sale.id, status: 'created' })
      }
    }

    return e.json(200, {
      created: created,
      updated: updated,
      total: created + updated,
      details: details,
      reference_month: refMonth,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/commissions/list
// Query: seller_id, month (1-12), year, status
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/commissions/list',
  (e) => {
    const query = e.requestInfo().query || {}
    const filters = []
    const params = {}

    if (query.seller_id) {
      filters.push('seller = {:sid}')
      params.sid = query.seller_id
    }
    if (query.month && query.year) {
      const m = parseInt(query.month, 10)
      const y = parseInt(query.year, 10)
      if (m >= 1 && m <= 12 && y) {
        params.rm = y + '-' + String(m).padStart(2, '0')
        filters.push('reference_month = {:rm}')
      }
    }
    if (query.status) {
      filters.push('status = {:st}')
      params.st = query.status
    }

    const filterStr = filters.length > 0 ? filters.join(' && ') : '1=1'

    let records = []
    try {
      records = $app.findRecordsByFilter(
        'commissions',
        filterStr,
        '-reference_month,-created',
        0,
        0,
        params,
      )
    } catch (err) {
      return e.json(200, [])
    }

    const result = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      let seller = null
      try {
        seller = $app.findRecordById('users', r.get('seller'))
      } catch (_) {}
      let sale = null
      try {
        sale = $app.findRecordById('sales', r.get('sale'))
      } catch (_) {}
      let customer = null
      if (sale) {
        try {
          customer = $app.findRecordById('customers', sale.get('customer'))
        } catch (_) {}
      }

      result.push({
        id: r.id,
        seller: r.get('seller'),
        sale: r.get('sale'),
        sale_value: r.get('sale_value') || 0,
        commission_percentage: r.get('commission_percentage') || 0,
        commission_value: r.get('commission_value') || 0,
        status: r.get('status') || 'pending',
        reference_month: r.get('reference_month') || '',
        paid_at: r.get('paid_at') || '',
        created: r.get('created') || '',
        updated: r.get('updated') || '',
        seller_name: seller ? seller.get('name') || seller.get('email') : 'Vendedor',
        seller_email: seller ? seller.get('email') : '',
        sale_date: sale ? sale.get('sale_date') || sale.get('created') : '',
        customer_name: customer ? customer.get('name') || '' : '',
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/commissions/summary
// Query: month (1-12), year
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/commissions/summary',
  (e) => {
    const query = e.requestInfo().query || {}
    let refMonth = ''
    if (query.month && query.year) {
      const m = parseInt(query.month, 10)
      const y = parseInt(query.year, 10)
      if (m >= 1 && m <= 12 && y) {
        refMonth = y + '-' + String(m).padStart(2, '0')
      }
    }

    const filters = []
    const params = {}
    if (refMonth) {
      filters.push('reference_month = {:rm}')
      params.rm = refMonth
    }
    const filterStr = filters.length > 0 ? filters.join(' && ') : '1=1'

    let records = []
    try {
      records = $app.findRecordsByFilter(
        'commissions',
        filterStr,
        '-reference_month,-created',
        0,
        0,
        params,
      )
    } catch (_) {}

    let totalCommission = 0
    let totalSalesValue = 0
    let pending = 0
    let paid = 0
    let approved = 0
    const comissionedSales = records.length

    const bySellerMap = {}
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const cv = r.get('commission_value') || 0
      const sv = r.get('sale_value') || 0
      totalCommission += cv
      totalSalesValue += sv

      const st = r.get('status') || 'pending'
      if (st === 'pending') pending++
      if (st === 'approved') approved++
      if (st === 'paid') paid++

      const sid = r.get('seller') || ''
      if (!bySellerMap[sid]) {
        bySellerMap[sid] = {
          seller: sid,
          seller_name: '',
          seller_email: '',
          sales_count: 0,
          total_sales_value: 0,
          total_commission: 0,
          pending: 0,
          approved: 0,
          paid: 0,
        }
      }
      bySellerMap[sid].sales_count += 1
      bySellerMap[sid].total_sales_value += sv
      bySellerMap[sid].total_commission += cv
      if (st === 'pending') bySellerMap[sid].pending += 1
      if (st === 'approved') bySellerMap[sid].approved += 1
      if (st === 'paid') bySellerMap[sid].paid += 1
    }

    const avgTicket = comissionedSales > 0 ? totalSalesValue / comissionedSales : 0

    // popula nome do vendedor
    const bySeller = []
    const sids = Object.keys(bySellerMap)
    for (let j = 0; j < sids.length; j++) {
      const item = bySellerMap[sids[j]]
      try {
        const u = $app.findRecordById('users', sids[j])
        item.seller_name = u.get('name') || u.get('email') || 'Vendedor'
        item.seller_email = u.get('email') || ''
      } catch (_) {
        item.seller_name = 'Vendedor'
      }
      item.total_sales_value = Math.round(item.total_sales_value * 100) / 100
      item.total_commission = Math.round(item.total_commission * 100) / 100
      bySeller.push(item)
    }

    return e.json(200, {
      reference_month: refMonth,
      cards: {
        total_commission: Math.round(totalCommission * 100) / 100,
        comissioned_sales: comissionedSales,
        pending: pending,
        approved: approved,
        paid: paid,
        avg_ticket: Math.round(avgTicket * 100) / 100,
      },
      by_seller: bySeller,
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// PUT /backend/v1/commissions/{id}/status
// Body: { status: pending|approved|paid|cancelled }
// ===========================================================================
routerAdd(
  'PUT',
  '/backend/v1/commissions/{id}/status',
  (e) => {
    // --- verifica role admin/gerente ---
    if (!e.auth) {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }
    const role = e.auth.get('role')
    if (role !== 'admin' && role !== 'gerente') {
      return e.json(403, { message: 'Acesso restrito a administradores e gerentes.' })
    }

    const id = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const newStatus = (body.status || '').toString()

    const allowed = ['pending', 'approved', 'paid', 'cancelled']
    let found = false
    for (let i = 0; i < allowed.length; i++) {
      if (allowed[i] === newStatus) {
        found = true
        break
      }
    }
    if (!found) {
      return e.json(400, {
        message: 'status inválido. Use: pending, approved, paid ou cancelled.',
      })
    }

    let rec
    try {
      rec = $app.findRecordById('commissions', id)
    } catch (_) {
      return e.json(404, { message: 'Comissão não encontrada.' })
    }

    rec.set('status', newStatus)
    if (newStatus === 'paid') {
      const now = new Date()
      const pad = function (n) {
        return n < 10 ? '0' + n : '' + n
      }
      const dateStr =
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
      rec.set('paid_at', dateStr)
    } else {
      rec.set('paid_at', '')
    }
    $app.save(rec)

    return e.json(200, {
      id: rec.id,
      status: rec.get('status'),
      paid_at: rec.get('paid_at') || '',
    })
  },
  $apis.requireAuth(),
)

// ===========================================================================
// GET /backend/v1/commissions/sellers
// Retorna lista de vendedores com suas regras de comissão ativas
// ===========================================================================
routerAdd(
  'GET',
  '/backend/v1/commissions/sellers',
  (e) => {
    let users = []
    try {
      users = $app.findRecordsByFilter('users', '1=1', 'name', 0, 0)
    } catch (_) {}

    const result = []
    for (let i = 0; i < users.length; i++) {
      const u = users[i]

      // busca regra ativa do vendedor
      let rule = null
      try {
        const rules = $app.findRecordsByFilter(
          'commission_rules',
          'seller = {:sid} && active = true',
          '-created',
          1,
          0,
          { sid: u.id },
        )
        if (rules && rules.length > 0) rule = rules[0]
      } catch (_) {}

      result.push({
        id: u.id,
        name: u.get('name') || 'Sem nome',
        email: u.get('email') || '',
        role: u.get('role') || 'vendedor',
        active: u.get('active') !== false,
        rule: rule
          ? {
              id: rule.id,
              percentage: rule.get('percentage') || 0,
              minimum_sales: rule.get('minimum_sales') || 0,
              maximum_sales: rule.get('maximum_sales') || 0,
              active: rule.get('active') !== false,
            }
          : null,
      })
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
