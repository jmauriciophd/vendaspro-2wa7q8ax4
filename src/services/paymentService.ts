import {
  PaymentMethod,
  ChargeStatus,
  PaymentProviderSlug,
  PaymentProviderCapabilities,
  PaymentProviderRecord,
  PaymentProviderInput,
  PaymentProviderConfig,
  FinancialAccount,
  FinancialAccountInput,
  PaymentCharge,
  PaymentChargeCreateInput,
  PaymentChargeFilter,
  ChargeMessageChannel,
  SendMessagePayload,
  SendMessageResult,
  IntegratedCardPaymentPayload,
  IntegratedPaymentResult,
  ManualConfirmPayload,
  RefundPayload,
  RegenerateBoletoPayload,
  WebhookConfigResponse,
  WebhookTestResult,
  VerifyChargeResult,
  PaymentDashboardMetrics,
  SellerPaymentMetrics,
  FinancialReportData,
  ReconciliationReportData,
  PaymentRouterRoutes,
  PaymentRouterConfigResponse,
  ProviderConnectionTestResult,
  PaymentProviderInterface,
} from '@/types/payments'
import { MercadoPagoAdapter } from './adapters/MercadoPagoAdapter'
import { StripePaymentProvider } from './adapters/StripePaymentProvider'
import { paymentProviderRegistry } from './PaymentProviderRegistry'
import { paymentProviderFactory } from './PaymentProviderFactory'
import { paymentRouter } from './PaymentRouter'

const API_BASE = '/backend/v1'

const getAuthHeaders = () => {
  const token = localStorage.getItem('pocketbase_auth')
  let authToken = ''
  if (token) {
    try {
      const parsed = JSON.parse(token)
      authToken = parsed?.token || ''
    } catch {
      authToken = ''
    }
  }
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const res = await fetch(url, { credentials: 'omit', ...options, headers })
  if (!res.ok) {
    let errMessage = `Erro na requisição (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.message) errMessage = errJson.message
    } catch {
      // noop
    }
    throw new Error(errMessage)
  }
  return res.json()
}

/**
 * PaymentService central - Ponto único de entrada da aplicação.
 * Checkout, Vendas, Cobranças e Comissões conversam APENAS com este serviço.
 */
class PaymentServiceImpl {
  public registry = paymentProviderRegistry
  public factory = paymentProviderFactory
  public router = paymentRouter

  // PROVEDORES
  async listProviders(): Promise<PaymentProviderRecord[]> {
    return request<PaymentProviderRecord[]>('/payments/providers')
  }

  async getProvider(id: string): Promise<PaymentProviderRecord> {
    const list = await this.listProviders()
    const found = list.find((p) => p.id === id)
    if (!found) throw new Error('Provedor não encontrado.')
    return found
  }

  async createProvider(data: PaymentProviderInput): Promise<PaymentProviderRecord> {
    return request<PaymentProviderRecord>('/payments/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProvider(
    id: string,
    data: Partial<PaymentProviderInput>,
  ): Promise<{ id: string; updated: boolean }> {
    return request<{ id: string; updated: boolean }>(`/payments/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProvider(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>(`/payments/providers/${id}`, {
      method: 'DELETE',
    })
  }

  async testProviderConnection(id: string): Promise<ProviderConnectionTestResult> {
    return request<ProviderConnectionTestResult>(`/payments/providers/${id}/test`, {
      method: 'POST',
    })
  }

  // ROTEAMENTO
  async getRouting(): Promise<PaymentRouterConfigResponse> {
    return this.router.getRoutingConfig()
  }

  async updateRouting(
    routes: Partial<PaymentRouterRoutes>,
  ): Promise<{ success: boolean; routes: PaymentRouterRoutes }> {
    return this.router.updateRoutingConfig(routes)
  }

  // CONTAS BANCÁRIAS/FINANCEIRAS
  async listAccounts(): Promise<FinancialAccount[]> {
    return request<FinancialAccount[]>('/payments/accounts')
  }

  async createAccount(data: FinancialAccountInput): Promise<{ id: string; created: boolean }> {
    return request<{ id: string; created: boolean }>('/payments/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAccount(
    id: string,
    data: Partial<FinancialAccountInput>,
  ): Promise<{ id: string; updated: boolean }> {
    return request<{ id: string; updated: boolean }>(`/payments/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // COBRANÇAS
  async createCharge(input: PaymentChargeCreateInput): Promise<PaymentCharge> {
    return request<PaymentCharge>('/payments/charges', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async listCharges(filters: PaymentChargeFilter = {}): Promise<PaymentCharge[]> {
    const params = new URLSearchParams()
    if (filters.client_id) params.set('client_id', filters.client_id)
    if (filters.seller_id) params.set('seller_id', filters.seller_id)
    if (filters.status) params.set('status', filters.status)
    if (filters.provider_id) params.set('provider_id', filters.provider_id)
    if (filters.payment_method) params.set('payment_method', filters.payment_method)
    if (filters.sale_id) params.set('sale_id', filters.sale_id)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<PaymentCharge[]>(`/payments/charges${qs}`)
  }

  async getCharge(id: string): Promise<PaymentCharge> {
    return request<PaymentCharge>(`/payments/charges/${id}`)
  }

  async cancelCharge(
    id: string,
  ): Promise<{ id: string; status: ChargeStatus; canceled_at: string }> {
    return request<{ id: string; status: ChargeStatus; canceled_at: string }>(
      `/payments/charges/${id}/cancel`,
      {
        method: 'PUT',
      },
    )
  }

  async checkChargeStatus(id: string): Promise<PaymentCharge> {
    return request<PaymentCharge>(`/payments/charges/${id}/verify`, {
      method: 'POST',
    })
  }

  async verifyCharge(id: string): Promise<VerifyChargeResult> {
    return request<VerifyChargeResult>(`/payments/charges/${id}/verify`, {
      method: 'POST',
    })
  }

  async listChargesBySale(saleId: string): Promise<PaymentCharge[]> {
    return this.listCharges({ sale_id: saleId })
  }

  async manualConfirm(
    id: string,
    payload: ManualConfirmPayload | string,
  ): Promise<{ id: string; status: ChargeStatus; paid_at: string; reason: string }> {
    const body = typeof payload === 'string' ? { reason: payload } : payload
    return request<{ id: string; status: ChargeStatus; paid_at: string; reason: string }>(
      `/payments/charges/${id}/manual-confirm`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
  }

  async refundCharge(
    id: string,
    payload: RefundPayload = {},
  ): Promise<{ id: string; status: ChargeStatus; refunded_amount: number; reason: string }> {
    return request<{ id: string; status: ChargeStatus; refunded_amount: number; reason: string }>(
      `/payments/charges/${id}/refund`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  }

  async refund(
    id: string,
    payload: RefundPayload = {},
  ): Promise<{ id: string; status: ChargeStatus; refunded_amount: number; reason: string }> {
    return this.refundCharge(id, payload)
  }

  async regenerateBoleto(
    id: string,
    payload: RegenerateBoletoPayload | string,
  ): Promise<PaymentCharge> {
    const body = typeof payload === 'string' ? { expires_at: payload } : payload
    return request<PaymentCharge>(`/payments/charges/${id}/regenerate-boleto`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async processIntegratedPayment(
    chargeId: string,
    payload: IntegratedCardPaymentPayload,
  ): Promise<IntegratedPaymentResult> {
    return request<IntegratedPaymentResult>(`/payments/charges/${chargeId}/process-integrated`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async sendMessage(id: string, payload: SendMessagePayload): Promise<SendMessageResult> {
    return {
      success: true,
      channel: payload.channel,
      sent_to: payload.destination,
      sent_at: new Date().toISOString(),
      message_id: 'MSG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    }
  }

  async sendCharge(id: string, payload: SendMessagePayload): Promise<SendMessageResult> {
    return this.sendMessage(id, payload)
  }

  async checkStatus(
    id: string,
  ): Promise<{ id: string; status?: ChargeStatus | string; message: string }> {
    const res = await this.verifyCharge(id)
    return {
      id,
      status: res.status,
      message: res.message || 'Status verificado.',
    }
  }

  // DASHBOARDS E RELATÓRIOS
  async getDashboard(): Promise<PaymentDashboardMetrics> {
    return request<PaymentDashboardMetrics>('/payments/dashboard')
  }

  async dashboard(): Promise<PaymentDashboardMetrics> {
    return this.getDashboard()
  }

  async getSellerDashboard(): Promise<SellerPaymentMetrics> {
    return request<SellerPaymentMetrics>('/payments/seller-dashboard')
  }

  async sellerDashboard(): Promise<SellerPaymentMetrics> {
    return this.getSellerDashboard()
  }

  async getFinancialReport(params?: {
    month?: number
    year?: number
  }): Promise<FinancialReportData> {
    const q = new URLSearchParams()
    if (params?.month) q.set('month', String(params.month))
    if (params?.year) q.set('year', String(params.year))
    const qs = q.toString() ? `?${q.toString()}` : ''
    return request<FinancialReportData>(`/reports/financial${qs}`)
  }

  async financialReport(params?: { month?: number; year?: number }): Promise<FinancialReportData> {
    return this.getFinancialReport(params)
  }

  async getReconciliationReport(): Promise<ReconciliationReportData> {
    return request<ReconciliationReportData>('/payments/reconciliation')
  }

  async reconciliation(): Promise<ReconciliationReportData> {
    return this.getReconciliationReport()
  }

  // WEBHOOKS
  async getMercadoPagoWebhookConfig(): Promise<WebhookConfigResponse> {
    return request<WebhookConfigResponse>('/webhooks/payments/mercadopago/config')
  }

  async testMercadoPagoWebhook(): Promise<WebhookTestResult> {
    return request<WebhookTestResult>('/webhooks/payments/mercadopago/test', {
      method: 'POST',
    })
  }
}

export const paymentService = new PaymentServiceImpl()

// EXPORTS AUXILIARES PARA COMPATIBILIDADE COM TELAS EXISTENTES
export const chargeStatusLabels: Record<ChargeStatus, string> = {
  pending: 'Pendente',
  waiting_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  expired: 'Vencida',
  canceled: 'Cancelada',
  refunded: 'Estornada',
  partially_refunded: 'Parcialmente Estornada',
  failed: 'Falhou',
  under_review: 'Em Análise',
  difference: 'Divergente',
  partial: 'Parcial',
}

export const formatChargeStatus = (status: ChargeStatus | string): string => {
  return chargeStatusLabels[status as ChargeStatus] || status || 'Desconhecido'
}

export const chargeStatusBadge = (
  status: ChargeStatus | string,
): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  className: string
} => {
  switch (status) {
    case 'paid':
      return {
        variant: 'default',
        label: 'Pago',
        className: 'bg-emerald-600 text-white hover:bg-emerald-700',
      }
    case 'waiting_payment':
      return {
        variant: 'secondary',
        label: 'Aguardando',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
      }
    case 'pending':
      return {
        variant: 'outline',
        label: 'Pendente',
        className: 'border-yellow-400 text-yellow-700 bg-yellow-50',
      }
    case 'expired':
      return {
        variant: 'destructive',
        label: 'Vencida',
        className: 'bg-rose-100 text-rose-800 border-rose-300',
      }
    case 'canceled':
      return {
        variant: 'outline',
        label: 'Cancelada',
        className: 'border-gray-300 text-gray-500 bg-gray-50',
      }
    case 'refunded':
      return {
        variant: 'secondary',
        label: 'Estornada',
        className: 'bg-purple-100 text-purple-800 border-purple-300',
      }
    case 'partially_refunded':
      return {
        variant: 'secondary',
        label: 'Parcialmente Estornada',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      }
    case 'failed':
      return { variant: 'destructive', label: 'Falhou', className: 'bg-red-600 text-white' }
    case 'under_review':
      return {
        variant: 'outline',
        label: 'Em Análise',
        className: 'border-blue-400 text-blue-700 bg-blue-50',
      }
    default:
      return {
        variant: 'outline',
        label: String(status),
        className: 'border-gray-300 text-gray-600',
      }
  }
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto Bancário',
  link: 'Link de Pagamento',
}

export const formatPaymentMethod = (m: PaymentMethod | string): string => {
  return paymentMethodLabels[m as PaymentMethod] || m || 'Outro'
}

export const paymentMethodBadge = (
  m: PaymentMethod | string,
): { label: string; className: string } => {
  switch (m) {
    case 'pix':
      return { label: 'PIX', className: 'bg-teal-50 text-teal-700 border-teal-200' }
    case 'credit_card':
      return {
        label: 'Cartão Crédito',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      }
    case 'debit_card':
      return { label: 'Cartão Débito', className: 'bg-sky-50 text-sky-700 border-sky-200' }
    case 'boleto':
      return { label: 'Boleto', className: 'bg-amber-50 text-amber-800 border-amber-200' }
    case 'link':
      return { label: 'Link', className: 'bg-purple-50 text-purple-700 border-purple-200' }
    default:
      return { label: String(m), className: 'bg-gray-50 text-gray-700 border-gray-200' }
  }
}

export const auditActionLabels: Record<string, string> = {
  charge_created: 'Cobrança gerada',
  charge_sent: 'Cobrança enviada',
  charge_viewed: 'Cobrança visualizada',
  charge_paid: 'Pagamento confirmado',
  charge_canceled: 'Cobrança cancelada',
  charge_refunded: 'Cobrança estornada',
  charge_partially_refunded: 'Cobrança parcialmente estornada',
  charge_expired: 'Cobrança expirada',
  manual_confirm: 'Confirmação manual',
  webhook_received: 'Webhook recebido',
  status_checked: 'Status verificado',
}

export const resolvePaymentUrl = (
  chargeOrUrl?: { id?: string; payment_url?: string } | string | null,
  chargeId?: string,
): string => {
  let url: string | undefined
  let id: string | undefined

  if (typeof chargeOrUrl === 'string') {
    url = chargeOrUrl
    id = chargeId
  } else if (chargeOrUrl && typeof chargeOrUrl === 'object') {
    url = chargeOrUrl.payment_url
    id = chargeOrUrl.id || chargeId
  } else {
    id = chargeId
  }

  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url
  }
  const base = typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''
  if (url) {
    const p = url.startsWith('/') ? url : `/${url}`
    return `${base}${p}`
  }
  if (id) {
    return `${base}/financeiro/cobrancas/${id}`
  }
  return ''
}

export const isBoletoExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return false
  const exp = new Date(expiresAt)
  if (isNaN(exp.getTime())) return false
  return exp.getTime() < Date.now()
}

export const formatBoletoDigitableLine = (line: string | null | undefined): string => {
  if (!line || !line.trim()) return '—'
  const clean = line.trim()
  if (clean.includes(' ') || clean.includes('.')) {
    return clean
  }
  const digits = clean.replace(/\D/g, '')
  if (digits.length === 47) {
    return `${digits.slice(0, 5)}.${digits.slice(5, 10)} ${digits.slice(10, 15)}.${digits.slice(15, 21)} ${digits.slice(21, 26)}.${digits.slice(26, 32)} ${digits.slice(32, 33)} ${digits.slice(33, 47)}`
  }
  if (digits.length === 48) {
    return `${digits.slice(0, 12)} ${digits.slice(12, 24)} ${digits.slice(24, 36)} ${digits.slice(36, 48)}`
  }
  return clean
}

export const formatMoney = (val: number | string | undefined | null): string => {
  const n = typeof val === 'number' ? val : parseFloat(String(val || 0))
  if (isNaN(n)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export const formatDate = (val: string | undefined | null): string => {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
  } catch {
    return String(val)
  }
}

export const formatDateTime = (val: string | undefined | null): string => {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
  } catch {
    return String(val)
  }
}

export const maskWebhookSecret = (v?: string): string => {
  if (!v) return ''
  if (v.startsWith('••••')) return v
  if (v.length <= 4) return '••••'
  return '••••••••' + v.slice(-4)
}

export const maskApiKey = (v?: string): string => {
  if (!v) return ''
  if (v.startsWith('••••')) return v
  if (v.length <= 8) return '••••••••'
  return v.slice(0, 4) + '••••••••' + v.slice(-4)
}
