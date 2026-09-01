import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Trophy,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Award,
  Users as UsersIcon,
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
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import { sellerPerformanceService } from '@/services/modules'
import type { SellerPerformanceReport, SellerPerformanceItem } from '@/types/modules'

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const MONTH_SHORT = [
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

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatBRLCompact = (v: number) => {
  const n = v || 0
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`
  return `R$ ${n.toFixed(0)}`
}

const AVATAR_COLORS = [
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-100',
  'bg-rose-50 text-rose-700 border-rose-100',
  'bg-blue-50 text-blue-700 border-blue-100',
]

function avatarInitials(name: string) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

const RANK_BADGE = [
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-slate-200 text-slate-700 border-slate-300',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-slate-100 text-slate-500 border-slate-200',
]

export default function PerformanceReport() {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [report, setReport] = useState<SellerPerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const loadData = async () => {
    try {
      const data = await sellerPerformanceService.report({ month, year })
      setReport(data)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao carregar relatório de desempenho')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const goPrev = () => setCursor(new Date(year, month - 2, 1))
  const goNext = () => setCursor(new Date(year, month, 1))
  const goCurrent = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))

  const ranking = report?.ranking || []
  const summary = report?.summary

  const maxSales = useMemo(() => {
    if (ranking.length === 0) return 1
    return Math.max(...ranking.map((r) => r.salesValue), 1)
  }, [ranking])

  // Gráfico de barras horizontais — vendas por vendedor no mês
  const barData = useMemo(() => {
    return ranking
      .slice()
      .sort((a, b) => a.salesValue - b.salesValue)
      .map((r) => ({ name: r.name, total: r.salesValue }))
  }, [ranking])

  // Evolução mensal (últimos 6 meses) por vendedor — carregada sob demanda
  const [evolution, setEvolution] = useState<
    Record<string, { name: string; data: { period: string; value: number }[] }>
  >({})

  useEffect(() => {
    let cancelled = false
    const loadEvolution = async () => {
      const sellers = ranking.map((r) => ({ id: r.seller, name: r.name }))
      if (sellers.length === 0) {
        setEvolution({})
        return
      }

      const months: { key: string; label: string; year: number; month: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months.push({
          key,
          label: `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
        })
      }

      // Busca o relatório de cada um dos últimos 6 meses em paralelo
      const results: Record<string, { name: string; data: { period: string; value: number }[] }> =
        {}
      try {
        const monthlyReports = await Promise.all(
          months.map((m) =>
            sellerPerformanceService.report({ month: m.month, year: m.year }).catch(() => null),
          ),
        )
        for (const s of sellers) {
          results[s.id] = {
            name: s.name,
            data: months.map((m, idx) => {
              const r = monthlyReports[idx]
              const item = r?.ranking.find((it) => it.seller === s.id)
              return { period: m.label, value: item?.salesValue || 0 }
            }),
          }
        }
        if (!cancelled) setEvolution(results)
      } catch (e) {
        console.error(e)
      }
    }
    loadEvolution()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, ranking.length])

  const evolutionChartData = useMemo(() => {
    const sellers = Object.keys(evolution)
    if (sellers.length === 0) return []
    const first = evolution[sellers[0]]
    if (!first) return []
    return first.data.map((point, idx) => {
      const row: Record<string, string | number> = { period: point.period }
      for (const sid of sellers) {
        row[evolution[sid].name] = evolution[sid].data[idx]?.value || 0
      }
      return row
    })
  }, [evolution])

  const avatarColor = (id: string) => {
    const idx = ranking.findIndex((r) => r.seller === id)
    return AVATAR_COLORS[idx % AVATAR_COLORS.length] || AVATAR_COLORS[0]
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Desempenho por Vendedor
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {MONTH_NAMES[cursor.getMonth()]}/{year}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare o desempenho da equipe comercial ao longo do tempo
          </p>
        </div>

        {/* Seletor de mês/ano */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
          <button
            onClick={goPrev}
            title="Mês anterior"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[150px]">
            <p className="text-xs font-bold text-slate-800">
              {MONTH_NAMES[cursor.getMonth()]} {year}
            </p>
            <button
              onClick={goCurrent}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Mês atual
            </button>
          </div>
          <button
            onClick={goNext}
            title="Próximo mês"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-indigo-50 text-indigo-600"
          label="Vendas Totais no Mês"
          value={`R$ ${formatBRL(summary?.totalSales || 0)}`}
        />
        <SummaryCard
          icon={<Percent className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
          label="Comissões Totais"
          value={`R$ ${formatBRL(summary?.totalCommissions || 0)}`}
        />
        <SummaryCard
          icon={<Target className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
          label="Média de Meta Atingida"
          value={`${(summary?.avgGoalPct || 0).toFixed(1)}%`}
        />
        <SummaryCard
          icon={<Trophy className="w-5 h-5" />}
          color="bg-violet-50 text-violet-600"
          label="Melhor Vendedor"
          value={summary?.bestSeller || '—'}
          small
        />
        <SummaryCard
          icon={<ShoppingCart className="w-5 h-5" />}
          color="bg-blue-50 text-blue-600"
          label="Total de Pedidos"
          value={String(summary?.totalOrders || 0)}
        />
      </div>

      {/* Tabela principal de ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            Ranking de Vendedores
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparativo no período {report?.period} vs {report?.previousPeriod}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando desempenho...</div>
        ) : ranking.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">
              Nenhum vendedor com atividade no período
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Selecione outro mês ou registre vendas pagas para visualizar o ranking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4 text-right">Vendas</th>
                  <th className="py-3 px-4 text-right">Pedidos</th>
                  <th className="py-3 px-4 text-right">Ticket Médio</th>
                  <th className="py-3 px-4 text-right">Comissão</th>
                  <th className="py-3 px-4 min-w-[160px]">Meta</th>
                  <th className="py-3 px-4 text-right">Variação vs mês anterior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((r) => (
                  <PerformanceRow
                    key={r.seller}
                    item={r}
                    avatarClass={avatarColor(r.seller)}
                    maxSales={maxSales}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gráfico de barras horizontais — Vendas por Vendedor */}
      {ranking.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Vendas por Vendedor
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Valor total vendido no mês ({MONTH_NAMES[cursor.getMonth()]}/{year})
            </p>
          </div>

          <div className="h-72 min-h-[288px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => formatBRLCompact(v)}
                />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} width={110} />
                <Tooltip
                  formatter={(val: any) => [
                    `R$ ${Number(val).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}`,
                    'Vendido',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Evolução Mensal */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-indigo-600" />
              Evolução Mensal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses de vendas por vendedor</p>
          </div>
        </div>

        {evolutionChartData.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">Carregando evolução...</div>
        ) : (
          <div className="h-72 min-h-[288px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <LineChart
                data={evolutionChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickFormatter={(v) => formatBRLCompact(v)} />
                <Tooltip
                  formatter={(val: any) =>
                    `R$ ${Number(val).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}`
                  }
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {Object.values(evolution).map((s, idx) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mini-tabela de evolução */}
        {Object.keys(evolution).length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Vendedor</th>
                  {evolutionChartData.map((p) => (
                    <th key={p.period} className="py-2.5 px-3 text-right">
                      {p.period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(evolution).map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.name}</td>
                    {s.data.map((p) => (
                      <td key={p.period} className="py-2.5 px-3 text-right text-slate-600">
                        R$ {formatBRL(p.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const LINE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']

// ---------------------------------------------------------------------------
function SummaryCard({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  small?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div
        className={`font-bold text-slate-900 tracking-tight truncate ${
          small ? 'text-base' : 'text-xl'
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function PerformanceRow({
  item,
  avatarClass,
  maxSales,
}: {
  item: SellerPerformanceItem
  avatarClass: string
  maxSales: number
}) {
  const goalPct = Math.min(item.goalPercentage, 100)
  const hasGoal = item.goalTarget > 0
  const variationPositive = item.variationValue > 0
  const variationNegative = item.variationValue < 0
  const variationZero = Math.abs(item.variationValue) < 0.01

  const rankClass = RANK_BADGE[Math.min(item.rank - 1, RANK_BADGE.length - 1)] || RANK_BADGE[3]
  const barWidth = maxSales > 0 ? Math.max(6, (item.salesValue / maxSales) * 100) : 0

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="py-3 px-4">
        <span
          className={`inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-bold border ${rankClass}`}
        >
          {item.rank}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border font-bold text-[10px] ${avatarClass}`}
          >
            {avatarInitials(item.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-xs font-bold text-slate-900">R$ {formatBRL(item.salesValue)}</p>
        <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </td>
      <td className="py-3 px-4 text-right text-slate-700 font-medium">{item.ordersCount}</td>
      <td className="py-3 px-4 text-right text-slate-700 font-medium">
        R$ {formatBRL(item.avgTicket)}
      </td>
      <td className="py-3 px-4 text-right font-bold text-emerald-700">
        R$ {formatBRL(item.commissionTotal)}
      </td>
      <td className="py-3 px-4">
        {hasGoal ? (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 font-medium">
                {item.goalPercentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">/ R$ {formatBRL(item.goalTarget)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  goalPct >= 100
                    ? 'bg-emerald-500'
                    : goalPct >= 70
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.max(3, goalPct)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400">Sem meta</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        {variationZero ? (
          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
            <Minus className="w-3.5 h-3.5" />
            R$ 0,00
          </span>
        ) : variationPositive ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            R$ {formatBRL(Math.abs(item.variationValue))}
            <span className="text-[10px] text-emerald-500">
              (+{item.variationPercent.toFixed(1)}%)
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            R$ {formatBRL(Math.abs(item.variationValue))}
            <span className="text-[10px] text-red-500">({item.variationPercent.toFixed(1)}%)</span>
          </span>
        )}
      </td>
    </tr>
  )
}
