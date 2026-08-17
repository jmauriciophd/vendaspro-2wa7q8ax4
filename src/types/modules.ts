// Tipos TypeScript para os novos módulos: Comissões, Funil, Importação de Clientes,
// Notificações, Metas por Categoria, Dashboard do Vendedor e Dashboard Admin.

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

// ===========================================================================
// Notificações
// ===========================================================================

export type NotificationType = 'commission' | 'order' | 'quote' | 'stock' | 'system'

export interface AppNotification extends RecordModel {
  id: string
  user: string
  type: NotificationType
  title: string
  message: string
  reference_type: string
  reference_id: string
  is_read: boolean
  created: string
  updated: string
}

export interface UnreadCount {
  count: number
}

// ===========================================================================
// Metas por Categoria
// ===========================================================================

export interface CategoryGoal extends RecordModel {
  id: string
  category: string
  target_value: number
  month: number
  year: number
  active: boolean
  created: string
  updated: string
  sales_value: number
  percentage: number
  remaining: number
  quantity: number
}

export interface CategoryGoalPerformance {
  category: string
  targetValue: number
  salesValue: number
  percentage: number
  remaining: number
  quantity: number
}

export interface CategoryGoalInput {
  category: string
  target_value: number
  month: number
  year: number
  active?: boolean
}

// ===========================================================================
// Dashboard do Vendedor
// ===========================================================================

export interface SellerDashboardSummary {
  salesToday: number
  salesMonth: number
  ordersMonth: number
  averageTicket: number
  commissionMonth: number
  goalPercentage: number
  targetValue: number
  commissionPending: number
  commissionApproved: number
  commissionPaid: number
}

export interface SellerRecentOrder {
  id: string
  sale_date: string
  total: number
  payment_method: string
  payment_status: string
  customer_name: string
}

export interface SellerCommission {
  id: string
  sale: string
  sale_ref: string
  sale_date: string
  customer_name: string
  sale_value: number
  commission_percentage: number
  commission_value: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  reference_month: string
  paid_at: string
}

export interface SellerGoals {
  id: string
  month: string
  targetValue: number
  salesValue: number
  percentage: number
}

export interface SellerTopProduct {
  id: string
  name: string
  quantity: number
  total: number
}

export interface SellerDashboard {
  seller: { id: string; name: string; email: string }
  summary: SellerDashboardSummary
  recentOrders: SellerRecentOrder[]
  commissions: {
    pending: number
    approved: number
    paid: number
    total: number
  }
  goals: {
    targetValue: number
    salesValue: number
    percentage: number
  }
  topProducts: SellerTopProduct[]
}

// ===========================================================================
// Dashboard Admin
// ===========================================================================

export interface AdminTeamPerformanceItem {
  seller: string
  name: string
  email: string
  salesValue: number
  ordersCount: number
  target: number
  percentage: number
  pendingCommission: number
  reachedGoal: boolean
}

export interface AdminTeamPerformance {
  reference_month: string
  ranking: AdminTeamPerformanceItem[]
  pending_commissions_count: number
  pending_commissions_value: number
  goals_reached: number
  total_sellers: number
}

export interface AdminCategoryBelow {
  category: string
  targetValue: number
  salesValue: number
  percentage: number
  remaining: number
}

export interface AdminCategoriesBelow {
  month: number
  year: number
  categories_below: AdminCategoryBelow[]
  count: number
}

// ===========================================================================
// Relatório de Desempenho por Vendedor
// ===========================================================================

export interface SellerPerformanceItem {
  seller: string
  name: string
  email: string
  role: string
  active: boolean
  salesValue: number
  ordersCount: number
  avgTicket: number
  commissionTotal: number
  goalPercentage: number
  goalTarget: number
  previousSalesValue: number
  variationPercent: number
  variationValue: number
  rank: number
}

export interface SellerPerformanceSummary {
  totalSales: number
  totalCommissions: number
  avgGoalPct: number
  bestSeller: string
  bestSellerValue: number
  totalOrders: number
  sellersCount: number
}

export interface SellerPerformanceReport {
  period: string
  previousPeriod: string
  ranking: SellerPerformanceItem[]
  summary: SellerPerformanceSummary
}

/** Item de evolução mensal de um vendedor (últimos 6 meses). */
export interface SellerMonthlyEvolution {
  period: string
  value: number
}
