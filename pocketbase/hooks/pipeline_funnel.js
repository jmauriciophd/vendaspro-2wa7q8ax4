// Funil de Vendas — conversão entre estágios do pipeline.
//
// GET /backend/v1/pipeline/funnel
// Query: month (1-12), year, seller_id
// Usa estágios reais (prospeccao, negociacao, proposta, fechado, perdido).
// Retorna array de estágios + cards de resumo.

routerAdd(
  'GET',
  '/backend/v1/pipeline/funnel',
  (e) => {
    const query = e.requestInfo().query || {}

    // filtros
    const filters = []
    const params = {}

    if (query.seller_id) {
      filters.push('owner = {:oid}')
      params.oid = query.seller_id
    }
    if (query.month && query.year) {
      const m = parseInt(query.month, 10)
      const y = parseInt(query.year, 10)
      if (m >= 1 && m <= 12 && y) {
        const startStr = y + '-' + String(m).padStart(2, '0') + '-01 00:00:00.000Z'
        const endD = new Date(y, m, 1)
        const endStr =
          endD.getFullYear() +
          '-' +
          String(endD.getMonth() + 1).padStart(2, '0') +
          '-01 00:00:00.000Z'
        filters.push('created >= {:s} && created < {:e}')
        params.s = startStr
        params.e = endStr
      }
    }

    const filterStr = filters.length > 0 ? filters.join(' && ') : '1=1'

    let deals = []
    try {
      deals = $app.findRecordsByFilter('deals', filterStr, '-created', 0, 0, params)
    } catch (_) {}

    // estágios do funil (ordem): prospeccao -> negociacao -> proposta -> fechado
    const STAGES = [
      { key: 'prospeccao', label: 'Prospecção' },
      { key: 'negociacao', label: 'Negociação' },
      { key: 'proposta', label: 'Proposta' },
      { key: 'fechado', label: 'Fechado' },
    ]

    // conta deals por estágio (inclui perdido separadamente)
    const countByStage = {}
    const valueByStage = {}
    for (let s = 0; s < STAGES.length; s++) {
      countByStage[STAGES[s].key] = 0
      valueByStage[STAGES[s].key] = 0
    }
    let lostCount = 0
    let lostValue = 0
    let totalDeals = 0
    let totalPotential = 0
    let totalConverted = 0

    for (let i = 0; i < deals.length; i++) {
      const d = deals[i]
      const stage = d.get('stage') || ''
      const value = d.get('value') || 0
      totalDeals++

      if (stage === 'perdido') {
        lostCount++
        lostValue += value
        continue
      }

      if (countByStage.hasOwnProperty(stage)) {
        countByStage[stage]++
        valueByStage[stage] += value
        totalPotential += value
        if (stage === 'fechado') {
          totalConverted += value
        }
      }
    }

    // monta array de estágios com conversão e perdas
    const stages = []
    let prevCount = 0
    for (let s = 0; s < STAGES.length; s++) {
      const st = STAGES[s]
      const count = countByStage[st.key]
      const value = valueByStage[st.key]

      let conversion = 100
      if (s > 0 && prevCount > 0) {
        conversion = Math.round((count / prevCount) * 1000) / 10
      } else if (s > 0) {
        conversion = 0
      }

      // drop_count: quantos saíram entre este e o próximo
      let dropCount = 0
      if (s < STAGES.length - 1) {
        dropCount = Math.max(0, count - countByStage[STAGES[s + 1].key])
      }

      stages.push({
        label: st.label,
        key: st.key,
        count: count,
        conversion: conversion,
        drop_count: dropCount,
        value: Math.round(value * 100) / 100,
      })

      prevCount = count
    }

    // cards de resumo
    const closedCount = countByStage['fechado'] || 0
    const firstCount = countByStage['prospeccao'] || 0
    const generalConversion =
      firstCount > 0 ? Math.round((closedCount / firstCount) * 1000) / 10 : 0

    // conta vendas concluídas (sales pagas) no mesmo período — métrica complementar
    let salesCount = 0
    try {
      const salesFilters = []
      const salesParams = {}
      if (query.seller_id) {
        salesFilters.push('seller = {:oid}')
        salesParams.oid = query.seller_id
      }
      if (query.month && query.year) {
        const m = parseInt(query.month, 10)
        const y = parseInt(query.year, 10)
        if (m >= 1 && m <= 12 && y) {
          const startStr = y + '-' + String(m).padStart(2, '0') + '-01 00:00:00.000Z'
          const endD = new Date(y, m, 1)
          const endStr =
            endD.getFullYear() +
            '-' +
            String(endD.getMonth() + 1).padStart(2, '0') +
            '-01 00:00:00.000Z'
          salesFilters.push('sale_date >= {:s} && sale_date < {:e}')
          salesParams.s = startStr
          salesParams.e = endStr
        }
      }
      const sf = salesFilters.length > 0 ? salesFilters.join(' && ') : '1=1'
      const salesRecords = $app.findRecordsByFilter('sales', sf, '-sale_date', 0, 0, salesParams)
      salesCount = salesRecords.length
    } catch (_) {}

    const cards = {
      total_opportunities: totalDeals,
      closed_deals: closedCount,
      completed_sales: salesCount,
      general_conversion: generalConversion,
      total_potential: Math.round(totalPotential * 100) / 100,
      total_converted: Math.round(totalConverted * 100) / 100,
      lost_count: lostCount,
      lost_value: Math.round(lostValue * 100) / 100,
    }

    return e.json(200, { stages: stages, cards: cards })
  },
  $apis.requireAuth(),
)
