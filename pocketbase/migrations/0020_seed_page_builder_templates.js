migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('page_templates')

    const seedTemplates = [
      {
        title: 'Catálogo Tradicional Comercial',
        slug: 'catalogo-tradicional',
        category: 'catalogo',
        description:
          'Layout clássico com banner topo, grid responsivo de produtos reais, filtros por categoria e carrinho fixo.',
        is_system_default: true,
        is_active: true,
        layout_data: {
          root: {
            id: 'root',
            type: 'page',
            styles: { backgroundColor: '#f8fafc', fontFamily: 'sans-serif' },
            children: ['header-1', 'hero-1', 'section-filters', 'section-products', 'footer-1'],
          },
          elements: {
            'header-1': {
              id: 'header-1',
              type: 'header',
              locked: true,
              styles: {
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
              },
              content: {
                showLogo: true,
                showCompanyInfo: true,
                showSellerBadge: true,
                showCartButton: true,
              },
            },
            'hero-1': {
              id: 'hero-1',
              type: 'banner',
              styles: {
                backgroundGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                padding: '48px 24px',
                borderRadius: '16px',
                margin: '24px auto',
                maxWidth: '1200px',
                textAlign: 'center',
              },
              content: {
                title: 'Catálogo Oficial de Ofertas',
                subtitle: 'Produtos selecionados com preços especiais para seu estabelecimento',
                badge: 'Ofertas da Semana',
              },
            },
            'section-filters': {
              id: 'section-filters',
              type: 'container',
              styles: { maxWidth: '1200px', margin: '0 auto 16px auto', padding: '0 16px' },
              children: ['category-nav-1'],
            },
            'category-nav-1': {
              id: 'category-nav-1',
              type: 'category_nav',
              content: { allLabel: 'Todas as Categorias', style: 'pills' },
            },
            'section-products': {
              id: 'section-products',
              type: 'section',
              styles: { maxWidth: '1200px', margin: '0 auto', padding: '16px' },
              children: ['product-grid-1'],
            },
            'product-grid-1': {
              id: 'product-grid-1',
              type: 'product_list',
              styles: {
                gridColumnsDesktop: 4,
                gridColumnsTablet: 2,
                gridColumnsMobile: 1,
                gap: '20px',
              },
              content: {
                showImage: true,
                showPrice: true,
                showStockBadge: true,
                showUnit: true,
                showSku: true,
                showBuyButton: true,
                buyButtonText: 'Adicionar ao Carrinho',
                itemsPerPage: 24,
              },
            },
            'footer-1': {
              id: 'footer-1',
              type: 'footer',
              locked: true,
              styles: {
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                padding: '40px 24px',
                marginTop: '64px',
              },
              content: {
                showCompanyLegal: true,
                showSellerContact: true,
                showSecuritySeal: true,
                copyrightText:
                  'Todos os direitos reservados. Venda sujeita à confirmação de estoque.',
              },
            },
          },
        },
        settings: {
          requireCustomerAuth: true,
          allowQuantityChange: true,
          allowWeightProducts: true,
        },
      },
      {
        title: 'Oferta Especial Relâmpago',
        slug: 'oferta-especial-relampago',
        category: 'oferta',
        description:
          'Página focada em alta conversão para queima de estoque e produtos promocionais com CTA destacado.',
        is_system_default: true,
        is_active: true,
        layout_data: {
          root: {
            id: 'root',
            type: 'page',
            styles: { backgroundColor: '#f1f5f9' },
            children: [
              'header-1',
              'banner-flash',
              'section-featured',
              'section-products',
              'footer-1',
            ],
          },
          elements: {
            'header-1': {
              id: 'header-1',
              type: 'header',
              locked: true,
              styles: { backgroundColor: '#ffffff', padding: '16px 24px' },
              content: { showLogo: true, showCartButton: true },
            },
            'banner-flash': {
              id: 'banner-flash',
              type: 'hero',
              styles: {
                backgroundGradient: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                color: '#ffffff',
                padding: '40px 20px',
                textAlign: 'center',
              },
              content: {
                title: '⚡ QUEIMA DE ESTOQUE EXCLUSIVA',
                subtitle: 'Condições válidas por tempo limitado ou enquanto durarem os estoques.',
                ctaText: 'Ver Produtos em Destaque',
              },
            },
            'section-featured': {
              id: 'section-featured',
              type: 'section',
              styles: { maxWidth: '1200px', margin: '24px auto', padding: '0 16px' },
              children: ['product-grid-flash'],
            },
            'product-grid-flash': {
              id: 'product-grid-flash',
              type: 'product_list',
              styles: {
                gridColumnsDesktop: 3,
                gridColumnsTablet: 2,
                gridColumnsMobile: 1,
                gap: '24px',
              },
              content: {
                showPrice: true,
                showStockBadge: true,
                highlightDiscount: true,
                buyButtonText: 'Garantir Oferta',
              },
            },
            'section-products': {
              id: 'section-products',
              type: 'container',
              styles: { maxWidth: '1200px', margin: '0 auto', padding: '16px' },
              children: [],
            },
            'footer-1': {
              id: 'footer-1',
              type: 'footer',
              locked: true,
              styles: { backgroundColor: '#1e293b', color: '#cbd5e1', padding: '32px' },
              content: { showCompanyLegal: true, showSellerContact: true },
            },
          },
        },
        settings: { requireCustomerAuth: true },
      },
      {
        title: 'Campanha Mensal B2B / Atacado',
        slug: 'campanha-mensal-atacado',
        category: 'atacado',
        description:
          'Estrutura otimizada para pedidos em volume com tabelas de múltiplas unidades (caixa, fardo, kg).',
        is_system_default: true,
        is_active: true,
        layout_data: {
          root: {
            id: 'root',
            type: 'page',
            styles: { backgroundColor: '#ffffff' },
            children: ['header-1', 'hero-b2b', 'section-b2b-products', 'footer-1'],
          },
          elements: {
            'header-1': {
              id: 'header-1',
              type: 'header',
              locked: true,
              styles: {
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
              },
              content: { showLogo: true, showCompanyInfo: true, showCartButton: true },
            },
            'hero-b2b': {
              id: 'hero-b2b',
              type: 'hero',
              styles: {
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '48px 24px',
                textAlign: 'center',
              },
              content: {
                title: 'Tabela de Pedidos Atacadista',
                subtitle:
                  'Condições diferenciadas para faturamento direto PJ com faturamento flexível',
              },
            },
            'section-b2b-products': {
              id: 'section-b2b-products',
              type: 'section',
              styles: { maxWidth: '1200px', margin: '32px auto', padding: '0 16px' },
              children: ['product-grid-b2b'],
            },
            'product-grid-b2b': {
              id: 'product-grid-b2b',
              type: 'product_list',
              styles: {
                gridColumnsDesktop: 4,
                gridColumnsTablet: 2,
                gridColumnsMobile: 1,
                gap: '16px',
              },
              content: {
                showSku: true,
                showUnit: true,
                showStockBadge: true,
                allowQuickQuantity: true,
              },
            },
            'footer-1': {
              id: 'footer-1',
              type: 'footer',
              locked: true,
              styles: { backgroundColor: '#020617', color: '#64748b', padding: '40px' },
              content: { showCompanyLegal: true, showSellerContact: true },
            },
          },
        },
        settings: { requireCustomerAuth: true },
      },
      {
        title: 'Catálogo Premium Gourmet',
        slug: 'catalogo-premium',
        category: 'premium',
        description:
          'Design sofisticado em tons escuros e dourados para marcas e linhas de produtos de alto valor agregado.',
        is_system_default: true,
        is_active: true,
        layout_data: {
          root: {
            id: 'root',
            type: 'page',
            styles: { backgroundColor: '#0b0f19', color: '#f8fafc' },
            children: ['header-dark', 'hero-dark', 'section-premium-products', 'footer-dark'],
          },
          elements: {
            'header-dark': {
              id: 'header-dark',
              type: 'header',
              locked: true,
              styles: {
                backgroundColor: '#0f172a',
                borderBottom: '1px solid #1e293b',
                padding: '18px 24px',
              },
              content: { showLogo: true, showCartButton: true },
            },
            'hero-dark': {
              id: 'hero-dark',
              type: 'banner',
              styles: {
                backgroundGradient: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
                color: '#ffffff',
                padding: '60px 24px',
                textAlign: 'center',
                borderRadius: '20px',
                maxWidth: '1200px',
                margin: '24px auto',
              },
              content: {
                title: 'Seleção Premium & Importados',
                subtitle: 'Experiência exclusiva com as melhores safras e procedências',
                badge: 'Edição Especial',
              },
            },
            'section-premium-products': {
              id: 'section-premium-products',
              type: 'section',
              styles: { maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' },
              children: ['product-grid-dark'],
            },
            'product-grid-dark': {
              id: 'product-grid-dark',
              type: 'product_list',
              styles: {
                gridColumnsDesktop: 3,
                gridColumnsTablet: 2,
                gridColumnsMobile: 1,
                gap: '24px',
              },
              content: {
                showImage: true,
                showPrice: true,
                showStockBadge: true,
                buyButtonText: 'Comprar Seleção',
              },
            },
            'footer-dark': {
              id: 'footer-dark',
              type: 'footer',
              locked: true,
              styles: { backgroundColor: '#030712', color: '#6b7280', padding: '40px 24px' },
              content: { showCompanyLegal: true, showSellerContact: true },
            },
          },
        },
        settings: { requireCustomerAuth: true },
      },
      {
        title: 'Página de Produto / Landing Page Direta',
        slug: 'landing-page-produto',
        category: 'produto',
        description:
          'Foco no detalhe completo de um produto específico com galeria, avaliações, especificações e checkout acelerado.',
        is_system_default: true,
        is_active: true,
        layout_data: {
          root: {
            id: 'root',
            type: 'page',
            styles: { backgroundColor: '#ffffff' },
            children: ['header-1', 'section-product-hero', 'section-details', 'footer-1'],
          },
          elements: {
            'header-1': {
              id: 'header-1',
              type: 'header',
              locked: true,
              styles: { backgroundColor: '#ffffff', padding: '16px 24px' },
              content: { showLogo: true, showCartButton: true },
            },
            'section-product-hero': {
              id: 'section-product-hero',
              type: 'section',
              styles: { maxWidth: '1100px', margin: '32px auto', padding: '0 16px' },
              children: ['product-single-1'],
            },
            'product-single-1': {
              id: 'product-single-1',
              type: 'product_single',
              content: {
                showGallery: true,
                showFullDescription: true,
                showStockRealtime: true,
                showQuantitySelector: true,
                showDirectCheckout: true,
              },
            },
            'section-details': {
              id: 'section-details',
              type: 'container',
              styles: { maxWidth: '1100px', margin: '32px auto', padding: '0 16px' },
              children: [],
            },
            'footer-1': {
              id: 'footer-1',
              type: 'footer',
              locked: true,
              styles: { backgroundColor: '#0f172a', color: '#94a3b8', padding: '32px' },
              content: { showCompanyLegal: true, showSellerContact: true },
            },
          },
        },
        settings: { requireCustomerAuth: true },
      },
    ]

    for (let i = 0; i < seedTemplates.length; i++) {
      const item = seedTemplates[i]
      let existing = null
      try {
        existing = app.findFirstRecordByData('page_templates', 'slug', item.slug)
      } catch (_) {}

      if (!existing) {
        const rec = new Record(templatesCol)
        rec.set('title', item.title)
        rec.set('slug', item.slug)
        rec.set('category', item.category)
        rec.set('description', item.description)
        rec.set('is_system_default', item.is_system_default)
        rec.set('is_active', item.is_active)
        rec.set('layout_data', item.layout_data)
        rec.set('settings', item.settings)
        app.save(rec)
      }
    }
  },
  (app) => {
    // rollback
  },
)
