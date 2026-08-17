import type { RecordModel } from 'pocketbase'

export type CustomerSize = 'pequeno' | 'medio' | 'grande'
export type CustomerStatus = 'ativo' | 'inativo'

export interface Customer extends RecordModel {
  id: string
  name: string
  cnpj?: string
  owner_name?: string
  phone?: string
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
  price: number
  active: boolean
  created: string
  updated: string
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

export interface User extends RecordModel {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
}
