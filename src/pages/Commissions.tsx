import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Percent,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Wallet,
  Users as UsersIcon,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  X,
  TrendingUp,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { commissionService } from '@/services/modules'
import { userService } from '@/services/crm'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  CommissionListItem,
  CommissionStatus,
  CommissionSummary,
  SellerWithRule,
} from '@/types/modules'
import type { User } from '@/types/crm'

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

const STATUS_META: Record<CommissionStatus, { label: string; bg: string }> = {
  pending: { label: 'Pendente', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprovada', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { label: 'Paga', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
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

export default function Commissions() {
  const navigate = useNavigate()
  const { isManager } = useAuth()

  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [sellerFilter, setSellerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [users, setUsers] = useState<User[]>([])
  const [sellers, setSellers] = useState<SellerWithRule[]>([])
  const [list, setList] = useState<CommissionListItem[]>([])
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  // Modal de configuração de regras
  const [rulesOpen, setRulesOpen] = useState(false)

  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const loadData = async () => {
    try {
      const [usersData, sellersData, listData, summaryData] = await Promise.all([
        userService.getAll(),
        commissionService.sellers(),
        commissionService.list({
          month,
          year,
          sellerId: sellerFilter !== 'all' ? sellerFilter : undefined,
          status: statusFilter !== 'all' ? (statusFilter as CommissionStatus) : undefined,
        }),
        commissionService.summary({ month, year }),
      ])
      setUsers(usersData)
      setSellers(sellersData)
      setList(listData)
      setSummary(summaryData)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar comissões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, sellerFilter, statusFilter])

  useRealtime('commissions', () => loadData())

  const goPrev = () => setCursor(new Date(year, month - 2, 1))
  const goNext = () => setCursor(new Date(year, month, 1))
  const goCurrent = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const res = await commissionService.calculate(month, year)
      toast.success(
        `${res.total} comissões processadas (${res.created} criadas, ${res.updated} atualizadas)`,
      )
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao calcular comissões')
    } finally {
      setCalculating(false)
    }
  }

  const handleStatusChange = async (id: string, status: CommissionStatus) => {
    try {
      await commissionService.updateStatus(id, status)
      toast.success('Status atualizado')
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao atualizar status')
    }
  }

  const cards = summary?.cards
  const maxSellerCommission = useMemo(() => {
    if (!summary || summary.by_seller.length === 0) return 1
    return Math.max(...summary.by_seller.map((s) => s.total_commission), 1)
  }, [summary])

  const userAvatarColor = (id: string) => {
    const idx = users.findIndex((u) => u.id === id)
    return AVATAR_COLORS[idx % AVATAR_COLORS.length] || AVATAR_COLORS[0]
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Comissões
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {MONTH_NAMES[cursor.getMonth()]}/{year}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Calcule e acompanhe as comissões da equipe por período
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

          {isManager && (
            <>
              <button
                onClick={() => setRulesOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Regras</span>
              </button>
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
              >
                {calculating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                <span>Calcular</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todos os Vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.rule ? `(${s.rule.percentage}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="paid">Pagas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<Wallet className="w-5 h-5" />}
          color="bg-indigo-50 text-indigo-600"
          label="Comissões do Mês"
          value={`R$ ${formatBRL(cards?.total_commission || 0)}`}
        />
        <SummaryCard
          icon={<ShoppingCart className="w-5 h-5" />}
          color="bg-violet-50 text-violet-600"
          label="Vendas Comissionadas"
          value={String(cards?.comissioned_sales || 0)}
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
          label="Pendentes"
          value={String(cards?.pending || 0)}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
          label="Pagas"
          value={String(cards?.paid || 0)}
        />
        <SummaryCard
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-blue-50 text-blue-600"
          label="Ticket Médio"
          value={`R$ ${formatBRL(cards?.avg_ticket || 0)}`}
        />
      </div>

      {/* Resumo por Vendedor */}
      {summary && summary.by_seller.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-indigo-600" />
              Resumo por Vendedor
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Desempenho comissional no período selecionado
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {summary.by_seller
              .slice()
              .sort((a, b) => b.total_commission - a.total_commission)
              .map((s) => {
                const pct = Math.round((s.total_commission / maxSellerCommission) * 100)
                return (
                  <div
                    key={s.seller}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border font-bold text-xs ${userAvatarColor(s.seller)}`}
                      >
                        {avatarInitials(s.seller_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.seller_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.seller_email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Vendas</p>
                        <p className="text-sm font-bold text-slate-800">{s.sales_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          Total Vendido
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          R$ {formatBRL(s.total_sales_value)}
                        </p>
                      </div>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Comissão</span>
                      <span className="text-sm font-bold text-emerald-700">
                        R$ {formatBRL(s.total_commission)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Tabela de comissões */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            Comissões Lançadas
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{list.length} registro(s) no período</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando comissões...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma comissão encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {isManager
                ? 'Use o botão "Calcular" para gerar comissões das vendas pagas do período.'
                : 'Não há comissões lançadas para os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Pedido / Cliente</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-right">Valor da Venda</th>
                  <th className="py-3 px-4 text-right">Percentual</th>
                  <th className="py-3 px-4 text-right">Comissão</th>
                  <th className="py-3 px-4">Status</th>
                  {isManager && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((c) => {
                  const sm = STATUS_META[c.status] || STATUS_META.pending
                  const date = c.sale_date ? new Date(c.sale_date) : null
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border font-bold text-[10px] ${userAvatarColor(c.seller)}`}
                          >
                            {avatarInitials(c.seller_name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{c.seller_name}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {c.seller_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => navigate('/vendas')} className="text-left group">
                          <p className="text-xs font-semibold text-indigo-600 group-hover:underline truncate max-w-[160px]">
                            #{c.sale.slice(-6)}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {c.customer_name || 'Cliente'}
                          </p>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {date ? date.toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        R$ {formatBRL(c.sale_value)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {c.commission_percentage}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        R$ {formatBRL(c.commission_value)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${sm.bg}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      {isManager && (
                        <td className="py-3 px-4 text-right">
                          <select
                            value={c.status}
                            onChange={(e) =>
                              handleStatusChange(c.id, e.target.value as CommissionStatus)
                            }
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="pending">Pendente</option>
                            <option value="approved">Aprovada</option>
                            <option value="paid">Paga</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de configuração de regras */}
      {rulesOpen && (
        <RulesModal
          sellers={sellers}
          onClose={() => setRulesOpen(false)}
          onSaved={() => {
            setRulesOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function SummaryCard({
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-xl font-bold text-slate-900 tracking-tight truncate">{value}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function RulesModal({
  sellers,
  onClose,
  onSaved,
}: {
  sellers: SellerWithRule[]
  onClose: () => void
  onSaved: () => void
}) {
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const s of sellers) {
      map[s.id] = s.rule ? String(s.rule.percentage) : ''
    }
    return map
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const s of sellers) {
        const raw = (percentages[s.id] || '').trim()
        if (!raw) continue
        const value = Number(raw)
        if (isNaN(value) || value < 0 || value > 100) {
          toast.error(`Percentual inválido para ${s.name}`)
          return
        }
        await commissionService.upsertRule({
          seller: s.id,
          percentage: value,
          active: true,
        })
      }
      toast.success('Regras de comissão atualizadas!')
      onSaved()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar regras')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Regras de Comissão</h3>
              <p className="text-xs text-slate-500">Defina o percentual por vendedor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {sellers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">Nenhum vendedor encontrado.</p>
          ) : (
            sellers.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                    {avatarInitials(s.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={percentages[s.id] || ''}
                    onChange={(e) => setPercentages((p) => ({ ...p, [s.id]: e.target.value }))}
                    placeholder="0"
                    className="w-20 px-2.5 py-1.5 text-sm text-center bg-white border border-slate-200 rounded-lg focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <span className="text-sm text-slate-500 font-medium">%</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Regras</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
