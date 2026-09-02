import { PaymentProviderSlug, PaymentProviderCapabilities } from '@/types/payments'

export interface ProviderMeta {
  id: PaymentProviderSlug | string
  name: string
  slug: PaymentProviderSlug | string
  description: string
  logo?: string
  capabilities: PaymentProviderCapabilities
  supportsTokens: boolean
  docsUrl: string
}

class PaymentProviderRegistry {
  private providers = new Map<string, ProviderMeta>()

  constructor() {
    this.registerDefaults()
  }

  private registerDefaults() {
    this.register({
      id: 'mercadopago',
      name: 'Mercado Pago',
      slug: 'mercadopago',
      description:
        'Líder em pagamentos na América Latina. Suporte a PIX com QR Code dinâmico, Boleto e Cartão de Crédito/Débito.',
      capabilities: {
        pix: true,
        credit_card: true,
        debit_card: true,
        boleto: true,
        refund: true,
        installments: true,
        embedded_checkout: true,
      },
      supportsTokens: true,
      docsUrl: 'https://www.mercadopago.com.br/developers',
    })

    this.register({
      id: 'stripe',
      name: 'Stripe',
      slug: 'stripe',
      description:
        'Infraestrutura financeira global. Suporte avançado a cartões internacionais e multi-moeda.',
      capabilities: {
        pix: false,
        credit_card: true,
        debit_card: false,
        boleto: false,
        refund: true,
        installments: true,
        embedded_checkout: true,
      },
      supportsTokens: true,
      docsUrl: 'https://stripe.com/docs',
    })

    this.register({
      id: 'asaas',
      name: 'Asaas',
      slug: 'asaas',
      description:
        'Gateway especializado em cobranças recorrentes, PIX e emissão de boletos com régua de cobrança.',
      capabilities: {
        pix: true,
        credit_card: true,
        debit_card: false,
        boleto: true,
        refund: true,
        installments: true,
        embedded_checkout: false,
      },
      supportsTokens: false,
      docsUrl: 'https://docs.asaas.com',
    })

    this.register({
      id: 'pagbank',
      name: 'PagBank (PagSeguro)',
      slug: 'pagbank',
      description: 'Ecossistema completo de pagamentos com ampla aceitação de bandeiras nacionais.',
      capabilities: {
        pix: true,
        credit_card: true,
        debit_card: true,
        boleto: true,
        refund: true,
        installments: true,
        embedded_checkout: false,
      },
      supportsTokens: false,
      docsUrl: 'https://dev.pagbank.uol.com.br',
    })
  }

  public register(meta: ProviderMeta) {
    this.providers.set(meta.slug.toLowerCase(), meta)
  }

  public get(slug: string): ProviderMeta | undefined {
    return this.providers.get(slug.toLowerCase())
  }

  public list(): ProviderMeta[] {
    return Array.from(this.providers.values())
  }

  public getCapabilities(slug: string): PaymentProviderCapabilities {
    const meta = this.get(slug)
    return (
      meta?.capabilities || {
        pix: false,
        credit_card: false,
        debit_card: false,
        boleto: false,
        refund: false,
        installments: false,
        embedded_checkout: false,
      }
    )
  }
}

export const paymentProviderRegistry = new PaymentProviderRegistry()
