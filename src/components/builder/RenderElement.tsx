import React, { useState } from 'react'
import type { BuilderElement, Breakpoint } from '@/types/builder'
import type { Product } from '@/types/crm'
import {
  Store,
  ShoppingCart,
  User,
  Phone,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  CheckCircle2,
  Play,
  Copy,
  Trash2,
  ArrowUp,
  Move,
  Edit2,
  Check,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface RenderElementProps {
  element: BuilderElement
  allElements: Record<string, BuilderElement>
  parentElement?: BuilderElement | null
  breakpoint?: Breakpoint
  isEditor?: boolean
  selectedId?: string | null
  onSelectElement?: (id: string) => void
  onUpdateElement?: (updated: BuilderElement) => void
  onDuplicateElement?: (id: string) => void
  onDeleteElement?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  onAddChild?: (parentId: string, type: string) => void
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
  parentElement,
  breakpoint = 'desktop',
  isEditor = false,
  selectedId,
  onSelectElement,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onMoveUp,
  onMoveDown,
  onAddChild,
  products = [],
  companyInfo,
  sellerInfo,
  customerInfo,
  cartItems = [],
  onAddToCart,
  onOpenCart,
  onCheckoutClick,
}) => {
  // Estado local para edição inline de textos e títulos via duplo clique
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTextValue, setInlineTextValue] = useState('')

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
          .reduce((acc, it) => acc + (it.product.price || 0) * it.quantity, 0)
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
    position: (styles.position as any) || (element.layoutMode === 'free' ? 'absolute' : undefined),
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
    if (!element.children || element.children.length === 0) {
      if (
        isEditor &&
        (element.type === 'section' ||
          element.type === 'container' ||
          element.type === 'card' ||
          element.type === 'flexbox' ||
          element.type === 'grid' ||
          element.type === 'columns')
      ) {
        return (
          <div className="w-full p-4 border border-dashed border-indigo-300 rounded-lg bg-indigo-50/40 text-center flex flex-col items-center justify-center gap-1.5 my-1">
            <p className="text-xs font-semibold text-indigo-900">
              {element.name || element.type} (Vazio)
            </p>
            <p className="text-[10px] text-slate-500">
              Arraste elementos para cá ou adicione novos filhos
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild?.(element.id, 'text')
              }}
              className="h-6 text-[11px] bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-200 mt-1"
            >
              <Plus className="w-3 h-3 mr-1" /> Adicionar Elemento
            </Button>
          </div>
        )
      }
      return null
    }

    return element.children.map((childId) => {
      const child = allElements[childId]
      if (!child) return null
      return (
        <RenderElement
          key={child.id}
          element={child}
          allElements={allElements}
          parentElement={element}
          breakpoint={breakpoint}
          isEditor={isEditor}
          selectedId={selectedId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          onDuplicateElement={onDuplicateElement}
          onDeleteElement={onDeleteElement}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onAddChild={onAddChild}
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

  // Wrapper contextual para edição, seleção, toolbar e badges no canvas
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
            ? 'outline-2 outline-indigo-600 outline-offset-1 z-20 shadow-xs'
            : 'hover:outline hover:outline-1 hover:outline-indigo-300'
        }`}
      >
        {/* Toolbar Flutuante de Seleção */}
        {isSelected && (
          <div className="absolute -top-7 left-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md shadow flex items-center gap-2 z-30">
            <span className="uppercase tracking-wider">{element.name || element.type}</span>

            {parentElement && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectElement?.(parentElement.id)
                }}
                className="hover:text-indigo-200 flex items-center gap-0.5 border-l border-indigo-400 pl-1.5"
                title="Selecionar Pai"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Pai</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicateElement?.(element.id)
              }}
              className="hover:text-indigo-200 border-l border-indigo-400 pl-1.5"
              title="Duplicar"
            >
              <Copy className="w-3 h-3" />
            </button>

            {!element.locked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteElement?.(element.id)
                }}
                className="hover:text-rose-200 border-l border-indigo-400 pl-1.5"
                title="Excluir"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        {contentNode}
      </div>
    )
  }

  // 1. HEADER (Desconstruído e editável)
  if (element.type === 'header') {
    const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0)
    return wrapEditor(
      <header style={inlineStyles} className="w-full">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {element.content?.showLogo !== false && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md font-black text-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 leading-tight">
                    {companyInfo?.name || 'VendasPro Store'}
                  </h1>
                  {element.content?.showCompanyInfo !== false && companyInfo?.cnpj && (
                    <p className="text-[11px] text-slate-400">CNPJ: {companyInfo.cnpj}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {element.content?.showSellerBadge !== false && sellerInfo && (
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

            {element.content?.showCartButton !== false && (
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
        {renderChildren()}
      </header>,
    )
  }

  // 2. FOOTER (Editável)
  if (element.type === 'footer') {
    return wrapEditor(
      <footer style={inlineStyles} className="w-full">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Store className="w-4 h-4 text-indigo-400" />
              {companyInfo?.name || 'VendasPro'}
            </p>
            {element.content?.showCompanyLegal !== false && (
              <p className="text-xs text-slate-400">
                {companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj} | ` : ''}
                {companyInfo?.address
                  ? `${companyInfo.address}, ${companyInfo.city || ''} - ${companyInfo.state || ''}`
                  : ''}
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              {element.content?.copyrightText ||
                'Todos os direitos reservados. Faturamento e entrega sob regras comerciais.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
            {element.content?.showSellerContact !== false && sellerInfo?.phone && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Atendimento: {sellerInfo.phone}</span>
              </div>
            )}
            {element.content?.showSecuritySeal !== false && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold text-[11px]">Compra Segura & Mercado Pago</span>
              </div>
            )}
          </div>
        </div>
        {renderChildren()}
      </footer>,
    )
  }

  // 3. SECTIONS, CONTAINERS, CARD, COLUMNS, GRID, FLEXBOX
  if (
    element.type === 'section' ||
    element.type === 'container' ||
    element.type === 'card' ||
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

  // 4. BANNER & HERO (Seção composta com filhos ou renderização de fallback)
  if (element.type === 'banner' || element.type === 'hero') {
    // Se tiver filhos, renderiza como container flexível
    if (element.children && element.children.length > 0) {
      return wrapEditor(
        <div style={inlineStyles} className="w-full">
          {renderChildren()}
        </div>,
      )
    }

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

  // 5. HEADING & TEXT (Com suporte a edição inline com duplo clique)
  if (element.type === 'heading') {
    const tag = element.content?.tag || 'h2'
    const textVal = element.content?.text || 'Título'

    if (isInlineEditing && isEditor) {
      return wrapEditor(
        <input
          autoFocus
          value={inlineTextValue}
          onChange={(e) => setInlineTextValue(e.target.value)}
          onBlur={() => {
            setIsInlineEditing(false)
            onUpdateElement?.({
              ...element,
              content: { ...(element.content || {}), text: inlineTextValue },
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsInlineEditing(false)
              onUpdateElement?.({
                ...element,
                content: { ...(element.content || {}), text: inlineTextValue },
              })
            }
          }}
          className="w-full bg-white border border-indigo-500 rounded px-2 py-1 text-slate-900"
          style={inlineStyles}
        />,
      )
    }

    const headingContent = replaceShortcodes(textVal)
    const handleDoubleClick = (e: React.MouseEvent) => {
      if (isEditor) {
        e.stopPropagation()
        setInlineTextValue(textVal)
        setIsInlineEditing(true)
      }
    }

    if (tag === 'h1') {
      return wrapEditor(
        <h1 style={inlineStyles} onDoubleClick={handleDoubleClick}>
          {headingContent}
        </h1>,
      )
    }
    if (tag === 'h3') {
      return wrapEditor(
        <h3 style={inlineStyles} onDoubleClick={handleDoubleClick}>
          {headingContent}
        </h3>,
      )
    }
    return wrapEditor(
      <h2 style={inlineStyles} onDoubleClick={handleDoubleClick}>
        {headingContent}
      </h2>,
    )
  }

  if (element.type === 'text') {
    const textVal = element.content?.text || ''

    if (isInlineEditing && isEditor) {
      return wrapEditor(
        <textarea
          autoFocus
          rows={3}
          value={inlineTextValue}
          onChange={(e) => setInlineTextValue(e.target.value)}
          onBlur={() => {
            setIsInlineEditing(false)
            onUpdateElement?.({
              ...element,
              content: { ...(element.content || {}), text: inlineTextValue },
            })
          }}
          className="w-full bg-white border border-indigo-500 rounded p-2 text-xs text-slate-900"
          style={inlineStyles}
        />,
      )
    }

    return wrapEditor(
      <div
        style={inlineStyles}
        className="whitespace-pre-wrap"
        onDoubleClick={(e) => {
          if (isEditor) {
            e.stopPropagation()
            setInlineTextValue(textVal)
            setIsInlineEditing(true)
          }
        }}
      >
        {replaceShortcodes(textVal)}
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

  // 7. IMAGE
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

  // 8. VÍDEO (Neutro e totalmente configurável, sem demo fixo inadequado)
  if (element.type === 'video') {
    const videoUrl = element.content?.url || ''

    if (!videoUrl) {
      return wrapEditor(
        <div
          style={inlineStyles}
          className="bg-slate-900 text-slate-400 p-8 flex flex-col items-center justify-center text-center aspect-video rounded-xl"
        >
          <Play className="w-10 h-10 text-indigo-400 mb-2 opacity-80" />
          <p className="text-xs font-bold text-white">Vídeo Promocional</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            {isEditor
              ? 'Selecione este componente e informe a URL do vídeo (YouTube/Vimeo) no painel de propriedades.'
              : 'Nenhum vídeo configurado.'}
          </p>
        </div>,
      )
    }

    let embedUrl = videoUrl
    if (videoUrl.includes('youtube.com/watch?v=')) {
      embedUrl = videoUrl.replace('watch?v=', 'embed/')
    } else if (videoUrl.includes('youtu.be/')) {
      embedUrl = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/')
    } else if (videoUrl.includes('vimeo.com/') && !videoUrl.includes('player.vimeo.com')) {
      embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')
    }

    return wrapEditor(
      <div
        style={inlineStyles}
        className="overflow-hidden bg-slate-900 flex items-center justify-center rounded-xl aspect-video"
      >
        <iframe
          src={embedUrl}
          title="Vídeo do Catálogo"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>,
    )
  }

  // 9. BUTTON & CTA
  if (element.type === 'button') {
    const btnText = element.content?.text || 'Clique Aqui'
    return wrapEditor(
      <button
        type="button"
        onClick={() => {
          if (!isEditor) {
            if (element.content?.actionType === 'open_cart') onOpenCart?.()
            else if (element.content?.actionType === 'open_checkout') onCheckoutClick?.()
          }
        }}
        style={inlineStyles}
        className="cursor-pointer"
      >
        {replaceShortcodes(btnText)}
      </button>,
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

  // 10. PRODUCT LIST (Catálogo Real com Produtos do CRM)
  if (element.type === 'product_list') {
    const dCols = styles.gridColumnsDesktop || 4
    const tCols = styles.gridColumnsTablet || 2
    const mCols = styles.gridColumnsMobile || 1
    const displayProducts = products.length > 0 ? products : []

    if (displayProducts.length === 0) {
      return wrapEditor(
        <div
          style={inlineStyles}
          className="w-full p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl"
        >
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">
            Nenhum produto cadastrado no catálogo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre produtos reais no módulo de Produtos para exibi-los nesta grade.
          </p>
        </div>,
      )
    }

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
                    {element.content?.showStockBadge !== false && (
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
                    {p.code && element.content?.showSku !== false && (
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

                    {element.content?.showPrice !== false && (
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
                  {element.content?.showBuyButton !== false && (
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

  // 11. PRODUCT SINGLE (Produto em Destaque — Decomposto em subcomponentes ou filhos)
  if (element.type === 'product_single') {
    const selectedProd = products.find((p) => p.id === element.content?.productId) || products[0]

    if (!selectedProd) {
      return wrapEditor(
        <div
          style={inlineStyles}
          className="w-full p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl"
        >
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">Nenhum produto real selecionado</p>
          <p className="text-[10px] text-slate-400 mt-1">
            Selecione um produto do cadastro no painel de propriedades.
          </p>
        </div>,
      )
    }

    // Se tiver filhos configurados na subárvore, renderiza a árvore de filhos
    if (element.children && element.children.length > 0) {
      return wrapEditor(
        <div style={inlineStyles} className="w-full">
          {renderChildren()}
        </div>,
      )
    }

    return wrapEditor(
      <div style={inlineStyles} className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative shadow-md">
            <img
              src={`https://img.usecurling.com/p/600/600?q=${encodeURIComponent(selectedProd.name || 'product')}`}
              alt={selectedProd.name}
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
                Código: {selectedProd.code || 'SKU'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {selectedProd.name}
              </h2>
              <p className="text-xs text-slate-400">
                Unidade de medida:{' '}
                <strong className="text-slate-600">{selectedProd.unit || 'unidade'}</strong> |
                Estoque atual:{' '}
                <strong className="text-emerald-600">{selectedProd.stock || 0} disponíveis</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">Valor Unitário</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-indigo-600">R$</span>
                <span className="text-3xl font-black text-slate-900">
                  {Number(selectedProd.price || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onAddToCart?.(selectedProd, 1)}
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

  // 12. SUBCOMPONENTES DE PRODUTO (product_name, product_price, product_stock, product_image, product_card)
  if (element.type === 'product_card') {
    return wrapEditor(
      <div style={inlineStyles} className="w-full flex flex-col justify-between">
        {renderChildren()}
      </div>,
    )
  }

  if (element.type === 'product_name') {
    const text =
      element.content?.useDynamic === false
        ? element.content?.customText || 'Nome do Produto'
        : products[0]?.name || 'Nome do Produto Dinâmico'
    return wrapEditor(<h3 style={inlineStyles}>{replaceShortcodes(text)}</h3>)
  }

  if (element.type === 'product_price') {
    const priceVal = products[0]?.price || 0
    return wrapEditor(
      <div style={inlineStyles}>
        {element.content?.labelPrefix && (
          <span className="text-xs text-slate-400 block">{element.content.labelPrefix}</span>
        )}
        <span className="text-xs font-bold mr-1">R$</span>
        <span>{Number(priceVal).toFixed(2).replace('.', ',')}</span>
      </div>,
    )
  }

  if (element.type === 'product_image') {
    const src =
      element.content?.useDynamic === false
        ? element.content?.customSrc || 'https://img.usecurling.com/p/400/400?q=product'
        : `https://img.usecurling.com/p/400/400?q=${encodeURIComponent(products[0]?.name || 'product')}`
    return wrapEditor(
      <div style={inlineStyles} className="overflow-hidden">
        <img src={src} alt="Produto" className="w-full h-full object-cover" />
      </div>,
    )
  }

  // 13. CART SUMMARY (Isolado e sem vídeo indesejado)
  if (element.type === 'cart_summary') {
    const totalCart = cartItems.reduce((acc, it) => acc + (it.product.price || 0) * it.quantity, 0)
    return wrapEditor(
      <div style={inlineStyles} className="w-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            {element.content?.title || 'Resumo do Pedido'}
          </h3>
          <Badge variant="outline" className="text-xs">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <p className="text-xs">Nenhum produto adicionado ao pedido ainda.</p>
          </div>
        ) : (
          <div className="py-3 space-y-2">
            {cartItems.map((it) => (
              <div key={it.product.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium truncate max-w-[200px]">
                  {it.quantity}x {it.product.name}
                </span>
                <span className="font-bold text-slate-900">
                  R$ {((it.product.price || 0) * it.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm text-slate-900">
              <span>Total:</span>
              <span className="text-indigo-600">R$ {totalCart.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        )}
        {renderChildren()}
      </div>,
    )
  }

  // 14. CHECKOUT BLOCK
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

  // 15. CUSTOM HTML
  if (element.type === 'custom_html') {
    return wrapEditor(
      <div
        style={inlineStyles}
        dangerouslySetInnerHTML={{ __html: element.content?.html || '' }}
      />,
    )
  }

  // Fallback padrão com renderização de filhos
  return wrapEditor(
    <div style={inlineStyles} className="p-3 border border-dashed border-slate-300 rounded-lg">
      <p className="text-xs text-slate-500 font-semibold">{element.name || element.type}</p>
      {renderChildren()}
    </div>,
  )
}
