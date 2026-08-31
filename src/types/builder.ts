import type { RecordModel } from 'pocketbase'
import type { Customer, User, Product } from './crm'

export type PageBuilderElementType =
  | 'header'
  | 'footer'
  | 'section'
  | 'container'
  | 'columns'
  | 'grid'
  | 'flexbox'
  | 'heading'
  | 'text'
  | 'image'
  | 'video'
  | 'button'
  | 'icon'
  | 'divider'
  | 'spacer'
  | 'banner'
  | 'hero'
  | 'cta'
  | 'gallery'
  | 'slider'
  | 'product_single'
  | 'product_list'
  | 'category_nav'
  | 'price_badge'
  | 'stock_badge'
  | 'quantity_selector'
  | 'cart_button'
  | 'cart_summary'
  | 'checkout_block'
  | 'table'
  | 'list'
  | 'custom_html'
  | 'custom_css'
  | 'shortcode'

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export interface ElementStyles {
  // Cores e Fundo
  backgroundColor?: string
  backgroundGradient?: string
  backgroundImage?: string
  backgroundSize?: 'cover' | 'contain' | 'auto' | '100% 100%'
  backgroundPosition?: string
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
  backgroundAttachment?: 'scroll' | 'fixed'
  color?: string

  // Tipografia
  fontFamily?: string
  fontSize?: string
  fontWeight?: string | number
  lineHeight?: string | number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  letterSpacing?: string
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'

  // Espaçamento e Dimensões
  padding?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  margin?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  width?: string
  minWidth?: string
  maxWidth?: string
  height?: string
  minHeight?: string
  maxHeight?: string

  // Bordas e Sombra
  border?: string
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
  borderColor?: string
  borderWidth?: string
  borderStyle?: string
  borderRadius?: string
  boxShadow?: string

  // Layout Flex e Grid
  display?: string
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap?: string
  gridColumnsDesktop?: number
  gridColumnsTablet?: number
  gridColumnsMobile?: number

  // Posicionamento e Visibilidade
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  top?: string
  right?: string
  bottom?: string
  left?: string
  zIndex?: number
  opacity?: number
  visibilityDesktop?: boolean
  visibilityTablet?: boolean
  visibilityMobile?: boolean
  overflow?: string
}

export interface ResponsiveStyles {
  desktop?: ElementStyles
  tablet?: ElementStyles
  mobile?: ElementStyles
}

export interface BuilderElement {
  id: string
  type: PageBuilderElementType
  name?: string
  locked?: boolean
  styles?: ElementStyles
  responsiveStyles?: ResponsiveStyles
  content?: Record<string, any>
  children?: string[] // IDs dos elementos filhos
}

export interface PageLayoutData {
  root: {
    id: 'root'
    type: 'page'
    styles?: ElementStyles
    children: string[]
  }
  elements: Record<string, BuilderElement>
}

export type TemplateCategory =
  | 'catalogo'
  | 'oferta'
  | 'campanha'
  | 'atacado'
  | 'promocao'
  | 'premium'
  | 'produto'
  | 'landing_page'

export interface PageTemplate extends RecordModel {
  id: string
  title: string
  slug: string
  category: TemplateCategory
  description?: string
  thumbnail?: string
  thumbnail_url?: string
  layout_data: PageLayoutData
  settings?: Record<string, any>
  is_system_default?: boolean
  is_active?: boolean
  created_by?: string
  created: string
  updated: string
  expand?: {
    created_by?: User
  }
}

export type PageStatus = 'draft' | 'published' | 'paused' | 'archived' | 'expired'
export type PageType = 'catalogo' | 'landing_page' | 'oferta_especial' | 'link_direto'
export type PageVisibility = 'public' | 'private' | 'exclusive_customer'

export interface SalePage extends RecordModel {
  id: string
  title: string
  slug: string
  access_token: string
  type: PageType
  status: PageStatus
  visibility: PageVisibility
  template?: string
  seller?: string
  target_customer?: string
  campaign_name?: string
  start_date?: string
  end_date?: string
  layout_data: PageLayoutData
  settings?: Record<string, any>
  seo_title?: string
  seo_description?: string
  seo_image?: string
  custom_css?: string
  custom_js?: string
  custom_html?: string
  views_count?: number
  orders_count?: number
  sales_total?: number
  version?: number
  created_by?: string
  created: string
  updated: string
  expand?: {
    template?: PageTemplate
    seller?: User
    target_customer?: Customer
    created_by?: User
  }
}

export interface PageVersion extends RecordModel {
  id: string
  page?: string
  template?: string
  version_number: number
  notes?: string
  layout_data: PageLayoutData
  settings?: Record<string, any>
  created_by?: string
  created: string
  updated: string
  expand?: {
    created_by?: User
  }
}

export interface MediaAsset extends RecordModel {
  id: string
  title: string
  file: string
  alt_text?: string
  file_type?: string
  file_size?: number
  width?: number
  height?: number
  uploaded_by?: string
  created: string
  updated: string
  expand?: {
    uploaded_by?: User
  }
}

export type AnalyticsEventType =
  | 'page_view'
  | 'product_click'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_step'
  | 'order_completed'

export interface AnalyticsEvent extends RecordModel {
  id: string
  page: string
  event_type: AnalyticsEventType
  customer?: string
  seller?: string
  product_id?: string
  device_type?: string
  referrer?: string
  ip_address?: string
  user_agent?: string
  payload?: Record<string, any>
  created: string
  updated: string
}

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface OrderCheckoutPayload {
  page_id: string
  customer_id: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price?: number
  }>
  payment_method: 'pix' | 'boleto' | 'credit_card' | 'debit_card' | 'link'
  installments?: number
  shipping_address?: {
    address: string
    number: string
    neighborhood: string
    city: string
    state: string
    cep?: string
    notes?: string
  }
  order_notes?: string
}

export interface OrderCheckoutResponse {
  success: boolean
  message: string
  sale: {
    id: string
    order_number: string
    total: number
    items_count: number
    customer_name: string
    created: string
  }
  payment_charge?: {
    id: string
    external_charge_id: string
    payment_method: string
    final_amount: number
    payment_url: string
    pix_code: string
    pix_qrcode: string
    boleto_url: string
    boleto_digitable_line: string
    expires_at: string
  }
  payment_warning?: string
}
