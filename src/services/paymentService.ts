// Serviço de Cobrança e Pagamentos Digitais.
// Encapsula todas as chamadas aos endpoints do hook pocketbase/hooks/payments.js.

import pb from '@/lib/pocketbase/client'
import type {
  PaymentProvider,
  PaymentProviderInput,
  FinancialAccount,
  FinancialAccountInput,
  PaymentChargeListItem,
  PaymentChargeDetail,
  CreateChargeInput,
  CreateChargeResult,
  RegenerateBoletoResult,
  SendChargeInput,
  SendChargeResult,
  PaymentsDashboard,
  SellerPaymentDashboard,
  ReconciliationData,
  ChargeStatus,
  PaymentMethod,
  PaymentProviderConfig,
  WebhookTestResult,
  VerifyChargeResult,
  FinancialReport,
} from '@/types/payments'

const BASE = '/backend/v1/payments'
const WEBHOOK_BASE = '/backend/v1/webhooks/payments'
const REPORTS_BASE = '/backend/v1/reports'

export const paymentService = {
  // ----- Providers -----
  async listProviders(): Promise<PaymentProvider[]> {
    return await pb.send(`${BASE}/providers`, { method: 'GET' })
  },

  async createProvider(data: PaymentProviderInput): Promise<PaymentProvider> {
    return await pb.send(`${BASE}/providers`, { method: 'POST', body: data })
  },

  async updateProvider(
    id: string,
    data: Partial<PaymentProviderInput>,
  ): Promise<{ id: string; updated: boolean }> {
    return await pb.send(`${BASE}/providers/${id}`, { method: 'PUT', body: data })
  },

  async deleteProvider(id: string): Promise<{ id: string; deleted: boolean }> {
    return await pb.send(`${BASE}/providers/${id}`, { method: 'DELETE' })
  },

  // ----- Financial Accounts -----
  async listAccounts(): Promise<FinancialAccount[]> {
    return await pb.send(`${BASE}/accounts`, { method: 'GET' })
  },

  async createAccount(data: FinancialAccountInput): Promise<{ id: string; created: boolean }> {
    return await pb.send(`${BASE}/accounts`, { method: 'POST', body: data })
  },

  async updateAccount(
    id: string,
    data: Partial<FinancialAccountInput>,
  ): Promise<{ id: string; updated: boolean }> {
    return await pb.send(`${BASE}/accounts/${id}`, { method: 'PUT', body: data })
  },

  // ----- Charges -----
  async listCharges(params?: {
    month?: number
    year?: number
    client_id?: string
    seller_id?: string
    status?: ChargeStatus
    provider_id?: string
    payment_method?: PaymentMethod
    sale_id?: string
  }): Promise<PaymentChargeListItem[]> {
    const query: Record<string, string | number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    if (params?.client_id) query.client_id = params.client_id
    if (params?.seller_id) query.seller_id = params.seller_id
    if (params?.status) query.status = params.status
    if (params?.provider_id) query.provider_id = params.provider_id
    if (params?.payment_method) query.payment_method = params.payment_method
    if (params?.sale_id) query.sale_id = params.sale_id
    return await pb.send(`${BASE}/charges`, { method: 'GET', query })
  },

  async listChargesBySale(saleId: string): Promise<PaymentChargeListItem[]> {
    return this.listCharges({ sale_id: saleId })
  },

  async getCharge(id: string): Promise<PaymentChargeDetail> {
    return await pb.send(`${BASE}/charges/${id}`, { method: 'GET' })
  },

  async createCharge(data: CreateChargeInput): Promise<CreateChargeResult> {
    return await pb.send(`${BASE}/charges`, { method: 'POST', body: data })
  },

  async cancelCharge(id: string): Promise<{ id: string; status: string; canceled_at: string }> {
    return await pb.send(`${BASE}/charges/${id}/cancel`, { method: 'PUT' })
  },

  async resendCharge(
    id: string,
    data: SendChargeInput,
  ): Promise<{ id: string; charge_id: string; sent: boolean }> {
    return await pb.send(`${BASE}/charges/${id}/resend`, { method: 'POST', body: data })
  },

  async getTimeline(id: string): Promise<PaymentChargeDetail['timeline']> {
    return await pb.send(`${BASE}/charges/${id}/timeline`, { method: 'GET' })
  },

  async checkStatus(
    id: string,
  ): Promise<{ id: string; status: string; checked_at: string; message: string }> {
    return await pb.send(`${BASE}/charges/${id}/check-status`, { method: 'POST' })
  },

  async sendCharge(id: string, data: SendChargeInput): Promise<SendChargeResult> {
    return await pb.send(`${BASE}/charges/${id}/send`, { method: 'POST', body: data })
  },

  async manualConfirm(
    id: string,
    reason: string,
  ): Promise<{ id: string; status: string; paid_at: string; reason: string }> {
    return await pb.send(`${BASE}/charges/${id}/manual-confirm`, {
      method: 'POST',
      body: { reason },
    })
  },

  async refund(
    id: string,
    params?: { amount?: number; reason?: string },
  ): Promise<{ id: string; status: string; refund_amount: number }> {
    return await pb.send(`${BASE}/charges/${id}/refund`, { method: 'POST', body: params || {} })
  },

  async regenerateBoleto(id: string, expiresAt: string): Promise<RegenerateBoletoResult> {
    return await pb.send(`${BASE}/charges/${id}/regenerate-boleto`, {
      method: 'POST',
      body: { expires_at: expiresAt },
    })
  },

  // ----- Integrated Checkout (Bricks / Transparente) -----
  async processIntegratedPayment(
    id: string,
    data: import('@/types/payments').IntegratedPaymentInput,
  ): Promise<import('@/types/payments').IntegratedPaymentResult> {
    return await pb.send(`${BASE}/charges/${id}/process-integrated`, {
      method: 'POST',
      body: data,
    })
  },

  // ----- Dashboards -----
  async dashboard(): Promise<PaymentsDashboard> {
    return await pb.send(`${BASE}/dashboard`, { method: 'GET' })
  },

  async sellerDashboard(): Promise<SellerPaymentDashboard> {
    return await pb.send(`${BASE}/seller-dashboard`, { method: 'GET' })
  },

  async reconciliation(): Promise<ReconciliationData> {
    return await pb.send(`${BASE}/reconciliation`, { method: 'GET' })
  },

  // ----- Webhook Mercado Pago -----
  async getMercadoPagoConfig(): Promise<PaymentProviderConfig> {
    return await pb.send(`${WEBHOOK_BASE}/mercadopago/config`, { method: 'GET' })
  },

  async testMercadoPagoWebhook(chargeId?: string): Promise<WebhookTestResult> {
    return await pb.send(`${WEBHOOK_BASE}/mercadopago/test`, {
      method: 'POST',
      body: chargeId ? { charge_id: chargeId } : {},
    })
  },

  async verifyCharge(id: string): Promise<VerifyChargeResult> {
    return await pb.send(`${BASE}/charges/${id}/verify`, { method: 'POST' })
  },

  // ----- Relatório Financeiro -----
  async financialReport(params?: { month?: number; year?: number }): Promise<FinancialReport> {
    const query: Record<string, string | number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send(`${REPORTS_BASE}/financial`, { method: 'GET', query })
  },
}

// ----- helpers de formatação/presentação (compartilhados entre páginas) -----

export const chargeStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  waiting_payment: 'Aguardando pagamento',
  paid: 'Pago',
  expired: 'Vencida',
  canceled: 'Cancelada',
  refunded: 'Reembolsada',
  partially_refunded: 'Reembolso parcial',
  failed: 'Falhou',
  under_review: 'Em análise',
  difference: 'Divergente',
  partial: 'Parcial',
}

export const chargeStatusBadge: Record<string, string> = {
  pending: 'bg-slate-50 text-slate-700 border-slate-200',
  waiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  canceled: 'bg-slate-100 text-slate-500 border-slate-200',
  refunded: 'bg-violet-50 text-violet-700 border-violet-200',
  partially_refunded: 'bg-violet-50 text-violet-700 border-violet-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  under_review: 'bg-sky-50 text-sky-700 border-sky-200',
  difference: 'bg-orange-50 text-orange-700 border-orange-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
}

export const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
}

export const paymentMethodBadge: Record<string, string> = {
  pix: 'bg-teal-50 text-teal-700 border-teal-200',
  credit_card: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  debit_card: 'bg-blue-50 text-blue-700 border-blue-200',
  boleto: 'bg-amber-50 text-amber-700 border-amber-200',
  link: 'bg-violet-50 text-violet-700 border-violet-200',
}

export const auditActionLabels: Record<string, string> = {
  charge_created: 'Cobrança criada',
  link_sent: 'Link enviado',
  webhook_received: 'Webhook recebido',
  status_updated: 'Status atualizado',
  payment_confirmed: 'Pagamento confirmado',
  payment_divergent: 'Pagamento divergente',
  charge_canceled: 'Cobrança cancelada',
  refund: 'Reembolso',
  manual_change: 'Alteração manual',
  reconciliation: 'Conciliação',
}

/**
 * Normaliza e resolve a URL de checkout / pagamento para a URL real da aplicação.
 * Se a URL gravada for demo/inválida ou relativa, substitui pelo origin atual da aplicação.
 */
export function resolvePaymentUrl(url?: string | null, chargeId?: string | null): string {
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''

  if (!url || url.trim() === '') {
    if (chargeId && currentOrigin) {
      return `${currentOrigin}/financeiro/cobrancas/${chargeId}`
    }
    return ''
  }

  const trimmed = url.trim()

  // Se aponta para domínio demo ou inexistente (ex: pay.vendaspro.demo, boleto.vendaspro.demo)
  if (
    trimmed.includes('vendaspro.demo') ||
    trimmed.includes('pay.vendaspro') ||
    trimmed.includes('boleto.vendaspro')
  ) {
    if (chargeId && currentOrigin) {
      return `${currentOrigin}/financeiro/cobrancas/${chargeId}`
    }
    if (currentOrigin) {
      return `${currentOrigin}/financeiro/cobrancas`
    }
  }

  // Se for uma URL que termina com /financeiro/cobrancas/ ou /cobranca/ ou /pagar/ sem o ID e temos o chargeId
  if (
    chargeId &&
    (trimmed.endsWith('/financeiro/cobrancas/') ||
      trimmed.endsWith('/financeiro/cobrancas') ||
      trimmed.endsWith('/cobranca/') ||
      trimmed.endsWith('/cobranca') ||
      trimmed.endsWith('/pagar/') ||
      trimmed.endsWith('/pagar'))
  ) {
    const baseClean = trimmed.replace(/\/+$/, '')
    return `${baseClean}/${chargeId}`
  }

  // Se é uma rota relativa iniciada por "/"
  if (trimmed.startsWith('/') && currentOrigin) {
    let full = `${currentOrigin}${trimmed}`
    if (
      chargeId &&
      (full.endsWith('/financeiro/cobrancas/') ||
        full.endsWith('/financeiro/cobrancas') ||
        full.endsWith('/cobranca/') ||
        full.endsWith('/cobranca') ||
        full.endsWith('/pagar/') ||
        full.endsWith('/pagar'))
    ) {
      const baseClean = full.replace(/\/+$/, '')
      return `${baseClean}/${chargeId}`
    }
    return full
  }

  return trimmed
}

export function formatMoney(v: number | undefined | null): string {
  return Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

export function timeAgo(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'agora'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d atrás`
  return d.toLocaleDateString('pt-BR')
}

/**
 * Formata a linha digitável do boleto (47 dígitos) em blocos visuais:
 * XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXX.XXXXXX.XXXXXX
 * Se a linha não tiver o tamanho esperado, retorna como veio.
 */
export function formatBoletoDigitableLine(line?: string | null): string {
  if (!line) return ''
  const digits = line.replace(/\D/g, '')
  if (digits.length === 47) {
    return (
      digits.substring(0, 5) +
      '.' +
      digits.substring(5, 9) +
      ' ' +
      digits.substring(10, 15) +
      '.' +
      digits.substring(15, 20) +
      ' ' +
      digits.substring(21, 26) +
      '.' +
      digits.substring(26, 31) +
      ' ' +
      digits.substring(32, 33) +
      ' ' +
      digits.substring(33, 37) +
      '.' +
      digits.substring(37, 43) +
      '.' +
      digits.substring(43, 47)
    )
  }
  // fallback: agrupa de 5 em 5 com espaços
  return digits.replace(/(.{5})/g, '$1 ').trim()
}

/** Indica se um boleto está vencido (expires_at anterior a hoje). */
export function isBoletoExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false
  const d = new Date(expiresAt)
  if (isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}
