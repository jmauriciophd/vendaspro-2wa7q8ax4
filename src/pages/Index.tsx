import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Store,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import {
  customerService,
  dealService,
  saleService,
  userService,
  reminderService,
} from '@/services/crm'
import type { Customer, Deal, Sale, User, Reminder } from '@/types/crm'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { Bell } from 'lucide-react'
import { ClientImportModal } from '@/components/clients/ClientImportModal'
import { adminDashboardService } from '@/services/modules'
import type { AdminTeamPerformance, AdminCategoriesBelow } from '@/types/modules'
import { toast } from 'sonner'
import { Upload, Filter as FilterIcon, Trophy, AlertTriangle, Target } from 'lucide-react'
import { paymentService, formatMoney } from '@/services/paymentService'
import type { PaymentsDashboard } from '@/types/payments'
import {
  DollarSign as PaymentDollar,
  CheckCircle2 as PaymentCheck,
  Clock as PaymentClock,
  AlertTriangle as PaymentAlert,
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [sales, setSales] = useState<Sale[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [importClientsOpen, setImportClientsOpen] = useState(false)
  // Novas seções admin (ranking vendedores + categorias abaixo da meta)
  const [teamPerformance, setTeamPerformance] = useState<AdminTeamPerformance | null>(null)
  const [categoriesBelow, setCategoriesBelow] = useState<AdminCategoriesBelow | null>(null)
  const [payDash, setPayDash] = useState<PaymentsDashboard | null>(null)

  const loadData = async () => {
    try {
      const [salesData, dealsData, customersData, usersData, remindersData] = await Promise.all([
        saleService.getAll(),
        dealService.getAll(),
        customerService.getAll(),
        userService.getAll(),
        user ? reminderService.getPending(user.id) : Promise.resolve([]),
      ])
      // dashboard financeiro (não bloqueia render principal)
      paymentService
        .dashboard()
        .then(setPayDash)
        .catch(() => {})
      setSales(salesData)
      setDeals(dealsData)
      setCustomers(customersData)
      setUsers(usersData)
      setReminders(remindersData)

      // Carrega dados das novas seções admin em paralelo (não bloqueia o render principal)
      Promise.all([
        adminDashboardService.teamPerformance().catch(() => null),
        adminDashboardService.categoriesBelow().catch(() => null),
      ]).then(([team, cats]) => {
        setTeamPerformance(team)
        setCategoriesBelow(cats)
      })
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime updates
  useRealtime<Sale>('sales', () => loadData())
  useRealtime<Deal>('deals', () => loadData())
  useRealtime<Customer>('customers', () => loadData())
  useRealtime<Reminder>('reminders', () => loadData())

  // Calculations for KPIs
  const kpiData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    let currentMonthSalesTotal = 0
    let previousMonthSalesTotal = 0

    for (const s of sales) {
      const d = new Date(s.sale_date || s.created)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        currentMonthSalesTotal += s.total || 0
      } else if (d.getMonth() === previousMonth && d.getFullYear() === previousMonthYear) {
        previousMonthSalesTotal += s.total || 0
      }
    }

    // Percentage diff
    let monthDiffPercent = 0
    if (previousMonthSalesTotal > 0) {
      monthDiffPercent =
        ((currentMonthSalesTotal - previousMonthSalesTotal) / previousMonthSalesTotal) * 100
    } else if (currentMonthSalesTotal > 0) {
      monthDiffPercent = 100
    }

    const openDeals = deals.filter((d) => d.stage !== 'fechado' && d.stage !== 'perdido')
    const closedDeals = deals.filter((d) => d.stage === 'fechado')
    const activeCustomers = customers.filter((c) => c.status === 'ativo')

    const conversionRate = deals.length > 0 ? (closedDeals.length / deals.length) * 100 : 0

    return {
      monthSales: currentMonthSalesTotal,
      monthDiffPercent,
      openDealsCount: openDeals.length,
      openDealsValue: openDeals.reduce((acc, curr) => acc + (curr.value || 0), 0),
      activeCustomersCount: activeCustomers.length,
      conversionRate,
    }
  }, [sales, deals, customers])

  // Chart: Sales over the last 6 months
  const monthlySalesChart = useMemo(() => {
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
    const now = new Date()
    const months: { [key: string]: { name: string; total: number; sortKey: number } } = {}

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = {
        name: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
        total: 0,
        sortKey: d.getTime(),
      }
    }

    for (const s of sales) {
      const d = new Date(s.sale_date || s.created)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (months[key]) {
        months[key].total += s.total || 0
      }
    }

    return Object.values(months).sort((a, b) => a.sortKey - b.sortKey)
  }, [sales])

  // Chart: Pipeline by Stage
  const pipelineDonutChart = useMemo(() => {
    const stagesMap = {
      prospeccao: { name: 'Prospecção', color: '#3B82F6', count: 0, value: 0 },
      negociacao: { name: 'Negociação', color: '#8B5CF6', count: 0, value: 0 },
      proposta: { name: 'Proposta', color: '#F59E0B', count: 0, value: 0 },
      fechado: { name: 'Fechado', color: '#10B981', count: 0, value: 0 },
      perdido: { name: 'Perdido', color: '#EF4444', count: 0, value: 0 },
    }

    for (const d of deals) {
      if (stagesMap[d.stage]) {
        stagesMap[d.stage].count += 1
        stagesMap[d.stage].value += d.value || 0
      }
    }

    return Object.values(stagesMap).filter((item) => item.count > 0 || item.value > 0)
  }, [deals])

  // Chart: Sales by Seller
  const salesBySellerChart = useMemo(() => {
    const sellerMap: { [key: string]: { name: string; total: number; count: number } } = {}

    for (const s of sales) {
      const sellerName = s.expand?.seller?.name || 'Vendedor Padrão'
      if (!sellerMap[sellerName]) {
        sellerMap[sellerName] = { name: sellerName, total: 0, count: 0 }
      }
      sellerMap[sellerName].total += s.total || 0
      sellerMap[sellerName].count += 1
    }

    return Object.values(sellerMap).sort((a, b) => b.total - a.total)
  }, [sales])

  const stageBadge = (stage: Deal['stage']) => {
    const map = {
      prospeccao: { label: 'Prospecção', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      negociacao: { label: 'Negociação', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
      proposta: { label: 'Proposta', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      fechado: { label: 'Fechado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      perdido: { label: 'Perdido', bg: 'bg-red-50 text-red-700 border-red-200' },
    }
    const s = map[stage] || { label: stage, bg: 'bg-slate-50 text-slate-700 border-slate-200' }
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.bg}`}>
        {s.label}
      </span>
    )
  }

  const paymentStatusBadge = (status: Sale['payment_status']) => {
    if (status === 'pago') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" />
          Pago
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3" />
        Pendente
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Visão Geral das Vendas
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Em Tempo Real
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe o faturamento, propostas em aberto e desempenho com mercadinhos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pipeline')}
            className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
          >
            Ver Pipeline Kanban
          </button>
          <button
            onClick={() => navigate('/vendas')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Registrar Venda
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Vendas no Mês */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vendas no Mês
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            R${' '}
            {kpiData.monthSales.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {kpiData.monthDiffPercent >= 0 ? (
              <span className="text-emerald-600 flex items-center font-semibold">
                <ArrowUpRight className="w-4 h-4" />+{kpiData.monthDiffPercent.toFixed(1)}%
              </span>
            ) : (
              <span className="text-red-600 flex items-center font-semibold">
                <ArrowDownRight className="w-4 h-4" />
                {kpiData.monthDiffPercent.toFixed(1)}%
              </span>
            )}
            <span className="text-slate-400">vs. mês anterior</span>
          </div>
        </div>

        {/* Card 2: Negócios Abertos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Negócios Abertos
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {kpiData.openDealsCount}{' '}
            <span className="text-sm font-normal text-slate-400">oportunidades</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-violet-700">
              R$ {kpiData.openDealsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span>em negociação</span>
          </div>
        </div>

        {/* Card 3: Clientes Ativos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Clientes Ativos
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {kpiData.activeCustomersCount}{' '}
            <span className="text-sm font-normal text-slate-400">/ {customers.length} total</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mercadinhos cadastrados</span>
          </div>
        </div>

        {/* Card 4: Taxa de Conversão */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Taxa de Conversão
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {kpiData.conversionRate.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-slate-700">Deals Fechados</span>
            <span>no ciclo comercial</span>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro (Pagamentos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/financeiro/cobrancas')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recebimentos Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PaymentCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            R$ {formatMoney(payDash?.received_today)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {payDash?.received_today_count || 0} cobrança(s) pagas hoje
          </p>
        </div>
        <div
          onClick={() => navigate('/financeiro/cobrancas')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cobranças Pendentes
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PaymentClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {payDash?.pending_count || 0}{' '}
            <span className="text-sm font-normal text-slate-400">cobranças</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            R$ {formatMoney(payDash?.pending_value)} em aberto
          </p>
        </div>
        <div
          onClick={() => navigate('/financeiro/cobrancas')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cobranças Vencidas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PaymentAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {payDash?.expired_count || 0}{' '}
            <span className="text-sm font-normal text-slate-400">vencidas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            R$ {formatMoney(payDash?.expired_value)} a recuperar
          </p>
        </div>
      </div>

      {/* Lembretes Pendentes */}
      <RemindersSection reminders={reminders} onComplete={loadData} />

      {/* Acesso Rápido */}
      <QuickAccessSection
        onCommissions={() => navigate('/comissoes')}
        onImportClients={() => setImportClientsOpen(true)}
        onFunnel={() => navigate('/pipeline-funil')}
        onPerformance={() => navigate('/relatorios/desempenho')}
        onFinancialReport={() => navigate('/relatorios/financeiro')}
      />

      {/* Top Vendedores + Comissões Pendentes (admin/gerente) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Vendedores */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Top Vendedores</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranking de vendas no mês{' '}
                  {teamPerformance ? `(${teamPerformance.reference_month})` : ''}
                </p>
              </div>
            </div>
            {teamPerformance && (
              <span className="text-[11px] text-slate-400">
                {teamPerformance.goals_reached}/{teamPerformance.total_sellers} bateram a meta
              </span>
            )}
          </div>

          {!teamPerformance || teamPerformance.ranking.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma venda registrada no período.
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxSales = Math.max(
                  ...teamPerformance.ranking.map((r) => r.salesValue || 0),
                  1,
                )
                return teamPerformance.ranking.slice(0, 6).map((r, idx) => (
                  <div key={r.seller} className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700'
                          : idx === 1
                            ? 'bg-slate-200 text-slate-700'
                            : idx === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {r.name}
                          {r.reachedGoal && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1" />
                          )}
                        </p>
                        <span className="text-xs font-bold text-slate-900">
                          R${' '}
                          {Number(r.salesValue || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            r.percentage >= 100
                              ? 'bg-emerald-500'
                              : r.percentage >= 70
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                          }`}
                          style={{
                            width: `${Math.max(8, Math.min((r.salesValue / maxSales) * 100, 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {r.ordersCount} pedido(s) • {Number(r.percentage || 0).toFixed(1)}% da meta
                      </p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>

        {/* Comissões Pendentes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Comissões Pendentes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Total aguardando aprovação</p>
              </div>
            </div>
          </div>

          {teamPerformance ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  R${' '}
                  {Number(teamPerformance.pending_commissions_value || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {teamPerformance.pending_commissions_count} comissão(ões) pendente(s) de aprovação.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 flex-1">
                {teamPerformance.ranking
                  .filter((r) => r.pendingCommission > 0)
                  .slice(0, 4)
                  .map((r) => (
                    <div key={r.seller} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 truncate">{r.name}</span>
                      <span className="font-semibold text-amber-700">
                        R${' '}
                        {Number(r.pendingCommission || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                {teamPerformance.ranking.filter((r) => r.pendingCommission > 0).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nenhuma comissão pendente por vendedor.
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/comissoes')}
                className="mt-4 w-full px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                Gerenciar comissões <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">Carregando...</div>
          )}
        </div>
      </div>

      {/* Modal de importação de clientes (atalho do dashboard) */}
      <ClientImportModal
        isOpen={importClientsOpen}
        onClose={() => setImportClientsOpen(false)}
        onImported={loadData}
      />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Vendas por Mês (Área Gradiente) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Evolução de Vendas (Últimos 6 Meses)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Faturamento acumulado por mês faturado
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-700 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" /> Tendência Positiva
            </div>
          </div>

          <div className="h-64 min-h-[256px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <AreaChart
                data={monthlySalesChart}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Faturamento',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#salesGradient)"
                  dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#4338CA' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Pipeline por Estágio (Donut) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">Pipeline por Estágio</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribuição do número de oportunidades</p>
          </div>

          <div className="h-56 min-h-[224px] w-full min-w-0 flex-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
              <PieChart>
                <Pie
                  data={pipelineDonutChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {pipelineDonutChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} negócio(s) (R$ ${item.payload.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
                    item.payload.name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
            {pipelineDonutChart.map((stage) => (
              <div key={stage.name} className="flex items-center gap-2 text-xs text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="truncate">{stage.name}</span>
                <span className="font-semibold text-slate-800 ml-auto">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row with Vendas por Vendedor & Negócios Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Vendas por Vendedor */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-800">Vendas por Vendedor</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ranking comercial por receita fechada</p>
          </div>

          <div className="h-60 min-h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart
                layout="vertical"
                data={salesBySellerChart}
                margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} width={90} />
                <Tooltip
                  formatter={(val: any) => [
                    `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Vendido',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela Negócios Recentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Negócios no Pipeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Oportunidades em andamento com mercadinhos
              </p>
            </div>
            <button
              onClick={() => navigate('/pipeline')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Ver Kanban <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Mercadinho</th>
                  <th className="py-2.5 px-3">Título do Negócio</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Estágio</th>
                  <th className="py-2.5 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.slice(0, 5).map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate('/pipeline')}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-800 group-hover:text-indigo-600">
                      {d.expand?.customer?.name || 'Cliente'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">{d.title}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      R$ {d.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">{stageBadge(d.stage)}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {d.expand?.owner?.name || 'Vendedor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabela Últimas Vendas */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Últimas Vendas Registradas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Histórico de pedidos faturados recentemente
            </p>
          </div>
          <button
            onClick={() => navigate('/vendas')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Ver todas as vendas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Mercadinho</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3">Forma de Pagamento</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((s) => {
                const dateFormatted = new Date(s.sale_date || s.created).toLocaleDateString('pt-BR')
                const methodMap: any = {
                  dinheiro: 'Dinheiro',
                  pix: 'PIX',
                  cartao_credito: 'Cartão de Crédito',
                  cartao_debito: 'Cartão de Débito',
                  boleto: 'Boleto Bancário',
                }
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate('/vendas')}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 text-slate-500 font-medium">{dateFormatted}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800 group-hover:text-indigo-600">
                      {s.expand?.customer?.name || 'Cliente'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {s.expand?.seller?.name || 'Vendedor'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {methodMap[s.payment_method] || s.payment_method}
                    </td>
                    <td className="py-3 px-3">{paymentStatusBadge(s.payment_status)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      R$ {s.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------- Acesso Rápido (atalhos para os novos módulos) ---------- */

function QuickAccessSection({
  onCommissions,
  onImportClients,
  onFunnel,
  onPerformance,
  onFinancialReport,
}: {
  onCommissions: () => void
  onImportClients: () => void
  onFunnel: () => void
  onPerformance: () => void
  onFinancialReport: () => void
}) {
  const shortcuts = [
    {
      label: 'Comissões',
      description: 'Calcule e acompanhe comissões da equipe',
      icon: Percent,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      hover: 'hover:border-indigo-300 hover:shadow-md',
      onClick: onCommissions,
    },
    {
      label: 'Desempenho',
      description: 'Compare o desempenho dos vendedores no período',
      icon: TrendingUp,
      color: 'bg-sky-50 text-sky-700 border-sky-100',
      hover: 'hover:border-sky-300 hover:shadow-md',
      onClick: onPerformance,
    },
    {
      label: 'Relatório Financeiro',
      description: 'Receitas, taxas e valor líquido por provedor',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      hover: 'hover:border-emerald-300 hover:shadow-md',
      onClick: onFinancialReport,
    },
    {
      label: 'Importar Clientes',
      description: 'Cadastre mercadinhos em lote via CSV',
      icon: Upload,
      color: 'bg-violet-50 text-violet-700 border-violet-100',
      hover: 'hover:border-violet-300 hover:shadow-md',
      onClick: onImportClients,
    },
    {
      label: 'Funil de Vendas',
      description: 'Visualize a conversão entre estágios',
      icon: FilterIcon,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      hover: 'hover:border-amber-300 hover:shadow-md',
      onClick: onFunnel,
    },
  ]

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Acesso Rápido</h3>
            <p className="text-xs text-slate-400 mt-0.5">Atalhos para os módulos do CRM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className={`group flex items-center gap-3 p-4 rounded-xl border ${s.color} ${s.hover} transition-all text-left cursor-pointer`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{s.label}</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                {s.description}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Lembretes Pendentes section ---------- */

function RemindersSection({
  reminders,
  onComplete,
}: {
  reminders: Reminder[]
  onComplete: () => void
}) {
  // até 5 mais próximos do vencimento (sem vencimento por último)
  const sorted = [...reminders].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return da - db
  })
  const list = sorted.slice(0, 5)

  const handleComplete = async (id: string) => {
    try {
      await reminderService.markDone(id)
      toast.success('Lembrete concluído!')
      onComplete()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao concluir lembrete')
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Lembretes Pendentes</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Próximos follow-ups de negócios a vencer
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
          {reminders.length} pendente(s)
        </span>
      </div>

      {list.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Nenhum lembrete pendente</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Você está em dia com seus follow-ups.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {list.map((r) => {
            const deal = r.expand?.deal
            const customerName = deal?.expand?.customer?.name || 'Cliente'
            const due = r.due_date ? new Date(r.due_date) : null
            const isOverdue = due && due < new Date()
            return (
              <div key={r.id} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {deal?.title || 'Negócio'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {customerName}
                    {r.message ? ` — ${r.message}` : ''}
                  </p>
                </div>
                {due && (
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isOverdue
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {due.toLocaleDateString('pt-BR')}
                  </span>
                )}
                <button
                  onClick={() => handleComplete(r.id)}
                  title="Concluir lembrete"
                  className="shrink-0 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
