migrate((app) => {
  const templates = app.findCollectionByNameOrId('page_templates')

  // 1. Template: Catálogo Comercial Direto
  try {
    const tpl1 = app.findFirstRecordByData('page_templates', 'slug', 'catalogo-comercial-direto')
    tpl1.set('layout_data', {
      root: {
        id: 'root',
        type: 'page',
        styles: { backgroundColor: '#f8fafc' },
        pageSettings: {
          pagePaddingDesktop: '24px',
          pagePaddingTablet: '20px',
          pagePaddingMobile: '16px',
          pageMaxWidth: '1200px',
          contentAlign: 'center',
          backgroundColor: '#f8fafc',
        },
        children: ['header-1', 'hero-1', 'section-products-1', 'cta-1', 'footer-1'],
      },
      elements: {
        'header-1': {
          id: 'header-1',
          type: 'header',
          name: 'Cabeçalho da Loja',
          styles: {
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
            width: '100%',
          },
          content: {
            showLogo: true,
            showCompanyInfo: true,
            showSellerBadge: true,
            showCartButton: true,
            cartButtonText: 'Meu Pedido',
          },
          children: [],
        },
        'hero-1': {
          id: 'hero-1',
          type: 'hero',
          name: 'Hero Principal com Ofertas',
          styles: {
            backgroundColor: '#0f172a',
            color: '#ffffff',
            paddingTop: '64px',
            paddingBottom: '64px',
            paddingLeft: '24px',
            paddingRight: '24px',
            textAlign: 'center',
            borderRadius: '16px',
            marginBottom: '32px',
            width: '100%',
          },
          content: {
            badge: '⚡ Condições Comerciais Exclusivas',
            title: 'Catálogo de Produtos Direto da Fábrica',
            subtitle:
              'Preços diferenciados, faturamento flexível e suporte comercial dedicado para {{cliente.nome}}.',
            primaryBtnText: 'Ver Produtos Disponíveis',
            primaryBtnLink: '#produtos',
            secondaryBtnText: 'Chamar no WhatsApp',
          },
          children: [],
        },
        'section-products-1': {
          id: 'section-products-1',
          type: 'section',
          name: 'Seção Grade de Produtos',
          styles: {
            paddingTop: '20px',
            paddingBottom: '40px',
            paddingLeft: '0px',
            paddingRight: '0px',
            width: '100%',
          },
          children: ['heading-prod-1', 'products-grid-1'],
        },
        'heading-prod-1': {
          id: 'heading-prod-1',
          type: 'heading',
          name: 'Título da Grade',
          styles: {
            fontSize: '24px',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '20px',
            textAlign: 'left',
          },
          content: {
            tag: 'h2',
            text: 'Produtos Pronta-Entrega',
          },
        },
        'products-grid-1': {
          id: 'products-grid-1',
          type: 'product_list',
          name: 'Grade do Catálogo Real',
          styles: {
            gridColumnsDesktop: 3,
            gridColumnsTablet: 2,
            gridColumnsMobile: 1,
            gap: '20px',
          },
          content: {
            showPrice: true,
            showStockBadge: true,
            showBuyButton: true,
            buyButtonText: 'Comprar',
          },
          children: [],
        },
        'cta-1': {
          id: 'cta-1',
          type: 'cta',
          name: 'Chamada para Negociação',
          styles: {
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            paddingTop: '32px',
            paddingBottom: '32px',
            paddingLeft: '24px',
            paddingRight: '24px',
            textAlign: 'center',
            marginTop: '32px',
            marginBottom: '32px',
          },
          content: {
            title: 'Precisa de Volume Especial ou Faturamento a Prazo?',
            text: 'Converse com seu consultor comercial e obtenha condições customizadas com emissão de NF-e.',
            buttonText: 'Falar com Consultor no WhatsApp',
          },
          children: [],
        },
        'footer-1': {
          id: 'footer-1',
          type: 'footer',
          name: 'Rodapé Institucional',
          styles: {
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            paddingTop: '40px',
            paddingBottom: '40px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderRadius: '16px',
            width: '100%',
          },
          content: {
            showCompanyLegal: true,
            showSellerContact: true,
            showSecuritySeal: true,
            copyrightText:
              'Todos os direitos reservados. Faturamento e entrega sob regras comerciais.',
          },
          children: [],
        },
      },
    })
    app.save(tpl1)
  } catch (_) {}

  // 2. Template: Oferta Relâmpago com Vídeo e Destaque
  try {
    const tpl2 = app.findFirstRecordByData('page_templates', 'slug', 'oferta-relampago-b2b')
    tpl2.set('layout_data', {
      root: {
        id: 'root',
        type: 'page',
        styles: { backgroundColor: '#f8fafc' },
        pageSettings: {
          pagePaddingDesktop: '24px',
          pagePaddingTablet: '20px',
          pagePaddingMobile: '16px',
          pageMaxWidth: '1200px',
          contentAlign: 'center',
          backgroundColor: '#f8fafc',
        },
        children: ['header-2', 'hero-2', 'featured-section-2', 'video-section-2', 'footer-2'],
      },
      elements: {
        'header-2': {
          id: 'header-2',
          type: 'header',
          name: 'Cabeçalho Oficial',
          styles: {
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          },
          content: {
            showLogo: true,
            showCompanyInfo: true,
            showSellerBadge: true,
            showCartButton: true,
          },
        },
        'hero-2': {
          id: 'hero-2',
          type: 'hero',
          name: 'Hero Promocional',
          styles: {
            backgroundColor: '#4338ca',
            color: '#ffffff',
            paddingTop: '48px',
            paddingBottom: '48px',
            paddingLeft: '24px',
            paddingRight: '24px',
            textAlign: 'center',
            borderRadius: '16px',
            marginBottom: '24px',
          },
          content: {
            badge: '🔥 Condição Por Tempo Limitado',
            title: 'Oferta Especial Selecionada para {{cliente.nome}}',
            subtitle: 'Aproveite o lote promocional faturado direto com seu consultor.',
          },
        },
        'featured-section-2': {
          id: 'featured-section-2',
          type: 'section',
          name: 'Seção Produto Destaque',
          styles: {
            paddingTop: '20px',
            paddingBottom: '20px',
          },
          children: ['product-single-2'],
        },
        'product-single-2': {
          id: 'product-single-2',
          type: 'product_single',
          name: 'Cartão de Produto Principal',
          styles: {
            backgroundColor: '#ffffff',
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          },
          content: {
            showGallery: true,
            showStockRealtime: true,
            ctaText: 'Comprar Agora',
          },
          children: [],
        },
        'video-section-2': {
          id: 'video-section-2',
          type: 'section',
          name: 'Seção de Apresentação em Vídeo',
          styles: {
            paddingTop: '24px',
            paddingBottom: '24px',
          },
          children: ['video-heading-2', 'video-player-2'],
        },
        'video-heading-2': {
          id: 'video-heading-2',
          type: 'heading',
          name: 'Título do Vídeo',
          styles: {
            fontSize: '20px',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '12px',
            textAlign: 'center',
          },
          content: {
            tag: 'h3',
            text: 'Conheça Mais Sobre Nossos Produtos',
          },
        },
        'video-player-2': {
          id: 'video-player-2',
          type: 'video',
          name: 'Vídeo Institucional',
          styles: {
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            borderRadius: '12px',
          },
          content: {
            url: '', // Vídeo neutro configurável pelo vendedor
            aspectRatio: '16/9',
            autoplay: false,
          },
        },
        'footer-2': {
          id: 'footer-2',
          type: 'footer',
          name: 'Rodapé Oficial',
          styles: {
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            paddingTop: '32px',
            paddingBottom: '32px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderRadius: '16px',
            marginTop: '32px',
          },
          content: {
            showCompanyLegal: true,
            showSellerContact: true,
            showSecuritySeal: true,
          },
        },
      },
    })
    app.save(tpl2)
  } catch (_) {}
})
