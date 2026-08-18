// Tipos TypeScript do módulo de Cobrança e Pagamentos Digitais.

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

export type ChargeMessageChannel = 'email' | 'whatsapp' | 'copy_link' | 'sms'

export type AuditAction =
  | 'charge_created'
  | 'link_sent'
  | 'webhook_received'
  | 'status_updated'
  | 'payment_confirmed'
  | 'payment_divergent'
  | 'charge_canceled'
  | 'refund'
  | 'manual_change'
  | 'reconciliation'

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export interface PaymentProvider {
  id: string
  name: string
  slug: string
  status: PaymentProviderStatus
  environment: PaymentEnvironment
  methods: PaymentMethod[]
  webhook_configured: boolean
  webhook_url: string
  last_sync: string
  created: string
  updated: string
  api_key_masked: string
  api_secret_masked: string
  webhook_secret_masked: string
}

export interface PaymentProviderConfig {
  provider: 'mercadopago'
  webhook_url: string
  instructions: string[]
}

export interface WebhookTestResult {
  message: string
  event_id: string
  charge_id: string
  previous_status: ChargeStatus
  new_status: ChargeStatus
  fee: number
  net: number
}

export interface VerifyChargeResult {
  id: string
  status: ChargeStatus
  previous_status?: ChargeStatus
  updated: boolean
  provider_status?: string
  checked_at: string
  message?: string
}

export interface PaymentProviderInput {
  name: string
  slug: string
  status?: PaymentProviderStatus
  environment?: PaymentEnvironment
  methods?: PaymentMethod[]
  api_key?: string
  api_secret?: string
  webhook_secret?: string
  webhook_configured?: boolean
}

// ---------------------------------------------------------------------------
// Financial Accounts
// ---------------------------------------------------------------------------

export interface FinancialAccount {
  id: string
  provider_id: string
  provider_name: string
  name: string
  account_reference: string
  environment: PaymentEnvironment
  active: boolean
  is_default: boolean
  created: string
  updated: string
}

export interface FinancialAccountInput {
  name: string
  provider_id?: string
  account_reference?: string
  environment?: PaymentEnvironment
  active?: boolean
  is_default?: boolean
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

export interface PaymentChargeListItem {
  id: string
  external_charge_id: string
  sale_id: string
  client_id: string
  client_name: string
  seller_id: string
  seller_name: string
  provider_id: string
  provider_name: string
  payment_method: PaymentMethod
  original_amount: number
  discount_amount: number
  final_amount: number
  provider_fee: number
  net_value: number
  installments: number
  installment_value: number
  interest_rate: number
  status: ChargeStatus
  payment_url: string
  pix_code: string
  expires_at: string
  paid_at: string
  canceled_at: string
  created: string
  updated: string
  boleto_url: string
  boleto_barcode: string
  boleto_digitable_line: string
  boleto_nosso_numero: string
  boleto_document_number: string
}

export interface ChargeAuditEntry {
  id: string
  action: AuditAction
  user_id: string
  user_name: string
  reference: string
  previous_data: Record<string, unknown>
  new_data: Record<string, unknown>
  ip_address: string
  created: string
}

export interface PaymentChargeDetail extends PaymentChargeListItem {
  invoice_id: string
  financial_account_id: string
  provider_slug: string
  pix_qrcode: string
  provider_response: Record<string, unknown>
  created_by: string
  timeline: ChargeAuditEntry[]
}

// Dados de boleto compartilhados entre list/detail/result.
export interface BoletoData {
  boleto_url: string
  boleto_barcode: string
  boleto_digitable_line: string
  boleto_nosso_numero: string
  boleto_document_number: string
}

export interface CreateChargeInput {
  sale_id: string
  provider_id: string
  payment_method: PaymentMethod
  discount_amount?: number
  expires_at?: string
  installments?: number
}

export interface CreateChargeResult {
  id: string
  external_charge_id: string
  sale_id: string
  status: ChargeStatus
  payment_method: PaymentMethod
  original_amount: number
  discount_amount: number
  final_amount: number
  provider_fee: number
  net_value: number
  installments: number
  installment_value: number
  interest_rate: number
  payment_url: string
  pix_code: string
  expires_at: string
  created: string
  boleto_url: string
  boleto_barcode: string
  boleto_digitable_line: string
  boleto_nosso_numero: string
  boleto_document_number: string
}

export interface RegenerateBoletoResult extends CreateChargeResult {
  regenerated_from: string
}

export interface SendChargeInput {
  channel: ChargeMessageChannel
  destination: string
}

export interface SendChargeResult {
  id: string
  charge_id: string
  channel: ChargeMessageChannel
  sent: boolean
  message: string
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export interface PaymentsDashboard {
  received_today: number
  received_today_count: number
  pending_count: number
  pending_value: number
  expired_count: number
  expired_value: number
  total_charged: number
  total_received: number
  paid_count: number
  conversion_rate: number
  avg_payment_hours: number
}

export interface SellerPaymentDashboard {
  sent_count: number
  waiting_count: number
  received_today_count: number
  received_today_value: number
  expired_count: number
  recent_received: Array<{
    id: string
    client_id: string
    client_name: string
    sale_id: string
    final_amount: number
    payment_method: PaymentMethod
    paid_at: string
    external_charge_id: string
  }>
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export interface ReconciliationItem {
  id: string
  external_charge_id: string
  sale_id: string
  client_id: string
  provider_id: string
  provider_name: string
  payment_method: PaymentMethod
  final_amount: number
  original_amount: number
  status: ChargeStatus
  paid_at: string
  created: string
}

export interface ReconciliationData {
  reconciled: ReconciliationItem[]
  divergent: ReconciliationItem[]
  unidentified: ReconciliationItem[]
  partial: ReconciliationItem[]
  counts: {
    reconciled: number
    divergent: number
    unidentified: number
    partial: number
  }
}

// ---------------------------------------------------------------------------
// Relatório Financeiro
// ---------------------------------------------------------------------------
export interface FinancialReportSummary {
  total_cobrado: number
  total_recebido: number
  total_taxas: number
  total_liquido: number
  total_pendente: number
  total_vencido: number
  total_cancelado: number
}

export interface FinancialReportProvider {
  provider_id: string
  provider_name: string
  total_cobrado: number
  total_recebido: number
  total_taxas: number
  total_liquido: number
  quantidade_cobrancas: number
  ticket_medio: number
  taxa_conversao: number
}

export interface FinancialReportMonth {
  month: string
  cobrado: number
  recebido: number
  taxas: number
  liquido: number
}

export interface FinancialReportMethod {
  method: string
  quantity: number
  valor_total: number
  taxa_media: number
}

export interface FinancialReportTimelineItem {
  date: string
  valor: number
  provider_name: string
  method: string
  client: string
}

export interface FinancialReport {
  summary: FinancialReportSummary
  by_provider: FinancialReportProvider[]
  by_month: FinancialReportMonth[]
  by_method: FinancialReportMethod[]
  timeline: FinancialReportTimelineItem[]
}
