// 0024 — Índices de performance, segurança e coleções para rate limit & locks distribuídos
// Compatível com PocketBase / SQLite no Skip Cloud

migrate(
  (app) => {
    // 1. Criar tabela/coleção `system_rate_limits` para Rate Limiting persistente (Redis-ready)
    try {
      app.findCollectionByNameOrId('system_rate_limits')
    } catch (_) {
      const rateLimitCol = new Collection({
        name: 'system_rate_limits',
        type: 'base',
        listRule: null, // Apenas hooks / server-side
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'key', type: 'text', required: true, max: 200 },
          { name: 'points', type: 'number', required: true },
          { name: 'expire_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_system_rate_limits_key ON system_rate_limits (key)',
          'CREATE INDEX idx_system_rate_limits_expire ON system_rate_limits (expire_at)',
        ],
      })
      app.save(rateLimitCol)
    }

    // 2. Criar tabela/coleção `system_locks` para Locks Distribuídos persistentes (Redis-ready)
    try {
      app.findCollectionByNameOrId('system_locks')
    } catch (_) {
      const locksCol = new Collection({
        name: 'system_locks',
        type: 'base',
        listRule: null, // Apenas hooks / server-side
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'key', type: 'text', required: true, max: 200 },
          { name: 'owner', type: 'text', required: true, max: 200 },
          { name: 'expire_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_system_locks_key ON system_locks (key)',
          'CREATE INDEX idx_system_locks_expire ON system_locks (expire_at)',
        ],
      })
      app.save(locksCol)
    }

    // 3. Criar índices adicionais de performance em collections existentes
    const safeAddIndex = (sql) => {
      try {
        app.db().newQuery(sql).execute()
      } catch (e) {
        console.log('Safe index creation note: ' + e)
      }
    }

    // Índices em sales
    safeAddIndex(
      'CREATE INDEX IF NOT EXISTS idx_sales_seller_date ON sales (seller, sale_date DESC)',
    )
    safeAddIndex(
      'CREATE INDEX IF NOT EXISTS idx_sales_status_date ON sales (payment_status, sale_date DESC)',
    )
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer)')

    // Índices em sale_items
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product)')

    // Índices em commissions
    safeAddIndex(
      'CREATE INDEX IF NOT EXISTS idx_commissions_seller_month ON commissions (seller, month, year)',
    )
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_commissions_sale ON commissions (sale)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions (status)')

    // Índices em deals
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals (customer)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals (owner)')

    // Índices em audit_logs
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module)')
    safeAddIndex('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created DESC)')

    // Índices em payment_charges
    safeAddIndex(
      'CREATE INDEX IF NOT EXISTS idx_payment_charges_sale_status ON payment_charges (sale_id, status)',
    )
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('system_locks'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('system_rate_limits'))
    } catch (_) {}
  },
)
