import type { PageBuilderElementType } from '@/types/builder'

export interface BuilderElementMeta {
  type: PageBuilderElementType
  label: string
  category: 'layout' | 'basic' | 'commerce' | 'marketing' | 'advanced'
  icon: string
  description: string
  defaultContent: Record<string, any>
  defaultStyles: Record<string, any>
}

export const ELEMENT_DEFINITIONS: BuilderElementMeta[] = [
  // LAYOUT
  {
    type: 'header',
    label: 'Cabeçalho / Header',
    category: 'layout',
    icon: 'PanelTop',
    description: 'Logo, dados de contato da empresa, badge do vendedor e botão do carrinho.',
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
    },
  },
  {
    type: 'footer',
    label: 'Rodapé / Footer',
    category: 'layout',
    icon: 'PanelBottom',
    description: 'Informações legais, CNPJ, contato do vendedor e selo de compra segura.',
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
    },
  },
  {
    type: 'section',
    label: 'Seção',
    category: 'layout',
    icon: 'SquareDashed',
    description: 'Bloco de seção com largura máxima e padding personalizável.',
    defaultContent: {},
    defaultStyles: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 16px',
    },
  },
  {
    type: 'container',
    label: 'Container',
    category: 'layout',
    icon: 'Box',
    description: 'Container flexível para agrupar e organizar elementos.',
    defaultContent: {},
    defaultStyles: {
      padding: '16px',
      borderRadius: '8px',
    },
  },
  {
    type: 'columns',
    label: 'Colunas',
    category: 'layout',
    icon: 'Columns2',
    description: 'Grade de duas ou mais colunas lado a lado.',
    defaultContent: { columnsCount: 2 },
    defaultStyles: {
      display: 'grid',
      gridColumnsDesktop: 2,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '20px',
    },
  },
  {
    type: 'grid',
    label: 'CSS Grid',
    category: 'layout',
    icon: 'LayoutGrid',
    description: 'Grid flexível configurável por breakpoint.',
    defaultContent: {},
    defaultStyles: {
      display: 'grid',
      gridColumnsDesktop: 3,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      gap: '24px',
    },
  },
  {
    type: 'flexbox',
    label: 'Flexbox',
    category: 'layout',
    icon: 'Rows3',
    description: 'Contêiner flex com controle de alinhamento e direção.',
    defaultContent: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
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
    label: 'Vídeo (YouTube/Vimeo)',
    category: 'basic',
    icon: 'Video',
    description: 'Incorporação responsiva de vídeo promocional.',
    defaultContent: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      autoplay: false,
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
    description: 'Cartão detalhado de um produto específico com seletor de quantidade.',
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
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
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
    description: 'Seção principal de impacto com título grande, subtítulo e dois botões de ação.',
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
      padding: '64px 24px',
      textAlign: 'center',
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
