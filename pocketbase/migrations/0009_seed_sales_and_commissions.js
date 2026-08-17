// 0009 — Seed de vendas, itens, comissões, metas e notificações de demonstração.
//
// Popula o banco com vendas distribuídas em junho, julho e agosto de 2026,
// itens de venda, comissões (status variado), metas mensais do vendedor12,
// metas de categoria para agosto/2026 e notificações de exemplo para o vendedor12.
//
// Idempotente: se já existirem vendas no banco, a migration não faz nada.

migrate(
  (app) => {
    // -----------------------------------------------------------------------
    // Guarda de idempotência: se já existem vendas, nada a fazer.
    // -----------------------------------------------------------------------
    let existingSalesCount = 0
    try {
      existingSalesCount = app.countRecords('sales')
    } catch (_) {}
    if (existingSalesCount > 0) {
      console.log('0009: vendas já existem (' + existingSalesCount + ') — seed ignorado.')
      return
    }

    // -----------------------------------------------------------------------
    // Referências e coleções
    // -----------------------------------------------------------------------
    const salesCol = app.findCollectionByNameOrId('sales')
    const saleItemsCol = app.findCollectionByNameOrId('sale_items')
    const commissionsCol = app.findCollectionByNameOrId('commissions')
    const targetsCol = app.findCollectionByNameOrId('sales_targets')
    const categoryGoalsCol = app.findCollectionByNameOrId('category_goals')
    const notificationsCol = app.findCollectionByNameOrId('notifications')

    // IDs fixos (conforme especificação)
    const ADMIN_ID = 'o1ryssop3yjsttb' // admin (João Maurício) — 5%
    const VEND_ID = 'dtnj3ydyhx261sc' // vendedor12 — 3%

    const sellerIds = [ADMIN_ID, VEND_ID]
    const sellerPct = {}
    sellerPct[ADMIN_ID] = 5
    sellerPct[VEND_ID] = 3

    const customerIds = [
      '0ngqb8jku4ahvee',
      'lrbcix6v6bt8ce1',
      'xywganlpwmv9q56',
      '1dw5alw9act31l4',
      '2kqsfgb6pookzo3',
    ]

    const productIds = [
      'er4gz66enh2p5lr',
      '5y7cspuvyt47pv0',
      'fea8ujiephpxlc2',
      '858zc06ycxlmvzs',
      'ail0ksdcoj88suw',
      'w68cyn4y6z6kpkp',
      '3qp3vihqz3pyx4a',
      'ftlbei3khya36vy',
      'b8n8z40eumeilnj',
      'aydxt56ped3hp8q',
    ]

    // Preços de catálogo (espelham os produtos reais para unit_price realista)
    const productPrices = {
      er4gz66enh2p5lr: 24.9, // Arroz 5kg
      '5y7cspuvyt47pv0': 7.5, // Feijão Carioca 1kg
      fea8ujiephpxlc2: 6.8, // Óleo de Soja 900ml
      '858zc06ycxlmvzs': 19.9, // Açúcar Cristal 5kg
      ail0ksdcoj88suw: 14.5, // Café Torrado 500g
      w68cyn4y6z6kpkp: 5.9, // Leite Integral 1L
      '3qp3vihqz3pyx4a': 9.9, // Refrigerante 2L
      ftlbei3khya36vy: 12.9, // Sabão em Pó 1kg
      b8n8z40eumeilnj: 3.5, // Detergente 500ml
      aydxt56ped3hp8q: 4.2, // Biscoito Recheado
    }

    const paymentMethods = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto']

    // -----------------------------------------------------------------------
    // Helper pseudo-random determinístico (LCG) para resultados reproduzíveis.
    // -----------------------------------------------------------------------
    let seed = 987654321
    const rnd = function () {
      // LCG simples — goja suporta operações de inteiros/floats
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const rndInt = function (min, max) {
      return min + Math.floor(rnd() * (max - min + 1))
    }
    const pick = function (arr) {
      return arr[rndInt(0, arr.length - 1)]
    }

    // -----------------------------------------------------------------------
    // Definição das 25 vendas: distribuição ~15 admin / ~10 vendedor12,
    // distribuídas em junho, julho e agosto de 2026.
    // -----------------------------------------------------------------------
    // (sellerIdx 0 = admin, 1 = vendedor12)
    const salesPlan = [
      // Junho/2026 — 8 vendas (5 admin, 3 vendedor12)
      { y: 2026, m: 6, d: 3, seller: 0, cust: 0 },
      { y: 2026, m: 6, d: 7, seller: 0, cust: 1 },
      { y: 2026, m: 6, d: 11, seller: 1, cust: 2 },
      { y: 2026, m: 6, d: 15, seller: 0, cust: 3 },
      { y: 2026, m: 6, d: 18, seller: 1, cust: 4 },
      { y: 2026, m: 6, d: 22, seller: 0, cust: 0 },
      { y: 2026, m: 6, d: 25, seller: 0, cust: 1 },
      { y: 2026, m: 6, d: 28, seller: 1, cust: 2 },
      // Julho/2026 — 9 vendas (5 admin, 4 vendedor12)
      { y: 2026, m: 7, d: 2, seller: 0, cust: 3 },
      { y: 2026, m: 7, d: 5, seller: 1, cust: 4 },
      { y: 2026, m: 7, d: 9, seller: 0, cust: 0 },
      { y: 2026, m: 7, d: 12, seller: 1, cust: 1 },
      { y: 2026, m: 7, d: 16, seller: 0, cust: 2 },
      { y: 2026, m: 7, d: 19, seller: 0, cust: 3 },
      { y: 2026, m: 7, d: 22, seller: 1, cust: 4 },
      { y: 2026, m: 7, d: 26, seller: 0, cust: 0 },
      { y: 2026, m: 7, d: 29, seller: 1, cust: 1 },
      // Agosto/2026 — 8 vendas (5 admin, 3 vendedor12)
      { y: 2026, m: 8, d: 3, seller: 0, cust: 2 },
      { y: 2026, m: 8, d: 6, seller: 1, cust: 3 },
      { y: 2026, m: 8, d: 10, seller: 0, cust: 4 },
      { y: 2026, m: 8, d: 13, seller: 1, cust: 0 },
      { y: 2026, m: 8, d: 16, seller: 0, cust: 1 },
      { y: 2026, m: 8, d: 20, seller: 0, cust: 2 },
      { y: 2026, m: 8, d: 24, seller: 1, cust: 3 },
      { y: 2026, m: 8, d: 27, seller: 0, cust: 4 },
    ]

    // Variação de status de comissão por mês para parecer realista:
    // junho → maioria approved/paid; julho → mix approved/pending; agosto → pending.
    const commissionStatusByMonth = {
      '2026-06': ['paid', 'paid', 'approved', 'paid', 'approved', 'paid', 'approved', 'paid'],
      '2026-07': [
        'approved',
        'pending',
        'approved',
        'pending',
        'approved',
        'pending',
        'approved',
        'pending',
        'approved',
      ],
      '2026-08': [
        'pending',
        'pending',
        'pending',
        'pending',
        'approved',
        'pending',
        'pending',
        'approved',
      ],
    }

    const pad2 = function (n) {
      return n < 10 ? '0' + n : '' + n
    }

    let createdSales = 0
    let createdItems = 0
    let createdCommissions = 0

    for (let i = 0; i < salesPlan.length; i++) {
      const p = salesPlan[i]
      const sellerId = sellerIds[p.seller]
      const custId = customerIds[p.cust]
      const refMonth = p.y + '-' + pad2(p.m)

      // Cria 3 a 5 itens com produtos aleatórios
      const itemCount = rndInt(3, 5)
      const usedProductIdx = {}
      const items = []
      let total = 0
      for (let j = 0; j < itemCount; j++) {
        // garante produtos distintos dentro da mesma venda
        let pIdx = rndInt(0, productIds.length - 1)
        let guard = 0
        while (usedProductIdx[pIdx] && guard < 20) {
          pIdx = rndInt(0, productIds.length - 1)
          guard++
        }
        usedProductIdx[pIdx] = true
        const productId = productIds[pIdx]
        const basePrice = productPrices[productId] || 10
        // Quantidade variada (1 a 40) para alcançar totais de R$500 a R$8.000
        const quantity = rndInt(5, 60)
        const unitPrice = basePrice
        const lineTotal = quantity * unitPrice
        total += lineTotal
        items.push({ productId: productId, quantity: quantity, unitPrice: unitPrice })
      }

      // Ajusta o total para dentro da faixa R$500–R$8.000 se necessário,
      // variando a quantidade do último item.
      if (total < 500) {
        const diff = 500 - total
        const lastUnit = items[items.length - 1].unitPrice
        const addQty = Math.ceil(diff / lastUnit)
        items[items.length - 1].quantity += addQty
        total += addQty * lastUnit
      } else if (total > 8000) {
        const diff = total - 8000
        const lastUnit = items[items.length - 1].unitPrice
        const remQty = Math.floor(diff / lastUnit)
        if (remQty > 0 && items[items.length - 1].quantity - remQty >= 1) {
          items[items.length - 1].quantity -= remQty
          total -= remQty * lastUnit
        }
      }
      total = Math.round(total * 100) / 100

      // sale_date no formato esperado pela coleção (date)
      const saleDateStr = p.y + '-' + pad2(p.m) + '-' + pad2(p.d) + ' 12:00:00.000Z'

      // Cria a venda
      const saleRec = new Record(salesCol)
      saleRec.set('customer', custId)
      saleRec.set('seller', sellerId)
      saleRec.set('sale_date', saleDateStr)
      saleRec.set('total', total)
      saleRec.set('payment_method', pick(paymentMethods))
      saleRec.set('payment_status', 'pago')
      saleRec.set('notes', 'Venda de demonstração')
      app.save(saleRec)
      createdSales++

      // Cria os itens
      for (let k = 0; k < items.length; k++) {
        const it = items[k]
        const itemRec = new Record(saleItemsCol)
        itemRec.set('sale', saleRec.id)
        itemRec.set('product', it.productId)
        itemRec.set('quantity', it.quantity)
        itemRec.set('unit_price', it.unitPrice)
        app.save(itemRec)
        createdItems++
      }

      // Cria a comissão vinculada
      const percentage = sellerPct[sellerId] || 0
      const commissionValue = Math.round(total * percentage * 100) / 10000 // total * pct / 100
      const monthStatuses = commissionStatusByMonth[refMonth] || ['pending']
      const status = monthStatuses[i % monthStatuses.length]

      const commRec = new Record(commissionsCol)
      commRec.set('seller', sellerId)
      commRec.set('sale', saleRec.id)
      commRec.set('sale_value', total)
      commRec.set('commission_percentage', percentage)
      commRec.set('commission_value', commissionValue)
      commRec.set('status', status)
      commRec.set('reference_month', refMonth)
      if (status === 'paid') {
        // paid_at alguns dias após a venda
        const paidDateStr =
          p.y + '-' + pad2(p.m) + '-' + pad2(Math.min(p.d + 5, 28)) + ' 15:00:00.000Z'
        commRec.set('paid_at', paidDateStr)
      } else {
        commRec.set('paid_at', '')
      }
      app.save(commRec)
      createdCommissions++
    }

    // -----------------------------------------------------------------------
    // Metas mensais (sales_targets) para o vendedor12 — junho, julho, agosto
    // -----------------------------------------------------------------------
    const vendedorTargets = [
      { month: '2026-06', target: 15000 },
      { month: '2026-07', target: 18000 },
      { month: '2026-08', target: 20000 },
    ]
    for (let t = 0; t < vendedorTargets.length; t++) {
      const vt = vendedorTargets[t]
      // idempotente por user+month
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'sales_targets',
          'user = {:u} && month = {:m}',
          'created',
          1,
          0,
          { u: VEND_ID, m: vt.month },
        )
      } catch (_) {}
      if (exists && exists.length > 0) continue

      const rec = new Record(targetsCol)
      rec.set('user', VEND_ID)
      rec.set('month', vt.month)
      rec.set('target', vt.target)
      app.save(rec)
    }

    // -----------------------------------------------------------------------
    // Metas de categoria (category_goals) para agosto/2026
    // -----------------------------------------------------------------------
    const categoryGoals = [
      { category: 'graos', target_value: 5000 },
      { category: 'bebidas', target_value: 4000 },
      { category: 'mercearia', target_value: 6000 },
      { category: 'limpeza', target_value: 3000 },
    ]
    for (let g = 0; g < categoryGoals.length; g++) {
      const cg = categoryGoals[g]
      // idempotente por (category, month, year) — índice único
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'category_goals',
          'category = {:c} && month = {:m} && year = {:y}',
          'created',
          1,
          0,
          { c: cg.category, m: 8, y: 2026 },
        )
      } catch (_) {}
      if (exists && exists.length > 0) continue

      const rec = new Record(categoryGoalsCol)
      rec.set('category', cg.category)
      rec.set('target_value', cg.target_value)
      rec.set('month', 8)
      rec.set('year', 2026)
      rec.set('active', true)
      app.save(rec)
    }

    // -----------------------------------------------------------------------
    // Notificações de exemplo para o vendedor12
    // -----------------------------------------------------------------------
    const seedNotifs = [
      {
        type: 'commission',
        title: 'Comissão aprovada',
        message: 'Sua comissão de R$ 145,20 referente a junho/2026 foi aprovada pelo gestor.',
        reference_type: 'commission',
        is_read: false,
      },
      {
        type: 'order',
        title: 'Novo pedido registrado',
        message: 'O pedido #A1B2C3 foi registrado e está aguardando confirmação de pagamento.',
        reference_type: 'sale',
        is_read: false,
      },
      {
        type: 'system',
        title: 'Meta atualizada',
        message: 'Sua meta de vendas para agosto/2026 foi definida em R$ 20.000,00.',
        reference_type: 'target',
        is_read: true,
      },
      {
        type: 'commission',
        title: 'Comissão pendente',
        message: 'Você possui comissões pendentes de aprovação em julho/2026.',
        reference_type: 'commission',
        is_read: false,
      },
    ]
    for (let n = 0; n < seedNotifs.length; n++) {
      const sn = seedNotifs[n]
      // idempotente por user+title+message
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'notifications',
          'user = {:u} && title = {:t} && message = {:m}',
          'created',
          1,
          0,
          { u: VEND_ID, t: sn.title, m: sn.message },
        )
      } catch (_) {}
      if (exists && exists.length > 0) continue

      const rec = new Record(notificationsCol)
      rec.set('user', VEND_ID)
      rec.set('type', sn.type)
      rec.set('title', sn.title)
      rec.set('message', sn.message)
      rec.set('reference_type', sn.reference_type)
      rec.set('reference_id', '')
      rec.set('is_read', sn.is_read)
      app.save(rec)
    }

    console.log(
      '0009: seed concluído — ' +
        createdSales +
        ' vendas, ' +
        createdItems +
        ' itens, ' +
        createdCommissions +
        ' comissões.',
    )
  },
  (app) => {
    // Reverte apenas os dados de demo criados por esta migration (best-effort).
    // Não removemos as coleções (criadas por migrations anteriores).
    try {
      const sales = app.findRecordsByFilter('sales', '1=1', 'created', 0, 0)
      for (let i = 0; i < sales.length; i++) {
        try {
          app.delete(sales[i])
        } catch (_) {}
      }
    } catch (_) {}
    try {
      const comms = app.findRecordsByFilter('commissions', '1=1', 'created', 0, 0)
      for (let i = 0; i < comms.length; i++) {
        try {
          app.delete(comms[i])
        } catch (_) {}
      }
    } catch (_) {}
    try {
      const items = app.findRecordsByFilter('sale_items', '1=1', 'created', 0, 0)
      for (let i = 0; i < items.length; i++) {
        try {
          app.delete(items[i])
        } catch (_) {}
      }
    } catch (_) {}
  },
)
