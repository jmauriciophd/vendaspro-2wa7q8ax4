import { useEffect, useState, useMemo } from 'react'
import {
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { categoryGoalService } from '@/services/modules'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import type { CategoryGoal, CategoryGoalInput } from '@/types/modules'

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

const CATEGORY_LABELS: Record<string, string> = {
  graos: 'Grãos',
  bebidas: 'Bebidas',
  limpeza: 'Limpeza',
  mercearia: 'Mercearia',
  higiene: 'Higiene',
  outros: 'Outros',
}

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS)

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPct = (v: number) => (v || 0).toFixed(1).replace('.', ',')

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-rose-500'
}

function progressTextColor(pct: number) {
  if (pct >= 100) return 'text-emerald-700'
  if (pct >= 70) return 'text-amber-700'
  return 'text-rose-700'
}

export default function CategoryGoals() {
  const { isManager } = useAuth()

  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [goals, setGoals] = useState<CategoryGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryGoal | null>(null)
  const [form, setForm] = useState<CategoryGoalInput>({
    category: 'graos',
    target_value: 0,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await categoryGoalService.list(month, year)
      setGoals(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar metas por categoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  useRealtime<CategoryGoal>('category_goals', () => loadData())

  const goPrev = () => setCursor(new Date(year, month - 2, 1))
  const goNext = () => setCursor(new Date(year, month, 1))
  const goCurrent = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))

  // Cards de topo
  const cards = useMemo(() => {
    const totalCategories = goals.length
    const totalTarget = goals.reduce((acc, g) => acc + (g.target_value || 0), 0)
    const totalSold = goals.reduce((acc, g) => acc + (g.sales_value || 0), 0)
    const overallPct = totalTarget > 0 ? (totalSold / totalTarget) * 100 : 0
    const aboveGoal = goals.filter((g) => (g.percentage || 0) >= 100).length
    return { totalCategories, totalTarget, totalSold, overallPct, aboveGoal }
  }, [goals])

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return goals
    return goals.filter((g) => g.category === categoryFilter)
  }, [goals, categoryFilter])

  const openCreate = () => {
    setEditing(null)
    setForm({
      category: 'graos',
      target_value: 0,
      month,
      year,
      active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (g: CategoryGoal) => {
    setEditing(g)
    setForm({
      category: g.category,
      target_value: g.target_value,
      month: g.month,
      year: g.year,
      active: g.active,
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category.trim()) {
      toast.error('Informe a categoria')
      return
    }
    if (!form.target_value || form.target_value <= 0) {
      toast.error('Informe um valor de meta válido')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await categoryGoalService.update(editing.id, form)
        toast.success('Meta atualizada!')
      } else {
        await categoryGoalService.create(form)
        toast.success('Meta criada!')
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      const e2 = err as { data?: { message?: string } }
      toast.error(e2?.data?.message || 'Erro ao salvar meta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta meta?')) return
    setDeletingId(id)
    try {
      await categoryGoalService.remove(id)
      toast.success('Meta removida')
      loadData()
    } catch (err: unknown) {
      console.error(err)
      const e2 = err as { data?: { message?: string } }
      toast.error(e2?.data?.message || 'Erro ao remover meta')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Metas por Categoria
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {MONTH_NAMES[cursor.getMonth()]}/{year}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe o desempenho de vendas por categoria de produto
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Meta
            </button>
          )}
        </div>
      </div>

      {/* Cards de topo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<Package className="w-5 h-5" />}
          color="bg-indigo-50 text-indigo-600"
          label="Categorias"
          value={String(cards.totalCategories)}
        />
        <SummaryCard
          icon={<Target className="w-5 h-5" />}
          color="bg-violet-50 text-violet-600"
          label="Meta Total"
          value={`R$ ${formatBRL(cards.totalTarget)}`}
        />
        <SummaryCard
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
          label="Vendido"
          value={`R$ ${formatBRL(cards.totalSold)}`}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
          label="Percentual Geral"
          value={`${formatPct(cards.overallPct)}%`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
          label="Acima da Meta"
          value={String(cards.aboveGoal)}
        />
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-slate-400 font-medium">Categoria:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
          >
            <option value="all">Todas</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de categorias com barras de progresso */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Desempenho por Categoria
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {filtered.length} categoria(s) com meta no período
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma meta encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {isManager
                ? 'Clique em "Nova Meta" para definir metas por categoria.'
                : 'Não há metas cadastradas para este período.'}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filtered.map((g) => {
              const pct = g.percentage || 0
              const barWidth = Math.min(pct, 100)
              const overGoal = pct >= 100
              return (
                <div
                  key={g.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">
                          {CATEGORY_LABELS[g.category] || g.category}
                        </p>
                        {!g.active && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            Inativa
                          </span>
                        )}
                        {overGoal && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Meta atingida
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        R$ {formatBRL(g.sales_value)} / R$ {formatBRL(g.target_value)} •{' '}
                        {g.quantity} un. vendidas
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-bold ${progressTextColor(pct)}`}>
                        {formatPct(pct)}%
                      </span>
                      {isManager && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(g)}
                            title="Editar meta"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(g.id)}
                            disabled={deletingId === g.id}
                            title="Remover meta"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {overGoal
                      ? `Meta ultrapassada em R$ ${formatBRL(Math.max(g.sales_value - g.target_value, 0))} 🎉`
                      : `Faltam R$ ${formatBRL(Math.max(g.remaining, 0))} para atingir a meta`}
                  </p>
                </div>
              )
            })}
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

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editing ? 'Editar Meta' : 'Nova Meta por Categoria'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {MONTH_NAMES[form.month - 1]}/{form.year}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mês *</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ano *</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
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
                  value={form.target_value || ''}
                  onChange={(e) => setForm((f) => ({ ...f, target_value: Number(e.target.value) }))}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active !== false}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-700">Meta ativa</span>
              </label>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editing ? 'Salvar' : 'Criar Meta'}</span>
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
