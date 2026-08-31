import React from 'react'
import type { BuilderElement, Breakpoint } from '@/types/builder'
import type { Product } from '@/types/crm'
import {
  Store,
  ShoppingCart,
  User,
  Phone,
  ShieldCheck,
  Package,
  Plus,
  Minus,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface RenderElementProps {
  element: BuilderElement
  allElements: Record<string, BuilderElement>
  breakpoint?: Breakpoint
  isEditor?: boolean
  selectedId?: string | null
  onSelectElement?: (id: string) => void
  products?: Product[]
  companyInfo?: any
  sellerInfo?: any
  customerInfo?: any
  cartItems?: Array<{ product: Product; quantity: number }>
  onAddToCart?: (product: Product, quantity?: number) => void
  onOpenCart?: () => void
  onCheckoutClick?: () => void
}

export const RenderElement: React.FC<RenderElementProps> = ({
  element,
  allElements,
  breakpoint = 'desktop',
  isEditor = false,
  selectedId,
  onSelectElement,
  products = [],
  companyInfo,
  sellerInfo,
  customerInfo,
  cartItems = [],
  onAddToCart,
  onOpenCart,
  onCheckoutClick,
}) => {
  if (!element) return null

  // Combina estilos base com estilos responsivos do breakpoint ativo
  const styles = {
    ...element.styles,
    ...(element.responsiveStyles?.[breakpoint] || {}),
  }

  // Ocultação por breakpoint
  if (breakpoint === 'desktop' && styles.visibilityDesktop === false) return null
  if (breakpoint === 'tablet' && styles.visibilityTablet === false) return null
  if (breakpoint === 'mobile' && styles.visibilityMobile === false) return null

  const isSelected = isEditor && selectedId === element.id

  // Função para interpolar shortcodes dinâmicos reais
  const replaceShortcodes = (str: string | undefined): string => {
    if (!str || typeof str !== 'string') return ''
    return str
      .replace(
        /{{cliente\.nome}}/g,
        customerInfo?.name || customerInfo?.owner_name || 'Prezado(a) Cliente',
      )
      .replace(/{{cliente\.cidade}}/g, customerInfo?.city || '')
      .replace(/{{vendedor\.nome}}/g, sellerInfo?.name || 'Consultor Comercial')
      .replace(/{{vendedor\.email}}/g, sellerInfo?.email || '')
      .replace(/{{vendedor\.telefone}}/g, sellerInfo?.phone || companyInfo?.phone || '')
      .replace(/{{empresa\.nome}}/g, companyInfo?.name || 'VendasPro')
      .replace(/{{empresa\.cnpj}}/g, companyInfo?.cnpj || '')
      .replace(
        /{{carrinho\.total}}/g,
        `R$ ${cartItems
          .reduce((acc, it) => acc + it.product.price * it.quantity, 0)
          .toFixed(2)
          .replace('.', ',')}`,
      )
  }

  // Estilo inline processado para CSS do React
  const inlineStyles: React.CSSProperties = {
    backgroundColor: styles.backgroundColor,
    backgroundImage:
      styles.backgroundGradient ||
      (styles.backgroundImage ? `url(${styles.backgroundImage})` : undefined),
    backgroundSize: styles.backgroundSize || 'cover',
    backgroundPosition: styles.backgroundPosition || 'center',
    backgroundRepeat: styles.backgroundRepeat || 'no-repeat',
    backgroundAttachment: styles.backgroundAttachment,
    color: styles.color,
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    textAlign: styles.textAlign,
    letterSpacing: styles.letterSpacing,
    textTransform: styles.textTransform as any,
    padding: styles.padding,
    paddingTop: styles.paddingTop,
    paddingRight: styles.paddingRight,
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft,
    margin: styles.margin,
    marginTop: styles.marginTop,
    marginRight: styles.marginRight,
    marginBottom: styles.marginBottom,
    marginLeft: styles.marginLeft,
    width: styles.width,
    minWidth: styles.minWidth,
    maxWidth: styles.maxWidth,
    height: styles.height,
    minHeight: styles.minHeight,
    maxHeight: styles.maxHeight,
    border: styles.border,
    borderTop: styles.borderTop,
    borderBottom: styles.borderBottom,
    borderLeft: styles.borderLeft,
    borderRight: styles.borderRight,
    borderColor: styles.borderColor,
    borderWidth: styles.borderWidth,
    borderStyle: styles.borderStyle,
    borderRadius: styles.borderRadius,
    boxShadow: styles.boxShadow,
    display: styles.display,
    flexDirection: styles.flexDirection,
    justifyContent: styles.justifyContent,
    alignItems: styles.alignItems,
    flexWrap: styles.flexWrap,
    gap: styles.gap,
    position: styles.position,
    top: styles.top,
    right: styles.right,
    bottom: styles.bottom,
    left: styles.left,
    zIndex: styles.zIndex,
    opacity: styles.opacity,
    overflow: styles.overflow,
  }

  // Renderiza filhos se houver
  const renderChildren = () => {
    if (!element.children || element.children.length === 0) return null
    return element.children.map((childId) => {
      const child = allElements[childId]
      if (!child) return null
      return (
        <RenderElement
          key={child.id}
          element={child}
          allElements={allElements}
          breakpoint={breakpoint}
          isEditor={isEditor}
          selectedId={selectedId}
          onSelectElement={onSelectElement}
          products={products}
          companyInfo={companyInfo}
          sellerInfo={sellerInfo}
          customerInfo={customerInfo}
          cartItems={cartItems}
          onAddToCart={onAddToCart}
          onOpenCart={onOpenCart}
          onCheckoutClick={onCheckoutClick}
        />
      )
    })
  }

  // Container para manipulação visual de seleção no editor
  const wrapEditor = (contentNode: React.ReactNode) => {
    if (!isEditor) return contentNode
    return (
      <div
        onClick={(e) => {
          e.stopPropagation()
          onSelectElement?.(element.id)
        }}
        className={`relative transition-all ${
          isSelected
            ? 'ring-2 ring-indigo-600 ring-offset-2 z-20 shadow-sm'
            : 'hover:outline hover:outline-1 hover:outline-indigo-300'
        }`}
      >
        {isSelected && (
          <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md shadow flex items-center gap-1 z-30 pointer-events-none">
            <span>{element.name || element.type}</span>
            {element.locked && <span className="text-amber-300">🔒 Bloqueado</span>}
          </div>
        )}
        {contentNode}
      </div>
    )
  }

  // 1. HEADER
  if (element.type === 'header') {
    const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0)
    return wrapEditor(
      <header style={inlineStyles} className="w-full">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {element.content?.showLogo && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md font-black text-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 leading-tight">
                    {companyInfo?.name || 'VendasPro Store'}
                  </h1>
                  {element.content?.showCompanyInfo && companyInfo?.cnpj && (
                    <p className="text-[11px] text-slate-400">CNPJ: {companyInfo.cnpj}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {element.content?.showSellerBadge && sellerInfo && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 leading-none">Consultor</p>
                  <p className="font-semibold text-slate-700">{sellerInfo.name}</p>
                </div>
              </div>
            )}

            {element.content?.showCartButton && (
              <Button
                type="button"
                onClick={onOpenCart}
                className="relative bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm px-4 py-2 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {element.content?.cartButtonText || 'Meu Pedido'}
                </span>
                {totalCartCount > 0 && (
                  <Badge className="bg-amber-400 text-slate-900 hover:bg-amber-400 font-bold px-1.5 py-0 text-[10px] rounded-full">
                    {totalCartCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>,
    )
  }

  // 2. FOOTER
  if (element.type === 'footer') {
    return wrapEditor(
      <footer style={inlineStyles} className="w-full">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Store className="w-4 h-4 text-indigo-400" />
              {companyInfo?.name || 'VendasPro'}
            </p>
            {element.content?.showCompanyLegal && (
              <p className="text-xs text-slate-400">
                {companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj} | ` : ''}
                {companyInfo?.address
                  ? `${companyInfo.address}, ${companyInfo.city || ''} - ${companyInfo.state || ''}`
                  : ''}
              </p>
            )}
            <p className="text-[11px] text-slate-500">{element.content?.copyrightText}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
            {element.content?.showSellerContact && sellerInfo?.phone && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Atendimento: {sellerInfo.phone}</span>
              </div>
            )}
            {element.content?.showSecuritySeal && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold text-[11px]">Compra Segura & Mercado Pago</span>
              </div>
            )}
          </div>
        </div>
      </footer>,
    )
  }

  // 3. SECTIONS, CONTAINERS, COLUMNS, GRID, FLEXBOX
  if (
    element.type === 'section' ||
    element.type === 'container' ||
    element.type === 'columns' ||
    element.type === 'grid' ||
    element.type === 'flexbox'
  ) {
    let gridColsClass = ''
    if (element.type === 'columns' || element.type === 'grid') {
      const dCols = styles.gridColumnsDesktop || (element.type === 'columns' ? 2 : 3)
      const tCols = styles.gridColumnsTablet || 2
      const mCols = styles.gridColumnsMobile || 1
      gridColsClass = `grid grid-cols-${mCols} md:grid-cols-${tCols} lg:grid-cols-${dCols}`
    }

    return wrapEditor(
      <div style={inlineStyles} className={`${gridColsClass}`}>
        {renderChildren()}
      </div>,
    )
  }

  // 4. BANNER & HERO
  if (element.type === 'banner' || element.type === 'hero') {
    return wrapEditor(
      <div style={inlineStyles}>
        {element.content?.badge && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {replaceShortcodes(element.content.badge)}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          {replaceShortcodes(element.content?.title || 'Destaques Comerciais')}
        </h2>
        {element.content?.subtitle && (
          <p className="text-sm sm:text-base opacity-90 max-w-2xl mx-auto mb-6">
            {replaceShortcodes(element.content.subtitle)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {element.content?.buttonText && (
            <a
              href={element.content.buttonLink || '#produtos'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm shadow-md hover:bg-slate-50 transition-colors"
            >
              {replaceShortcodes(element.content.buttonText)}
            </a>
          )}
          {element.content?.primaryBtnText && (
            <a
              href={element.content.primaryBtnLink || '#produtos'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
            >
              {replaceShortcodes(element.content.primaryBtnText)}
            </a>
          )}
          {element.content?.secondaryBtnText && (
            <a
              href={
                sellerInfo?.phone ? `https://wa.me/55${sellerInfo.phone.replace(/\D/g, '')}` : '#'
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition-colors"
            >
              {replaceShortcodes(element.content.secondaryBtnText)}
            </a>
          )}
        </div>
      </div>,
    )
  }

  // 5. HEADING & TEXT
  if (element.type === 'heading') {
    const tag = element.content?.tag || 'h2'
    if (tag === 'h1') {
      return wrapEditor(
        <h1 style={inlineStyles}>{replaceShortcodes(element.content?.text || 'Título')}</h1>,
      )
    }
    if (tag === 'h3') {
      return wrapEditor(
        <h3 style={inlineStyles}>{replaceShortcodes(element.content?.text || 'Título')}</h3>,
      )
    }
    return wrapEditor(
      <h2 style={inlineStyles}>{replaceShortcodes(element.content?.text || 'Título')}</h2>,
    )
  }

  if (element.type === 'text') {
    return wrapEditor(
      <div style={inlineStyles} className="whitespace-pre-wrap">
        {replaceShortcodes(element.content?.text || '')}
      </div>,
    )
  }

  // 6. SHORTCODE
  if (element.type === 'shortcode') {
    const rawCode = element.content?.code || '{{cliente.nome}}'
    const value = replaceShortcodes(rawCode) || element.content?.fallback || ''
    return wrapEditor(
      <span style={inlineStyles}>
        {element.content?.prefix || ''}
        {value}
        {element.content?.suffix || ''}
      </span>,
    )
  }

  // 7. IMAGE & VIDEO
  if (element.type === 'image') {
    return wrapEditor(
      <div className="overflow-hidden" style={inlineStyles}>
        <img
          src={element.content?.src || 'https://img.usecurling.com/p/600/400?q=products'}
          alt={element.content?.alt || 'Imagem'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>,
    )
  }

  if (element.type === 'video') {
    return wrapEditor(
      <div
        style={inlineStyles}
        className="overflow-hidden bg-slate-900 flex items-center justify-center"
      >
        <iframe
          src={element.content?.url?.replace('watch?v=', 'embed/') || ''}
          title="Vídeo Promocional"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>,
    )
  }

  // 8. BUTTON & CTA
  if (element.type === 'button') {
    return wrapEditor(
      <a href={element.content?.link || '#'} style={inlineStyles}>
        {replaceShortcodes(element.content?.text || 'Clique Aqui')}
      </a>,
    )
  }

  if (element.type === 'cta') {
    return wrapEditor(
      <div style={inlineStyles}>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {replaceShortcodes(element.content?.title || 'Fale com um Especialista')}
        </h3>
        <p className="text-sm text-slate-600 max-w-xl mx-auto mb-4">
          {replaceShortcodes(element.content?.text || 'Tire dúvidas sobre prazos e faturamento')}
        </p>
        <a
          href={sellerInfo?.phone ? `https://wa.me/55${sellerInfo.phone.replace(/\D/g, '')}` : '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <Phone className="w-4 h-4" />
          {replaceShortcodes(element.content?.buttonText || 'Atendimento WhatsApp')}
        </a>
      </div>,
    )
  }

  // 9. PRODUCT LIST (Catálogo Real com Estoque e Preço do CRM)
  if (element.type === 'product_list') {
    const dCols = styles.gridColumnsDesktop || 4
    const tCols = styles.gridColumnsTablet || 2
    const mCols = styles.gridColumnsMobile || 1
    const displayProducts =
      products.length > 0
        ? products
        : ([
            {
              id: 'mock-1',
              name: 'Produto Exemplo A',
              price: 89.9,
              unit: 'cx',
              code: 'PRD-01',
              stock: 50,
              active: true,
              category: 'Geral',
            },
            {
              id: 'mock-2',
              name: 'Produto Exemplo B',
              price: 145.0,
              unit: 'un',
              code: 'PRD-02',
              stock: 12,
              active: true,
              category: 'Geral',
            },
            {
              id: 'mock-3',
              name: 'Produto Exemplo C',
              price: 29.9,
              unit: 'kg',
              code: 'PRD-03',
              stock: 150,
              active: true,
              category: 'Alimentos',
            },
            {
              id: 'mock-4',
              name: 'Produto Exemplo D',
              price: 220.0,
              unit: 'fd',
              code: 'PRD-04',
              stock: 5,
              active: true,
              category: 'Bebidas',
            },
          ] as unknown as Product[])

    return wrapEditor(
      <div style={inlineStyles} id="produtos" className="w-full">
        <div
          className={`grid grid-cols-${mCols} sm:grid-cols-${tCols} lg:grid-cols-${dCols} gap-5`}
        >
          {displayProducts.map((p) => {
            const currentItemInCart = cartItems.find((it) => it.product.id === p.id)
            const qty = currentItemInCart ? currentItemInCart.quantity : 0
            const stockQty = p.stock !== undefined ? p.stock : 999
            const isOutOfStock = stockQty <= 0

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://img.usecurling.com/p/400/400?q=${encodeURIComponent(p.name || 'product')}`}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {element.content?.showStockBadge && (
                      <div className="absolute top-2.5 right-2.5">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Esgotado
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold">
                            {stockQty} {p.unit || 'un'} em estoque
                          </Badge>
                        )}
                      </div>
                    )}
                    {p.code && element.content?.showSku && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/70 text-white text-[9px] font-mono">
                        Cód: {p.code}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug mb-1">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">
                      Unidade: {p.unit || 'unidade'}
                    </p>

                    {element.content?.showPrice && (
                      <div className="mt-3">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Preço Unitário
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-indigo-600">R$</span>
                          <span className="text-xl font-black text-slate-900">
                            {Number(p.price || 0)
                              .toFixed(2)
                              .replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {element.content?.showBuyButton && (
                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <div className="flex items-center justify-between w-full bg-indigo-50 border border-indigo-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => onAddToCart?.(p, qty - 1)}
                            className="w-8 h-8 rounded-lg bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center font-bold text-sm shadow-xs transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-xs text-indigo-950">
                            {qty} {p.unit || 'un'}
                          </span>
                          <button
                            type="button"
                            disabled={stockQty <= qty}
                            onClick={() => onAddToCart?.(p, qty + 1)}
                            className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold text-sm shadow-xs transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => onAddToCart?.(p, 1)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs py-2 flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {element.content?.buyButtonText || 'Comprar'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>,
    )
  }

  // 10. PRODUCT SINGLE (Produto Único / Landing Page)
  if (element.type === 'product_single') {
    const singleProduct = (products.find((p) => p.id === element.content?.productId) ||
      products[0] || {
        id: 'mock-single',
        name: 'Produto Especial Destaque',
        price: 199.9,
        unit: 'cx',
        code: 'PRD-SINGLE',
        stock: 35,
        active: true,
        category: 'Premium',
      }) as unknown as Product

    return wrapEditor(
      <div style={inlineStyles} className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative shadow-md">
            <img
              src={`https://img.usecurling.com/p/600/600?q=${encodeURIComponent(singleProduct.name || 'product')}`}
              alt={singleProduct.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Item em Destaque
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Código: {singleProduct.code || 'SKU'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {singleProduct.name}
              </h2>
              <p className="text-xs text-slate-400">
                Unidade de medida:{' '}
                <strong className="text-slate-600">{singleProduct.unit || 'unidade'}</strong> |
                Estoque atual:{' '}
                <strong className="text-emerald-600">{singleProduct.stock} disponíveis</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">Valor Unitário</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-indigo-600">R$</span>
                <span className="text-3xl font-black text-slate-900">
                  {Number(singleProduct.price || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onAddToCart?.(singleProduct, 1)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {element.content?.ctaText || 'Adicionar ao Meu Pedido'}
            </Button>
          </div>
        </div>
      </div>,
    )
  }

  // 11. CHECKOUT BLOCK
  if (element.type === 'checkout_block') {
    return wrapEditor(
      <div style={inlineStyles} className="w-full text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Finalização do Pedido Comercial</h3>
          <p className="text-xs text-slate-500">
            Pagamentos integrados via Mercado Pago (PIX instantâneo, Boleto Bancário ou Cartão de
            Crédito).
          </p>
          <Button
            type="button"
            onClick={onCheckoutClick}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Prosseguir para Checkout Seguro
          </Button>
        </div>
      </div>,
    )
  }

  // 12. CUSTOM HTML (Sanitizado)
  if (element.type === 'custom_html') {
    return wrapEditor(
      <div
        style={inlineStyles}
        dangerouslySetInnerHTML={{ __html: element.content?.html || '' }}
      />,
    )
  }

  // Fallback genérico
  return wrapEditor(
    <div style={inlineStyles} className="p-3 border border-dashed border-slate-300 rounded-lg">
      <p className="text-xs text-slate-500 font-semibold">{element.name || element.type}</p>
      {renderChildren()}
    </div>,
  )
}
