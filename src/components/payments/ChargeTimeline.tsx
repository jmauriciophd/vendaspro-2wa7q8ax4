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
} from 'lucide-react'
import type { ChargeAuditEntry } from '@/types/payments'
import { auditActionLabels, formatDateTime } from '@/services/paymentService'

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
  charge_created: 'bg-indigo-100 text-indigo-700',
  link_sent: 'bg-sky-100 text-sky-700',
  webhook_received: 'bg-violet-100 text-violet-700',
  status_updated: 'bg-slate-100 text-slate-700',
  payment_confirmed: 'bg-emerald-100 text-emerald-700',
  payment_divergent: 'bg-orange-100 text-orange-700',
  charge_canceled: 'bg-rose-100 text-rose-700',
  refund: 'bg-violet-100 text-violet-700',
  manual_change: 'bg-amber-100 text-amber-700',
  reconciliation: 'bg-teal-100 text-teal-700',
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

      <ol className="space-y-5">
        {entries.map((entry, idx) => {
          const Icon = actionIcon[entry.action] || CircleDot
          const color = actionColor[entry.action] || 'bg-slate-100 text-slate-700'
          const label = auditActionLabels[entry.action] || entry.action
          return (
            <li key={entry.id} className="relative">
              <span
                className={`absolute -left-4 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>

              <div className="ml-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(entry.created)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  {entry.user_name && (
                    <span>
                      por <strong className="text-slate-700">{entry.user_name}</strong>
                    </span>
                  )}
                  {entry.ip_address && <span>IP: {entry.ip_address}</span>}
                  {entry.reference && <span className="font-mono">ref: {entry.reference}</span>}
                </div>

                {(Object.keys(entry.previous_data || {}).length > 0 ||
                  Object.keys(entry.new_data || {}).length > 0) && (
                  <div className="mt-2 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.keys(entry.previous_data || {}).length > 0 && (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Anterior
                        </p>
                        <pre className="whitespace-pre-wrap break-words text-slate-600 font-mono">
                          {JSON.stringify(entry.previous_data, null, 0)}
                        </pre>
                      </div>
                    )}
                    {Object.keys(entry.new_data || {}).length > 0 && (
                      <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                        <p className="font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                          Novo
                        </p>
                        <pre className="whitespace-pre-wrap break-words text-slate-700 font-mono">
                          {JSON.stringify(entry.new_data, null, 0)}
                        </pre>
                      </div>
                    )}
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
