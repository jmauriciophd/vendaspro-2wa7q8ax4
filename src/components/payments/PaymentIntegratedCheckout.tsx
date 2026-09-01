import React, { useEffect, useState, useRef } from 'react'
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Hash,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { paymentService, formatMoney } from '@/services/paymentService'
import type { PaymentChargeDetail } from '@/types/payments'

interface PaymentIntegratedCheckoutProps {
  charge: PaymentChargeDetail
  onPaymentSuccess?: () => void
}

declare global {
  interface Window {
    MercadoPago?: any
  }
}

/**
 * Componente oficial de Checkout Integrado (Bricks / Card Payment) do Mercado Pago.
 * Garante que o cliente NUNCA fique travado em tela cinza ou em loop de erros.
 * Renderiza o formulário direto e transparente, utilizando o SDK com tratamento
 * resiliente de falhas de rede / chaves sandbox.
 */
export const PaymentIntegratedCheckout: React.FC<PaymentIntegratedCheckoutProps> = ({
  charge,
  onPaymentSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [paidSuccess, setPaidSuccess] = useState(charge.status === 'paid')
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Campos do formulário integrado de cartão
  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState(charge.client_name || '')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [docType, setDocType] = useState('CPF')
  const [installments, setInstallments] = useState(charge.installments || 1)
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'elo' | 'amex' | 'generic'>(
    'generic',
  )

  const brickContainerRef = useRef<HTMLDivElement>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [brickRendered, setBrickRendered] = useState(false)
  const [brickFallbackNotice, setBrickFallbackNotice] = useState(false)
  const [cardUnavailable, setCardUnavailable] = useState(false)
  const brickAttemptedRef = useRef(false)

  // Detecta bandeira pelo prefixo do número do cartão
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16)
    // Formatação 0000 0000 0000 0000
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim()
    setCardNumber(formatted)

    if (raw.startsWith('4')) {
      setCardBrand('visa')
    } else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(raw)) {
      setCardBrand('mastercard')
    } else if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(raw)) {
      setCardBrand('elo')
    } else if (/^(34|37)/.test(raw)) {
      setCardBrand('amex')
    } else {
      setCardBrand('generic')
    }
  }

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`)
    } else {
      setExpiry(raw)
    }
  }

  const handleDocChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14)
    if (raw.length <= 11) {
      // CPF: 000.000.000-00
      setDocType('CPF')
      const formatted = raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      setDocNumber(formatted)
    } else {
      // CNPJ: 00.000.000/0000-00
      setDocType('CNPJ')
      const formatted = raw
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
      setDocNumber(formatted)
    }
  }

  // Carrega SDK Oficial do Mercado Pago de forma segura
  useEffect(() => {
    const publicKey = charge.provider_public_key
    if (!publicKey || publicKey.startsWith('DEMO') || publicKey.startsWith('demo')) {
      return
    }

    if (window.MercadoPago) {
      setSdkLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => {
      setSdkLoaded(true)
    }
    script.onerror = () => {
      console.warn('Falha ao carregar SDK Mercado Pago do CDN, usando formulário integrado seguro.')
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [charge.provider_public_key])

  // Inicializa Card Payment Brick UMA ÚNICA VEZ e com proteção total contra loops
  useEffect(() => {
    const publicKey = charge.provider_public_key
    if (!sdkLoaded || !publicKey || !window.MercadoPago || !brickContainerRef.current) return
    if (brickRendered || brickAttemptedRef.current) return

    brickAttemptedRef.current = true

    let brickController: any = null

    try {
      const mp = new window.MercadoPago(publicKey, {
        locale: 'pt-BR',
      })
      const bricksBuilder = mp.bricks()

      const renderCardPaymentBrick = async (bricksBuilderInstance: any) => {
        const settings = {
          initialization: {
            amount: charge.final_amount,
            payer: {
              email: 'cliente@vendaspro.com',
            },
          },
          customization: {
            visual: {
              style: {
                theme: 'default',
              },
            },
            paymentMethods: {
              maxInstallments: charge.installments || 12,
            },
          },
          callbacks: {
            onReady: () => {
              setBrickRendered(true)
            },
            onSubmit: async (cardFormData: any) => {
              setSubmitting(true)
              setPaymentError(null)
              try {
                const res = await paymentService.processIntegratedPayment(charge.id, {
                  token: cardFormData.token,
                  payment_method_id: cardFormData.payment_method_id,
                  installments: cardFormData.installments,
                  issuer_id: cardFormData.issuer_id,
                  payer: cardFormData.payer,
                })
                if (res.success || res.status === 'paid') {
                  setPaidSuccess(true)
                  toast.success('Pagamento com cartão aprovado!')
                  if (onPaymentSuccess) onPaymentSuccess()
                } else {
                  setPaymentError(res.message || 'Pagamento recusado.')
                  toast.error(res.message || 'Pagamento recusado.')
                }
              } catch (err: any) {
                const msg = err?.response?.message || err?.message || 'Erro ao processar pagamento.'
                setPaymentError(msg)
                toast.error(msg)
              } finally {
                setSubmitting(false)
              }
            },
            onError: (error: any) => {
              console.warn(
                'Mercado Pago Brick indisponível (usando formulário nativo embutido):',
                error,
              )
              // Em caso de erro na inicialização do Bricks (ex: 404 em payment_methods/search),
              // capturamos silenciosamente e liberamos imediatamente o formulário nativo
              setBrickRendered(false)
              setBrickFallbackNotice(true)
            },
          },
        }

        if (brickContainerRef.current) {
          brickContainerRef.current.innerHTML = ''
          try {
            brickController = await bricksBuilderInstance.create(
              'cardPayment',
              'cardPaymentBrick_container',
              settings,
            )
          } catch (createErr) {
            console.warn('Bricks.create falhou (fallback ativo para checkout nativo):', createErr)
            setBrickRendered(false)
            setBrickFallbackNotice(true)
          }
        }
      }

      renderCardPaymentBrick(bricksBuilder).catch((err) => {
        console.warn('Erro na promessa do Brick:', err)
        setBrickRendered(false)
        setBrickFallbackNotice(true)
      })
    } catch (e) {
      console.warn('Erro ao configurar instância do Mercado Pago:', e)
      setBrickRendered(false)
      setBrickFallbackNotice(true)
    }

    return () => {
      try {
        if (brickController && typeof brickController.unmount === 'function') {
          brickController.unmount()
        }
      } catch {
        /* intentionally ignored */
      }
    }
  }, [sdkLoaded, charge.id, charge.final_amount, charge.installments, charge.provider_public_key])

  // Submissão do Formulário Integrado Nativo
  const handleNativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError(null)

    const rawCard = cardNumber.replace(/\D/g, '')
    if (rawCard.length < 13) {
      toast.error('Informe um número de cartão de crédito válido.')
      return
    }

    if (!cardholderName.trim()) {
      toast.error('Informe o nome impresso no cartão.')
      return
    }

    const [expMonth, expYear] = expiry.split('/')
    if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
      toast.error('Informe a validade no formato MM/AA.')
      return
    }

    if (cvv.length < 3) {
      toast.error('Informe o código de segurança (CVV).')
      return
    }

    const rawDoc = docNumber.replace(/\D/g, '')
    if (rawDoc.length < 11) {
      toast.error('Informe o CPF/CNPJ do titular do cartão.')
      return
    }

    const isMpProvider =
      charge.provider_slug === 'mercadopago' ||
      (charge.provider_public_key &&
        (charge.provider_public_key.startsWith('TEST-') ||
          charge.provider_public_key.startsWith('APP_USR-')))

    setSubmitting(true)
    try {
      let cardToken = ''

      // Se o SDK do Mercado Pago estiver disponível, tenta gerar token oficial no browser
      if (window.MercadoPago && charge.provider_public_key) {
        try {
          const mp = new window.MercadoPago(charge.provider_public_key)
          const tokenRes = await mp.createCardToken({
            cardNumber: rawCard,
            cardholderName: cardholderName.trim(),
            cardExpirationMonth: expMonth,
            cardExpirationYear: '20' + expYear,
            securityCode: cvv,
            identification: {
              type: docType,
              number: rawDoc,
            },
          })
          if (tokenRes && tokenRes.id) {
            cardToken = tokenRes.id
          }
        } catch (tokErr) {
          console.warn('Geração de token de cartão no SDK falhou:', tokErr)
        }
      }

      // Se é Mercado Pago com chave configurada e não foi possível obter card_token_id válido
      if (isMpProvider && !cardToken) {
        setCardUnavailable(true)
        const unavailMsg =
          'Pagamento com cartão temporariamente indisponível pelo gateway. Por favor, use PIX ou boleto para pagar.'
        setPaymentError(unavailMsg)
        toast.error(unavailMsg)
        setSubmitting(false)
        return
      }

      if (!cardToken) {
        // Apenas para provedores simulados ou ambientes locais sem chave real
        cardToken = 'tok_' + Math.random().toString(36).substring(2, 15)
      }

      const res = await paymentService.processIntegratedPayment(charge.id, {
        token: cardToken,
        payment_method_id: cardBrand === 'generic' ? 'credit_card' : cardBrand,
        installments: Number(installments),
        payer: {
          email: 'cliente@vendaspro.com',
          identification: {
            type: docType,
            number: rawDoc,
          },
        },
      })

      if (res.success || res.status === 'paid') {
        setPaidSuccess(true)
        toast.success(res.message || 'Pagamento com cartão aprovado!')
        if (onPaymentSuccess) onPaymentSuccess()
      } else {
        const errorMsg = res.message || 'Pagamento recusado.'
        setPaymentError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      let msg = err?.response?.message || err?.message || 'Erro ao processar pagamento com cartão.'
      if (
        String(msg).toLowerCase().includes('card_token_id') ||
        String(msg).toLowerCase().includes('invalid card_token_id')
      ) {
        msg = 'Pagamento com cartão temporariamente indisponível. Por favor, utilize PIX ou boleto.'
        setCardUnavailable(true)
      }
      setPaymentError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (paidSuccess || charge.status === 'paid') {
    return (
      <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-emerald-950">Pagamento Confirmado!</h4>
        <p className="text-xs text-emerald-700 max-w-md mx-auto">
          O valor de <strong>R$ {formatMoney(charge.final_amount)}</strong> foi pago com sucesso
          através do Cartão de Crédito. O comprovante foi registrado no sistema.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header do Checkout Integrado */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Checkout Integrado Seguro
            </h4>
            <p className="text-[11px] text-slate-500">
              Pagamento processado na página sem redirecionamento externo
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL
        </span>
      </div>

      {paymentError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Não foi possível processar o pagamento</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{paymentError}</p>
          </div>
        </div>
      )}

      {/* Container para Mercado Pago Bricks oficial quando disponível */}
      <div id="cardPaymentBrick_container" ref={brickContainerRef} />

      {/* Aviso quando o pagamento com cartão estiver indisponível */}
      {cardUnavailable ? (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Cartão de Crédito Temporariamente Indisponível
              </h5>
              <p className="text-xs text-amber-800 mt-1">
                A validação com a operadora de cartão está temporariamente fora do ar. Você pode
                efetuar o pagamento imediatamente escolhendo <strong>PIX</strong> ou{' '}
                <strong>Boleto</strong>.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Aviso informativo amigável de fallback quando o Bricks avançado não inicializa */}
      {!brickRendered && brickFallbackNotice && !cardUnavailable && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800 animate-in fade-in">
          <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              Checkout transparente padrão ativo para recebimento seguro.
            </p>
          </div>
        </div>
      )}

      {/* Formulário Integrado Embutido (Renderização Garantida e Limpa) */}
      {!brickRendered && !cardUnavailable && (
        <form
          onSubmit={handleNativeSubmit}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
        >
          {/* Cartão Visual Preview */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 font-bold">
                Cartão de Crédito
              </span>
              <div className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-xs">
                {cardBrand}
              </div>
            </div>

            <div className="py-1">
              <p className="text-base sm:text-lg font-mono tracking-widest text-slate-100 font-semibold drop-shadow-xs">
                {cardNumber || '•••• •••• •••• ••••'}
              </p>
            </div>

            <div className="flex items-end justify-between text-[11px]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Titular
                </span>
                <span className="font-semibold uppercase tracking-wider text-slate-200 truncate max-w-[180px] block">
                  {cardholderName || 'NOME DO TITULAR'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Validade
                </span>
                <span className="font-mono font-semibold text-slate-200">{expiry || 'MM/AA'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Cartão *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="cc-number"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Impresso no Cartão *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="cc-name"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  placeholder="Como aparece no cartão"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none uppercase transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Validade (MM/AA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    value={expiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder="MM/AA"
                    maxLength={5}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código CVV *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF/CNPJ do Titular *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    inputMode="numeric"
                    value={docNumber}
                    onChange={(e) => handleDocChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opções de Parcelamento *
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                >
                  <option value={1}>1x de R$ {formatMoney(charge.final_amount)} (à vista)</option>
                  {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => {
                    const val = charge.final_amount / n
                    return (
                      <option key={n} value={n}>
                        {n}x de R$ {formatMoney(val)} sem juros
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando pagamento com segurança...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Pagar R$ {formatMoney(charge.final_amount)} com Cartão</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
