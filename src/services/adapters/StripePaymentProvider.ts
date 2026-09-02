import {
  PaymentProviderInterface,
  PaymentProviderSlug,
  PaymentProviderCapabilities,
  ChargeCreationResult,
  CreateChargeParams,
  IntegratedCardPaymentPayload,
  IntegratedPaymentResult,
  ProviderConnectionTestResult,
  ChargeStatus,
} from '@/types/payments'

/**
 * Adapter para Stripe encapsulando chamadas e regras específicas de negócio.
 */
export class StripePaymentProvider implements PaymentProviderInterface {
  readonly id: string = 'stripe'
  readonly name: string = 'Stripe'
  readonly slug: PaymentProviderSlug = 'stripe'

  readonly capabilities: PaymentProviderCapabilities = {
    pix: false,
    credit_card: true,
    debit_card: false,
    boleto: false,
    refund: true,
    installments: true,
    embedded_checkout: true,
  }

  mapStatus(stripeRawStatus: string): ChargeStatus {
    const s = String(stripeRawStatus || '').toLowerCase()
    switch (s) {
      case 'succeeded':
      case 'paid':
        return 'paid'
      case 'requires_action':
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'processing':
        return 'waiting_payment'
      case 'canceled':
        return 'canceled'
      case 'failed':
        return 'failed'
      case 'refunded':
        return 'refunded'
      default:
        return 'pending'
    }
  }

  async createCharge(params: CreateChargeParams): Promise<ChargeCreationResult> {
    const res = await fetch('/backend/v1/payments/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sale_id: params.saleId,
        payment_method: params.method,
        discount_amount: params.discountAmount || 0,
        installments: params.installments || 1,
        expires_at: params.expiresAt,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Não foi possível gerar cobrança via Stripe.')
    }
    const data = await res.json()
    return {
      chargeId: data.id,
      externalChargeId: data.external_charge_id,
      status: this.mapStatus(data.status),
      paymentUrl: data.payment_url,
      providerResponse: data,
    }
  }

  async createPayment(
    chargeId: string,
    payload: IntegratedCardPaymentPayload,
  ): Promise<IntegratedPaymentResult> {
    const res = await fetch(`/backend/v1/payments/charges/${chargeId}/process-integrated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Falha ao processar pagamento com cartão via Stripe.')
    }
    return {
      success: true,
      status: this.mapStatus(data.status),
      message: data.message || 'Pagamento confirmado com sucesso!',
      charge_id: chargeId,
      details: data.details,
    }
  }

  async getPaymentStatus(chargeId: string): Promise<ChargeStatus> {
    const res = await fetch(`/backend/v1/payments/charges/${chargeId}/verify`, { method: 'POST' })
    if (!res.ok) throw new Error('Falha ao verificar status na Stripe.')
    const data = await res.json()
    return this.mapStatus(data.status)
  }

  async cancelPayment(chargeId: string): Promise<boolean> {
    const res = await fetch(`/backend/v1/payments/charges/${chargeId}/cancel`, { method: 'PUT' })
    return res.ok
  }

  async refundPayment(chargeId: string, amount?: number, reason?: string): Promise<boolean> {
    const res = await fetch(`/backend/v1/payments/charges/${chargeId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    })
    return res.ok
  }

  async testConnection(): Promise<ProviderConnectionTestResult> {
    const res = await fetch('/backend/v1/payments/providers/stripe/test', { method: 'POST' })
    return res.json()
  }
}
