import React, { useEffect, useState } from 'react'
import type { Sale, SaleItem } from '@/types/crm'
import { saleService } from '@/services/crm'
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Store,
  User as UserIcon,
  CreditCard,
  ShoppingBag,
} from 'lucide-react'

interface ViewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  saleId: string | null
}

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({ isOpen, onClose, saleId }) => {
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && saleId) {
      setLoading(true)
      saleService
        .getById(saleId)
        .then((res) => {
          setSale(res.sale)
          setItems(res.items)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, saleId])

  if (!isOpen || !saleId) return null

  const paymentMethodLabel: any = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto Bancário',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Detalhes da Venda</h3>
              <p className="text-xs text-slate-500">Comprovante de faturamento comercial</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading || !sale ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Carregando dados da venda...
            </div>
          ) : (
            <>
              {/* Top Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Mercadinho
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{sale.expand?.customer?.name || 'Mercadinho'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sale.expand?.customer?.city || ''}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data da Venda
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {new Date(sale.sale_date || sale.created).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vendedor: {sale.expand?.seller?.name || 'Vendedor'}
                  </p>
                </div>
              </div>

              {/* Status and Payment */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Forma de Pagamento:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentMethodLabel[sale.payment_method] || sale.payment_method}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block text-right">Status:</span>
                  {sale.payment_status === 'pago' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Pago
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" /> Pendente
                    </span>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Itens Faturados ({items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item / Produto</th>
                        <th className="py-2.5 px-3 text-center">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Preço Un.</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const lineTotal = item.quantity * item.unit_price
                        return (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.expand?.product?.name || 'Produto'}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {item.quantity} {item.expand?.product?.unit || 'un'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              R$ {item.unit_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              R$ {lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {sale.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Observações: </span>
                  {sale.notes}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Grand Total */}
        {sale && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Valor Total do Pedido
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              R$ {sale.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
