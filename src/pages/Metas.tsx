import { useEffect, useMemo, useState } from 'react'
import {
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Edit2,
  Trophy,
  Users as UsersIcon,
  DollarSign,
  CheckCircle2,
  X,
} from 'lucide-react'
import { saleService, salesTargetService, userService } from '@/services/crm'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import type { Sale, SalesTarget, User } from '@/types/crm'

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

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Metas() {
  const { user, isManager } = useAuth()

  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [users, setUsers] = useState<User[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de edição de meta
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingTarget, setEditingTarget] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const monthKey = monthKeyFromDate(cursor)

  const loadData = async () => {
    try {
      const [usersData, targetsData, salesData] = await Promise.all([
        userService.getAll(),
        salesTargetService.getByMonth(monthKey),
        saleService.getAll(),
      ])
      setUsers(usersData)
      setTargets(targetsData)
      setSales(salesData)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar metas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  useRealtime<SalesTarget>('sales_targets', () => loadData())

  const goPrevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const goNextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const goCurrentMonth = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))

  // Vendas realizadas por vendedor no mês selecionado
  const salesBySeller = useMemo(() => {
    const map: { [userId: string]: number } = {}
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    for (const s of sales) {
      const d = new Date(s.sale_date || s.created)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const sellerId = s.seller || ''
        map[sellerId] = (map[sellerId] || 0) + (s.total || 0)
      }
    }
    return map
  }, [sales, cursor])

  // Linhas por vendedor
  const rows = useMemo(() => {
    const targetByUser: { [userId: string]: SalesTarget } = {}
    for (const t of targets) {
      targetByUser[t.user] = t
    }
    return users.map((u) => {
      const target = targetByUser[u.id]
      const targetValue = target?.target || 0
      const sold = salesBySeller[u.id] || 0
      const pct = targetValue > 0 ? (sold / targetValue) * 100 : 0
      return {
        user: u,
        target,
        targetValue,
        sold,
        pct,
      }
    })
  }, [users, targets, salesBySeller])

  // Totais da equipe
  const team = useMemo(() => {
    const totalTarget = rows.reduce((acc, r) => acc + r.targetValue, 0)
    const totalSold = rows.reduce((acc, r) => acc + r.sold, 0)
    const pct = totalTarget > 0 ? (totalSold / totalTarget) * 100 : 0
    return { totalTarget, totalSold, pct }
  }, [rows])

  const progressColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const progressTextColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-700'
    if (pct >= 70) return 'text-amber-700'
    return 'text-rose-700'
  }

  const progressBgLight = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (pct >= 70) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  const openEditModal = (u: User) => {
    const existing = targets.find((t) => t.user === u.id)
    setEditingUser(u)
    setEditingTarget(existing ? String(existing.target) : '')
    setIsModalOpen(true)
  }

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const value = Number(editingTarget)
    if (!editingTarget || isNaN(value) || value < 0) {
      toast.error('Informe um valor válido para a meta.')
      return
    }
    setSavingTarget(true)
    try {
      await salesTargetService.upsert({
        user: editingUser.id,
        month: monthKey,
        target: value,
      })
      toast.success(`Meta de ${editingUser.name || editingUser.email} definida!`)
      setIsModalOpen(false)
      setEditingUser(null)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar meta')
    } finally {
      setSavingTarget(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Metas de Vendas
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Acompanhamento Mensal
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Defina e acompanhe as metas da equipe por período
          </p>
        </div>

        {/* Mês/Ano seletor */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-xs">
          <button
            onClick={goPrevMonth}
            title="Mês anterior"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-xs font-bold text-slate-800">
              {MONTH_NAMES[cursor.getMonth()]} de {cursor.getFullYear()}
            </p>
            <button
              onClick={goCurrentMonth}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Voltar para o mês atual
            </button>
          </div>
          <button
            onClick={goNextMonth}
            title="Próximo mês"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Card de meta da equipe */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-10 bottom-0 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-amber-200" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
                    Meta da Equipe • {MONTH_NAMES[cursor.getMonth()]}/{cursor.getFullYear()}
                  </span>
                </div>
                <div className="text-3xl font-bold tracking-tight">
                  R$ {formatBRL(team.totalTarget)}
                </div>
                <div className="text-sm text-indigo-100 mt-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Vendas realizadas: R$ {formatBRL(team.totalSold)}
                </div>
              </div>

              <div className="md:w-56">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-indigo-100">Progresso geral</span>
                  <span className="font-bold text-white">{team.pct.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(team.pct, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-indigo-100 mt-1.5">
                  {team.pct >= 100
                    ? '🎉 Meta da equipe atingida!'
                    : `Faltam R$ ${formatBRL(Math.max(team.totalTarget - team.totalSold, 0))}`}
                </p>
              </div>
            </div>
          </div>

          {/* Tabela/cards por vendedor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-indigo-600" />
                  Metas por Vendedor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Desempenho individual no mês selecionado
                </p>
              </div>
              {isManager && (
                <span className="text-[11px] text-slate-400 hidden sm:block">
                  Clique em <Edit2 className="w-3 h-3 inline text-indigo-500" /> para definir/editar
                  a meta
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <UsersIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">Nenhum vendedor encontrado</h3>
                <p className="text-xs text-slate-400 mt-1">Cadastre usuários na aba Equipe.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4 text-right">Meta do Mês</th>
                      <th className="py-3 px-4 text-right">Vendas Realizadas</th>
                      <th className="py-3 px-4 text-center">% Atingido</th>
                      <th className="py-3 px-4 min-w-[180px]">Progresso</th>
                      {isManager && <th className="py-3 px-4 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                              {(r.user.name || r.user.email || 'U')
                                .split(' ')
                                .slice(0, 2)
                                .map((n) => n[0].toUpperCase())
                                .join('')}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                {r.user.name || 'Sem nome'}
                              </p>
                              <p className="text-[11px] text-slate-400">{r.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {r.targetValue > 0 ? (
                            `R$ ${formatBRL(r.targetValue)}`
                          ) : (
                            <span className="text-slate-300 font-normal">— não definida</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-700">
                          R$ {formatBRL(r.sold)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.targetValue > 0 ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${progressBgLight(
                                r.pct,
                              )}`}
                            >
                              {r.pct.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.targetValue > 0 ? (
                            <div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor(
                                    r.pct,
                                  )}`}
                                  style={{ width: `${Math.min(r.pct, 100)}%` }}
                                />
                              </div>
                              <p
                                className={`text-[10px] mt-1 font-medium ${progressTextColor(r.pct)}`}
                              >
                                {r.pct >= 100
                                  ? 'Meta atingida!'
                                  : r.pct >= 70
                                    ? 'Perto da meta'
                                    : 'Abaixo do esperado'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Sem meta definida</span>
                          )}
                        </td>
                        {isManager && (
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => openEditModal(r.user)}
                              title="Definir / editar meta"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/60 border-t-2 border-slate-200">
                    <tr className="font-bold">
                      <td className="py-3 px-4 text-slate-800">Total da Equipe</td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        R$ {formatBRL(team.totalTarget)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        R$ {formatBRL(team.totalSold)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${progressBgLight(
                            team.pct,
                          )}`}
                        >
                          {team.pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(
                              team.pct,
                            )}`}
                            style={{ width: `${Math.min(team.pct, 100)}%` }}
                          />
                        </div>
                      </td>
                      {isManager && <td className="py-3 px-4" />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Atingiu a meta (≥ 100%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Próximo da meta (≥ 70%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" /> Abaixo do esperado (&lt; 70%)
            </span>
          </div>
        </>
      )}

      {/* Modal editar meta */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Definir Meta</h3>
                  <p className="text-xs text-slate-500">
                    {MONTH_NAMES[cursor.getMonth()]}/{cursor.getFullYear()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingUser(null)
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-6 space-y-4">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100">
                  {(editingUser.name || editingUser.email || 'U')
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join('')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {editingUser.name || 'Sem nome'}
                  </p>
                  <p className="text-[11px] text-slate-400">{editingUser.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor da Meta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingTarget}
                  onChange={(e) => setEditingTarget(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Vendas realizadas no mês: R$ {formatBRL(salesBySeller[editingUser.id] || 0)}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingUser(null)
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
                >
                  {savingTarget ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar Meta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
