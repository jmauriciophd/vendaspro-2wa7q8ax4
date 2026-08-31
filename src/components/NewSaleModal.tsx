import React, { useState, useMemo, useEffect } from 'react'
import type { Customer, Product, User, PaymentMethod, PaymentStatus } from '@/types/crm'
import { saleService } from '@/services/crm'
import { toast } from 'sonner'
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User as UserIcon,
  Store,
  Calendar,
  CreditCard,
} from 'lucide-react'

interface NewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  customers: Customer[]
  products: Product[]
  users: User[]
  currentUserId?: string
  onSaleCreated: () => void
}

interface SaleItemDraft {
  productId: string
  quantity: number
  unitPrice: number
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  users,
  currentUserId,
  onSaleCreated,
}) => {
  // Step state (1: Client/Date, 2: Items, 3: Payment)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Info
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [sellerId, setSellerId] = useState(currentUserId || users[0]?.id || '')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])

  // Step 2: Items
  const [items, setItems] = useState<SaleItemDraft[]>([
    {
      productId: '',
      quantity: 1,
      unitPrice: 0,
    },
  ])

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pago')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset/reinitialize state whenever modal opens or reference data changes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setCustomerId(customers[0]?.id || '')
      setSellerId(currentUserId || users[0]?.id || '')
      setSaleDate(new Date().toISOString().split('T')[0])
      setPaymentMethod('pix')
      setPaymentStatus('pago')
      setNotes('')
      setErrors({})
      setItems([
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
        },
      ])
    }
  }, [isOpen, customers, users, currentUserId])

  // Calculate total automatically (only for items with valid productId)
  const totalAmount = useMemo(() => {
    return items.reduce((acc, curr) => {
      if (!curr.productId) return acc
      return acc + (curr.quantity || 0) * (curr.unitPrice || 0)
    }, 0)
  }, [items])

  if (!isOpen) return null

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId)
    const newItems = [...items]
    newItems[index] = {
      productId: newProductId,
      quantity: newItems[index]?.quantity > 0 ? newItems[index].quantity : 1,
      unitPrice: selectedProd ? selectedProd.price : 0,
    }
    setItems(newItems)
    if (errors.items) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.items
        return next
      })
    }
  }

  const handleQtyChange = (index: number, qty: number) => {
    const newItems = [...items]
    newItems[index].quantity = qty < 1 ? 1 : qty
    setItems(newItems)
  }

  const handlePriceChange = (index: number, price: number) => {
    const newItems = [...items]
    newItems[index].unitPrice = price < 0 ? 0 : price
    setItems(newItems)
  }

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      toast.warning('A venda deve conter pelo menos 1 item')
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const validateStep1 = () => {
    const errs: { [key: string]: string } = {}
    if (!customerId) errs.customer = 'Selecione um cliente / mercadinho'
    if (!sellerId) errs.seller = 'Selecione o vendedor responsável'
    if (!saleDate) errs.saleDate = 'Informe a data da venda'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: { [key: string]: string } = {}
    if (items.length === 0) {
      errs.items = 'Adicione ao menos um produto'
    } else {
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (!it.productId || it.productId.trim() === '') {
          errs.items = 'Selecione um produto em todas as linhas'
          break
        }
        if (!it.quantity || it.quantity <= 0) {
          errs.items = `Linha ${i + 1}: Informe uma quantidade válida maior que 0`
          break
        }
        if (it.unitPrice < 0) {
          errs.items = `Linha ${i + 1}: Preço unitário não pode ser negativo`
          break
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2)
    } else if (step === 2) {
      if (validateStep2()) setStep(3)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return

    setIsSubmitting(true)
    try {
      const salePayload = {
        customer: customerId,
        seller: sellerId || undefined,
        sale_date: `${saleDate} 12:00:00.000Z`,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || undefined,
      }

      const itemsPayload = items.map((it) => ({
        product: it.productId,
        quantity: Number(it.quantity),
        unit_price: Number(it.unitPrice),
      }))

      await saleService.createWithItems(salePayload, itemsPayload)

      toast.success('Venda registrada com sucesso!')
      onSaleCreated()
      onClose()
      // Reset
      setStep(1)
      setItems([{ productId: '', quantity: 1, unitPrice: 0 }])
      setNotes('')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao registrar venda')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Nova Venda / Pedido</h3>
              <p className="text-xs text-slate-500">
                Passo {step} de 3:{' '}
                {step === 1
                  ? 'Cliente e Vendedor'
                  : step === 2
                    ? 'Itens do Pedido'
                    : 'Forma de Pagamento'}
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

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-white text-xs font-semibold">
          <div
            className={`py-2.5 px-4 text-center border-b-2 transition-colors ${
              step === 1
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-400'
            }`}
          >
            1. Dados Gerais
          </div>
          <div
            className={`py-2.5 px-4 text-center border-b-2 transition-colors ${
              step === 2
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-400'
            }`}
          >
            2. Itens & Produtos
          </div>
          <div
            className={`py-2.5 px-4 text-center border-b-2 transition-colors ${
              step === 3
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-400'
            }`}
          >
            3. Pagamento
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mercadinho / Cliente *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                    errors.customer
                      ? 'border-red-500 ring-2 ring-red-100'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                >
                  <option value="">Selecione o mercadinho comprador...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}/{c.state || 'SP'})
                    </option>
                  ))}
                </select>
                {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendedor Responsável *
                  </label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Venda / Faturamento *
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Produtos Adicionados ({items.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Selecione o produto, informe quantidade e confirme o valor unitário
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Item</span>
                </button>
              </div>

              {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const lineTotal = item.productId
                    ? (item.quantity || 0) * (item.unitPrice || 0)
                    : 0

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Produto
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg outline-none ${
                            !item.productId && errors.items
                              ? 'border-red-500 ring-1 ring-red-200'
                              : 'border-slate-200 focus:border-indigo-600'
                          }`}
                        >
                          <option value="">Selecione um produto...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit || 'un'}) - R$ {p.price?.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Qtd
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Preço Un. (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-right">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Subtotal
                        </label>
                        <div className="text-xs font-bold text-slate-800 pt-1">
                          R$ {lineTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="boleto">Boleto Bancário (Faturado)</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status do Pagamento *
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  >
                    <option value="pago">Pago (Confirmado)</option>
                    <option value="pendente">Pendente / A Faturar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações da Entrega ou Faturamento
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Instruções para entrega matutina, notas fiscais, canhoto..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

              {/* Order Summary box */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <h5 className="text-xs font-bold text-indigo-950 mb-2">Resumo da Venda</h5>
                <div className="text-xs text-indigo-900/80 space-y-1">
                  <p>
                    • Mercadinho:{' '}
                    <strong>{customers.find((c) => c.id === customerId)?.name || 'Cliente'}</strong>
                  </p>
                  <p>
                    • Total de itens:{' '}
                    <strong>{items.reduce((acc, i) => acc + (i.quantity || 0), 0)} unidades</strong>{' '}
                    ({items.length} produtos)
                  </p>
                  <p>
                    • Forma: <strong>{paymentMethod.toUpperCase()}</strong> (
                    {paymentStatus === 'pago' ? 'Já pago' : 'Pendente'})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Total and Steps Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
              Total Calculado
            </span>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Concluir Venda</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
