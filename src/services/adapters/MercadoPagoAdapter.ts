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
 * Adapter para Mercado Pago encapsulando chamadas e regras específicas de negócio.
 */
export class MercadoPagoAdapter implements PaymentProviderInterface {
  readonly id: string = 'mercadopago'
  readonly name: string = 'Mercado Pago'
  readonly slug: PaymentProviderSlug = 'mercadopago'

  readonly capabilities: PaymentProviderCapabilities = {
    pix: true,
    credit_card: true,
    debit_card: true,
    boleto: true,
    refund: true,
    installments: true,
    embedded_checkout: true,
  }

  mapStatus(mpRawStatus: string): ChargeStatus {
    const s = String(mpRawStatus || '').toLowerCase()
    switch (s) {
      case 'approved':
      case 'accredited':
        return 'paid'
      case 'in_process':
      case 'pending':
      case 'authorized':
        return 'waiting_payment'
      case 'rejected':
        return 'failed'
      case 'cancelled':
      case 'canceled':
        return 'canceled'
      case 'refunded':
        return 'refunded'
      case 'charged_back':
        return 'refunded'
      case 'in_mediation':
        return 'under_review'
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
      pixCode: data.pix_code,
      pixQrCodeBase64: data.pix_qrcode,
      boletoUrl: data.boleto_url,
      boletoBarcode: data.boleto_barcode,
      boletoDigitableLine: data.boleto_digitable_line,
      boletoNossoNumero: data.boleto_nosso_numero,
      boletoDocumentNumber: data.boleto_document_number,
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
      throw new Error(data?.message || 'Falha ao processar pagamento com cartão.')
    }
    return {
      success: true,
      status: this.mapStatus(data.status),
      message: data.message || 'Pagamento aprovado!',
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
      '/backend/v1/payments/providers/mercadopago/test',
      { method: 'POST' },
    )
  }
}
