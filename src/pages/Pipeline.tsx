import { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Filter,
  User as UserIcon,
  Store,
  Calendar,
  DollarSign,
  MoveRight,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react'
import { dealService, customerService, userService } from '@/services/crm'
import type { Deal, Customer, User, DealStage } from '@/types/crm'
import { DealModal } from '@/components/DealModal'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

/** Dias que um negócio pode ficar parado no mesmo estágio antes de alertar. */
const STALE_STAGE_DAYS = 7

/** Retorna quantos dias o negócio está no estágio atual (baseado no `updated`). */
function daysInStage(deal: Deal): number {
  const ref = new Date(deal.updated || deal.created)
  const diff = Date.now() - ref.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

interface StageColumn {
  id: DealStage
  title: string
  color: string
  borderColor: string
  badgeBg: string
  badgeText: string
}

const STAGES: StageColumn[] = [
  {
    id: 'prospeccao',
    title: 'Prospecção',
    color: '#3B82F6',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
  },
  {
    id: 'negociacao',
    title: 'Negociação',
    color: '#8B5CF6',
    borderColor: 'border-violet-200',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
  },
  {
    id: 'proposta',
    title: 'Proposta',
    color: '#F59E0B',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
  },
  {
    id: 'fechado',
    title: 'Fechado',
    color: '#10B981',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  {
    id: 'perdido',
    title: 'Perdido',
    color: '#EF4444',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
  },
]

export default function Pipeline() {
  const { user, role } = useAuth()
  const isVendedor = role === 'vendedor'

  const [deals, setDeals] = useState<Deal[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [sellerFilter, setSellerFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)
  const [defaultStageForNew, setDefaultStageForNew] = useState<DealStage>('prospeccao')

  // Drag state (HTML5 drag & drop)
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)

  const loadAll = async () => {
    try {
      const [dealsData, customersData, usersData] = await Promise.all([
        dealService.getAll(),
        customerService.getAll(),
        userService.getAll(),
      ])
      setDeals(dealsData)
      setCustomers(customersData)
      setUsers(usersData)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados do pipeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useRealtime<Deal>('deals', () => loadAll())

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Fallback de isolamento (o backend já filtra via regra por papel).
      // Vendedor só enxerga os próprios negócios (owner = user.id).
      if (isVendedor && user && d.owner !== user.id) return false
      if (!isVendedor && sellerFilter !== 'all' && d.owner !== sellerFilter) return false
      if (customerFilter !== 'all' && d.customer !== customerFilter) return false
      return true
    })
  }, [deals, sellerFilter, customerFilter, isVendedor, user])

  // Stage totals
  const stageTotals = useMemo(() => {
    const map: { [key in DealStage]: { count: number; total: number } } = {
      prospeccao: { count: 0, total: 0 },
      negociacao: { count: 0, total: 0 },
      proposta: { count: 0, total: 0 },
      fechado: { count: 0, total: 0 },
      perdido: { count: 0, total: 0 },
    }

    for (const d of filteredDeals) {
      if (map[d.stage]) {
        map[d.stage].count += 1
        map[d.stage].total += d.value || 0
      }
    }
    return map
  }, [filteredDeals])

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
    setDraggedDealId(dealId)
  }

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault()
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault()
    setDragOverStage(null)
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    if (!dealId) return

    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === targetStage) {
      setDraggedDealId(null)
      return
    }

    // Optimistic update
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)))

    try {
      await dealService.updateStage(dealId, targetStage)
      const stageName = STAGES.find((s) => s.id === targetStage)?.title
      toast.success(`Negócio movido para "${stageName}"`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao mover negócio')
      loadAll()
    } finally {
      setDraggedDealId(null)
    }
  }

  const moveStageFallback = async (dealId: string, newStage: DealStage) => {
    try {
      await dealService.updateStage(dealId, newStage)
      const stageName = STAGES.find((s) => s.id === newStage)?.title
      toast.success(`Negócio movido para "${stageName}"`)
      loadAll()
    } catch (e) {
      toast.error('Erro ao alterar estágio')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Pipeline de Vendas
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Kanban Comercial
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Arraste os cartões entre as etapas para avançar as negociações
          </p>
        </div>

        {/* Filters & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Vendedor Filter — oculto para vendedor (só vê os próprios) */}
          {!isVendedor && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
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
          )}

          {/* Cliente Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">Todos os Mercadinhos</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setDealToEdit(null)
              setDefaultStageForNew('prospeccao')
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Negócio</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {STAGES.map((stage) => {
          const stageDeals = filteredDeals.filter((d) => d.stage === stage.id)
          const totals = stageTotals[stage.id]
          const isTarget = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col rounded-2xl bg-slate-100/70 border p-3 min-h-[500px] transition-all duration-200 ${
                isTarget
                  ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-200'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h2 className="text-xs font-bold text-slate-800 tracking-tight">{stage.title}</h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stage.badgeBg} ${stage.badgeText}`}
                  >
                    {totals.count}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setDealToEdit(null)
                    setDefaultStageForNew(stage.id)
                    setIsModalOpen(true)
                  }}
                  title={`Adicionar negócio em ${stage.title}`}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Total value badge for column */}
              <div className="mb-3 px-2 py-1 rounded-lg bg-white/70 border border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total da etapa:</span>
                <span className="font-bold text-slate-800">
                  R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Deals List */}
              <div className="space-y-3 flex-1">
                {stageDeals.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400">
                    <p className="text-xs">Nenhum negócio</p>
                    <p className="text-[10px] text-slate-400">Arraste para cá</p>
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const isDragging = draggedDealId === deal.id
                    const closeDate = deal.expected_close_date
                      ? new Date(deal.expected_close_date)
                      : null
                    const isOverdue =
                      closeDate &&
                      closeDate < new Date() &&
                      deal.stage !== 'fechado' &&
                      deal.stage !== 'perdido'
                    const staleDays = daysInStage(deal)
                    const isStale =
                      deal.stage !== 'fechado' &&
                      deal.stage !== 'perdido' &&
                      staleDays >= STALE_STAGE_DAYS

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => {
                          setDealToEdit(deal)
                          setIsModalOpen(true)
                        }}
                        className={`bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-150 cursor-grab active:cursor-grabbing group relative ${
                          isDragging ? 'opacity-40 scale-95 ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        {/* Customer Highlight */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-bold text-indigo-900 group-hover:text-indigo-600 truncate flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {deal.expand?.customer?.name || 'Mercadinho'}
                          </span>
                          {isStale && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 cursor-help">
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="text-xs bg-amber-600 text-white border-amber-700 max-w-[220px]"
                              >
                                Negócio parado há {staleDays} dias no mesmo estágio
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-slate-700 leading-snug mb-2 group-hover:text-slate-900 line-clamp-2">
                          {deal.title}
                        </h4>

                        {/* Value */}
                        <div className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-normal">R$</span>
                          {deal.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Footer: Date & Owner */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          {closeDate ? (
                            <span
                              className={`flex items-center gap-1 font-medium ${
                                isOverdue ? 'text-red-600' : 'text-emerald-600'
                              }`}
                              title={isOverdue ? 'Prazo atrasado' : 'Prazo previsto'}
                            >
                              <Calendar className="w-3 h-3" />
                              {closeDate.toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-slate-400">Sem prazo</span>
                          )}

                          <span className="text-slate-600 font-medium truncate max-w-[90px]">
                            {deal.expand?.owner?.name?.split(' ')[0] || 'Vendedor'}
                          </span>
                        </div>

                        {/* Move stage dropdown helper on click */}
                        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Mover para:</span>
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              moveStageFallback(deal.id, e.target.value as DealStage)
                            }}
                            value={deal.stage}
                            className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-700 text-[10px] outline-none"
                          >
                            <option value="prospeccao">Prospecção</option>
                            <option value="negociacao">Negociação</option>
                            <option value="proposta">Proposta</option>
                            <option value="fechado">Fechado</option>
                            <option value="perdido">Perdido</option>
                          </select>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Deal Modal (Create & Edit) */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setDealToEdit(null)
        }}
        dealToEdit={dealToEdit}
        defaultStage={defaultStageForNew}
        customers={customers}
        users={users}
        currentUserId={user?.id}
        onSaved={loadAll}
      />
    </div>
  )
}
