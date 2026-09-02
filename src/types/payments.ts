export type PaymentProviderSlug = 'mercadopago' | 'stripe' | 'asaas' | 'pagbank' | 'cielo' | 'stone'
export type PaymentProviderStatus = 'active' | 'inactive' | 'incomplete' | 'error'
export type PaymentEnvironment = 'sandbox' | 'production'
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'link'

export type ChargeStatus =
  | 'pending'
  | 'waiting_payment'
  | 'paid'
  | 'expired'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'under_review'
  | 'difference'
  | 'partial'

export type ChargeMessageChannel = 'whatsapp' | 'email' | 'sms' | 'copy_link' | 'copy_pix'
export type AuditAction =
  | 'charge_created'
  | 'charge_sent'
  | 'charge_viewed'
  | 'charge_paid'
  | 'charge_canceled'
  | 'charge_refunded'
  | 'charge_partially_refunded'
  | 'charge_expired'
  | 'manual_confirm'
  | 'webhook_received'
  | 'status_checked'

export interface PaymentProviderCapabilities {
  pix: boolean
  credit_card: boolean
  debit_card: boolean
  boleto: boolean
  refund: boolean
  installments: boolean
  embedded_checkout: boolean
}

export interface ProviderConnectionTestResult {
  success: boolean
  status: 'connected' | 'error' | 'not_configured'
  message: string
  tested_at: string
  details?: Record<string, unknown>
}

export interface PaymentProviderRecord {
  id: string
  name: string
  slug: PaymentProviderSlug | string
  status: PaymentProviderStatus
  environment: PaymentEnvironment
  methods: PaymentMethod[]
  priority?: number
  capabilities?: PaymentProviderCapabilities
  webhook_configured: boolean
  webhook_url?: string
  last_sync?: string
  created?: string
  updated?: string
  api_key_masked?: string
  api_secret_masked?: string
  webhook_secret_masked?: string
  is_configured?: boolean
}

// Aliases para compatibilidade total com páginas existentes
export type PaymentProvider = PaymentProviderRecord
export type PaymentChargeDetail = PaymentCharge
export type PaymentChargeListItem = PaymentCharge
export type CreateChargeResult = PaymentCharge
export type ChargeAuditEntry = PaymentChargeTimelineItem
export type PaymentsDashboard = PaymentDashboardMetrics
export type SellerPaymentDashboard = SellerPaymentMetrics
export type FinancialReport = FinancialReportData
export type ReconciliationData = ReconciliationReportData
export type ReconciliationItem = ReconciliationReportData['reconciled'][0]

export interface PaymentProviderInput {
  name: string
  slug: PaymentProviderSlug | string
  status: PaymentProviderStatus
  environment: PaymentEnvironment
  methods: PaymentMethod[]
  priority?: number
  api_key?: string
  api_secret?: string
  webhook_secret?: string
  webhook_configured?: boolean
}

export interface PaymentProviderConfig {
  id?: string
  provider_id: string
  active: boolean
  environment: PaymentEnvironment
  api_key?: string
  webhook_secret?: string
  webhook_url?: string
}

export interface FinancialAccount {
  id: string
  provider_id: string
  provider_name?: string
  name: string
  account_reference?: string
  environment: PaymentEnvironment
  active: boolean
  is_default: boolean
  created?: string
  updated?: string
}

export interface FinancialAccountInput {
  provider_id: string
  name: string
  account_reference?: string
  environment?: PaymentEnvironment
  active?: boolean
  is_default?: boolean
}

export interface PaymentChargeTimelineItem {
  id: string
  action: AuditAction | string
  user_id?: string
  user_name?: string
  reference?: string
  previous_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created: string
}

export interface PaymentCharge {
  id: string
  external_charge_id: string
  sale_id: string
  client_id: string
  client_name?: string
  seller_id?: string
  seller_name?: string
  provider_id: string
  provider_name?: string
  provider_slug?: PaymentProviderSlug | string
  provider_public_key?: string
  provider_environment?: PaymentEnvironment
  financial_account_id?: string
  payment_method: PaymentMethod
  original_amount: number
  discount_amount: number
  final_amount: number
  provider_fee?: number
  net_value?: number
  installments: number
  installment_value: number
  interest_rate: number
  status: ChargeStatus
  payment_url?: string
  pix_code?: string
  pix_qrcode?: string
  expires_at: string
  paid_at?: string
  canceled_at?: string
  created?: string
  updated?: string
  timeline?: PaymentChargeTimelineItem[]
  boleto_url?: string
  boleto_barcode?: string
  boleto_digitable_line?: string
  boleto_nosso_numero?: string
  boleto_document_number?: string
  provider_response?: Record<string, unknown>
}

export interface PaymentChargeCreateInput {
  sale_id: string
  payment_method: PaymentMethod
  provider_id?: string
  discount_amount?: number
  installments?: number
  expires_at?: string
}

export interface PaymentChargeFilter {
  client_id?: string
  seller_id?: string
  status?: ChargeStatus | string
  provider_id?: string
  payment_method?: PaymentMethod | string
  sale_id?: string
}

export interface IntegratedCardPaymentPayload {
  token?: string
  issuer_id?: string
  payment_method_id?: string
  installments?: number
  payer?: {
    email: string
    identification?: {
      type: string
      number: string
    }
  }
}

export interface IntegratedPaymentResult {
  success: boolean
  status: ChargeStatus
  message: string
  charge_id: string
  details?: Record<string, unknown>
}

export interface SendMessagePayload {
  channel: ChargeMessageChannel
  destination?: string
  custom_message?: string
}

export interface SendMessageResult {
  success: boolean
  channel: ChargeMessageChannel
  sent_to?: string
  sent_at: string
  message_id?: string
}

export interface ManualConfirmPayload {
  reason: string
  paid_at?: string
  reference?: string
}

export interface RefundPayload {
  amount?: number
  reason?: string
}

export interface RegenerateBoletoPayload {
  expires_at: string
}

export interface WebhookConfigResponse {
  provider: string
  webhook_url: string
  instructions: string[]
}

export interface WebhookTestResult {
  message: string
}

export interface VerifyChargeResult {
  id: string
  status: ChargeStatus
  previous_status?: ChargeStatus | string
  provider_status?: string
  updated: boolean
  checked_at: string
  message: string
}

export interface PaymentDashboardMetrics {
  total_charged: number
  total_received: number
  paid_count: number
  conversion_rate: number
}

export interface SellerPaymentMetrics {
  sent_count: number
  waiting_count: number
  received_today_count: number
  received_today_value: number
  expired_count: number
  recent_received: Array<{
    id: string
    client_name: string
    final_amount: number
    paid_at: string
    payment_method: PaymentMethod
  }>
}

export interface FinancialReportData {
  summary: {
    total_cobrado: number
    total_recebido: number
    total_taxas: number
    total_liquido: number
    total_pendente: number
    total_vencido: number
    total_cancelado: number
  }
  by_provider: Array<{
    provider: string
    total: number
    count: number
  }>
  by_month: Array<{
    month: string
    total: number
    count: number
  }>
  by_method: Array<{
    method: PaymentMethod
    total: number
    count: number
  }>
  timeline: Array<{
    date: string
    cobrado: number
    recebido: number
  }>
}

export interface ReconciliationReportData {
  reconciled: Array<{
    id: string
    sale_id: string
    client_name: string
    provider: string
    system_amount: number
    provider_amount: number
    fee: number
    net: number
    status: string
    date: string
  }>
  divergent: Array<{
    id: string
    sale_id: string
    client_name: string
    provider: string
    system_amount: number
    provider_amount: number
    divergence_type: string
    divergence_detail: string
    date: string
  }>
  unidentified: Array<{
    id: string
    external_id: string
    provider: string
    amount: number
    date: string
    details: string
  }>
  partial: Array<{
    id: string
    sale_id: string
    client_name: string
    expected_amount: number
    paid_amount: number
    remaining: number
    date: string
  }>
  counts: {
    reconciled: number
    divergent: number
    unidentified: number
    partial: number
  }
}

export interface PaymentRouterRoutes {
  pix: PaymentProviderSlug | string
  credit_card: PaymentProviderSlug | string
  debit_card: PaymentProviderSlug | string
  boleto: PaymentProviderSlug | string
  link: PaymentProviderSlug | string
}

export interface PaymentRouterConfigResponse {
  routes: PaymentRouterRoutes
  available_gateways: Array<{
    id: string
    name: string
    slug: string
    methods: PaymentMethod[]
  }>
}

export interface CreateChargeParams {
  saleId: string
  clientId: string
  amount: number
  discountAmount?: number
  installments?: number
  method: PaymentMethod
  expiresAt?: string
  customer?: {
    name?: string
    email?: string
    cpfCnpj?: string
    phone?: string
  }
}

export interface ChargeCreationResult {
  chargeId: string
  externalChargeId: string
  status: ChargeStatus
  paymentUrl?: string
  pixCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  boletoBarcode?: string
  boletoDigitableLine?: string
  boletoNossoNumero?: string
  boletoDocumentNumber?: string
  providerResponse?: Record<string, unknown>
}

export interface PaymentProviderInterface {
  readonly id: string
  readonly name: string
  readonly slug: PaymentProviderSlug | string
  readonly capabilities: PaymentProviderCapabilities

  createCharge(params: CreateChargeParams): Promise<ChargeCreationResult>
  createPayment(chargeId: string, payload: IntegratedCardPaymentPayload): Promise<IntegratedPaymentResult>
  getPaymentStatus(chargeId: string): Promise<ChargeStatus>
  cancelPayment(chargeId: string): Promise<boolean>
  refundPayment(chargeId: string, amount?: number, reason?: string): Promise<boolean>
  testConnection(): Promise<ProviderConnectionTestResult>
  mapStatus(providerRawStatus: string): ChargeStatus
}
