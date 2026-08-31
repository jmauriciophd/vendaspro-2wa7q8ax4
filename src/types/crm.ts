import type { RecordModel } from 'pocketbase'

export type CustomerSize = 'pequeno' | 'medio' | 'grande'
export type CustomerStatus = 'ativo' | 'inativo'

export interface Customer extends RecordModel {
  id: string
  name: string
  cnpj?: string
  ie?: string
  owner_name?: string
  phone?: string
  phone_whatsapp?: string
  telegram?: string
  email?: string
  address?: string
  number?: string
  city?: string
  state?: string
  neighborhood?: string
  size?: CustomerSize
  status: CustomerStatus
  notes?: string
  created: string
  updated: string
}

export type ProductCategory = 'graos' | 'bebidas' | 'limpeza' | 'mercearia' | 'higiene' | 'outros'

export interface Product extends RecordModel {
  id: string
  name: string
  category: ProductCategory
  unit?: string
  code?: string
  stock?: number
  price: number
  ncm?: string
  cfop?: string
  active: boolean
  created: string
  updated: string
  expand?: {
    'sale_items(product)'?: SaleItem[]
  }
}

export type DealStage = 'prospeccao' | 'negociacao' | 'proposta' | 'fechado' | 'perdido'

export interface Deal extends RecordModel {
  id: string
  title: string
  customer: string
  value: number
  stage: DealStage
  expected_close_date?: string
  owner?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    customer?: Customer
    owner?: User
  }
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto'
export type PaymentStatus = 'pago' | 'pendente'

export interface Sale extends RecordModel {
  id: string
  customer: string
  seller?: string
  sale_date: string
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  notes?: string
  created: string
  updated: string
  expand?: {
    customer?: Customer
    seller?: User
    'sale_items(sale)'?: SaleItem[]
  }
}

export interface SaleItem extends RecordModel {
  id: string
  sale: string
  product: string
  quantity: number
  unit_price: number
  created: string
  updated: string
  expand?: {
    product?: Product
    sale?: Sale
  }
}

export type UserRole = 'admin' | 'gerente' | 'vendedor'

export type AppPermission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.disable'
  | 'users.delete'
  | 'audit.view'
  | 'commissions.view'
  | 'commissions.create'
  | 'commissions.edit'
  | 'commissions.approve'
  | 'commissions.pay'
  | 'reports.view'
  | 'reports.export'
  | 'settings.view'
  | 'settings.edit'
  | 'payments.view'
  | 'payments.create'
  | 'payments.send'
  | 'payments.cancel'
  | 'payments.refund'
  | 'payments.reconcile'
  | 'payments.providers.manage'

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: UserRole
  active?: boolean
  permissions?: AppPermission[] | string[]
  is_super_admin?: boolean
  created: string
  updated: string
}

export type AuditLogResult = 'success' | 'blocked' | 'error'

export interface AuditLog extends RecordModel {
  id: string
  actor?: string
  target?: string
  action: string
  module: string
  description?: string
  ip?: string
  user_agent?: string
  before?: Record<string, any>
  after?: Record<string, any>
  result: AuditLogResult
  created: string
  updated: string
  expand?: {
    actor?: User
    target?: User
  }
}

export interface CompanySettings extends RecordModel {
  id: string
  name: string
  cnpj?: string
  ie?: string
  im?: string
  address?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  cep?: string
  phone?: string
  email?: string
  email_subject?: string
  email_body?: string
  logo?: string
  created: string
  updated: string
}

export type EmailDocType = 'nfe' | 'promissoria'
export type EmailStatus = 'sent' | 'failed'

export interface EmailLog extends RecordModel {
  id: string
  sale?: string
  to_email: string
  subject?: string
  body?: string
  doc_type?: EmailDocType
  status?: EmailStatus
  error_message?: string
  sent_by?: string
  attachment_html?: string
  attachment_filename?: string
  created: string
  updated: string
  expand?: {
    sale?: Sale
    sent_by?: User
  }
}

export interface SalesTarget extends RecordModel {
  id: string
  user: string
  month: string // YYYY-MM
  target: number
  created: string
  updated: string
  expand?: {
    user?: User
  }
}

export type ReminderStatus = 'pending' | 'done'

export interface Reminder extends RecordModel {
  id: string
  deal: string
  user: string
  message: string
  due_date?: string
  status?: ReminderStatus
  created: string
  updated: string
  expand?: {
    deal?: Deal
    user?: User
  }
}
