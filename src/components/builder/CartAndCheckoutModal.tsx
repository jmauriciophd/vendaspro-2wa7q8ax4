import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  FileText,
  CreditCard,
  Copy,
  ExternalLink,
  Loader2,
  User,
  MapPin,
  ArrowRight,
  Store,
} from 'lucide-react'
import type { Product, Customer } from '@/types/crm'
import type { CartItem, OrderCheckoutResponse } from '@/types/builder'
import { publicCatalogService } from '@/services/builder'
import { toast } from 'sonner'

interface CartAndCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onClearCart: () => void
  pageId: string
  pageTitle: string
  customers: Customer[]
  targetCustomer?: Customer | null
  sellerInfo?: any
}

type CheckoutStep = 'cart' | 'identification' | 'shipping' | 'payment' | 'confirmation'

export const CartAndCheckoutModal: React.FC<CartAndCheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  pageId,
  pageTitle,
  customers,
  targetCustomer,
  sellerInfo,
}) => {
  const [step, setStep] = useState<CheckoutStep>('cart')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    targetCustomer?.id || (customers.length > 0 ? customers[0].id : ''),
  )

  // Dados de Entrega
  const [address, setAddress] = useState(targetCustomer?.address || 'Av. Principal')
  const [number, setNumber] = useState('100')
  const [neighborhood, setNeighborhood] = useState('Centro')
  const [city, setCity] = useState(targetCustomer?.city || 'São Paulo')
  const [state, setState] = useState(targetCustomer?.state || 'SP')
  const [cep, setCep] = useState('01001-000')
  const [orderNotes, setOrderNotes] = useState('')

  // Método de Pagamento Real
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'credit_card'>('pix')
  const [installments, setInstallments] = useState(1)

  // Status de Submissão
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderCheckoutResponse | null>(null)
  const [isPixCopied, setIsPixCopied] = useState(false)

  // Cálculo total do carrinho
  const subtotal = cartItems.reduce((acc, it) => acc + it.subtotal, 0)
  const total = subtotal

  const handleNextStep = () => {
    if (step === 'cart') {
      if (cartItems.length === 0) {
        toast.error('O carrinho está vazio.')
        return
      }
      setStep('identification')
    } else if (step === 'identification') {
      if (!selectedCustomerId) {
        toast.error('Selecione ou identifique o cliente cadastrado para prosseguir.')
        return
      }
      setStep('shipping')
    } else if (step === 'shipping') {
      if (!address || !city || !state) {
        toast.error('Preencha os dados obrigatórios de entrega.')
        return
      }
      setStep('payment')
    }
  }

  const handleFinishOrder = async () => {
    if (!selectedCustomerId) {
      toast.error('Cliente não identificado.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        page_id: pageId,
        customer_id: selectedCustomerId,
        items: cartItems.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          unit_price: it.unitPrice,
        })),
        payment_method: paymentMethod,
        installments: installments,
        shipping_address: {
          address,
          number,
          neighborhood,
          city,
          state,
          cep,
          notes: orderNotes,
        },
        order_notes: orderNotes,
      }

      const res = await publicCatalogService.createOrder(payload)
      setOrderResult(res)
      setStep('confirmation')
      onClearCart()
      toast.success('🎉 Pedido realizado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao processar pedido: ' + (err?.message || 'Falha'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPix = () => {
    if (orderResult?.payment_charge?.pix_code) {
      navigator.clipboard.writeText(orderResult.payment_charge.pix_code)
      setIsPixCopied(true)
      toast.success('Código PIX Copia e Cola copiado!')
      setTimeout(() => setIsPixCopied(false), 3000)
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || targetCustomer

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            {step === 'cart' && 'Meu Pedido Comercial'}
            {step === 'identification' && 'Identificação do Cliente Cadastrado'}
            {step === 'shipping' && 'Endereço e Instruções de Faturamento/Entrega'}
            {step === 'payment' && 'Forma de Pagamento Oficial Mercado Pago'}
            {step === 'confirmation' && 'Pedido Confirmado!'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === 'confirmation'
              ? 'Seu pedido foi registrado diretamente no CRM com baixa atômica de estoque.'
              : 'Ambiente seguro e integrado com regras comerciais e faturamento oficial.'}
          </DialogDescription>
        </DialogHeader>

        {/* ---------------- 1. ETAPA: CARRINHO ---------------- */}
        {step === 'cart' && (
          <div className="flex-1 flex flex-col min-h-0 pt-2 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <ShoppingCart className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">Seu carrinho está vazio</p>
                <p className="text-xs text-slate-400 mt-1">
                  Adicione produtos da lista para iniciar seu pedido comercial.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={`https://img.usecurling.com/p/100/100?q=${encodeURIComponent(item.product.name)}`}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          R$ {Number(item.unitPrice).toFixed(2).replace('.', ',')} /{' '}
                          {item.product.unit || 'un'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800">
                          {item.quantity} {item.product.unit || 'un'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-xs font-black text-slate-900">
                          R$ {Number(item.subtotal).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, 0)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cartItems.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Itens Selecionados</span>
                  <span>{cartItems.reduce((acc, it) => acc + it.quantity, 0)} unidades</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total do Pedido</span>
                  <span className="text-lg text-indigo-600">
                    R$ {Number(total).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- 2. ETAPA: IDENTIFICAÇÃO (Login Obrigatório de Cliente) ---------------- */}
        {step === 'identification' && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
              <User className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-indigo-950">
                  Acesso Restrito a Clientes Identificados
                </h4>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Conforme a política comercial, o checkout não permite compras anônimas (guest).
                  Selecione seu cadastro para aplicar tabela e faturamento.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione o Cliente Cadastrado
              </Label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value)
                  const cust = customers.find((c) => c.id === e.target.value)
                  if (cust) {
                    if (cust.address) setAddress(cust.address)
                    if (cust.city) setCity(cust.city)
                    if (cust.state) setState(cust.state)
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-indigo-600"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.cnpj ? `(CNPJ/CPF: ${c.cnpj})` : ''} - {c.city || 'Sem cidade'}/
                    {c.state || ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h5 className="text-xs font-bold text-slate-800">Dados do Cliente Vinculado</h5>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <strong>Razão/Nome:</strong> {selectedCustomer.name}
                  </div>
                  <div>
                    <strong>Documento:</strong> {selectedCustomer.cnpj || 'Não informado'}
                  </div>
                  <div>
                    <strong>Telefone:</strong>{' '}
                    {selectedCustomer.phone || selectedCustomer.phone_whatsapp || 'Não informado'}
                  </div>
                  <div>
                    <strong>E-mail:</strong> {selectedCustomer.email || 'Não informado'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- 3. ETAPA: ENTREGA E OBSERVAÇÕES ---------------- */}
        {step === 'shipping' && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Endereço de Entrega</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Número</Label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Bairro</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">UF</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  className="text-xs mt-1 uppercase"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Instruções / Observações do Pedido</Label>
              <textarea
                rows={3}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: Entregar pela manhã na portaria de recebimento..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1 focus:outline-indigo-600"
              />
            </div>
          </div>
        )}

        {/* ---------------- 4. ETAPA: PAGAMENTO (MERCADO PAGO REAL) ---------------- */}
        {step === 'payment' && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <Label className="text-xs font-bold text-slate-800 block">
              Escolha a Forma de Pagamento
            </Label>

            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as any)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {/* Opção PIX */}
              <label
                htmlFor="method-pix"
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'pix'
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <RadioGroupItem value="pix" id="method-pix" />
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block">PIX Instantâneo</span>
                  <span className="text-[10px] text-slate-500">QR Code e Copia e Cola Oficial</span>
                </div>
              </label>

              {/* Opção Boleto */}
              <label
                htmlFor="method-boleto"
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'boleto'
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <RadioGroupItem value="boleto" id="method-boleto" />
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block">Boleto Bancário</span>
                  <span className="text-[10px] text-slate-500">Vencimento em até 3 dias</span>
                </div>
              </label>

              {/* Opção Cartão (Checkout Pro Oficial) */}
              <label
                htmlFor="method-card"
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'credit_card'
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <RadioGroupItem value="credit_card" id="method-card" />
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block">Cartão de Crédito</span>
                  <span className="text-[10px] text-slate-500">Checkout Seguro Mercado Pago</span>
                </div>
              </label>
            </RadioGroup>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Transação protegida com criptografia e validação direta de webhook.</span>
            </div>
          </div>
        )}

        {/* ---------------- 5. ETAPA: CONFIRMAÇÃO & DADOS DE PAGAMENTO ---------------- */}
        {step === 'confirmation' && orderResult && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-2 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Pedido {orderResult.sale.order_number} Confirmado!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Total do Pedido:{' '}
                <strong className="text-slate-900">
                  R$ {Number(orderResult.sale.total).toFixed(2).replace('.', ',')}
                </strong>
              </p>
            </div>

            {/* Dados PIX */}
            {orderResult.payment_charge?.pix_code && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                <span className="text-xs font-bold text-slate-800 block text-center">
                  Pagamento Instantâneo via PIX
                </span>

                {orderResult.payment_charge.pix_qrcode && (
                  <div className="flex justify-center my-2">
                    <img
                      src={
                        orderResult.payment_charge.pix_qrcode.startsWith('data:image/') ||
                        orderResult.payment_charge.pix_qrcode.startsWith('http://') ||
                        orderResult.payment_charge.pix_qrcode.startsWith('https://') ||
                        orderResult.payment_charge.pix_qrcode.startsWith('/')
                          ? orderResult.payment_charge.pix_qrcode
                          : `data:image/png;base64,${orderResult.payment_charge.pix_qrcode}`
                      }
                      alt="QR Code PIX"
                      className="w-44 h-44 border border-slate-200 rounded-xl bg-white p-2 shadow-xs object-contain"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Código PIX Copia e Cola:
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={orderResult.payment_charge.pix_code}
                      className="text-[11px] font-mono bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopyPix}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0"
                    >
                      {isPixCopied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Dados Boleto */}
            {orderResult.payment_charge?.boleto_url && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <FileText className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-xs text-slate-700 font-semibold">
                  Seu boleto bancário foi gerado com sucesso pelo Mercado Pago.
                </p>
                <Button
                  onClick={() => window.open(orderResult.payment_charge?.boleto_url, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Visualizar / Imprimir Boleto
                </Button>
              </div>
            )}

            {/* Link Cartão Mercado Pago */}
            {orderResult.payment_charge?.payment_url && paymentMethod === 'credit_card' && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
                <CreditCard className="w-8 h-8 text-indigo-600 mx-auto" />
                <p className="text-xs text-indigo-900 font-semibold">
                  Finalize o pagamento com cartão no ambiente seguro do Mercado Pago.
                </p>
                <Button
                  onClick={() => window.open(orderResult.payment_charge?.payment_url, '_blank')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Pagar com Cartão no Mercado Pago
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- BARRA INFERIOR DE NAVEGAÇÃO ENTRE PASSOS ---------------- */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
          {step !== 'confirmation' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                if (step === 'identification') setStep('cart')
                else if (step === 'shipping') setStep('identification')
                else if (step === 'payment') setStep('shipping')
                else onClose()
              }}
              className="text-xs"
            >
              {step === 'cart' ? 'Continuar Comprando' : 'Voltar'}
            </Button>
          )}

          {step === 'confirmation' && (
            <Button
              size="sm"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Concluir e Fechar
            </Button>
          )}

          {step !== 'confirmation' && step !== 'payment' && (
            <Button
              size="sm"
              disabled={cartItems.length === 0}
              onClick={handleNextStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <span>Avançar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}

          {step === 'payment' && (
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleFinishOrder}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando Pedido...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finalizar Pedido Oficial
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
