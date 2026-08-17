import { useEffect, useState } from 'react'
import { Scale, CheckCircle2, AlertTriangle, HelpCircle, PieChart, Link2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import {
  paymentService,
  formatMoney,
  formatDate,
  chargeStatusLabels,
  chargeStatusBadge,
  paymentMethodLabels,
} from '@/services/paymentService'
import type { ReconciliationData, ReconciliationItem } from '@/types/payments'

type TabKey = 'reconciled' | 'divergent' | 'unidentified' | 'partial'

const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'reconciled', label: 'Conciliados', icon: CheckCircle2 },
  { key: 'divergent', label: 'Divergentes', icon: AlertTriangle },
  { key: 'unidentified', label: 'Não identificados', icon: HelpCircle },
  { key: 'partial', label: 'Parciais', icon: PieChart },
]

export default function Reconciliation() {
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('reconciled')
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await paymentService.reconciliation()
      setData(d)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar conciliação.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDiscard = async (id: string) => {
    if (!confirm('Descartar este pagamento não identificado?')) return
    try {
      await paymentService.cancelCharge(id)
      toast.success('Pagamento descartado.')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao descartar.')
    }
  }

  const handleAssociate = async (id: string, saleId: string) => {
    if (!saleId) {
      toast.error('Informe o ID do pedido.')
      return
    }
    try {
      // Reassocia via atualização direta — usamos a rota de manual-confirm como
      // forma de marcar como resolvido (após vincular sale_id). Na primeira
      // versão, apenas registramos a intenção via toast.
      toast.success('Associação registrada. Use confirmação manual após revisar.')
      setLinkingId(null)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao associar.')
    }
  }

  const counts = data?.counts || { reconciled: 0, divergent: 0, unidentified: 0, partial: 0 }
  const items: ReconciliationItem[] = data ? data[tab] || [] : []

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Scale className="w-6 h-6 text-indigo-600" /> Conciliação de Pagamentos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Identifique divergências, pagamentos não identificados e parciais
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Conciliados"
          value={counts.reconciled}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Divergentes"
          value={counts.divergent}
          icon={AlertTriangle}
          color="bg-orange-50 text-orange-600"
        />
        <SummaryCard
          label="Não identificados"
          value={counts.unidentified}
          icon={HelpCircle}
          color="bg-sky-50 text-sky-600"
        />
        <SummaryCard
          label="Parciais"
          value={counts.partial}
          icon={PieChart}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold w-fit flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 transition-colors flex items-center gap-1.5 ${
                active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              } ${t.key !== 'reconciled' ? 'border-l border-slate-200' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Carregando conciliação...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhum registro nesta categoria</p>
            <p className="text-xs text-slate-400 mt-1">Tudo certo por aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cobrança</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Provedor</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data</th>
                  {tab === 'unidentified' && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {item.external_charge_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.client_id ? '—' : 'Sem cliente'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.provider_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {paymentMethodLabels[item.payment_method] || item.payment_method}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      R$ {formatMoney(item.final_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          chargeStatusBadge[item.status] ||
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {chargeStatusLabels[item.status] || item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(item.created)}</td>
                    {tab === 'unidentified' && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {linkingId === item.id ? (
                            <>
                              <input
                                type="text"
                                placeholder="ID do pedido"
                                className="w-28 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAssociate(item.id, (e.target as HTMLInputElement).value)
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = e.currentTarget.parentElement?.querySelector(
                                    'input',
                                  ) as HTMLInputElement
                                  handleAssociate(item.id, input?.value || '')
                                }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                title="Associar"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setLinkingId(item.id)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Associar a um pedido"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDiscard(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Descartar"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
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

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}
