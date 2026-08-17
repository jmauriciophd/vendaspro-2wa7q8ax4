// Tipos TypeScript para os novos módulos: Comissões, Funil e Importação de Clientes.

import type { RecordModel } from 'pocketbase'

// ===========================================================================
// Comissões
// ===========================================================================

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export interface CommissionRule extends RecordModel {
  id: string
  seller: string
  percentage: number
  minimum_sales?: number
  maximum_sales?: number
  active: boolean
  created: string
  updated: string
  expand?: {
    seller?: import('./crm').User
  }
}

export interface Commission extends RecordModel {
  id: string
  seller: string
  sale: string
  sale_value: number
  commission_percentage: number
  commission_value: number
  status: CommissionStatus
  reference_month: string // YYYY-MM
  paid_at?: string
  created: string
  updated: string
  expand?: {
    seller?: import('./crm').User
    sale?: import('./crm').Sale
  }
}

/** Item retornado por GET /commissions/list (com joins). */
export interface CommissionListItem {
  id: string
  seller: string
  sale: string
  sale_value: number
  commission_percentage: number
  commission_value: number
  status: CommissionStatus
  reference_month: string
  paid_at?: string
  created: string
  updated: string
  seller_name: string
  seller_email: string
  sale_date: string
  customer_name: string
}

export interface CommissionSummaryCards {
  total_commission: number
  comissioned_sales: number
  pending: number
  approved: number
  paid: number
  avg_ticket: number
}

export interface CommissionSummaryBySeller {
  seller: string
  seller_name: string
  seller_email: string
  sales_count: number
  total_sales_value: number
  total_commission: number
  pending: number
  approved: number
  paid: number
}

export interface CommissionSummary {
  reference_month: string
  cards: CommissionSummaryCards
  by_seller: CommissionSummaryBySeller[]
}

export interface CommissionCalculateResult {
  created: number
  updated: number
  total: number
  details: Array<{ sale: string; status: string; reason?: string }>
  reference_month: string
}

export interface SellerWithRule {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  rule: {
    id: string
    percentage: number
    minimum_sales: number
    maximum_sales: number
    active: boolean
  } | null
}

// ===========================================================================
// Funil de Vendas
// ===========================================================================

export interface FunnelStage {
  label: string
  key: string
  count: number
  conversion: number
  drop_count: number
  value: number
}

export interface FunnelCards {
  total_opportunities: number
  closed_deals: number
  completed_sales: number
  general_conversion: number
  total_potential: number
  total_converted: number
  lost_count: number
  lost_value: number
}

export interface FunnelData {
  stages: FunnelStage[]
  cards: FunnelCards
}

// ===========================================================================
// Importação de Clientes
// ===========================================================================

export interface ClientImportRow {
  name?: string
  email?: string
  phone?: string
  document?: string
  cnpj?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  type?: string
  phone_whatsapp?: string
  telegram?: string
}

export interface ClientImportDetail {
  row: number
  name: string
  status: 'success' | 'duplicate' | 'error'
  reason?: string
  id?: string
}

export interface ClientImportResult {
  success: number
  duplicates: number
  errors: number
  details: ClientImportDetail[]
}
