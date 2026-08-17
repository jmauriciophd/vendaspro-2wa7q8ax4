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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Relatórios Comerciais
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Análise de Vendas
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Métricas de faturamento, categorias de produtos e desempenho comercial
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">CRM de Vendas — Relatório Comercial</h1>
        <p className="text-xs text-slate-500">
          Emitido em: {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

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
            R$ {summaryMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total faturado no período selecionado</p>
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

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
          <h3 className="text-sm font-bold text-slate-800 mb-1">Vendas por Categoria de Produto</h3>
          <p className="text-xs text-slate-400 mb-4">Faturamento por departamento</p>

          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
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
          <h3 className="text-sm font-bold text-slate-800 mb-1">Top 5 Produtos Mais Vendidos</h3>
          <p className="text-xs text-slate-400 mb-4">Classificação por receita total faturada</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} width={110} />
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
          <h3 className="text-sm font-bold text-slate-800 mb-1">Top 5 Mercadinhos Compradores</h3>
          <p className="text-xs text-slate-400 mb-4">Mercadinhos que mais geraram faturamento</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} width={120} />
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

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
    </div>
  )
}
