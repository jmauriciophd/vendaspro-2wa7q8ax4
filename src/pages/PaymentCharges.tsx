import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  TrendingUp,
  Filter,
  ChevronRight,
  Download,
  Search,
} from 'lucide-react'
import {
  paymentService,
  formatMoney,
  formatDate,
  chargeStatusLabels,
  formatChargeStatus,
  paymentMethodLabels,
  formatPaymentMethod,
  paymentMethodBadge,
} from '@/services/paymentService'
import type { PaymentChargeListItem, ChargeStatus, PaymentMethod } from '@/types/payments'
import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services/crm'
import type { Customer, User } from '@/types/crm'
import { userService } from '@/services/crm'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const statusList: ChargeStatus[] = [
  'pending',
  'waiting_payment',
  'paid',
  'expired',
  'canceled',
  'difference',
  'under_review',
  'partial',
]

const methodList: PaymentMethod[] = ['pix', 'credit_card', 'debit_card', 'boleto', 'link']

export default function PaymentCharges() {
  return (
    <ErrorBoundary fallbackTitle="Erro ao carregar cobranças">
      <PaymentChargesContent />
    </ErrorBoundary>
  )
}

function PaymentChargesContent() {
  const navigate = useNavigate()
  const { isManager } = useAuth()
  const [charges, setCharges] = useState<PaymentChargeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([])

  // filtros
  const [fStatus, setFStatus] = useState('')
  const [fMethod, setFMethod] = useState('')
  const [fClient, setFClient] = useState('')
  const [fSeller, setFSeller] = useState('')
  const [fProvider, setFProvider] = useState('')
  const [fSale, setFSale] = useState('')
  const [fMonth, setFMonth] = useState('')
  const [fYear, setFYear] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (fStatus) params.status = fStatus
      if (fMethod) params.payment_method = fMethod
      if (fClient) params.client_id = fClient
      if (fSeller) params.seller_id = fSeller
      if (fProvider) params.provider_id = fProvider
      if (fSale) params.sale_id = fSale
      if (fMonth) params.month = parseInt(fMonth, 10)
      if (fYear) params.year = parseInt(fYear, 10)

      const [chargesData, provs] = await Promise.all([
        paymentService.listCharges(params as any),
        paymentService.listProviders(),
      ])
      setCharges(chargesData)
      setProviders(provs.map((p) => ({ id: p.id, name: p.name })))

      if (isManager) {
        const [cs, ss] = await Promise.all([customerService.getAll(), userService.getAll()])
        setCustomers(cs)
        setSellers(ss)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [fStatus, fMethod, fClient, fSeller, fProvider, fSale, fMonth, fYear])

  // resumo
  const summary = useMemo(() => {
    let totalCharged = 0
    let totalReceived = 0
    let waiting = 0
    let waitingValue = 0
    let expired = 0
    let canceled = 0
    let differences = 0
    for (const c of charges) {
      totalCharged += c.final_amount || 0
      if (c.status === 'paid') totalReceived += c.final_amount || 0
      if (c.status === 'waiting_payment' || c.status === 'pending') {
        waiting++
        waitingValue += c.final_amount || 0
      }
      if (c.status === 'expired') expired++
      if (c.status === 'canceled') canceled++
      if (c.status === 'difference' || c.status === 'under_review' || c.status === 'partial')
        differences++
    }
    return { totalCharged, totalReceived, waiting, waitingValue, expired, canceled, differences }
  }, [charges])

  const clearFilters = () => {
    setFStatus('')
    setFMethod('')
    setFClient('')
    setFSeller('')
    setFProvider('')
    setFSale('')
    setFMonth('')
    setFYear('')
  }

  const cards = [
    {
      label: 'Total cobrado',
      value: 'R$ ' + formatMoney(summary.totalCharged),
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Total recebido',
      value: 'R$ ' + formatMoney(summary.totalReceived),
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Aguardando pagamento',
      value: summary.waiting + ' • R$ ' + formatMoney(summary.waitingValue),
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Vencidas',
      value: String(summary.expired),
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Canceladas',
      value: String(summary.canceled),
      icon: Ban,
      color: 'bg-slate-100 text-slate-500',
    },
    {
      label: 'Diferenças',
      value: String(summary.differences),
      icon: AlertTriangle,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-600" /> Cobranças
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gere links de pagamento, acompanhe recebimentos e concilie cobranças
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => navigate('/financeiro/conciliacao')}
            className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Filter className="w-4 h-4" /> Conciliação
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.color}`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {c.label}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{c.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros
          </h3>
          <button
            onClick={clearFilters}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Limpar
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          >
            <option value="">Todos os status de cobrança</option>
            {statusList.map((s) => (
              <option key={s} value={s}>
                {formatChargeStatus(s)}
              </option>
            ))}
          </select>
          <select
            value={fMethod}
            onChange={(e) => setFMethod(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          >
            <option value="">Todos os métodos de pagamento</option>
            {methodList.map((m) => (
              <option key={m} value={m}>
                {formatPaymentMethod(m)}
              </option>
            ))}
          </select>
          {isManager && (
            <>
              <select
                value={fClient}
                onChange={(e) => setFClient(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
              >
                <option value="">Todos os clientes</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={fSeller}
                onChange={(e) => setFSeller(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
              >
                <option value="">Todos os vendedores</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.email}
                  </option>
                ))}
              </select>
            </>
          )}
          <select
            value={fProvider}
            onChange={(e) => setFProvider(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          >
            <option value="">Todos os provedores</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={fSale}
            onChange={(e) => setFSale(e.target.value)}
            placeholder="ID do pedido"
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          />
          <select
            value={fMonth}
            onChange={(e) => setFMonth(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <select
            value={fYear}
            onChange={(e) => setFYear(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
          >
            <option value="">Todos os anos</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Carregando cobranças...
          </div>
        ) : charges.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhuma cobrança encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              Ajuste os filtros ou gere uma nova cobrança a partir de uma venda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cobrança</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Provedor</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Pago em</th>
                  {isManager && <th className="py-3 px-4">Vendedor</th>}
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charges.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/financeiro/cobrancas/${c.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 group-hover:text-indigo-600">
                      {c.external_charge_id}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.client_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {c.sale_id ? '#' + c.sale_id.slice(-6).toUpperCase() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.provider_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          paymentMethodBadge[c.payment_method] ||
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {formatPaymentMethod(c.payment_method)}
                      </span>
                    </td>{' '}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      R$ {formatMoney(c.final_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} expiresAt={c.expires_at} paidAt={c.paid_at} />
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(c.expires_at)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(c.paid_at)}</td>
                    {isManager && (
                      <td className="py-3 px-4 text-slate-600">{c.seller_name || '—'}</td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 inline" />
                    </td>
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

// Badge de status compartilhado — com detecção de situações especiais e tooltips.
function StatusBadge({
  status,
  expiresAt,
  paidAt,
}: {
  status: string
  expiresAt?: string | null
  paidAt?: string | null
}) {
  const colors: Record<string, string> = {
    pending: 'bg-slate-50 text-slate-700 border-slate-200',
    waiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-rose-50 text-rose-700 border-rose-200',
    canceled: 'bg-slate-100 text-slate-500 border-slate-200',
    refunded: 'bg-violet-50 text-violet-700 border-violet-200',
    partially_refunded: 'bg-violet-50 text-violet-700 border-violet-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    under_review: 'bg-sky-50 text-sky-700 border-sky-200',
    difference: 'bg-orange-50 text-orange-700 border-orange-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  // tooltips descritivos por status
  const tooltips: Record<string, string> = {
    pending: 'Cobrança criada, aguardando processamento.',
    waiting_payment: 'Link/boleto gerado, aguardando o cliente pagar.',
    paid: 'Pagamento confirmado dentro do prazo.',
    expired: 'O prazo de pagamento venceu. Gere um novo boleto/link.',
    canceled: 'Cobrança cancelada. Se houve pagamento, é preciso reembolsar.',
    refunded: 'Pagamento devolvido ao cliente.',
    partially_refunded: 'Reembolso parcial concluído.',
    failed: 'Falha no processamento da cobrança.',
    under_review: 'Pagamento em análise antifraude.',
    difference: 'Valor recebido divergente do cobrado.',
    partial: 'Pagamento parcial recebido.',
  }

  // Detecta situação especial: pago após vencimento
  const paidAfterDue =
    status === 'paid' &&
    expiresAt &&
    paidAt &&
    new Date(paidAt).getTime() > new Date(expiresAt).getTime()

  if (paidAfterDue) {
    return (
      <span
        title={`Pago após vencimento em ${new Date(paidAt!).toLocaleDateString('pt-BR')}`}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200 cursor-help"
      >
        Pago (atrasado)
      </span>
    )
  }

  // Vencida — chama atenção para gerar novo
  if (status === 'expired') {
    return (
      <span
        title={tooltips.expired}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 text-red-700 border-red-200 cursor-help"
      >
        Vencida — gere novo
      </span>
    )
  }

  // Cancelada que tinha pagamento — alerta de reembolso
  if (status === 'canceled' && paidAt) {
    return (
      <span
        title="Cobrança cancelada, mas houve pagamento. Avalie o reembolso."
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-orange-50 text-orange-700 border-orange-200 cursor-help"
      >
        Cancelada (reembolsar?)
      </span>
    )
  }

  return (
    <span
      title={tooltips[status] || formatChargeStatus(status)}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-help ${
        colors[status] || 'bg-slate-50 text-slate-700 border-slate-200'
      }`}
    >
      {formatChargeStatus(status)}
    </span>
  )
}
