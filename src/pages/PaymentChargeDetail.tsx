import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CreditCard,
  Copy,
  Check,
  Send,
  Ban,
  RefreshCw,
  CheckCircle2,
  Undo2,
  User,
  ShoppingCart,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  BadgeCheck,
  Layers,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  paymentService,
  formatMoney,
  formatDate,
  formatDateTime,
  chargeStatusLabels,
  chargeStatusBadge,
  paymentMethodLabels,
  isBoletoExpired,
  resolvePaymentUrl,
} from '@/services/paymentService'
import { useAuth } from '@/context/AuthContext'
import { PixDisplay } from '@/components/payments/PixDisplay'
import { ChargeTimeline } from '@/components/payments/ChargeTimeline'
import { SendChargeModal } from '@/components/payments/SendChargeModal'
import { BoletoView } from '@/components/payments/BoletoView'
import { PaymentIntegratedCheckout } from '@/components/payments/PaymentIntegratedCheckout'
import { usePaymentStatus } from '@/hooks/usePaymentStatus'

export default function PaymentChargeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isManager, isAdmin, user } = useAuth()
  const isAuthenticated = Boolean(user)
  const [tab, setTab] = useState<'details' | 'timeline'>('details')
  const [sendOpen, setSendOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Modais auxiliares administrativos
  const [manualOpen, setManualOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)

  // Callback de mudança de status memoizado para evitar re-renderizações e loops
  const handleStatusChange = useCallback((newStatus: any) => {
    if (newStatus === 'paid') {
      toast.success('🎉 Pagamento aprovado com sucesso!')
    } else if (newStatus === 'failed') {
      toast.error('Pagamento recusado.')
    }
  }, [])

  // Hook de polling e status automático
  const {
    charge,
    loading,
    error: loadError,
    refetch: load,
    isPolling,
  } = usePaymentStatus({
    chargeId: id,
    pollingIntervalMs: 3500,
    onStatusChange: handleStatusChange,
  })

  const canCancel = charge && (charge.status === 'pending' || charge.status === 'waiting_payment')
  const canManualConfirm =
    isManager &&
    charge &&
    charge.status !== 'paid' &&
    charge.status !== 'canceled' &&
    charge.status !== 'refunded'
  const canRefund =
    isAdmin && charge && (charge.status === 'paid' || charge.status === 'partially_refunded')
  const isOwner = user?.id === charge?.seller_id

  const isBoleto = charge?.payment_method === 'boleto'
  const boletoExpired = isBoleto ? isBoletoExpired(charge?.expires_at) : false
  const canRegenerateBoleto =
    isBoleto &&
    charge &&
    (charge.status === 'expired' ||
      charge.status === 'canceled' ||
      (boletoExpired && (charge.status === 'pending' || charge.status === 'waiting_payment')))
  const boletoWaiting =
    isBoleto &&
    (charge?.status === 'pending' || charge?.status === 'waiting_payment') &&
    !boletoExpired

  const realPaymentUrl = resolvePaymentUrl(charge?.payment_url, charge?.id)

  const handleCopyLink = async () => {
    if (!realPaymentUrl) return
    try {
      await navigator.clipboard.writeText(realPaymentUrl)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar link.')
    }
  }

  const handleCancel = async () => {
    if (!charge) return
    if (!confirm('Tem certeza que deseja cancelar esta cobrança?')) return
    setActionLoading(true)
    try {
      await paymentService.cancelCharge(charge.id)
      toast.success('Cobrança cancelada.')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cancelar cobrança.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!charge) return
    setActionLoading(true)
    try {
      const res = await paymentService.checkStatus(charge.id)
      toast.success(res.message || 'Status verificado.')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao verificar status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifyProvider = async () => {
    if (!charge) return
    setActionLoading(true)
    try {
      const res = await paymentService.verifyCharge(charge.id)
      if (res.updated) {
        toast.success(
          `Status atualizado: ${res.previous_status} → ${res.status}` +
            (res.provider_status ? ` (provedor: ${res.provider_status})` : ''),
        )
        load()
      } else {
        toast.info(res.message || 'Status conferido no provedor — sem alterações.')
      }
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.response?.message || 'Erro ao verificar status no provedor.'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  if (!charge) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
          <CreditCard className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Cobrança não encontrada</h2>
        <p className="text-xs text-slate-500 mt-1">
          {loadError || 'O identificador da cobrança é inválido ou o pagamento não foi localizado.'}
        </p>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => load()}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/financeiro/cobrancas')}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
            >
              Ir para lista de cobranças
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Público / Administrativo */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">VendasPro</h2>
            <p className="text-[11px] text-slate-500 font-medium">Portal de Pagamento Seguro</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPolling && charge.status !== 'paid' && charge.status !== 'canceled' && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              <span className="hidden sm:inline">Sincronizando status...</span>
            </div>
          )}
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="w-3.5 h-3.5" /> 256-bit SSL
          </span>
        </div>
      </div>

      {/* Ações administrativas quando autenticado */}
      {isAuthenticated && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate('/financeiro/cobrancas')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para cobranças
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSendOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Reenviar
            </button>
            {realPaymentUrl && (
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar link
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                <Ban className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
            <button
              onClick={handleCheckStatus}
              disabled={actionLoading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Verificar status
            </button>
            <button
              onClick={handleVerifyProvider}
              disabled={actionLoading}
              className="px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              <BadgeCheck className="w-3.5 h-3.5" /> Verificar status no provedor
            </button>
            {canManualConfirm && (
              <button
                onClick={() => setManualOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar manualmente
              </button>
            )}
            {canRefund && (
              <button
                onClick={() => setRefundOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" /> Reembolsar
              </button>
            )}
            {canRegenerateBoleto && (
              <button
                onClick={() => setRegenerateOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Gerar novo boleto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card superior com status grande */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Cobrança #{charge.external_charge_id}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Criada em {formatDateTime(charge.created)}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border ${
              chargeStatusBadge[charge.status] || 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {chargeStatusLabels[charge.status] || charge.status}
          </span>
        </div>
      </div>

      {/* Tabs - apenas para usuários autenticados */}
      {isAuthenticated && (
        <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold w-fit">
          <button
            onClick={() => setTab('details')}
            className={`px-5 py-2 transition-colors ${
              tab === 'details'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setTab('timeline')}
            className={`px-5 py-2 transition-colors border-l border-slate-200 ${
              tab === 'timeline'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Linha do Tempo
          </button>
        </div>
      )}

      {tab === 'details' || !isAuthenticated ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dados principais */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Dados da cobrança</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow
                icon={ShoppingCart}
                label="Pedido"
                value={charge.sale_id ? '#' + charge.sale_id.slice(-6).toUpperCase() : '—'}
                mono
              />
              <DetailRow icon={User} label="Cliente" value={charge.client_name || '—'} />
              <DetailRow
                icon={DollarSign}
                label="Valor original"
                value={'R$ ' + formatMoney(charge.original_amount)}
              />
              <DetailRow
                icon={DollarSign}
                label="Desconto"
                value={'R$ ' + formatMoney(charge.discount_amount)}
              />
              <DetailRow
                icon={DollarSign}
                label="Valor final"
                value={'R$ ' + formatMoney(charge.final_amount)}
                highlight
              />
              <DetailRow icon={Building2} label="Provedor" value={charge.provider_name || '—'} />
              <DetailRow
                icon={CreditCard}
                label="Método"
                value={paymentMethodLabels[charge.payment_method] || charge.payment_method}
              />
              {charge.installments > 1 && (
                <DetailRow
                  icon={Layers}
                  label="Parcelamento"
                  value={`${charge.installments}x de R$ ${formatMoney(charge.installment_value)} no cartão — Total: R$ ${formatMoney(charge.final_amount)}`}
                />
              )}
              <DetailRow icon={Calendar} label="Criado em" value={formatDateTime(charge.created)} />
              <DetailRow icon={Calendar} label="Vencimento" value={formatDate(charge.expires_at)} />
              <DetailRow icon={Clock} label="Pago em" value={formatDate(charge.paid_at)} />
            </div>

            {/* Grade de parcelas (quando houver) */}
            {charge.installments > 1 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Detalhamento das parcelas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: charge.installments }, (_, i) => i + 1).map((n) => (
                    <div
                      key={n}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="text-[11px] font-semibold text-slate-500">{n}ª parcela</span>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">
                          R$ {formatMoney(charge.installment_value)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {charge.status === 'paid' ? 'paga' : 'a pagar'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PIX */}
            {charge.payment_method === 'pix' && (charge.pix_code || charge.pix_qrcode) && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Pagamento PIX
                </h4>
                <PixDisplay pixCode={charge.pix_code || ''} qrcode={charge.pix_qrcode} />
              </div>
            )}

            {/* BOLETO */}
            {charge.payment_method === 'boleto' && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" /> Boleto Bancário
                  </h4>
                  <div className="flex items-center gap-2">
                    {boletoWaiting && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" /> Aguardando pagamento
                      </span>
                    )}
                    {boletoExpired && charge.status !== 'canceled' && charge.status !== 'paid' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Vencido
                      </span>
                    )}
                  </div>
                </div>

                {charge.boleto_barcode || charge.boleto_digitable_line ? (
                  <BoletoView
                    boleto={{
                      boleto_url: resolvePaymentUrl(charge.boleto_url, charge.id),
                      boleto_barcode: charge.boleto_barcode,
                      boleto_digitable_line: charge.boleto_digitable_line,
                      boleto_nosso_numero: charge.boleto_nosso_numero,
                      boleto_document_number: charge.boleto_document_number,
                      final_amount: charge.final_amount,
                      expires_at: charge.expires_at,
                      client_name: charge.client_name,
                      provider_name: charge.provider_name,
                      external_charge_id: charge.external_charge_id,
                    }}
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    Boleto ainda não gerado pelo provedor. Use “Gerar novo boleto” para tentar
                    novamente.
                  </div>
                )}

                {canRegenerateBoleto && isAuthenticated && (
                  <button
                    onClick={() => setRegenerateOpen(true)}
                    className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Gerar novo boleto com nova data
                  </button>
                )}
              </div>
            )}

            {/* CHECKOUT INTEGRADO TRANSPARENTE: Cartão de Crédito / Link */}
            {charge.payment_method === 'credit_card' ||
            charge.payment_method === 'debit_card' ||
            charge.payment_method === 'link' ? (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Pagamento com Cartão
                    (Checkout Integrado)
                  </h4>
                </div>

                {charge.status === 'pending' || charge.status === 'waiting_payment' ? (
                  <PaymentIntegratedCheckout charge={charge} onPaymentSuccess={load} />
                ) : charge.status === 'paid' ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-emerald-950">Cobrança Paga</h4>
                    <p className="text-xs text-emerald-700">
                      Esta cobrança já foi quitada em {formatDateTime(charge.paid_at)}.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
                    Status da cobrança:{' '}
                    <strong>{chargeStatusLabels[charge.status] || charge.status}</strong>.
                  </div>
                )}
              </div>
            ) : null}

            {/* URL pública desta cobrança para compartilhamento */}
            {realPaymentUrl &&
              charge.payment_method !== 'link' &&
              charge.payment_method !== 'credit_card' &&
              !charge.payment_url?.includes('mercadopago') && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    URL de pagamento
                  </h4>
                  <div className="flex items-stretch gap-2">
                    <input
                      readOnly
                      value={realPaymentUrl}
                      className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="shrink-0 px-3.5 py-2 text-xs font-semibold rounded-xl border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copiar
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Lateral */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Resumo financeiro
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Original</span>
                  <span className="font-semibold text-slate-800">
                    R$ {formatMoney(charge.original_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Desconto</span>
                  <span className="font-semibold text-rose-600">
                    - R$ {formatMoney(charge.discount_amount)}
                  </span>
                </div>
                {charge.installments > 1 && Number(charge.interest_rate) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Juros parcelamento</span>
                    <span className="font-semibold text-rose-600">
                      + R${' '}
                      {formatMoney(
                        Math.max(
                          0,
                          charge.final_amount - charge.original_amount + charge.discount_amount,
                        ),
                      )}
                    </span>
                  </div>
                )}
                {isAuthenticated && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Taxa do provedor</span>
                      <span className="font-semibold text-rose-600">
                        - R$ {formatMoney(charge.provider_fee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Valor líquido</span>
                      <span className="font-semibold text-indigo-700">
                        R$ {formatMoney(charge.net_value)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-emerald-700 text-base">
                    R$ {formatMoney(charge.final_amount)}
                  </span>
                </div>
              </div>{' '}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Vendedor
              </h4>
              <p className="text-sm font-semibold text-slate-800">{charge.seller_name || '—'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-5">Linha do Tempo</h3>
          <ChargeTimeline entries={charge.timeline || []} />
        </div>
      )}

      {/* Modais */}
      <SendChargeModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        charge={charge}
        onSent={load}
      />

      {manualOpen && (
        <ManualConfirmModal
          chargeId={charge.id}
          onClose={() => setManualOpen(false)}
          onConfirmed={() => {
            setManualOpen(false)
            load()
          }}
        />
      )}

      {refundOpen && (
        <RefundModal
          chargeId={charge.id}
          maxAmount={charge.final_amount}
          onClose={() => setRefundOpen(false)}
          onRefunded={() => {
            setRefundOpen(false)
            load()
          }}
        />
      )}

      {regenerateOpen && (
        <RegenerateBoletoModal
          chargeId={charge.id}
          onClose={() => setRegenerateOpen(false)}
          onRegenerated={(newId) => {
            setRegenerateOpen(false)
            toast.success('Novo boleto gerado.')
            navigate('/financeiro/cobrancas/' + newId)
          }}
        />
      )}
    </div>
  )
}

// ----- Regenerar Boleto -----
function RegenerateBoletoModal({
  chargeId,
  onClose,
  onRegenerated,
}: {
  chargeId: string
  onClose: () => void
  onRegenerated: (newId: string) => void
}) {
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!expiresAt) {
      toast.error('Informe a nova data de vencimento.')
      return
    }
    setLoading(true)
    try {
      const res = await paymentService.regenerateBoleto(chargeId, expiresAt)
      onRegenerated(res.id)
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.response?.message || 'Erro ao gerar novo boleto.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Gerar novo boleto</h3>
              <p className="text-xs text-slate-500">
                A cobrança atual será cancelada e um novo boleto será criado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-500">
            Informe a nova data de vencimento para o boleto regenerado.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nova data de vencimento *
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            <FileText className="w-4 h-4" /> {loading ? 'Gerando...' : 'Gerar boleto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </span>
      <p
        className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-800'} ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

// ----- Confirmação manual -----
function ManualConfirmModal({
  chargeId,
  onClose,
  onConfirmed,
}: {
  chargeId: string
  onClose: () => void
  onConfirmed: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Informe o motivo da confirmação manual.')
      return
    }
    setLoading(true)
    try {
      await paymentService.manualConfirm(chargeId, reason)
      toast.success('Pagamento confirmado manualmente.')
      onConfirmed()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao confirmar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800">Confirmação Manual</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-500">
            Esta ação registrará o pagamento como confirmado. A ação fica registrada no log de
            auditoria.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex: comprovante recebido fora do sistema..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- Reembolso -----
function RefundModal({
  chargeId,
  maxAmount,
  onClose,
  onRefunded,
}: {
  chargeId: string
  maxAmount: number
  onClose: () => void
  onRefunded: () => void
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const amt = amount ? Number(amount) : undefined
      await paymentService.refund(chargeId, { amount: amt, reason })
      toast.success('Reembolso registrado.')
      onRefunded()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar reembolso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800">Reembolso</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-500">
            Valor máximo: <strong>R$ {formatMoney(maxAmount)}</strong>. Deixe em branco para
            reembolso total.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor do reembolso (opcional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(maxAmount)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo do reembolso..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            <Undo2 className="w-4 h-4" /> Reembolsar
          </button>
        </div>
      </div>
    </div>
  )
}
