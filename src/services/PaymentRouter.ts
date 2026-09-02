import {
  PaymentMethod,
  PaymentProviderSlug,
  PaymentRouterRoutes,
  PaymentRouterConfigResponse,
} from '@/types/payments'

/**
 * PaymentRouter - Roteador inteligente que decide qual Gateway utilizar para cada método de pagamento.
 */
class PaymentRouter {
  private defaultRoutes: PaymentRouterRoutes = {
    pix: 'mercadopago',
    credit_card: 'mercadopago',
    debit_card: 'mercadopago',
    boleto: 'mercadopago',
    link: 'mercadopago',
  }

  async getRoutingConfig(): Promise<PaymentRouterConfigResponse> {
    try {
      const res = await fetch('/backend/v1/payments/routing')
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // noop
    }
    return {
      routes: this.defaultRoutes,
      available_gateways: [
        {
          id: 'mp',
          name: 'Mercado Pago',
          slug: 'mercadopago',
          methods: ['pix', 'credit_card', 'debit_card', 'boleto', 'link'],
        },
        { id: 'st', name: 'Stripe', slug: 'stripe', methods: ['credit_card'] },
      ],
    }
  }

  async updateRoutingConfig(
    routes: Partial<PaymentRouterRoutes>,
  ): Promise<{ success: boolean; routes: PaymentRouterRoutes }> {
    const res = await fetch('/backend/v1/payments/routing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    if (!res.ok) {
      throw new Error('Falha ao atualizar rotas de pagamento.')
    }
    return res.json()
  }

  async resolveGatewayForMethod(method: PaymentMethod): Promise<PaymentProviderSlug | string> {
    const config = await this.getRoutingConfig()
    return config.routes[method] || 'mercadopago'
  }
}

export const paymentRouter = new PaymentRouter()
