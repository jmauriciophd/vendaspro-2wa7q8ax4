import type { PageBuilderElementType } from '@/types/builder'

export interface BuilderElementMeta {
  type: PageBuilderElementType
  label: string
  category: 'layout' | 'basic' | 'commerce' | 'marketing' | 'advanced'
  icon: string
  description: string
  canHaveChildren?: boolean
  allowedChildren?: PageBuilderElementType[]
  defaultContent: Record<string, any>
  defaultStyles: Record<string, any>
  // Estrutura pré-fabricada de filhos se este elemento nascer como composto
  initialChildrenTemplates?: Array<{
    type: PageBuilderElementType
    name: string
    styles?: Record<string, any>
    content?: Record<string, any>
  }>
}

export const ELEMENT_DEFINITIONS: BuilderElementMeta[] = [
  // LAYOUT
  {
    type: 'header',
    label: 'Cabeçalho / Header',
    category: 'layout',
    icon: 'PanelTop',
    canHaveChildren: true,
    description: 'Logo, dados da empresa, vendedor e botão do pedido editáveis internamente.',
    defaultContent: {
      showLogo: true,
      showCompanyInfo: true,
      showSellerBadge: true,
      showCartButton: true,
      cartButtonText: 'Meu Pedido',
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '16px 24px',
      width: '100%',
    },
  },
  {
    type: 'footer',
    label: 'Rodapé / Footer',
    category: 'layout',
    icon: 'PanelBottom',
    canHaveChildren: true,
    description: 'Informações legais, CNPJ, contato do vendedor e selo de segurança.',
    defaultContent: {
      showCompanyLegal: true,
      showSellerContact: true,
      showSecuritySeal: true,
      copyrightText: 'Todos os direitos reservados. Faturamento e entrega sob regras comerciais.',
    },
    defaultStyles: {
      backgroundColor: '#0f172a',
      color: '#94a3b8',
      padding: '40px 24px',
      marginTop: '48px',
      width: '100%',
    },
  },
  {
    type: 'section',
    label: 'Seção (Section)',
    category: 'layout',
    icon: 'SquareDashed',
    canHaveChildren: true,
    description: 'Bloco de seção com largura total ou contida e padding padrão configurável.',
    defaultContent: {},
    defaultStyles: {
      maxWidth: '1200px',
      margin: '0 auto',
      paddingTop: '32px',
      paddingBottom: '32px',
      paddingLeft: '20px',
      paddingRight: '20px',
      width: '100%',
    },
  },
  {
    type: 'container',
    label: 'Container',
    category: 'layout',
    icon: 'Box',
    canHaveChildren: true,
    description: 'Container flexível com espaçamento padrão para agrupar e organizar elementos.',
    defaultContent: {},
    defaultStyles: {
      paddingTop: '20px',
      paddingBottom: '20px',
      paddingLeft: '20px',
      paddingRight: '20px',
      borderRadius: '8px',
      width: '100%',
    },
  },
  {
    type: 'card',
    label: 'Card / Bloco Destacado',
    category: 'layout',
    icon: 'CreditCard',
    canHaveChildren: true,
    description: 'Cartão com borda, sombra e padding para destacar conteúdos.',
    defaultContent: {},
    defaultStyles: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      paddingTop: '20px',
      paddingBottom: '20px',
      paddingLeft: '20px',
      paddingRight: '20px',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      width: '100%',
    },
  },
  {
    type: 'columns',
    label: 'Colunas',
    category: 'layout',
    icon: 'Columns2',
    canHaveChildren: true,
    description: 'Grade de duas ou mais colunas lado a lado.',
    defaultContent: { columnsCount: 2 },
    defaultStyles: {
      display: 'grid',
      gridColumnsDesktop: 2,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '20px',
      width: '100%',
    },
  },
  {
    type: 'grid',
    label: 'CSS Grid',
    category: 'layout',
    icon: 'LayoutGrid',
    canHaveChildren: true,
    description: 'Grid flexível configurável por breakpoint.',
    defaultContent: {},
    defaultStyles: {
      display: 'grid',
      gridColumnsDesktop: 3,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '24px',
      width: '100%',
    },
  },
  {
    type: 'flexbox',
    label: 'Flexbox',
    category: 'layout',
    icon: 'Rows3',
    canHaveChildren: true,
    description: 'Contêiner flex com controle de alinhamento e direção.',
    defaultContent: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      width: '100%',
    },
  },
  {
    type: 'divider',
    label: 'Divisor',
    category: 'layout',
    icon: 'Minus',
    description: 'Linha separadora horizontal sutil.',
    defaultContent: {},
    defaultStyles: {
      borderBottom: '1px solid #e2e8f0',
      margin: '24px 0',
      width: '100%',
    },
  },
  {
    type: 'spacer',
    label: 'Espaçador',
    category: 'layout',
    icon: 'Maximize2',
    description: 'Espaço em branco ajustável entre blocos.',
    defaultContent: {},
    defaultStyles: {
      height: '32px',
      width: '100%',
    },
  },

  // BASIC
  {
    type: 'heading',
    label: 'Título / Cabeçalho',
    category: 'basic',
    icon: 'Heading',
    description: 'Título com nível H1, H2 ou H3 e shortcodes.',
    defaultContent: {
      text: 'Título da Seção',
      tag: 'h2',
    },
    defaultStyles: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '12px',
      textAlign: 'left',
    },
  },
  {
    type: 'text',
    label: 'Texto / Parágrafo',
    category: 'basic',
    icon: 'AlignLeft',
    description: 'Parágrafo descritivo com suporte a variáveis dinâmicas.',
    defaultContent: {
      text: 'Insira o texto descritivo aqui. Você pode usar variáveis como {{cliente.nome}} e {{vendedor.nome}}.',
    },
    defaultStyles: {
      fontSize: '15px',
      color: '#475569',
      lineHeight: '1.6',
      marginBottom: '16px',
    },
  },
  {
    type: 'image',
    label: 'Imagem',
    category: 'basic',
    icon: 'Image',
    description: 'Imagem da biblioteca ou CDN com link opcional.',
    defaultContent: {
      src: 'https://img.usecurling.com/p/800/500?q=products+commercial',
      alt: 'Imagem ilustrativa',
      link: '',
    },
    defaultStyles: {
      width: '100%',
      borderRadius: '12px',
      objectFit: 'cover',
    },
  },
  {
    type: 'video',
    label: 'Vídeo (YouTube/Vimeo/MP4)',
    category: 'basic',
    icon: 'Video',
    canHaveChildren: false,
    description: 'Vídeo promocional com URL configurável, proporção e controles.',
    defaultContent: {
      url: '', // Vazio por padrão para não injetar links indesejados
      sourceType: 'youtube', // 'youtube' | 'vimeo' | 'mp4' | 'embed'
      autoplay: false,
      controls: true,
      loop: false,
      muted: false,
      aspectRatio: '16/9',
      poster: '',
    },
    defaultStyles: {
      width: '100%',
      aspectRatio: '16/9',
      borderRadius: '12px',
    },
  },
  {
    type: 'button',
    label: 'Botão de Ação',
    category: 'basic',
    icon: 'MousePointerClick',
    description: 'Botão customizável com link ou ação.',
    defaultContent: {
      text: 'Fazer Pedido Agora',
      link: '#produtos',
      variant: 'primary',
    },
    defaultStyles: {
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '15px',
      textAlign: 'center',
      display: 'inline-block',
    },
  },
  {
    type: 'icon',
    label: 'Ícone de Destaque',
    category: 'basic',
    icon: 'Sparkles',
    description: 'Ícone visual para destacar diferenciais e benefícios.',
    defaultContent: {
      iconName: 'Truck',
      label: 'Entrega Rápida e Garantida',
    },
    defaultStyles: {
      color: '#4f46e5',
      fontSize: '24px',
    },
  },

  // COMMERCE (E-commerce Real)
  {
    type: 'product_list',
    label: 'Grade de Produtos Dinâmica',
    category: 'commerce',
    icon: 'ShoppingBag',
    description: 'Grid completo com produtos reais do CRM, busca, filtro e botão comprar.',
    defaultContent: {
      categoryFilter: 'all',
      showSearch: true,
      showCategoryPills: true,
      showImage: true,
      showPrice: true,
      showStockBadge: true,
      showUnit: true,
      showSku: true,
      showBuyButton: true,
      buyButtonText: 'Adicionar ao Pedido',
      itemsPerPage: 24,
    },
    defaultStyles: {
      gridColumnsDesktop: 4,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '20px',
    },
  },
  {
    type: 'product_single',
    label: 'Produto em Destaque',
    category: 'commerce',
    icon: 'Tag',
    canHaveChildren: true,
    description:
      'Produto do cadastro real com subcomponentes editáveis (Imagem, Preço, Botão de Compra).',
    defaultContent: {
      productId: '',
      showGallery: true,
      showFullDescription: true,
      showStockRealtime: true,
      showQuantitySelector: true,
      showDirectCheckout: true,
      ctaText: 'Comprar Agora',
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingLeft: '24px',
      paddingRight: '24px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      width: '100%',
    },
  },
  {
    type: 'product_card',
    label: 'Card de Produto (Subárvore)',
    category: 'commerce',
    icon: 'ShoppingBag',
    canHaveChildren: true,
    description: 'Estrutura editável do Card de Produto: Imagem, Título, Preço e Botão.',
    defaultContent: {
      productId: '',
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '16px',
      width: '100%',
    },
  },
  {
    type: 'product_image',
    label: 'Imagem do Produto (Dinâmica)',
    category: 'commerce',
    icon: 'Image',
    canHaveChildren: false,
    description: 'Vinculada à foto do produto no catálogo ou imagem personalizada.',
    defaultContent: {
      useDynamic: true,
      customSrc: '',
      alt: 'Imagem do produto',
    },
    defaultStyles: {
      width: '100%',
      aspectRatio: '1/1',
      borderRadius: '12px',
      objectFit: 'cover',
    },
  },
  {
    type: 'product_name',
    label: 'Nome do Produto (Dinâmico)',
    category: 'commerce',
    icon: 'Heading',
    canHaveChildren: false,
    description: 'Título vinculado ao cadastro do produto ou texto personalizado.',
    defaultContent: {
      useDynamic: true,
      customText: '',
    },
    defaultStyles: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '6px',
    },
  },
  {
    type: 'product_price',
    label: 'Preço Comercial (Dinâmico)',
    category: 'commerce',
    icon: 'Tag',
    canHaveChildren: false,
    description: 'Preço real calculado com moeda e regras comerciais.',
    defaultContent: {
      showCurrency: true,
      labelPrefix: 'Valor unitário:',
    },
    defaultStyles: {
      fontSize: '20px',
      fontWeight: '900',
      color: '#4f46e5',
      marginBottom: '12px',
    },
  },
  {
    type: 'product_stock',
    label: 'Badge de Estoque (Dinâmico)',
    category: 'commerce',
    icon: 'Layers',
    canHaveChildren: false,
    description: 'Status do estoque em tempo real (Disponível / Esgotado).',
    defaultContent: {},
    defaultStyles: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#059669',
      marginBottom: '8px',
    },
  },
  {
    type: 'category_nav',
    label: 'Navegação por Categorias',
    category: 'commerce',
    icon: 'Layers',
    description: 'Barra de abas/filtros rápidos para as categorias de produtos.',
    defaultContent: {
      allLabel: 'Todos os Itens',
      style: 'pills',
    },
    defaultStyles: {
      margin: '16px 0',
    },
  },
  {
    type: 'cart_summary',
    label: 'Resumo do Carrinho',
    category: 'commerce',
    icon: 'ShoppingCart',
    description: 'Bloco de resumo de itens selecionados e cálculo de totais.',
    defaultContent: {
      title: 'Resumo do Pedido',
      showEmptyMessage: true,
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    },
  },
  {
    type: 'checkout_block',
    label: 'Bloco de Checkout & Pagamento',
    category: 'commerce',
    icon: 'CreditCard',
    description: 'Etapa de identificação, entrega e pagamento seguro via Mercado Pago.',
    defaultContent: {
      enablePix: true,
      enableBoleto: true,
      enableCard: true,
      showSecurityInfo: true,
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
    },
  },

  // MARKETING
  {
    type: 'banner',
    label: 'Banner Promocional',
    category: 'marketing',
    icon: 'Megaphone',
    description: 'Banner de destaque com gradiente, título e chamada comercial.',
    defaultContent: {
      badge: 'Oferta Especial',
      title: 'Condições Exclusivas de Faturamento',
      subtitle: 'Aproveite tabela com descontos progressivos por volume',
      buttonText: 'Ver Tabela Completa',
      buttonLink: '#produtos',
    },
    defaultStyles: {
      backgroundGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      color: '#ffffff',
      padding: '48px 32px',
      borderRadius: '16px',
      textAlign: 'center',
    },
  },
  {
    type: 'hero',
    label: 'Hero Section',
    category: 'marketing',
    icon: 'Sparkle',
    canHaveChildren: true,
    description:
      'Seção principal com árvore de filhos totalmente editáveis (Badge, Título, Texto, Botões).',
    defaultContent: {
      title: 'Bem-vindo ao Catálogo Oficial VendasPro',
      subtitle:
        'Produtos com procedência, entrega pontual e suporte comercial direto com seu vendedor.',
      primaryBtnText: 'Explorar Produtos',
      primaryBtnLink: '#produtos',
      secondaryBtnText: 'Falar no WhatsApp',
      secondaryBtnLink: '{{vendedor.whatsapp_link}}',
    },
    defaultStyles: {
      backgroundColor: '#0f172a',
      color: '#ffffff',
      paddingTop: '64px',
      paddingBottom: '64px',
      paddingLeft: '24px',
      paddingRight: '24px',
      textAlign: 'center',
      width: '100%',
    },
  },
  {
    type: 'cta',
    label: 'Chamada para Ação (CTA)',
    category: 'marketing',
    icon: 'PhoneCall',
    description: 'Caixa de conversão para tirar dúvidas ou finalizar pedido.',
    defaultContent: {
      title: 'Precisa de condições especiais ou grande volume?',
      text: 'Fale diretamente com seu vendedor responsável e solicite uma cotação personalizada.',
      buttonText: 'Chamar no WhatsApp',
      buttonLink: '{{vendedor.whatsapp_link}}',
    },
    defaultStyles: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '32px',
      textAlign: 'center',
    },
  },
  {
    type: 'gallery',
    label: 'Galeria de Imagens',
    category: 'marketing',
    icon: 'Images',
    description: 'Grade de fotos com zoom ou abertura modal.',
    defaultContent: {
      images: [
        'https://img.usecurling.com/p/600/400?q=groceries+fresh',
        'https://img.usecurling.com/p/600/400?q=warehouse+logistics',
        'https://img.usecurling.com/p/600/400?q=beverages+shelf',
      ],
    },
    defaultStyles: {
      gridColumnsDesktop: 3,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '16px',
    },
  },

  // ADVANCED
  {
    type: 'shortcode',
    label: 'Dado Dinâmico (Shortcode)',
    category: 'advanced',
    icon: 'Code',
    description: 'Exibe nome do cliente, vendedor, telefone ou dados da empresa em tempo real.',
    defaultContent: {
      code: '{{cliente.nome}}',
      fallback: 'Prezado Cliente',
      prefix: 'Olá, ',
      suffix: '!',
    },
    defaultStyles: {
      fontWeight: '600',
      color: '#4f46e5',
      display: 'inline-block',
    },
  },
  {
    type: 'custom_html',
    label: 'HTML Personalizado',
    category: 'advanced',
    icon: 'FileCode',
    description:
      'Código HTML customizado para integrações específicas (requer permissão de Admin).',
    defaultContent: {
      html: '<div style="padding: 12px; background: #e0e7ff; border-radius: 8px; color: #3730a3; font-size: 13px;">Bloco HTML Customizado</div>',
    },
    defaultStyles: {},
  },
]
