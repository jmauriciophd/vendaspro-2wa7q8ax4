import { useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Ban,
  Download,
  Loader2,
  BarChart3,
  PieChart as PieIcon,
  CreditCard,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { paymentService, formatMoney, formatDateTime } from '@/services/paymentService'
import type { FinancialReport } from '@/types/payments'

const MONTHS = [
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

const PIE_COLORS = ['#14B8A6', '#6366F1', '#F59E0B', '#8B5CF6', '#EF4444']

export default function FinancialReport() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await paymentService.financialReport({ month, year })
      setData(res)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar relatório financeiro.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [month, year])

  const years = useMemo(() => {
    const ys = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]
    return Array.from(new Set(ys))
  }, [])

  const handleExportCsv = () => {
    if (!data) return
    const rows: string[][] = []
    rows.push(['Resumo'])
    rows.push(['Métrica', 'Valor'])
    rows.push(['Total Cobrado', String(data.summary.total_cobrado)])
    rows.push(['Total Recebido', String(data.summary.total_recebido)])
    rows.push(['Total Taxas', String(data.summary.total_taxas)])
    rows.push(['Total Líquido', String(data.summary.total_liquido)])
    rows.push(['Total Pendente', String(data.summary.total_pendente)])
    rows.push(['Total Vencido', String(data.summary.total_vencido)])
    rows.push(['Total Cancelado', String(data.summary.total_cancelado)])
    rows.push([])
    rows.push(['Por Provedor'])
    rows.push([
      'Provedor',
      'Cobranças',
      'Total Cobrado',
      'Total Recebido',
      'Taxas',
      'Líquido',
      'Ticket Médio',
      'Conversão (%)',
    ])
    for (const p of data.by_provider) {
      rows.push([
        p.provider_name,
        String(p.quantidade_cobrancas),
        String(p.total_cobrado),
        String(p.total_recebido),
        String(p.total_taxas),
        String(p.total_liquido),
        String(p.ticket_medio),
        String(p.taxa_conversao),
      ])
    }
    rows.push([])
    rows.push(['Timeline de Recebimentos'])
    rows.push(['Data', 'Valor', 'Provedor', 'Método', 'Cliente'])
    for (const t of data.timeline) {
      rows.push([t.date, String(t.valor), t.provider_name, t.method, t.client])
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_financeiro_${month}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado.')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" /> Relatório Financeiro
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Receitas, taxas dos provedores e valor líquido
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando relatório...
        </div>
      ) : (
        <>
          {/* 6 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <SummaryCard
              label="Total Cobrado"
              value={data.summary.total_cobrado}
              icon={DollarSign}
              color="bg-indigo-50 text-indigo-700"
            />
            <SummaryCard
              label="Total Recebido"
              value={data.summary.total_recebido}
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              label="Taxas"
              value={data.summary.total_taxas}
              icon={TrendingDown}
              color="bg-rose-50 text-rose-700"
            />
            <SummaryCard
              label="Valor Líquido"
              value={data.summary.total_liquido}
              icon={DollarSign}
              color="bg-teal-50 text-teal-700"
              highlight
            />
            <SummaryCard
              label="Pendente"
              value={data.summary.total_pendente}
              icon={Clock}
              color="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              label="Vencido"
              value={data.summary.total_vencido}
              icon={Ban}
              color="bg-red-50 text-red-700"
            />
          </div>

          {/* Gráfico de barras — Recebimentos por Mês */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Recebimentos por Mês</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Últimos 6 meses — cobrado vs recebido vs líquido
                </p>
              </div>
            </div>
            <div className="h-72 min-h-[288px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                <BarChart
                  data={data.by_month}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                    }
                  />
                  <Tooltip
                    formatter={(val: any) => `R$ ${formatMoney(Number(val))}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="cobrado" name="Cobrado" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="liquido" name="Líquido" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela Por Provedor */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-base font-bold text-slate-800 mb-4">Por Provedor</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Provedor</th>
                      <th className="py-3 px-3">Cobranças</th>
                      <th className="py-3 px-3">Cobrado</th>
                      <th className="py-3 px-3">Recebido</th>
                      <th className="py-3 px-3">Taxas</th>
                      <th className="py-3 px-3">Líquido</th>
                      <th className="py-3 px-3">Ticket Médio</th>
                      <th className="py-3 px-3">Conversão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.by_provider.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          Nenhum dado no período.
                        </td>
                      </tr>
                    ) : (
                      data.by_provider.map((p) => (
                        <tr key={p.provider_id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {p.provider_name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{p.quantidade_cobrancas}</td>
                          <td className="py-3 px-3 text-slate-700">
                            R$ {formatMoney(p.total_cobrado)}
                          </td>
                          <td className="py-3 px-3 text-emerald-700 font-semibold">
                            R$ {formatMoney(p.total_recebido)}
                          </td>
                          <td className="py-3 px-3 text-rose-600">
                            R$ {formatMoney(p.total_taxas)}
                          </td>
                          <td className="py-3 px-3 text-teal-700 font-semibold">
                            R$ {formatMoney(p.total_liquido)}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            R$ {formatMoney(p.ticket_medio)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {p.taxa_conversao.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico de Pizza — Métodos de Pagamento */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Métodos de Pagamento</h3>
              </div>
              <div className="h-56 min-h-[224px] w-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                  <PieChart>
                    <Pie
                      data={data.by_method.map((m) => ({ name: m.method, value: m.valor_total }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.by_method.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => `R$ ${formatMoney(Number(val))}`}
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
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                {data.by_method.map((m, i) => (
                  <div key={m.method} className="flex items-center gap-2 text-xs text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{m.method}</span>
                    <span className="font-semibold text-slate-800 ml-auto">
                      R$ {formatMoney(m.valor_total)}
                    </span>
                  </div>
                ))}
                {data.by_method.length === 0 && (
                  <p className="col-span-2 text-xs text-slate-400 text-center py-2">
                    Sem dados de métodos.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline de Recebimentos */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Timeline de Recebimentos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimas 20 transações pagas</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Valor</th>
                    <th className="py-3 px-3">Provedor</th>
                    <th className="py-3 px-3">Método</th>
                    <th className="py-3 px-3">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.timeline.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Nenhum recebimento no período.
                      </td>
                    </tr>
                  ) : (
                    data.timeline.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 text-slate-600">{formatDateTime(t.date)}</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          R$ {formatMoney(t.valor)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{t.provider_name || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{t.method || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{t.client || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 border shadow-xs ${
        highlight ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-lg font-bold ${highlight ? 'text-teal-700' : 'text-slate-900'}`}>
        R$ {formatMoney(value)}
      </p>
    </div>
  )
}
