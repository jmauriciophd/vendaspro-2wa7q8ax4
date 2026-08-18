// Relatório de Desempenho por Vendedor — endpoint de comparação entre vendedores.
//
// Rotas registradas:
//   GET /backend/v1/reports/seller-performance?month=X&year=Y&compare_with=prev_month
//
// Retorna para cada vendedor ativo: nome, vendas no mês (valor total), nº de pedidos,
// ticket médio, comissão total, % da meta, variação vs período anterior (valor e %),
// ranking. Cálculo 100% server-side, isolado por período.
//
// NOTA: toda lógica é inline no callback (top-level helpers não são acessíveis no JSVM).

routerAdd(
  'GET',
  '/backend/v1/reports/seller-performance',
  (e) => {
    // --- autenticação obrigatória ---
    if (!e.auth) {
      return e.json(403, { message: 'Acesso restrito a usuários autenticados.' })
    }

    // Isolamento por papel: vendedor só vê o próprio desempenho.
    // Admin/gerente continuam vendo o ranking completo.
    const authRole = e.auth.get('role')
    const isSeller = authRole !== 'admin' && authRole !== 'gerente'
    const sellerScope = isSeller ? e.auth.id : ''

    const query = e.requestInfo().query || {}
    const now = new Date()
    const year = query.year ? parseInt(query.year, 10) : now.getFullYear()
    const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1

    if (!month || month < 1 || month > 12 || !year) {
      return e.json(400, { message: 'month (1-12) e year são obrigatórios.' })
    }

    const pad2 = function (n) {
      return n < 10 ? '0' + n : '' + n
    }

    const refMonth = year + '-' + pad2(month)

    // Período atual
    const curStart = year + '-' + pad2(month) + '-01 00:00:00.000Z'
    const endD = new Date(year, month, 1)
    const curEnd = endD.getFullYear() + '-' + pad2(endD.getMonth() + 1) + '-01 00:00:00.000Z'

    // Período anterior (mês imediatamente anterior)
    const prevD = new Date(year, month - 1, 1)
    const prevYear = prevD.getFullYear()
    const prevMonth = prevD.getMonth() + 1
    const prevStart = prevYear + '-' + pad2(prevMonth) + '-01 00:00:00.000Z'
    const prevEnd = curStart // início do mês atual == fim do mês anterior

    // --- Busca vendas pagas do período atual ---
    let curSales = []
    try {
      curSales = $app.findRecordsByFilter(
        'sales',
        'payment_status = "pago" && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { s: curStart, e: curEnd },
      )
    } catch (_) {}

    // --- Busca vendas pagas do período anterior ---
    let prevSales = []
    try {
      prevSales = $app.findRecordsByFilter(
        'sales',
        'payment_status = "pago" && sale_date >= {:s} && sale_date < {:e}',
        '-sale_date',
        0,
        0,
        { s: prevStart, e: prevEnd },
      )
    } catch (_) {}

    // --- Agrupa vendas por vendedor (período atual) ---
    const curMap = {} // sellerId -> { salesValue, orders }
    for (let i = 0; i < curSales.length; i++) {
      const sid = curSales[i].get('seller') || ''
      if (!sid) continue
      if (!curMap[sid]) curMap[sid] = { salesValue: 0, orders: 0 }
      curMap[sid].salesValue += curSales[i].get('total') || 0
      curMap[sid].orders += 1
    }

    // --- Agrupa vendas por vendedor (período anterior) ---
    const prevMap = {} // sellerId -> salesValue
    for (let j = 0; j < prevSales.length; j++) {
      const sid = prevSales[j].get('seller') || ''
      if (!sid) continue
      if (!prevMap[sid]) prevMap[sid] = 0
      prevMap[sid] += prevSales[j].get('total') || 0
    }

    // --- Comissões do mês atual por vendedor ---
    let commissions = []
    try {
      commissions = $app.findRecordsByFilter(
        'commissions',
        'reference_month = {:rm}',
        '-created',
        0,
        0,
        { rm: refMonth },
      )
    } catch (_) {}
    const commissionBySeller = {}
    for (let k = 0; k < commissions.length; k++) {
      const sid = commissions[k].get('seller') || ''
      const st = commissions[k].get('status') || 'pending'
      // Considera todas as comissões do mês (pendentes, aprovadas e pagas),
      // excluindo apenas as canceladas, para refletir o total gerado.
      if (st === 'cancelled') continue
      const v = commissions[k].get('commission_value') || 0
      if (!commissionBySeller[sid]) commissionBySeller[sid] = 0
      commissionBySeller[sid] += v
    }

    // --- Metas do mês atual por vendedor ---
    let targets = []
    try {
      targets = $app.findRecordsByFilter('sales_targets', 'month = {:m}', 'user', 0, 0, {
        m: refMonth,
      })
    } catch (_) {}
    const targetByUser = {}
    for (let t = 0; t < targets.length; t++) {
      targetByUser[targets[t].get('user')] = targets[t].get('target') || 0
    }

    // --- Lista de vendedores ativos (todos os users; filtra inativos depois) ---
    let users = []
    try {
      users = $app.findRecordsByFilter('users', '1=1', 'name', 0, 0)
    } catch (_) {}

    // Ranking: considera vendedores que tenham vendas no mês OU meta definida.
    // Vendedores sem atividade no período são omitidos para manter o ranking enxuto.
    const ranking = []
    for (let u = 0; u < users.length; u++) {
      const u_rec = users[u]
      const sid = u_rec.id

      // Isolamento por papel: vendedor só vê a própria linha.
      if (sellerScope && sid !== sellerScope) continue
      const name = u_rec.get('name') || u_rec.get('email') || 'Vendedor'
      const email = u_rec.get('email') || ''
      const active = u_rec.get('active') !== false
      const role = u_rec.get('role') || 'vendedor'

      const salesValue = curMap[sid] ? curMap[sid].salesValue : 0
      const ordersCount = curMap[sid] ? curMap[sid].orders : 0
      const goalTarget = targetByUser[sid] || 0
      const commissionTotal = commissionBySeller[sid] || 0
      const previousSalesValue = prevMap[sid] || 0

      // Omite vendedores sem nenhuma atividade no período atual E sem meta.
      if (ordersCount === 0 && goalTarget === 0) continue

      const avgTicket = ordersCount > 0 ? salesValue / ordersCount : 0
      const goalPercentage = goalTarget > 0 ? (salesValue / goalTarget) * 100 : 0

      const variationValue = salesValue - previousSalesValue
      let variationPercent = 0
      if (previousSalesValue > 0) {
        variationPercent = ((salesValue - previousSalesValue) / previousSalesValue) * 100
      } else if (salesValue > 0) {
        variationPercent = 100
      }

      ranking.push({
        seller: sid,
        name: name,
        email: email,
        role: role,
        active: active,
        salesValue: Math.round(salesValue * 100) / 100,
        ordersCount: ordersCount,
        avgTicket: Math.round(avgTicket * 100) / 100,
        commissionTotal: Math.round(commissionTotal * 100) / 100,
        goalPercentage: Math.round(goalPercentage * 10) / 10,
        goalTarget: Math.round(goalTarget * 100) / 100,
        previousSalesValue: Math.round(previousSalesValue * 100) / 100,
        variationPercent: Math.round(variationPercent * 10) / 10,
        variationValue: Math.round(variationValue * 100) / 100,
      })
    }

    // Ordena por vendas (desc) e atribui posição no ranking.
    ranking.sort(function (a, b) {
      return b.salesValue - a.salesValue
    })
    for (let r = 0; r < ranking.length; r++) {
      ranking[r].rank = r + 1
    }

    // --- Resumo agregado ---
    let totalSales = 0
    let totalCommissions = 0
    let totalOrders = 0
    let goalPctSum = 0
    let goalPctCount = 0
    let bestSeller = ''
    let bestSellerValue = 0
    for (let s = 0; s < ranking.length; s++) {
      const item = ranking[s]
      totalSales += item.salesValue
      totalCommissions += item.commissionTotal
      totalOrders += item.ordersCount
      if (item.goalTarget > 0) {
        goalPctSum += item.goalPercentage
        goalPctCount++
      }
      if (item.salesValue > bestSellerValue) {
        bestSellerValue = item.salesValue
        bestSeller = item.name
      }
    }
    const avgGoalPct = goalPctCount > 0 ? goalPctSum / goalPctCount : 0

    return e.json(200, {
      period: refMonth,
      previousPeriod: prevYear + '-' + pad2(prevMonth),
      ranking: ranking,
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        avgGoalPct: Math.round(avgGoalPct * 10) / 10,
        bestSeller: bestSeller,
        bestSellerValue: Math.round(bestSellerValue * 100) / 100,
        totalOrders: totalOrders,
        sellersCount: ranking.length,
      },
    })
  },
  $apis.requireAuth(),
)
