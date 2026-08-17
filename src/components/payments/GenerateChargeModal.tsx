import React, { useState, useEffect, useMemo } from 'react'
import { X, CreditCard, Loader2, ShoppingCart, User, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { paymentService, formatMoney } from '@/services/paymentService'
import type { PaymentProvider, PaymentMethod } from '@/types/payments'
import type { Sale } from '@/types/crm'

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

  const original = sale?.total || 0
  const discountNum = Number(discount || 0)
  const final = Math.max(0, original - discountNum)

  if (!isOpen || !sale) return null

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
      })
      toast.success('Cobrança gerada com sucesso!')
      onGenerated?.(res.id)
      onClose()
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.response?.message || 'Erro ao gerar cobrança.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

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
