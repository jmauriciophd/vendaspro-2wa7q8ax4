import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Store,
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Plus,
  MessageCircle,
  Send,
} from 'lucide-react'
import { customerService, dealService, saleService, userService } from '@/services/crm'
import type { Customer, Deal, Sale, User } from '@/types/crm'
import { CustomerModal } from '@/components/CustomerModal'
import { DealModal } from '@/components/DealModal'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'negocios' | 'vendas'>('negocios')

  // Modals
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false)
  const [isNewDealOpen, setIsNewDealOpen] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)

  const loadData = async () => {
    if (!id) return
    try {
      const [c, d, s, u] = await Promise.all([
        customerService.getById(id),
        dealService.getAll({ customerId: id }),
        saleService.getAll({ customerId: id }),
        userService.getAll(),
      ])
      setCustomer(c)
      setDeals(d)
      setSales(s)
      setUsers(u)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados do mercadinho')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<Customer>('customers', () => loadData())
  useRealtime<Deal>('deals', () => loadData())
  useRealtime<Sale>('sales', () => loadData())

  const stageBadge = (stage: Deal['stage']) => {
    const map: any = {
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
          <CheckCircle2 className="w-3 h-3" /> Pago
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3" /> Pendente
      </span>
    )
  }

  if (loading || !customer) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
        Carregando informações do mercadinho...
      </div>
    )
  }

  const totalSalesValue = sales.reduce((acc, curr) => acc + (curr.total || 0), 0)
  const openDealsValue = deals
    .filter((d) => d.stage !== 'fechado' && d.stage !== 'perdido')
    .reduce((acc, curr) => acc + (curr.value || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/clientes')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
        </button>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 uppercase">
                  Porte {customer.size || 'Pequeno'}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    customer.status === 'ativo'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {customer.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {customer.cnpj && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">CNPJ: {customer.cnpj}</p>
              )}

              {/* Contact and address grid */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs text-slate-600">
                {customer.owner_name && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Responsável: <strong>{customer.owner_name}</strong>
                    </span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {customer.address ? `${customer.address}, ${customer.number || 'S/N'} - ` : ''}
                    {customer.neighborhood ? `${customer.neighborhood}, ` : ''}
                    {customer.city}/{customer.state || 'SP'}
                  </span>
                </div>
              </div>

              {customer.notes && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Observações: </span>
                  {customer.notes}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-start">
            <button
              onClick={() => setIsEditCustomerOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => {
                setDealToEdit(null)
                setIsNewDealOpen(true)
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Negócio</span>
            </button>
            <button
              onClick={() => {
                const raw = customer.phone_whatsapp || customer.phone || ''
                let digits = raw.replace(/\D/g, '')
                if (digits && !digits.startsWith('55')) digits = '55' + digits
                const msg = encodeURIComponent(
                  `Olá ${customer.name}! Aqui é da ${'nossa empresa'}. Como podemos ajudar?`,
                )
                window.open(
                  digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`,
                  '_blank',
                )
              }}
              title="Enviar mensagem por WhatsApp"
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => {
                const handle = customer.telegram || ''
                const msg = encodeURIComponent(`Olá ${customer.name}! Aqui é da nossa empresa.`)
                window.open(
                  handle
                    ? `https://t.me/${handle.replace(/^@/, '')}?text=${msg}`
                    : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${msg}`,
                  '_blank',
                )
              }}
              title="Enviar mensagem por Telegram"
              className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Cards inside Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Total Comprado (Vendas)
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{sales.length} vendas registradas</p>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Pipeline em Aberto
            </span>
            <div className="text-lg font-bold text-violet-700 mt-0.5">
              R$ {openDealsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {deals.filter((d) => d.stage !== 'fechado' && d.stage !== 'perdido').length}{' '}
              oportunidades
            </p>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Cadastrado em
            </span>
            <div className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {new Date(customer.created).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Negócios & Vendas */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('negocios')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'negocios'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Negócios & Propostas ({deals.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vendas')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'vendas'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Histórico de Vendas ({sales.length})</span>
          </button>
        </div>

        {/* Tab 1: Deals */}
        {activeTab === 'negocios' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {deals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum negócio ou proposta registrada para este cliente.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Título</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Estágio</th>
                    <th className="py-3 px-4">Previsão</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{d.title}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        R$ {d.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">{stageBadge(d.stage)}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {d.expected_close_date
                          ? new Date(d.expected_close_date).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {d.expand?.owner?.name || 'Vendedor'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setDealToEdit(d)
                            setIsNewDealOpen(true)
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Sales */}
        {activeTab === 'vendas' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhuma venda finalizada para este mercadinho.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Data da Venda</th>
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Forma de Pagamento</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total Faturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((s) => {
                    const methodMap: any = {
                      dinheiro: 'Dinheiro',
                      pix: 'PIX',
                      cartao_credito: 'Cartão de Crédito',
                      cartao_debito: 'Cartão de Débito',
                      boleto: 'Boleto Bancário',
                    }
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {new Date(s.sale_date || s.created).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {s.expand?.seller?.name || 'Vendedor'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {methodMap[s.payment_method] || s.payment_method}
                        </td>
                        <td className="py-3.5 px-4">{paymentStatusBadge(s.payment_status)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          R$ {s.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        customerToEdit={customer}
        onSaved={loadData}
      />

      {/* New/Edit Deal Modal */}
      <DealModal
        isOpen={isNewDealOpen}
        onClose={() => {
          setIsNewDealOpen(false)
          setDealToEdit(null)
        }}
        dealToEdit={dealToEdit}
        customers={customer ? [customer] : []}
        users={users}
        onSaved={loadData}
      />
    </div>
  )
}
