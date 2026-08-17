import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  ShoppingBag,
  Ticket,
  Wallet,
  TrendingUp,
  Target,
  Trophy,
  Package,
  ChevronRight,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { sellerDashboardService } from '@/services/modules'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type {
  SellerDashboard as SellerDashboardData,
  SellerRecentOrder,
  SellerTopProduct,
} from '@/types/modules'

const formatBRL = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatPct = (v: number) =>
  Number(v || 0)
    .toFixed(1)
    .replace('.', ',')

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

const COMMISSION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprovada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  paid: { label: 'Paga', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', color: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
  parcial: 'Parcial',
}

export default function SellerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<SellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await sellerDashboardService.get()
      setData(res)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar seu dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = () => {
    setRefreshing(true)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">Não foi possível carregar seus dados.</p>
        <button
          onClick={load}
          className="mt-3 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const s = data.summary
  const g = data.goals
  const c = data.commissions
  const goalPct = g.percentage || 0
  const goalBarWidth = Math.min(goalPct, 100)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Olá, {data.seller.name?.split(' ')[0] || 'Vendedor'}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Seu painel de vendas — dados isolados por usuário no backend
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
          label="Vendas Hoje"
          value={`R$ ${formatBRL(s.salesToday)}`}
        />
        <SummaryCard
          icon={<ShoppingBag className="w-5 h-5" />}
          color="bg-indigo-50 text-indigo-600"
          label="Vendas no Mês"
          value={`R$ ${formatBRL(s.salesMonth)}`}
        />
        <SummaryCard
          icon={<Package className="w-5 h-5" />}
          color="bg-violet-50 text-violet-600"
          label="Pedidos no Mês"
          value={String(s.ordersMonth)}
        />
        <SummaryCard
          icon={<Ticket className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
          label="Ticket Médio"
          value={`R$ ${formatBRL(s.averageTicket)}`}
        />
        <SummaryCard
          icon={<Wallet className="w-5 h-5" />}
          color="bg-cyan-50 text-cyan-600"
          label="Minha Comissão"
          value={`R$ ${formatBRL(s.commissionMonth)}`}
        />
        <SummaryCard
          icon={<Target className="w-5 h-5" />}
          color="bg-rose-50 text-rose-600"
          label="Minha Meta"
          value={`${formatPct(goalPct)}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Minha Meta Mensal */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Minha Meta Mensal
              </h3>
              <span
                className={`text-sm font-bold ${
                  goalPct >= 100
                    ? 'text-emerald-600'
                    : goalPct >= 70
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}
              >
                {formatPct(goalPct)}%
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs text-slate-500">
                  Realizado:{' '}
                  <span className="font-bold text-slate-800">R$ {formatBRL(g.salesValue)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Meta:{' '}
                  <span className="font-bold text-slate-800">R$ {formatBRL(g.targetValue)}</span>
                </p>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    goalPct >= 100
                      ? 'bg-emerald-500'
                      : goalPct >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${goalBarWidth}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {goalPct >= 100
                  ? `🎉 Parabéns! Você ultrapassou a meta em R$ ${formatBRL(g.salesValue - g.targetValue)}.`
                  : `Faltam R$ ${formatBRL(Math.max(g.targetValue - g.salesValue, 0))} para atingir a meta.`}
              </p>
            </div>
          </div>

          {/* Meus Pedidos Recentes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Meus Pedidos Recentes
              </h3>
              <button
                onClick={() => navigate('/vendas')}
                className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/60 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Cliente</th>
                    <th className="text-left font-semibold px-4 py-2.5">Data</th>
                    <th className="text-right font-semibold px-4 py-2.5">Valor</th>
                    <th className="text-center font-semibold px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                        Nenhum pedido neste mês.
                      </td>
                    </tr>
                  ) : (
                    data.recentOrders.map((o: SellerRecentOrder) => (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-slate-800 font-medium truncate max-w-[160px]">
                          {o.customer_name || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">
                          {formatDate(o.sale_date)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                          R$ {formatBRL(o.total)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              o.payment_status === 'pago'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meus Produtos Mais Vendidos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-indigo-600" />
                Meus Produtos Mais Vendidos
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {data.topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum produto vendido neste mês.
                </div>
              ) : (
                data.topProducts.map((p: SellerTopProduct, idx: number) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
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
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.quantity} un. vendidas</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {formatBRL(p.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna lateral (1/3) */}
        <div className="space-y-6">
          {/* Minhas Comissões */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                Minhas Comissões
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Resumo do mês atual</p>
            </div>
            <div className="p-4 space-y-3">
              <CommissionCard
                label="Pendente"
                value={c.pending}
                color="bg-amber-50 text-amber-700 border-amber-200"
              />
              <CommissionCard
                label="Aprovada"
                value={c.approved}
                color="bg-indigo-50 text-indigo-700 border-indigo-200"
              />
              <CommissionCard
                label="Paga"
                value={c.paid}
                color="bg-emerald-50 text-emerald-700 border-emerald-200"
              />
              <div className="pt-3 mt-3 border-t border-dashed border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-xl font-bold text-slate-900">R$ {formatBRL(c.total)}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/comissoes')}
                className="w-full mt-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                Ver comissões <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Atalho para pipeline */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Pipeline de Vendas</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Acompanhe seus negócios em andamento no funil de vendas.
            </p>
            <button
              onClick={() => navigate('/pipeline')}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              Ir para Pipeline <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
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

function CommissionCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${color}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-sm font-bold">R$ {formatBRL(value)}</span>
    </div>
  )
}
