import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter,
  TrendingUp,
  Target,
  CheckCircle2,
  Percent,
  DollarSign,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { funnelService } from '@/services/modules'
import { userService, dealService } from '@/services/crm'
import { useRealtime } from '@/hooks/use-realtime'
import type { FunnelData, FunnelStage } from '@/types/modules'
import type { Deal, User } from '@/types/crm'

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

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Gradiente de cores do funil: índigo no topo -> verde embaixo
const STAGE_COLORS = [
  {
    bg: 'from-indigo-500 to-indigo-600',
    solid: '#4F46E5',
    light: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    bg: 'from-violet-500 to-violet-600',
    solid: '#7C3AED',
    light: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    bg: 'from-amber-500 to-amber-600',
    solid: '#D97706',
    light: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    bg: 'from-emerald-500 to-emerald-600',
    solid: '#059669',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
]

export default function SalesFunnel() {
  const navigate = useNavigate()

  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [sellerFilter, setSellerFilter] = useState<string>('all')

  const [users, setUsers] = useState<User[]>([])
  const [data, setData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)

  // Detalhes do estágio selecionado (modal)
  const [selectedStage, setSelectedStage] = useState<FunnelStage | null>(null)
  const [stageDeals, setStageDeals] = useState<Deal[]>([])
  const [loadingDeals, setLoadingDeals] = useState(false)

  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const loadData = async () => {
    try {
      const [usersData, funnelData] = await Promise.all([
        userService.getAll(),
        funnelService.get({
          month,
          year,
          sellerId: sellerFilter !== 'all' ? sellerFilter : undefined,
        }),
      ])
      setUsers(usersData)
      setData(funnelData)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar funil de vendas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, sellerFilter])

  useRealtime('deals', () => loadData())

  const goPrev = () => setCursor(new Date(year, month - 2, 1))
  const goNext = () => setCursor(new Date(year, month, 1))
  const goCurrent = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))

  // Largura proporcional de cada estágio no funil
  const maxCount = useMemo(() => {
    if (!data || data.stages.length === 0) return 1
    return Math.max(...data.stages.map((s) => s.count), 1)
  }, [data])

  const openStageDetails = async (stage: FunnelStage) => {
    setSelectedStage(stage)
    setLoadingDeals(true)
    try {
      const deals = await dealService.getAll({
        stage: stage.key,
        ownerId: sellerFilter !== 'all' ? sellerFilter : undefined,
      })
      // filtra por mês/ano (created) para bater com o backend
      const filtered = deals.filter((d) => {
        const dt = new Date(d.created)
        return dt.getFullYear() === year && dt.getMonth() + 1 === month
      })
      setStageDeals(filtered)
    } catch (err) {
      console.error(err)
      setStageDeals([])
    } finally {
      setLoadingDeals(false)
    }
  }

  const cards = data?.cards

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Funil de Vendas
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {MONTH_NAMES[cursor.getMonth()]}/{year}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Conversão entre estágios do pipeline comercial
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de mês */}
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

          <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todos os Vendedores</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FunnelCard
          icon={<Target className="w-4 h-4" />}
          color="bg-indigo-50 text-indigo-600"
          label="Oportunidades"
          value={String(cards?.total_opportunities || 0)}
        />
        <FunnelCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="bg-emerald-50 text-emerald-600"
          label="Pedidos Fechados"
          value={String(cards?.closed_deals || 0)}
        />
        <FunnelCard
          icon={<ShoppingCart className="w-4 h-4" />}
          color="bg-violet-50 text-violet-600"
          label="Vendas Concluídas"
          value={String(cards?.completed_sales || 0)}
        />
        <FunnelCard
          icon={<Percent className="w-4 h-4" />}
          color="bg-amber-50 text-amber-600"
          label="Conversão Geral"
          value={`${(cards?.general_conversion || 0).toFixed(1)}%`}
        />
        <FunnelCard
          icon={<DollarSign className="w-4 h-4" />}
          color="bg-blue-50 text-blue-600"
          label="Valor Potencial"
          value={`R$ ${formatBRL(cards?.total_potential || 0)}`}
        />
        <FunnelCard
          icon={<TrendingUp className="w-4 h-4" />}
          color="bg-emerald-50 text-emerald-600"
          label="Valor Convertido"
          value={`R$ ${formatBRL(cards?.total_converted || 0)}`}
        />
      </div>

      {/* Funil visual */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              Funil de Conversão
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em um estágio para ver os detalhes dos negócios
            </p>
          </div>
          {cards && cards.lost_count > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {cards.lost_count} perdido(s) • R$ {formatBRL(cards.lost_value)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-200 rounded-2xl"
                style={{ marginLeft: `${i * 5}%` }}
              />
            ))}
          </div>
        ) : !data || data.stages.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Sem dados para o funil</h3>
            <p className="text-xs text-slate-400 mt-1">Não há negócios no período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.stages.map((stage, idx) => {
              const color = STAGE_COLORS[idx % STAGE_COLORS.length]
              const widthPct = Math.max((stage.count / maxCount) * 100, 8) // mínimo 8% para visibilidade
              return (
                <div key={stage.key}>
                  <button
                    onClick={() => openStageDetails(stage)}
                    className="block w-full text-left group"
                    style={{ paddingLeft: `${idx * 4}%`, paddingRight: `${idx * 4}%` }}
                  >
                    <div
                      className={`relative h-20 rounded-2xl bg-gradient-to-r ${color.bg} text-white shadow-md group-hover:shadow-lg group-hover:brightness-110 transition-all flex items-center justify-between px-5`}
                      style={{ width: `${widthPct}%`, minWidth: '220px', margin: '0 auto' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                          {stage.count}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{stage.label}</p>
                          <p className="text-[11px] text-white/80">
                            {stage.conversion}% conversão • -{stage.drop_count} perdas
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[11px] text-white/80 font-medium">Valor</p>
                        <p className="text-sm font-bold">R$ {formatBRL(stage.value)}</p>
                      </div>
                    </div>
                  </button>
                  {idx < data.stages.length - 1 && stage.drop_count > 0 && (
                    <div
                      className="flex items-center justify-center py-0.5"
                      style={{ paddingRight: `${(idx + 1) * 4}%` }}
                    >
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <ArrowDown className="w-3 h-3" />
                        {stage.drop_count} negócio(s) perdido(s) entre {stage.label} e{' '}
                        {data.stages[idx + 1].label}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabela resumo */}
      {data && data.stages.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Resumo por Estágio</h3>
            <p className="text-xs text-slate-400 mt-0.5">Métricas detalhadas de conversão</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Estágio</th>
                  <th className="py-3 px-4 text-right">Quantidade</th>
                  <th className="py-3 px-4 text-right">Conversão</th>
                  <th className="py-3 px-4 text-right">Perdas (próx.)</th>
                  <th className="py-3 px-4 text-right">Valor Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.stages.map((stage, idx) => {
                  const color = STAGE_COLORS[idx % STAGE_COLORS.length]
                  return (
                    <tr
                      key={stage.key}
                      onClick={() => openStageDetails(stage)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color.solid }}
                          />
                          <span className="font-semibold text-slate-800">{stage.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {stage.count}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${color.light}`}
                        >
                          {stage.conversion}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        {stage.drop_count > 0 ? `-${stage.drop_count}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        R$ {formatBRL(stage.value)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {cards && (
                <tfoot className="bg-slate-50/60 border-t-2 border-slate-200">
                  <tr className="font-bold">
                    <td className="py-3 px-4 text-slate-800">Perdidos (saída lateral)</td>
                    <td className="py-3 px-4 text-right text-red-600">{cards.lost_count}</td>
                    <td className="py-3 px-4 text-right text-slate-400">—</td>
                    <td className="py-3 px-4 text-right text-slate-400">—</td>
                    <td className="py-3 px-4 text-right text-red-600">
                      R$ {formatBRL(cards.lost_value)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Modal de detalhes do estágio */}
      {selectedStage && (
        <StageDetailModal
          stage={selectedStage}
          deals={stageDeals}
          loading={loadingDeals}
          onClose={() => setSelectedStage(null)}
          onGoPipeline={() => {
            setSelectedStage(null)
            navigate('/pipeline')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function FunnelCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold text-slate-900 tracking-tight truncate">{value}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function StageDetailModal({
  stage,
  deals,
  loading,
  onClose,
  onGoPipeline,
}: {
  stage: FunnelStage
  deals: Deal[]
  loading: boolean
  onClose: () => void
  onGoPipeline: () => void
}) {
  const totalValue = deals.reduce((acc, d) => acc + (d.value || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{stage.label}</h3>
              <p className="text-xs text-slate-500">
                {stage.count} negócio(s) • {stage.conversion}% de conversão • R${' '}
                {formatBRL(stage.value)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Negócios</p>
              <p className="text-lg font-bold text-slate-900">{stage.count}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Conversão</p>
              <p className="text-lg font-bold text-indigo-700">{stage.conversion}%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Valor Total</p>
              <p className="text-lg font-bold text-emerald-700">R$ {formatBRL(totalValue)}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Carregando negócios...</div>
          ) : deals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-semibold text-slate-700">Nenhum negócio neste estágio</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Não há negócios em {stage.label} para o período selecionado.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Negócio</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[160px]">
                        {d.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]">
                        {d.expand?.customer?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">
                        {d.expand?.owner?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        R$ {formatBRL(d.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={onGoPipeline}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            Ver no Pipeline
          </button>
        </div>
      </div>
    </div>
  )
}
