import { PaymentProviderInterface, PaymentProviderSlug } from '@/types/payments'
import { MercadoPagoAdapter } from './adapters/MercadoPagoAdapter'
import { StripePaymentProvider } from './adapters/StripePaymentProvider'

/**
 * Factory para instanciar adapters com base no slug do gateway.
 */
class PaymentProviderFactory {
  private instances = new Map<string, PaymentProviderInterface>()

  constructor() {
    this.instances.set('mercadopago', new MercadoPagoAdapter())
    this.instances.set('stripe', new StripePaymentProvider())
  }

  public getProvider(slug: PaymentProviderSlug | string): PaymentProviderInterface {
    const key = (slug || 'mercadopago').toLowerCase()
    const instance = this.instances.get(key)
    if (instance) {
      return instance
    }
    // Fallback gracioso para MercadoPagoAdapter
    return this.instances.get('mercadopago')!
  }

  public registerCustomAdapter(slug: string, adapter: PaymentProviderInterface) {
    this.instances.set(slug.toLowerCase(), adapter)
  }
}

export const paymentProviderFactory = new PaymentProviderFactory()
