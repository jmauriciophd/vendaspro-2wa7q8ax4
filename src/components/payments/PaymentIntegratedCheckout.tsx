import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CreditCard,
  QrCode,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { paymentService, formatMoney } from '@/services/paymentService'
import { StripeCardCheckout } from './providers/StripeCardCheckout'
import { ProviderPixCheckout } from './providers/ProviderPixCheckout'
import { BoletoView } from './BoletoView'

interface PaymentIntegratedCheckoutProps {
  charge?: any
  chargeId?: string
  amount?: number
  customerEmail?: string
  customerName?: string
  customerDoc?: string
  installments?: number
  defaultMethod?: 'pix' | 'credit_card' | 'boleto'
  onPaymentSuccess?: (result?: any) => void
  onPaymentError?: (error: string) => void
}

export const PaymentIntegratedCheckout: React.FC<PaymentIntegratedCheckoutProps> = ({
  charge,
  chargeId: propChargeId,
  amount: propAmount,
  customerEmail: propCustomerEmail = '',
  customerName: propCustomerName = '',
  customerDoc = '',
  installments = 1,
  defaultMethod = 'credit_card',
  onPaymentSuccess,
  onPaymentError,
}) => {
  const chargeId = propChargeId || charge?.id || ''
  const amount = propAmount ?? charge?.final_amount ?? 0
  const customerEmail = propCustomerEmail || charge?.customer_email || ''
  const customerName = propCustomerName || charge?.client_name || ''
  const [activeTab, setActiveTab] = useState<'pix' | 'credit_card' | 'boleto'>(defaultMethod)
  const [loadingCharge, setLoadingCharge] = useState(true)
  const [chargeData, setChargeData] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // Mercado Pago Bricks state
  const [mpCardNumber, setMpCardNumber] = useState('')
  const [mpHolderName, setMpHolderName] = useState(customerName)
  const [mpExpiry, setMpExpiry] = useState('')
  const [mpCvv, setMpCvv] = useState('')
  const [mpCpf, setMpCpf] = useState(customerDoc)
  const [mpInstallments, setMpInstallments] = useState(installments)

  // Se o componente já recebeu o objeto `charge` completo, aproveita diretamente sem refazer request
  useEffect(() => {
    if (charge) {
      setChargeData(charge)
      setPaymentStatus(charge.status)
      setLoadingCharge(false)
      if (
        charge.payment_method === 'pix' ||
        charge.payment_method === 'boleto' ||
        charge.payment_method === 'credit_card'
      ) {
        setActiveTab(charge.payment_method as any)
      }
      return
    }

    if (!chargeId) {
      setLoadingCharge(false)
      return
    }

    let mounted = true
    const loadCharge = async () => {
      try {
        setLoadingCharge(true)
        const data = await paymentService.getCharge(chargeId)
        if (mounted) {
          setChargeData(data)
          setPaymentStatus(data.status)
          if (
            data.payment_method === 'pix' ||
            data.payment_method === 'boleto' ||
            data.payment_method === 'credit_card'
          ) {
            setActiveTab(data.payment_method as any)
          }
        }
      } catch (err: any) {
        if (mounted) {
          setFeedback({ type: 'error', text: 'Não foi possível carregar os detalhes da cobrança.' })
        }
      } finally {
        if (mounted) setLoadingCharge(false)
      }
    }
    loadCharge()
    return () => {
      mounted = false
    }
  }, [chargeId, charge])

  const providerSlug = (chargeData?.provider_slug || 'mercadopago').toLowerCase()
  const isStripe = providerSlug === 'stripe'

  const handleMpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setIsProcessing(true)

    try {
      const res = await paymentService.processIntegratedPayment(chargeId, {
        token: 'tok_mp_simulated_' + Math.random().toString(36).substring(2, 8),
        payment_method_id: 'master',
        installments: mpInstallments,
        payer: {
          email: customerEmail || 'cliente@vendaspro.com',
          identification: {
            type: 'CPF',
            number: mpCpf.replace(/\D/g, ''),
          },
        },
      })

      if (res.success && res.status === 'paid') {
        setPaymentStatus('paid')
        setFeedback({ type: 'success', text: 'Pagamento aprovado com sucesso!' })
        if (onPaymentSuccess) onPaymentSuccess(res)
      } else {
        setPaymentStatus(res.status)
        setFeedback({ type: 'info', text: res.message || 'Pagamento recebido e em processamento.' })
      }
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível processar o pagamento com cartão.'
      setFeedback({ type: 'error', text: msg })
      if (onPaymentError) onPaymentError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loadingCharge) {
    return (
      <Card className="w-full max-w-lg mx-auto border-gray-200 shadow-md">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600">Preparando checkout seguro...</p>
        </CardContent>
      </Card>
    )
  }

  if (paymentStatus === 'paid') {
    return (
      <Card className="w-full max-w-lg mx-auto border-emerald-200 bg-emerald-50/40 shadow-md">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Pagamento Aprovado!</h2>
          <p className="text-sm text-gray-600 mb-6">
            O valor de <strong>{formatMoney(amount)}</strong> foi confirmado com sucesso.
          </p>
          <div className="bg-white border border-emerald-200 rounded-lg p-4 text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Código da Cobrança:</span>
              <span className="font-mono font-semibold">
                {chargeData?.external_charge_id || chargeId}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data da Confirmação:</span>
              <span className="font-semibold">{new Date().toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-gray-200 shadow-md">
      <CardHeader className="border-b bg-gray-50/60 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">Checkout Seguro</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cobrança{' '}
              <span className="font-mono font-medium text-gray-800">
                #{chargeData?.external_charge_id || chargeId}
              </span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Valor Total</span>
            <div className="text-xl font-extrabold text-indigo-600">{formatMoney(amount)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {feedback && (
          <Alert
            variant={feedback.type === 'error' ? 'destructive' : 'default'}
            className={`mb-4 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : ''}`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <AlertDescription className="text-xs">{feedback.text}</AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="pix" className="text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="credit_card" className="text-xs flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Cartão
            </TabsTrigger>
            <TabsTrigger value="boleto" className="text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Boleto
            </TabsTrigger>
          </TabsList>

          {/* ABA PIX */}
          <TabsContent value="pix">
            <ProviderPixCheckout
              chargeId={chargeId}
              pixCode={chargeData?.pix_code}
              pixQrCodeBase64={chargeData?.pix_qrcode}
              amount={amount}
              providerName={chargeData?.provider_name || 'PIX'}
            />
          </TabsContent>

          {/* ABA CARTÃO */}
          <TabsContent value="credit_card">
            {isStripe ? (
              <StripeCardCheckout
                chargeId={chargeId}
                amount={amount}
                clientEmail={customerEmail}
                clientName={customerName}
                isTestingMode={chargeData?.provider_environment === 'sandbox'}
                onSuccess={(res) => {
                  setPaymentStatus('paid')
                  setFeedback({ type: 'success', text: 'Pagamento Stripe aprovado!' })
                  if (onPaymentSuccess) onPaymentSuccess(res)
                }}
                onError={(err) => {
                  setFeedback({ type: 'error', text: err })
                  if (onPaymentError) onPaymentError(err)
                }}
              />
            ) : (
              <form onSubmit={handleMpSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={mpCardNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
                      setMpCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '))
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Nome impresso no Cartão
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    value={mpHolderName}
                    onChange={(e) => setMpHolderName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-md text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Validade (MM/AA)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/AA"
                      value={mpExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setMpExpiry(
                          digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits,
                        )
                      }}
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={mpCvv}
                      onChange={(e) => setMpCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      CPF do Titular
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={mpCpf}
                      onChange={(e) => setMpCpf(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Parcelas</label>
                    <select
                      value={mpInstallments}
                      onChange={(e) => setMpInstallments(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={1}>1x de {formatMoney(amount)}</option>
                      <option value={2}>2x de {formatMoney(amount / 2)}</option>
                      <option value={3}>3x de {formatMoney(amount / 3)}</option>
                      <option value={6}>6x de {formatMoney(amount / 6)}</option>
                      <option value={12}>12x de {formatMoney(amount / 12)}</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 mt-2"
                >
                  {isProcessing ? 'Processando...' : `Confirmar Pagamento (${formatMoney(amount)})`}
                </Button>
              </form>
            )}
          </TabsContent>

          {/* ABA BOLETO */}
          <TabsContent value="boleto">
            {chargeData?.boleto_url || chargeData?.boleto_digitable_line ? (
              <BoletoView
                charge={
                  {
                    id: chargeData.id,
                    external_charge_id: chargeData.external_charge_id,
                    final_amount: chargeData.final_amount,
                    expires_at: chargeData.expires_at,
                    boleto_barcode: chargeData.boleto_barcode,
                    boleto_digitable_line: chargeData.boleto_digitable_line,
                    boleto_url: chargeData.boleto_url,
                    boleto_document_number: chargeData.boleto_document_number,
                    client_name: chargeData.client_name || customerName,
                  } as any
                }
              />
            ) : (
              <div className="text-center py-6 bg-gray-50 border rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Boleto gerado para este pedido</p>
                <p className="text-xs text-gray-500 mt-1">
                  O código de barras será processado após a confirmação.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
