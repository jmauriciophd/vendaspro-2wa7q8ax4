import pb from '@/lib/pocketbase/client'
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
      return await pb.send<PaymentRouterConfigResponse>('/backend/v1/payments/routing', {
        method: 'GET',
      })
    } catch {
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
  }

  async updateRoutingConfig(
    routes: Partial<PaymentRouterRoutes>,
  ): Promise<{ success: boolean; routes: PaymentRouterRoutes }> {
    return await pb.send<{ success: boolean; routes: PaymentRouterRoutes }>(
      '/backend/v1/payments/routing',
      {
        method: 'POST',
        body: { routes },
      },
    )
  }

  async resolveGatewayForMethod(method: PaymentMethod): Promise<PaymentProviderSlug | string> {
    const config = await this.getRoutingConfig()
    return config.routes[method] || 'mercadopago'
  }
}

export const paymentRouter = new PaymentRouter()
