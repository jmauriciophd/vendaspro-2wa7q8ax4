import React, { useState } from 'react'
import { X, Send, Copy, Mail, MessageCircle, Link2, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  paymentService,
  formatMoney,
  formatDate,
  resolvePaymentUrl,
} from '@/services/paymentService'
import type { PaymentChargeDetail, ChargeMessageChannel } from '@/types/payments'

interface SendChargeModalProps {
  isOpen: boolean
  onClose: () => void
  charge: PaymentChargeDetail
  onSent?: () => void
}

const channels: Array<{ value: ChargeMessageChannel; label: string; icon: React.ElementType }> = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'copy_link', label: 'Copiar link', icon: Link2 },
]

export const SendChargeModal: React.FC<SendChargeModalProps> = ({
  isOpen,
  onClose,
  charge,
  onSent,
}) => {
  const [channel, setChannel] = useState<ChargeMessageChannel>('email')
  const [destination, setDestination] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const saleRef = charge.sale_id ? '#' + charge.sale_id.slice(-6).toUpperCase() : ''
  const valor = 'R$ ' + formatMoney(charge.final_amount)
  const vencimento = formatDate(charge.expires_at)
  const link = resolvePaymentUrl(charge.payment_url, charge.id)
  const clientName = charge.client_name || 'cliente'

  const message = `Olá, ${clientName}. Segue o link para pagamento do pedido ${saleRef}. Valor: ${valor}. Vencimento: ${vencimento}. ${link}. Após a confirmação, o sistema atualizará automaticamente o pedido.`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const handleSend = async () => {
    if (channel !== 'copy_link' && !destination.trim()) {
      toast.error('Informe o destino (email ou telefone).')
      return
    }
    setSending(true)
    try {
      if (channel === 'copy_link') {
        await handleCopyLink()
        // registra o envio como copy_link
        await paymentService.sendCharge(charge.id, { channel, destination: '' })
      } else {
        await paymentService.sendCharge(charge.id, { channel, destination })
        toast.success('Cobrança enviada com sucesso!')
      }
      onSent?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar cobrança.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Enviar Cobrança</h3>
              <p className="text-xs text-slate-500">
                {charge.external_charge_id} • R$ {formatMoney(charge.final_amount)}
              </p>
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
          {/* Canal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Canal</label>
            <div className="grid grid-cols-3 gap-2">
              {channels.map((c) => {
                const Icon = c.icon
                const active = channel === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setChannel(c.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Destination */}
          {channel === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email do destinatário
              </label>
              <input
                type="email"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          )}

          {channel === 'whatsapp' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone (WhatsApp)
              </label>
              <input
                type="tel"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          )}

          {channel === 'copy_link' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link de pagamento
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={link}
                  className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preview da mensagem
            </label>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
              {message}
            </div>
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
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {channel === 'copy_link' ? 'Copiar e registrar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
