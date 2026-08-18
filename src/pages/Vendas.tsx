import { useEffect, useState, useMemo } from 'react'
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Store,
  DollarSign,
  User as UserIcon,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { saleService, customerService, userService, productService } from '@/services/crm'
import { paymentService } from '@/services/paymentService'
import type { Sale, Customer, User, Product } from '@/types/crm'
import { NewSaleModal } from '@/components/NewSaleModal'
import { ViewSaleModal } from '@/components/ViewSaleModal'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Vendas() {
  const { user, role } = useAuth()
  const isVendedor = role === 'vendedor'

  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [customerFilter, setCustomerFilter] = useState('all')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [viewSaleId, setViewSaleId] = useState<string | null>(null)
  // mapa sale_id -> { label, badge, tooltip } do status da cobrança mais recente
  const [chargeStatusBySale, setChargeStatusBySale] = useState<
    Record<string, { label: string; badge: string; tooltip?: string }>
  >({})

  const loadData = async () => {
    try {
      const [salesData, custData, userData, prodData] = await Promise.all([
        saleService.getAll({
          customerId: customerFilter,
          sellerId: sellerFilter,
          paymentStatus: statusFilter,
          startDate: startDate ? `${startDate} 00:00:00.000Z` : undefined,
          endDate: endDate ? `${endDate} 23:59:59.000Z` : undefined,
        }),
        customerService.getAll(),
        userService.getAll(),
        productService.getAll({ activeOnly: true }),
      ])
      setSales(salesData)
      setCustomers(custData)
      setUsers(userData)
      setProducts(prodData)

      // carrega status de cobranças por sale_id (não bloqueia)
      try {
        const charges = await paymentService.listCharges()
        const statusLabels: Record<string, string> = {
          pending: 'Pendente',
          waiting_payment: 'Aguardando',
          paid: 'Pago',
          expired: 'Vencida',
          canceled: 'Cancelada',
          difference: 'Divergente',
          under_review: 'Em análise',
          partial: 'Parcial',
          refunded: 'Reembolsada',
          partially_refunded: 'Reemb. parcial',
          failed: 'Falhou',
        }
        const statusBadge: Record<string, string> = {
          pending: 'bg-slate-50 text-slate-600 border-slate-200',
          waiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
          paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          expired: 'bg-rose-50 text-rose-700 border-rose-200',
          canceled: 'bg-slate-100 text-slate-500 border-slate-200',
          difference: 'bg-orange-50 text-orange-700 border-orange-200',
          under_review: 'bg-sky-50 text-sky-700 border-sky-200',
          partial: 'bg-amber-50 text-amber-700 border-amber-200',
          refunded: 'bg-violet-50 text-violet-700 border-violet-200',
          partially_refunded: 'bg-violet-50 text-violet-700 border-violet-200',
          failed: 'bg-red-50 text-red-700 border-red-200',
        }
        // agrupa cobranças por sale_id para detectar situações especiais
        const bySale: Record<string, typeof charges> = {}
        for (const c of charges) {
          if (!c.sale_id) continue
          if (!bySale[c.sale_id]) bySale[c.sale_id] = []
          bySale[c.sale_id].push(c)
        }
        const map: Record<string, { label: string; badge: string; tooltip?: string }> = {}
        for (const saleId of Object.keys(bySale)) {
          const list = bySale[saleId]
          const paid = list.find((c) => c.status === 'paid')
          const refunded = list.find(
            (c) => c.status === 'refunded' || c.status === 'partially_refunded',
          )
          const expired = list.find((c) => c.status === 'expired')
          const canceled = list.find((c) => c.status === 'canceled')

          let label = ''
          let badge = 'bg-slate-50 text-slate-600 border-slate-200'
          let tooltip = ''

          if (refunded) {
            label = 'Estornado'
            badge = 'bg-violet-50 text-violet-700 border-violet-200'
            tooltip = 'Cobrança reembolsada/estornada.'
          } else if (paid) {
            const paidAfterDue =
              paid.expires_at &&
              paid.paid_at &&
              new Date(paid.paid_at).getTime() > new Date(paid.expires_at).getTime()
            if (paidAfterDue) {
              label = 'Pago (após vencimento)'
              badge = 'bg-amber-50 text-amber-700 border-amber-200'
              tooltip = `Pago após vencimento em ${new Date(paid.paid_at).toLocaleDateString('pt-BR')}.`
            } else {
              label = 'Cobrança: ' + (statusLabels[paid.status] || paid.status)
              badge = statusBadge[paid.status] || badge
              tooltip = 'Pagamento recebido.'
            }
          } else if (expired) {
            label = 'Cobrança vencida — gere novo boleto'
            badge = 'bg-red-50 text-red-700 border-red-200'
            tooltip = 'A cobrança venceu. Gere um novo boleto/link de pagamento.'
          } else {
            // pega a primeira para label genérico
            const c = list[0]
            label = 'Cobrança: ' + (statusLabels[c.status] || c.status)
            badge = statusBadge[c.status] || badge
            tooltip = 'Status atual da cobrança.'
          }
          map[saleId] = { label, badge, tooltip }
        }
        setChargeStatusBySale(map)
      } catch {
        /* intentionally ignored */
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar vendas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [customerFilter, sellerFilter, statusFilter, startDate, endDate])

  useRealtime<Sale>('sales', () => loadData())

  // Fallback de isolamento (o backend já filtra via regra por papel):
  // vendedor só enxerga as próprias vendas (seller = user.id).
  const visibleSales = useMemo(() => {
    if (isVendedor && user) {
      return sales.filter((s) => s.seller === user.id)
    }
    return sales
  }, [sales, isVendedor, user])

  const totalFilteredSales = useMemo(() => {
    return visibleSales.reduce((acc, curr) => acc + (curr.total || 0), 0)
  }, [visibleSales])

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Deseja realmente excluir este registro de venda?')) return
    try {
      await saleService.delete(saleId)
      toast.success('Venda excluída com sucesso')
      loadData()
    } catch (e) {
      toast.error('Erro ao excluir venda')
    }
  }

  const paymentMethodLabel: any = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto Bancário',
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Vendas & Pedidos Faturados
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {visibleSales.length} vendas
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de pedidos, emissão de faturamento e status de pagamento
          </p>
        </div>

        <button
          onClick={() => setIsNewSaleOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda</span>
        </button>
      </div>

      {/* Filter Bar & Summary */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Cliente */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer w-full truncate"
            >
              <option value="all">Todos os Mercadinhos</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendedor — oculto para vendedor (só vê as próprias) */}
          {!isVendedor && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer w-full"
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

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer w-full"
            >
              <option value="all">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="De"
              className="bg-transparent text-slate-700 outline-none w-full"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Até"
              className="bg-transparent text-slate-700 outline-none w-full"
            />
          </div>
        </div>

        {/* Total Badge */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total filtrado: <strong>{visibleSales.length} vendas</strong>
          </span>{' '}
          <span className="text-sm font-bold text-slate-900">
            Total: R$ {totalFilteredSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando vendas...</div>
        ) : visibleSales.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma venda encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Não existem registros para o período ou filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Mercadinho / Cliente</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSales.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setViewSaleId(s.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {new Date(s.sale_date || s.created).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{s.expand?.customer?.name || 'Mercadinho'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {s.expand?.seller?.name || 'Vendedor'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {paymentMethodLabel[s.payment_method] || s.payment_method}
                    </td>
                    <td className="py-3.5 px-4">
                      {(() => {
                        const cs = chargeStatusBySale[s.id]
                        // Se houver situação especial de cobrança, priorize-a
                        if (cs) {
                          const isSpecial =
                            cs.label.indexOf('após vencimento') !== -1 ||
                            cs.label === 'Estornado' ||
                            cs.label === 'Reembolso pendente' ||
                            cs.label.indexOf('vencida') !== -1
                          if (isSpecial) {
                            return (
                              <span
                                title={cs.tooltip || ''}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-help ${cs.badge}`}
                              >
                                {cs.label.indexOf('vencida') !== -1 ||
                                cs.label === 'Reembolso pendente' ? (
                                  <AlertTriangle className="w-3 h-3" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {cs.label}
                              </span>
                            )
                          }
                        }
                        // status padrão da venda
                        return s.payment_status === 'pago' ? (
                          <span
                            title="Pagamento recebido."
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-help"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Pago
                          </span>
                        ) : (
                          <span
                            title="Aguardando pagamento."
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                          >
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )
                      })()}
                      {chargeStatusBySale[s.id] &&
                        !(
                          chargeStatusBySale[s.id].label.indexOf('após vencimento') !== -1 ||
                          chargeStatusBySale[s.id].label === 'Estornado' ||
                          chargeStatusBySale[s.id].label === 'Reembolso pendente' ||
                          chargeStatusBySale[s.id].label.indexOf('vencida') !== -1
                        ) && (
                          <span
                            title={chargeStatusBySale[s.id].tooltip || ''}
                            className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-help ${chargeStatusBySale[s.id].badge}`}
                          >
                            {chargeStatusBySale[s.id].label}
                          </span>
                        )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      R$ {s.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setViewSaleId(s.id)}
                          title="Ver detalhes da venda"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(s.id)}
                          title="Excluir venda"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        customers={customers}
        products={products}
        users={users}
        currentUserId={user?.id}
        onSaleCreated={loadData}
      />

      {/* View Sale Modal */}
      <ViewSaleModal
        isOpen={Boolean(viewSaleId)}
        onClose={() => setViewSaleId(null)}
        saleId={viewSaleId}
      />
    </div>
  )
}
