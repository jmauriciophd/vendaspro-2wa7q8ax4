import pb from '@/lib/pocketbase/client'
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
    const data = await pb.send<any>('/backend/v1/payments/charges', {
      method: 'POST',
      body: {
        sale_id: params.saleId,
        payment_method: params.method,
        discount_amount: params.discountAmount || 0,
        installments: params.installments || 1,
        expires_at: params.expiresAt,
      },
    })
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
    const data = await pb.send<any>(`/backend/v1/payments/charges/${chargeId}/process-integrated`, {
      method: 'POST',
      body: payload,
    })
    if (!data || data.success === false) {
      throw new Error(data?.message || 'Falha ao processar pagamento com cartão via Stripe.')
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
    const data = await pb.send<any>(`/backend/v1/payments/charges/${chargeId}/verify`, {
      method: 'POST',
    })
    return this.mapStatus(data.status)
  }

  async cancelPayment(chargeId: string): Promise<boolean> {
    try {
      await pb.send(`/backend/v1/payments/charges/${chargeId}/cancel`, { method: 'PUT' })
      return true
    } catch {
      return false
    }
  }

  async refundPayment(chargeId: string, amount?: number, reason?: string): Promise<boolean> {
    try {
      await pb.send(`/backend/v1/payments/charges/${chargeId}/refund`, {
        method: 'POST',
        body: { amount, reason },
      })
      return true
    } catch {
      return false
    }
  }

  async testConnection(): Promise<ProviderConnectionTestResult> {
    return await pb.send<ProviderConnectionTestResult>(
      '/backend/v1/payments/providers/stripe/test',
      { method: 'POST' },
    )
  }
}
