import { useEffect, useState, useMemo } from 'react'
import {
  BarChart3,
  Printer,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Layers,
  PieChart as PieIcon,
  Store,
  CheckCircle2,
  Filter,
  FileText,
  Download,
  Receipt,
  Percent,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { saleService, saleItemService, customerService, productService } from '@/services/crm'
import type { Sale, SaleItem, Customer, Product } from '@/types/crm'

export default function Relatorios() {
  const [sales, setSales] = useState<Sale[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Period filter: 7d, 30d, 90d, 1y, custom
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('90d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Aba ativa: comercial | fiscal
  const [activeTab, setActiveTab] = useState<'comercial' | 'fiscal'>('comercial')

  // Período fiscal (datas início/fim)
  const [fiscalStart, setFiscalStart] = useState('')
  const [fiscalEnd, setFiscalEnd] = useState('')

  const loadData = async () => {
    try {
      const [salesData, itemsData, custData, prodData] = await Promise.all([
        saleService.getAll(),
        saleItemService.getAllDetailed(),
        customerService.getAll(),
        productService.getAll(),
      ])
      setSales(salesData)
      setSaleItems(itemsData)
      setCustomers(custData)
      setProducts(prodData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter sales according to period
  const filteredSales = useMemo(() => {
    const now = new Date()
    let cutoffDate = new Date()

    if (period === '7d') {
      cutoffDate.setDate(now.getDate() - 7)
    } else if (period === '30d') {
      cutoffDate.setDate(now.getDate() - 30)
    } else if (period === '90d') {
      cutoffDate.setDate(now.getDate() - 90)
    } else if (period === '1y') {
      cutoffDate.setFullYear(now.getFullYear() - 1)
    }

    return sales.filter((s) => {
      const saleDate = new Date(s.sale_date || s.created)
      if (period === 'custom') {
        if (customStart && saleDate < new Date(`${customStart} 00:00:00`)) return false
        if (customEnd && saleDate > new Date(`${customEnd} 23:59:59`)) return false
        return true
      }
      return saleDate >= cutoffDate
    })
  }, [sales, period, customStart, customEnd])

  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map((s) => s.id))
  }, [filteredSales])

  const filteredItems = useMemo(() => {
    return saleItems.filter((it) => filteredSaleIds.has(it.sale))
  }, [saleItems, filteredSaleIds])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, curr) => acc + (curr.total || 0), 0)
    const countSales = filteredSales.length
    const avgTicket = countSales > 0 ? totalRevenue / countSales : 0
    const totalItemsCount = filteredItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

    return {
      totalRevenue,
      countSales,
      avgTicket,
      totalItemsCount,
    }
  }, [filteredSales, filteredItems])

  // Chart 1: Receita por Mês no Período
  const revenueByMonthChart = useMemo(() => {
    const monthsMap: { [key: string]: { name: string; total: number; sortKey: number } } = {}
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]

    for (const s of filteredSales) {
      const d = new Date(s.sale_date || s.created)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthsMap[key]) {
        monthsMap[key] = {
          name: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
          total: 0,
          sortKey: d.getTime(),
        }
      }
      monthsMap[key].total += s.total || 0
    }

    return Object.values(monthsMap).sort((a, b) => a.sortKey - b.sortKey)
  }, [filteredSales])

  // Chart 2: Vendas por Categoria (Donut)
  const salesByCategoryChart = useMemo(() => {
    const categoryNames: any = {
      graos: 'Grãos & Cereais',
      bebidas: 'Bebidas',
      limpeza: 'Limpeza',
      mercearia: 'Mercearia',
      higiene: 'Higiene',
      outros: 'Outros',
    }

    const categoryColors: any = {
      graos: '#F59E0B',
      bebidas: '#3B82F6',
      limpeza: '#10B981',
      mercearia: '#8B5CF6',
      higiene: '#EC4899',
      outros: '#64748B',
    }

    const catMap: { [key: string]: { name: string; value: number; color: string } } = {}

    for (const it of filteredItems) {
      const cat = it.expand?.product?.category || 'outros'
      const itemSubtotal = it.quantity * it.unit_price
      if (!catMap[cat]) {
        catMap[cat] = {
          name: categoryNames[cat] || cat,
          value: 0,
          color: categoryColors[cat] || '#8B5CF6',
        }
      }
      catMap[cat].value += itemSubtotal
    }

    return Object.values(catMap).filter((c) => c.value > 0)
  }, [filteredItems])

  // Chart 3: Top 5 Produtos Mais Vendidos (Valor)
  const topProductsChart = useMemo(() => {
    const prodMap: { [key: string]: { name: string; revenue: number; qty: number } } = {}

    for (const it of filteredItems) {
      const pName = it.expand?.product?.name || 'Produto'
      if (!prodMap[pName]) {
        prodMap[pName] = { name: pName, revenue: 0, qty: 0 }
      }
      prodMap[pName].revenue += it.quantity * it.unit_price
      prodMap[pName].qty += it.quantity
    }

    return Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredItems])

  // Chart 4: Top 5 Clientes que mais compraram
  const topCustomersChart = useMemo(() => {
    const custMap: { [key: string]: { name: string; total: number } } = {}

    for (const s of filteredSales) {
      const cName = s.expand?.customer?.name || 'Mercadinho'
      if (!custMap[cName]) {
        custMap[cName] = { name: cName, total: 0 }
      }
      custMap[cName].total += s.total || 0
    }

    return Object.values(custMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filteredSales])

  // Chart 5: Vendas por Vendedor
  const salesBySellerChart = useMemo(() => {
    const sellerMap: { [key: string]: { name: string; total: number; count: number } } = {}

    for (const s of filteredSales) {
      const sellerName = s.expand?.seller?.name || 'Vendedor'
      if (!sellerMap[sellerName]) {
        sellerMap[sellerName] = { name: sellerName, total: 0, count: 0 }
      }
      sellerMap[sellerName].total += s.total || 0
      sellerMap[sellerName].count += 1
    }

    return Object.values(sellerMap).sort((a, b) => b.total - a.total)
  }, [filteredSales])

  // Payment Methods Breakdown Table
  const paymentMethodStats = useMemo(() => {
    const methodNames: any = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      boleto: 'Boleto Bancário',
    }

    const map: { [key: string]: { method: string; count: number; total: number } } = {}

    for (const s of filteredSales) {
      const m = s.payment_method || 'outros'
      if (!map[m]) {
        map[m] = { method: methodNames[m] || m, count: 0, total: 0 }
      }
      map[m].count += 1
      map[m].total += s.total || 0
    }

    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filteredSales])

  const handlePrint = () => {
    window.print()
  }

  // ===== Relatório Fiscal =====
  const ICMS_RATE = 0.18

  const fiscalSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.sale_date || s.created)
      if (fiscalStart && d < new Date(`${fiscalStart} 00:00:00`)) return false
      if (fiscalEnd && d > new Date(`${fiscalEnd} 23:59:59`)) return false
      return true
    })
  }, [sales, fiscalStart, fiscalEnd])

  const fiscalRows = useMemo(() => {
    return fiscalSales
      .map((s) => {
        const value = s.total || 0
        const icms = value * ICMS_RATE
        return {
          number: String(Math.abs(s.created.charCodeAt(0) % 9) + 1) + s.id.slice(-5).toUpperCase(),
          date: s.sale_date || s.created,
          customer: s.expand?.customer?.name || 'Mercadinho',
          value,
          icms,
          status: s.payment_status,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [fiscalSales])

  const fiscalSummary = useMemo(() => {
    const count = fiscalRows.length
    const totalValue = fiscalRows.reduce((acc, r) => acc + r.value, 0)
    const totalIcms = fiscalRows.reduce((acc, r) => acc + r.icms, 0)
    const avg = count > 0 ? totalValue / count : 0
    return { count, totalValue, totalIcms, avg }
  }, [fiscalRows])

  const fiscalByMonth = useMemo(() => {
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    const map: { [key: string]: { name: string; total: number; sortKey: number } } = {}
    for (const r of fiscalRows) {
      const d = new Date(r.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) {
        map[key] = {
          name: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
          total: 0,
          sortKey: d.getTime(),
        }
      }
      map[key].total += r.value
    }
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey)
  }, [fiscalRows])

  const exportFiscalCsv = () => {
    const headers = ['NF-e', 'Data', 'Cliente', 'Valor', 'ICMS (18%)', 'Status']
    const lines = [
      headers.join(';'),
      ...fiscalRows.map((r) =>
        [
          r.number,
          new Date(r.date).toLocaleDateString('pt-BR'),
          r.customer,
          r.value.toFixed(2).replace('.', ','),
          r.icms.toFixed(2).replace('.', ','),
          r.status === 'pago' ? 'Pago' : 'Pendente',
        ].join(';'),
      ),
    ]
    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_fiscal_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printFiscal = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const rowsHtml = fiscalRows
      .map(
        (r) =>
          `<tr><td>${r.number}</td><td>${new Date(r.date).toLocaleDateString('pt-BR')}</td><td>${r.customer}</td><td style="text-align:right">R$ ${r.value.toFixed(2)}</td><td style="text-align:right">R$ ${r.icms.toFixed(2)}</td><td>${r.status === 'pago' ? 'Pago' : 'Pendente'}</td></tr>`,
      )
      .join('')
    w.document
      .write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatório Fiscal</title>
    <style>
      body{font-family:Arial,sans-serif;color:#1e293b;padding:32px}
      h1{color:#4f46e5;font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
      th{background:#f1f5f9;text-align:left;padding:8px;border-bottom:2px solid #e2e8f0}
      td{padding:8px;border-bottom:1px solid #eef2f7}
      .sum{margin-top:16px;font-size:12px;color:#475569}
    </style></head><body>
    <h1>Relatório Fiscal — NF-es Emitidas</h1>
    <p style="font-size:11px;color:#64748b">Período: ${fiscalStart || 'início'} a ${fiscalEnd || 'fim'} • Emitido em ${new Date().toLocaleString('pt-BR')}</p>
    <table><thead><tr><th>NF-e</th><th>Data</th><th>Cliente</th><th style="text-align:right">Valor</th><th style="text-align:right">ICMS</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <div class="sum"><strong>Total de NF-es:</strong> ${fiscalSummary.count} • <strong>Valor Total:</strong> R$ ${fiscalSummary.totalValue.toFixed(2)} • <strong>ICMS Total:</strong> R$ ${fiscalSummary.totalIcms.toFixed(2)}</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => {
      w.focus()
      w.print()
    }, 400)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Relatórios
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {activeTab === 'comercial' ? 'Comercial' : 'Fiscal'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'comercial'
              ? 'Métricas de faturamento, categorias de produtos e desempenho comercial'
              : 'Totalização de NF-es emitidas, ICMS e exportação fiscal'}
          </p>
        </div>

        {activeTab === 'comercial' ? (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Relatório</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={exportFiscalCsv}
              className="px-4 py-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={printFiscal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold w-fit print:hidden">
        <button
          onClick={() => setActiveTab('comercial')}
          className={`px-4 py-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'comercial'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Comercial
        </button>
        <button
          onClick={() => setActiveTab('fiscal')}
          className={`px-4 py-2 flex items-center gap-1.5 border-l border-slate-200 transition-colors ${
            activeTab === 'fiscal'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Fiscal
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">
          CRM de Vendas — {activeTab === 'comercial' ? 'Relatório Comercial' : 'Relatório Fiscal'}
        </h1>
        <p className="text-xs text-slate-500">
          Emitido em: {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {activeTab === 'fiscal' ? (
        /* ===== ABA FISCAL ===== */
        <div className="space-y-6">
          {/* Filtro de período fiscal */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 print:hidden">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Período:
            </span>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={fiscalStart}
                onChange={(e) => setFiscalStart(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={fiscalEnd}
                onChange={(e) => setFiscalEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Cards de resumo fiscal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  NF-es Emitidas
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{fiscalSummary.count}</div>
              <p className="text-[11px] text-slate-400 mt-1">Notas no período selecionado</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Valor Total
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                R$ {fiscalSummary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Soma das NF-es</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  ICMS Total
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                R$ {fiscalSummary.totalIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">18% sobre o valor das notas</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Média por NF-e
                </span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                R$ {fiscalSummary.avg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Valor médio das notas</p>
            </div>
          </div>

          {/* Gráfico de barras: valor de NF-es por mês */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Valor de NF-es por Mês</h3>
            <p className="text-xs text-slate-400 mb-4">Total faturado em notas fiscais (R$)</p>
            <div className="h-64 min-h-[256px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <BarChart
                  data={fiscalByMonth}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Valor NF-e',
                    ]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de NF-es */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">NF-es Emitidas no Período</h3>
              <p className="text-xs text-slate-400 mt-0.5">{fiscalRows.length} nota(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Número NF-e</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-right">ICMS</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma NF-e no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    fiscalRows.map((r) => (
                      <tr key={r.number} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{r.number}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(r.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-slate-800">{r.customer}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          R$ {r.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          R$ {r.icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'pago' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ===== ABA COMERCIAL (conteúdo existente) ===== */
        <>
          {/* Period Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Período:
              </span>
              {(['7d', '30d', '90d', '1y', 'custom'] as const).map((p) => {
                const labels = {
                  '7d': 'Últimos 7 dias',
                  '30d': 'Últimos 30 dias',
                  '90d': 'Últimos 90 dias',
                  '1y': 'Último 1 ano',
                  custom: 'Personalizado',
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      period === p
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {labels[p]}
                  </button>
                )
              })}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            )}
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Receita Total
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                R${' '}
                {summaryMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total faturado no período selecionado
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Nº de Vendas
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {summaryMetrics.countSales}{' '}
                <span className="text-xs font-normal text-slate-400">pedidos</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pedidos fechados e emitidos</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Ticket Médio
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                R$ {summaryMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Média por pedido faturado</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Itens Vendidos
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {summaryMetrics.totalItemsCount}{' '}
                <span className="text-xs font-normal text-slate-400">unidades</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Volume total de produtos entregues</p>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receita por Período */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Receita por Mês no Período</h3>
              <p className="text-xs text-slate-400 mb-4">Total faturado em Reais (R$)</p>

              <div className="h-64 min-h-[256px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    data={revenueByMonthChart}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Faturamento',
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="total" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vendas por Categoria */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Vendas por Categoria de Produto
              </h3>
              <p className="text-xs text-slate-400 mb-4">Faturamento por departamento</p>

              <div className="h-56 min-h-[224px] w-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                  <PieChart>
                    <Pie
                      data={salesByCategoryChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {salesByCategoryChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Receita',
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100">
                {salesByCategoryChart.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Produtos */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Top 5 Produtos Mais Vendidos
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Classificação por receita total faturada
              </p>

              <div className="h-60 min-h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    layout="vertical"
                    data={topProductsChart}
                    margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      stroke="#94A3B8"
                      fontSize={10}
                      tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#64748B"
                      fontSize={11}
                      width={110}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Faturamento',
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#10B981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Clientes */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Top 5 Mercadinhos Compradores
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Mercadinhos que mais geraram faturamento
              </p>

              <div className="h-60 min-h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    layout="vertical"
                    data={topCustomersChart}
                    margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      stroke="#94A3B8"
                      fontSize={10}
                      tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#64748B"
                      fontSize={11}
                      width={120}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Total Comprado',
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="total" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown Table & Seller Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formas de Pagamento Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Distribuição por Forma de Pagamento
              </h3>
              <p className="text-xs text-slate-400 mb-4">Volume e total faturado por modalidade</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Forma de Pagamento</th>
                      <th className="py-2.5 px-3 text-center">Nº Vendas</th>
                      <th className="py-2.5 px-3 text-right">Total Faturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentMethodStats.map((item) => (
                      <tr key={item.method}>
                        <td className="py-3 px-3 font-semibold text-slate-800">{item.method}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{item.count}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendas por Vendedor Vertical Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Vendas por Vendedor</h3>
              <p className="text-xs text-slate-400 mb-4">Desempenho da equipe comercial</p>

              <div className="h-60 min-h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    data={salesBySellerChart}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Faturamento',
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="total" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
