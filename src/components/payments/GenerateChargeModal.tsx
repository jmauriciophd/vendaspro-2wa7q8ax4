import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  CreditCard,
  Loader2,
  ShoppingCart,
  User,
  DollarSign,
  Layers,
  FileText,
  Send,
  Check,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  paymentService,
  formatMoney,
  formatDate,
  formatBoletoDigitableLine,
  resolvePaymentUrl,
} from '@/services/paymentService'
import type { PaymentProvider, PaymentMethod, CreateChargeResult } from '@/types/payments'
import type { Sale } from '@/types/crm'
import { BoletoView } from '@/components/payments/BoletoView'
import { SendChargeModal } from '@/components/payments/SendChargeModal'

interface GenerateChargeModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  onGenerated?: (chargeId: string) => void
}

const allMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'link', label: 'Link de Pagamento' },
]

export const GenerateChargeModal: React.FC<GenerateChargeModalProps> = ({
  isOpen,
  onClose,
  sale,
  onGenerated,
}) => {
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [discount, setDiscount] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [installments, setInstallments] = useState(1)
  const [boletoResult, setBoletoResult] = useState<CreateChargeResult | null>(null)
  const [copiedLine, setCopiedLine] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoadingProviders(true)
      paymentService
        .listProviders()
        .then((data) => {
          const active = data.filter((p) => p.status === 'active')
          setProviders(active)
          if (active.length > 0 && !providerId) setProviderId(active[0].id)
        })
        .catch((err) => {
          console.error(err)
          toast.error('Erro ao carregar provedores.')
        })
        .finally(() => setLoadingProviders(false))

      // default +3 dias
      const d = new Date()
      d.setDate(d.getDate() + 3)
      setExpiresAt(d.toISOString().split('T')[0])
      setDiscount('')
      setMethod('pix')
      setInstallments(1)
      setBoletoResult(null)
      setSendOpen(false)
    }
  }, [isOpen])

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === providerId) || null,
    [providers, providerId],
  )

  const availableMethods = useMemo(() => {
    if (!selectedProvider) return []
    const m = selectedProvider.methods || []
    return allMethods.filter((am) => m.includes(am.value))
  }, [selectedProvider])

  // ajusta método se não suportado pelo provider
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.find((m) => m.value === method)) {
      setMethod(availableMethods[0].value)
    }
  }, [availableMethods, method])

  // reseta parcelas quando o método muda
  useEffect(() => {
    if (method !== 'credit_card') setInstallments(1)
  }, [method])

  const original = sale?.total || 0
  const discountNum = Number(discount || 0)
  const base = Math.max(0, original - discountNum)

  // taxa de juros por parcela (espelha o cálculo do backend — só para preview)
  const installmentRate = (n: number): number => {
    if (n <= 1) return 0
    if (n === 2) return 0.025
    if (n === 3) return 0.045
    if (n === 4) return 0.065
    if (n === 5) return 0.085
    if (n === 6) return 0.105
    return 0.125
  }

  const interestRate = method === 'credit_card' ? installmentRate(installments) : 0
  const final = Math.round(base * (1 + interestRate) * 100) / 100
  const totalInterest = Math.round((final - base) * 100) / 100
  const installmentValue =
    installments > 1 && method === 'credit_card'
      ? Math.round((final / installments) * 100) / 100
      : final

  const handleSubmit = async () => {
    if (!providerId || !method) {
      toast.error('Selecione provedor e forma de pagamento.')
      return
    }
    setSubmitting(true)
    try {
      const expires = expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : undefined
      const res = await paymentService.createCharge({
        sale_id: sale.id,
        provider_id: providerId,
        payment_method: method,
        discount_amount: discountNum || 0,
        expires_at: expires,
        installments: method === 'credit_card' ? installments : 1,
      })
      toast.success('Cobrança gerada com sucesso!')
      // Se boleto, mostra preview inline em vez de fechar.
      if (method === 'boleto') {
        setBoletoResult(res)
        onGenerated?.(res.id)
      } else {
        onGenerated?.(res.id)
        onClose()
      }
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.response?.message || 'Erro ao gerar cobrança.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLine = async () => {
    if (!boletoResult?.boleto_digitable_line) return
    try {
      await navigator.clipboard.writeText(boletoResult.boleto_digitable_line)
      setCopiedLine(true)
      toast.success('Linha digitável copiada!')
      setTimeout(() => setCopiedLine(false), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  // ===== Preview de boleto após geração =====
  if (boletoResult) {
    const providerName = selectedProvider?.name || ''
    return (
      <>
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Boleto gerado</h3>
                  <p className="text-xs text-slate-500">Cobrança pronta para envio</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Valor</span>
                  <p className="text-xs font-bold text-emerald-700">
                    R$ {formatMoney(boletoResult.final_amount)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Vencimento</span>
                  <p className="text-xs font-bold text-amber-700">
                    {formatDate(boletoResult.expires_at)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase">Provedor</span>
                  <p className="text-xs font-bold text-indigo-700 truncate">{providerName}</p>
                </div>
              </div>

              {/* Linha digitável destacada */}
              {boletoResult.boleto_digitable_line && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Linha digitável
                    </span>
                    <button
                      onClick={handleCopyLine}
                      className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        copiedLine ? 'text-emerald-700' : 'text-indigo-700 hover:text-indigo-800'
                      }`}
                    >
                      {copiedLine ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLine ? 'Copiado' : 'Copiar linha'}
                    </button>
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-800 tracking-wider break-all">
                    {formatBoletoDigitableLine(boletoResult.boleto_digitable_line)}
                  </p>
                </div>
              )}

              {/* Boleto visual */}
              <BoletoView
                boleto={{
                  boleto_url: resolvePaymentUrl(boletoResult.boleto_url, boletoResult.id),
                  boleto_barcode: boletoResult.boleto_barcode,
                  boleto_digitable_line: boletoResult.boleto_digitable_line,
                  boleto_nosso_numero: boletoResult.boleto_nosso_numero,
                  boleto_document_number: boletoResult.boleto_document_number,
                  final_amount: boletoResult.final_amount,
                  expires_at: boletoResult.expires_at,
                  client_name: sale.expand?.customer?.name,
                  provider_name: providerName,
                  external_charge_id: boletoResult.external_charge_id,
                }}
                hideActions
              />
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleCopyLine}
                disabled={!boletoResult.boleto_digitable_line}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {copiedLine ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar linha digitável
              </button>
              <a
                href={resolvePaymentUrl(boletoResult.boleto_url, boletoResult.id) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Abrir boleto
              </a>
              <button
                onClick={() => setSendOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Enviar para cliente
              </button>
            </div>
          </div>
        </div>

        {sendOpen && (
          <SendChargeModal
            isOpen={sendOpen}
            onClose={() => setSendOpen(false)}
            charge={
              {
                id: boletoResult.id,
                external_charge_id: boletoResult.external_charge_id,
                sale_id: boletoResult.sale_id,
                final_amount: boletoResult.final_amount,
                payment_url: resolvePaymentUrl(
                  boletoResult.boleto_url || boletoResult.payment_url,
                  boletoResult.id,
                ),
                expires_at: boletoResult.expires_at,
                client_name: sale.expand?.customer?.name || '',
                payment_method: 'boleto',
              } as any
            }
            onSent={() => {
              setSendOpen(false)
              onClose()
            }}
          />
        )}
      </>
    )
  }

  if (!isOpen || !sale) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Gerar Pagamento</h3>
              <p className="text-xs text-slate-500">Cobrança digital para o pedido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Resumo do pedido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Cliente
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                {sale.expand?.customer?.name || 'Cliente'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> Pedido
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1 font-mono">
                #{sale.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Valor */}
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Valor do pedido
            </span>
            <span className="text-lg font-bold text-slate-900">R$ {formatMoney(original)}</span>
          </div>

          {/* Provedor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Provedor de pagamento
            </label>
            {loadingProviders ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando provedores...
              </div>
            ) : providers.length === 0 ? (
              <p className="text-xs text-amber-600 py-2">
                Nenhum provedor ativo. Configure em Configurações › Pagamentos.
              </p>
            ) : (
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.environment})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Método */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Forma de pagamento
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              disabled={availableMethods.length === 0}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:opacity-60"
            >
              {availableMethods.length === 0 ? (
                <option value="">Selecione um provedor</option>
              ) : (
                availableMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Parcelamento (somente cartão de crédito) */}
          {method === 'credit_card' && (
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Parcelas
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                    const rate = installmentRate(n)
                    const total = Math.round(base * (1 + rate) * 100) / 100
                    const parcela = n > 1 ? Math.round((total / n) * 100) / 100 : total
                    const jurosLabel =
                      n === 1
                        ? 'à vista'
                        : rate === 0.125
                          ? `${n}x de R$ ${formatMoney(parcela)} (juros 12,5%)`
                          : `${n}x de R$ ${formatMoney(parcela)} (juros ${(rate * 100).toFixed(1)}%)`
                    return (
                      <option key={n} value={n}>
                        {jurosLabel}
                      </option>
                    )
                  })}
                </select>
              </div>

              {installments > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Valor de cada parcela</span>
                    <span className="font-semibold text-slate-800">
                      R$ {formatMoney(installmentValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total parcelado</span>
                    <span className="font-semibold text-slate-800">R$ {formatMoney(final)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Juros totais</span>
                    <span className="font-semibold text-rose-600">
                      R$ {formatMoney(totalInterest)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    {installments}x de R$ {formatMoney(installmentValue)} (total: R${' '}
                    {formatMoney(final)} — juros: R$ {formatMoney(totalInterest)})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Desconto e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Desconto (R$) — opcional
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          {/* Valor final */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Valor final a cobrar</span>
            <span className="text-xl font-bold text-emerald-700">R$ {formatMoney(final)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !providerId || !method}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Gerar link
          </button>
        </div>
      </div>
    </div>
  )
}
