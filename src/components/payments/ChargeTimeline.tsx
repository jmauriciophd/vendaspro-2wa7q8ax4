import React from 'react'
import {
  CircleDot,
  Send,
  Webhook,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Undo2,
  Hand,
  Scale,
  History,
  CreditCard,
  QrCode,
  FileText,
  DollarSign,
  Building2,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  Copy,
} from 'lucide-react'
import type { ChargeAuditEntry } from '@/types/payments'
import {
  auditActionLabels,
  formatDateTime,
  formatMoney,
  chargeStatusLabels,
  chargeStatusBadge,
  paymentMethodLabels,
  paymentMethodBadge,
} from '@/services/paymentService'

interface ChargeTimelineProps {
  entries: ChargeAuditEntry[]
}

const actionIcon: Record<string, React.ElementType> = {
  charge_created: CircleDot,
  link_sent: Send,
  webhook_received: Webhook,
  status_updated: RefreshCw,
  payment_confirmed: CheckCircle2,
  payment_divergent: AlertTriangle,
  charge_canceled: Ban,
  refund: Undo2,
  manual_change: Hand,
  reconciliation: Scale,
}

const actionColor: Record<string, string> = {
  charge_created: 'bg-indigo-100 text-indigo-700 ring-indigo-50',
  link_sent: 'bg-sky-100 text-sky-700 ring-sky-50',
  webhook_received: 'bg-violet-100 text-violet-700 ring-violet-50',
  status_updated: 'bg-slate-100 text-slate-700 ring-slate-50',
  payment_confirmed: 'bg-emerald-100 text-emerald-700 ring-emerald-50',
  payment_divergent: 'bg-orange-100 text-orange-700 ring-orange-50',
  charge_canceled: 'bg-rose-100 text-rose-700 ring-rose-50',
  refund: 'bg-violet-100 text-violet-700 ring-violet-50',
  manual_change: 'bg-amber-100 text-amber-700 ring-amber-50',
  reconciliation: 'bg-teal-100 text-teal-700 ring-teal-50',
}

function getPaymentMethodIcon(method?: string) {
  switch (method) {
    case 'pix':
      return QrCode
    case 'boleto':
      return FileText
    case 'credit_card':
    case 'debit_card':
      return CreditCard
    case 'link':
      return ExternalLink
    default:
      return CreditCard
  }
}

function formatProviderLabel(provider?: string): string {
  if (!provider) return '—'
  const p = provider.toLowerCase()
  if (p === 'mercadopago' || p.includes('mercado')) return 'Mercado Pago'
  if (p === 'asaas') return 'Asaas'
  if (p === 'pagbank' || p.includes('pagseguro')) return 'PagBank'
  if (p === 'cora') return 'Cora'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function formatChannelLabel(channel?: string): { label: string; icon: React.ElementType } {
  switch (channel) {
    case 'email':
      return { label: 'E-mail', icon: Mail }
    case 'whatsapp':
      return { label: 'WhatsApp', icon: Phone }
    case 'copy_link':
      return { label: 'Link Copiado', icon: Copy }
    default:
      return { label: channel || 'Envio', icon: Send }
  }
}

interface RenderDataBlockProps {
  title: string
  data: Record<string, any>
  variant: 'previous' | 'new'
}

const RenderDataBlock: React.FC<RenderDataBlockProps> = ({ title, data, variant }) => {
  if (!data || Object.keys(data).length === 0) return null

  const isNew = variant === 'new'
  const containerClass = isNew
    ? 'p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/80'
    : 'p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70'

  const titleClass = isNew
    ? 'text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2.5 flex items-center gap-1.5'
    : 'text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5'

  // Identificação de campos comuns
  const status = data.status || data.raw_status
  const method = data.method || data.payment_method
  const amount =
    data.final_amount !== undefined
      ? data.final_amount
      : data.amount !== undefined
        ? data.amount
        : data.refund_amount !== undefined
          ? data.refund_amount
          : data.expected !== undefined
            ? data.expected
            : undefined

  const receivedAmount = data.received !== undefined ? data.received : undefined
  const provider = data.provider || data.provider_slug
  const channel = data.channel
  const destination = data.destination
  const message = data.message
  const reason = data.reason
  const source = data.source
  const paidAt = data.paid_at
  const canceledAt = data.canceled_at

  const MethodIcon = getPaymentMethodIcon(method)
  const channelInfo = channel ? formatChannelLabel(channel) : null
  const ChannelIcon = channelInfo?.icon

  // Campos renderizados estruturadamente
  const renderedKeys = new Set([
    'status',
    'raw_status',
    'method',
    'payment_method',
    'final_amount',
    'amount',
    'refund_amount',
    'expected',
    'received',
    'provider',
    'provider_slug',
    'channel',
    'destination',
    'message',
    'reason',
    'source',
    'paid_at',
    'canceled_at',
  ])

  // Campos extras não categorizados
  const extraKeys = Object.keys(data).filter(
    (k) => !renderedKeys.has(k) && data[k] !== undefined && data[k] !== '',
  )

  return (
    <div className={containerClass}>
      <div className={titleClass}>
        <span className={`w-1.5 h-1.5 rounded-full ${isNew ? 'bg-indigo-500' : 'bg-slate-400'}`} />
        {title}
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Status + Método de Pagamento */}
        {(status || method) && (
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs ${
                  chargeStatusBadge[status] || 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
                {chargeStatusLabels[status] || status}
              </span>
            )}

            {method && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs ${
                  paymentMethodBadge[method] || 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                <MethodIcon className="w-3.5 h-3.5" />
                {paymentMethodLabels[method] || method.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Valores Monetários (BRL) */}
        {amount !== undefined && (
          <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/70 border border-slate-200/60">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {data.refund_amount !== undefined
                ? 'Valor Reembolsado:'
                : data.expected !== undefined
                  ? 'Valor Esperado:'
                  : 'Valor:'}
            </span>
            <span className="font-bold text-slate-900 font-mono text-xs">
              R$ {formatMoney(amount)}
            </span>
          </div>
        )}

        {receivedAmount !== undefined && (
          <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60">
            <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Valor Recebido:
            </span>
            <span className="font-bold text-amber-900 font-mono text-xs">
              R$ {formatMoney(receivedAmount)}
            </span>
          </div>
        )}

        {/* Provedor de Pagamento */}
        {provider && (
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Provedor:
            </span>
            <span className="font-semibold text-slate-700">{formatProviderLabel(provider)}</span>
          </div>
        )}

        {/* Canal e Destino de Envio */}
        {channelInfo && (
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="text-slate-400 flex items-center gap-1">
              {ChannelIcon && <ChannelIcon className="w-3.5 h-3.5 text-slate-400" />}
              Canal:
            </span>
            <span className="font-semibold text-slate-700">
              {channelInfo.label}
              {destination ? ` (${destination})` : ''}
            </span>
          </div>
        )}

        {/* Motivo / Justificativa / Razão */}
        {reason && (
          <div className="p-2 rounded-lg bg-white/60 border border-slate-200/60 text-[11px] text-slate-700">
            <span className="font-semibold text-slate-500 block mb-0.5">Motivo:</span>
            <span className="italic">{reason}</span>
          </div>
        )}

        {/* Mensagem enviada */}
        {message && (
          <div className="p-2 rounded-lg bg-white/60 border border-slate-200/60 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-500 block mb-0.5">Mensagem:</span>
            <p className="line-clamp-3 hover:line-clamp-none transition-all">{message}</p>
          </div>
        )}

        {/* Origem / Source */}
        {source && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-slate-400">Origem da atualização:</span>
            <span className="font-mono text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">
              {source}
            </span>
          </div>
        )}

        {/* Datas adicionais */}
        {paidAt && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pago em:
            </span>
            <span className="font-medium text-slate-700">{formatDateTime(paidAt)}</span>
          </div>
        )}

        {canceledAt && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-slate-400 flex items-center gap-1">
              <Ban className="w-3 h-3 text-rose-500" /> Cancelado em:
            </span>
            <span className="font-medium text-slate-700">{formatDateTime(canceledAt)}</span>
          </div>
        )}

        {/* Dados extras chave-valor caso existam */}
        {extraKeys.length > 0 && (
          <div className="pt-2 border-t border-slate-200/50 space-y-1">
            {extraKeys.map((k) => (
              <div key={k} className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-slate-400 font-mono text-[10px]">{k}:</span>
                <span className="font-semibold truncate max-w-[180px]">
                  {typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const ChargeTimeline: React.FC<ChargeTimelineProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
        <History className="w-8 h-8 text-slate-300" />
        Nenhum evento registrado na linha do tempo.
      </div>
    )
  }

  return (
    <div className="relative pl-4">
      {/* linha vertical */}
      <div className="absolute left-[14px] top-2 bottom-2 w-px bg-slate-200" />

      <ol className="space-y-6">
        {entries.map((entry) => {
          const Icon = actionIcon[entry.action] || CircleDot
          const color = actionColor[entry.action] || 'bg-slate-100 text-slate-700 ring-slate-50'
          const label = auditActionLabels[entry.action] || entry.action

          const hasPrev = Boolean(
            entry.previous_data && Object.keys(entry.previous_data).length > 0,
          )
          const hasNew = Boolean(entry.new_data && Object.keys(entry.new_data).length > 0)

          return (
            <li key={entry.id} className="relative">
              <span
                className={`absolute -left-4 top-0.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>

              <div className="ml-7">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {formatDateTime(entry.created)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  {entry.user_name && (
                    <span>
                      por{' '}
                      <strong className="text-slate-700 font-semibold">{entry.user_name}</strong>
                    </span>
                  )}
                  {entry.ip_address && (
                    <span className="text-slate-400">IP: {entry.ip_address}</span>
                  )}
                  {entry.reference && (
                    <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      ref: {entry.reference}
                    </span>
                  )}
                </div>

                {(hasPrev || hasNew) && (
                  <div
                    className={`mt-3 grid gap-2.5 ${hasPrev && hasNew ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {hasPrev && (
                      <RenderDataBlock
                        title="Anterior"
                        data={entry.previous_data}
                        variant="previous"
                      />
                    )}
                    {hasNew && <RenderDataBlock title="Novo" data={entry.new_data} variant="new" />}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
