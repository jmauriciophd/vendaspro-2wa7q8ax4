migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const customersCol = app.findCollectionByNameOrId('customers')

    // 1. media_assets (Biblioteca de Mídia)
    if (!app.hasTable('media_assets')) {
      const mediaCol = new Collection({
        name: 'media_assets',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || uploaded_by = @request.auth.id)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || uploaded_by = @request.auth.id)",
        fields: [
          { name: 'title', type: 'text', required: true },
          {
            name: 'file',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          },
          { name: 'alt_text', type: 'text' },
          { name: 'file_type', type: 'text' },
          { name: 'file_size', type: 'number' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'uploaded_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_media_assets_uploader ON media_assets (uploaded_by)',
          'CREATE INDEX idx_media_assets_created ON media_assets (created DESC)',
        ],
      })
      app.save(mediaCol)
    }

    // 2. page_templates (Modelos reutilizáveis de páginas e catálogos)
    if (!app.hasTable('page_templates')) {
      const tplCol = new Collection({
        name: 'page_templates',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || @request.auth.permissions ~ 'templates.create')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || @request.auth.permissions ~ 'templates.edit')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.permissions ~ 'templates.delete')",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          {
            name: 'category',
            type: 'select',
            required: true,
            values: [
              'catalogo',
              'oferta',
              'campanha',
              'atacado',
              'promocao',
              'premium',
              'produto',
              'landing_page',
            ],
            maxSelect: 1,
          },
          { name: 'description', type: 'text' },
          {
            name: 'thumbnail',
            type: 'file',
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          },
          { name: 'thumbnail_url', type: 'text' },
          { name: 'layout_data', type: 'json' },
          { name: 'settings', type: 'json' },
          { name: 'is_system_default', type: 'bool' },
          { name: 'is_active', type: 'bool' },
          { name: 'created_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_page_templates_slug ON page_templates (slug)',
          'CREATE INDEX idx_page_templates_category ON page_templates (category)',
          'CREATE INDEX idx_page_templates_active ON page_templates (is_active)',
        ],
      })
      app.save(tplCol)
    }

    const templatesCol = app.findCollectionByNameOrId('page_templates')

    // 3. sale_pages (Páginas e Catálogos publicados ou rascunhos)
    if (!app.hasTable('sale_pages')) {
      const pageCol = new Collection({
        name: 'sale_pages',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "status = 'published' || (@request.auth.id != '')",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || seller = @request.auth.id || created_by = @request.auth.id)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || seller = @request.auth.id || created_by = @request.auth.id)",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'access_token', type: 'text', required: true },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['catalogo', 'landing_page', 'oferta_especial', 'link_direto'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['draft', 'published', 'paused', 'archived', 'expired'],
            maxSelect: 1,
          },
          {
            name: 'visibility',
            type: 'select',
            required: true,
            values: ['public', 'private', 'exclusive_customer'],
            maxSelect: 1,
          },
          { name: 'template', type: 'relation', collectionId: templatesCol.id, maxSelect: 1 },
          { name: 'seller', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          {
            name: 'target_customer',
            type: 'relation',
            collectionId: customersCol.id,
            maxSelect: 1,
          },
          { name: 'campaign_name', type: 'text' },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'layout_data', type: 'json' },
          { name: 'settings', type: 'json' },
          { name: 'seo_title', type: 'text' },
          { name: 'seo_description', type: 'text' },
          { name: 'seo_image', type: 'text' },
          { name: 'custom_css', type: 'text' },
          { name: 'custom_js', type: 'text' },
          { name: 'custom_html', type: 'text' },
          { name: 'views_count', type: 'number' },
          { name: 'orders_count', type: 'number' },
          { name: 'sales_total', type: 'number' },
          { name: 'version', type: 'number' },
          { name: 'created_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sale_pages_slug ON sale_pages (slug)',
          'CREATE UNIQUE INDEX idx_sale_pages_token ON sale_pages (access_token)',
          'CREATE INDEX idx_sale_pages_seller ON sale_pages (seller)',
          'CREATE INDEX idx_sale_pages_customer ON sale_pages (target_customer)',
          'CREATE INDEX idx_sale_pages_status ON sale_pages (status)',
        ],
      })
      app.save(pageCol)
    }

    const pagesCol = app.findCollectionByNameOrId('sale_pages')

    // 4. page_versions (Histórico de versões de templates e páginas)
    if (!app.hasTable('page_versions')) {
      const versionCol = new Collection({
        name: 'page_versions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'page', type: 'relation', collectionId: pagesCol.id, maxSelect: 1 },
          { name: 'template', type: 'relation', collectionId: templatesCol.id, maxSelect: 1 },
          { name: 'version_number', type: 'number', required: true },
          { name: 'notes', type: 'text' },
          { name: 'layout_data', type: 'json', required: true },
          { name: 'settings', type: 'json' },
          { name: 'created_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_page_versions_page ON page_versions (page, version_number DESC)',
          'CREATE INDEX idx_page_versions_template ON page_versions (template, version_number DESC)',
        ],
      })
      app.save(versionCol)
    }

    // 5. page_analytics_events (Cliques, visualizações, add_to_cart, checkout_started)
    if (!app.hasTable('page_analytics_events')) {
      const eventCol = new Collection({
        name: 'page_analytics_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '', // Permite gravação pública de telemetria do catálogo
        updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'page', type: 'relation', collectionId: pagesCol.id, maxSelect: 1 },
          {
            name: 'event_type',
            type: 'select',
            required: true,
            values: [
              'page_view',
              'product_click',
              'add_to_cart',
              'remove_from_cart',
              'checkout_step',
              'order_completed',
            ],
            maxSelect: 1,
          },
          { name: 'customer', type: 'relation', collectionId: customersCol.id, maxSelect: 1 },
          { name: 'seller', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'product_id', type: 'text' },
          { name: 'device_type', type: 'text' },
          { name: 'referrer', type: 'text' },
          { name: 'ip_address', type: 'text' },
          { name: 'user_agent', type: 'text' },
          { name: 'payload', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_analytics_page ON page_analytics_events (page, created DESC)',
          'CREATE INDEX idx_analytics_seller ON page_analytics_events (seller, created DESC)',
          'CREATE INDEX idx_analytics_event_type ON page_analytics_events (event_type)',
        ],
      })
      app.save(eventCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('page_analytics_events'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('page_versions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sale_pages'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('page_templates'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('media_assets'))
    } catch (_) {}
  },
)
