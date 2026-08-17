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

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: UserRole
  active?: boolean
  created: string
  updated: string
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
