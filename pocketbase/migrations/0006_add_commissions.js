migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const salesId = app.findCollectionByNameOrId('sales').id

    // =========================================================
    // 1. commission_rules collection
    //    fields: seller (relation→users), percentage (number),
    //            minimum_sales (number), maximum_sales (number),
    //            active (bool, default true), created/updated
    // =========================================================
    let rulesCol
    try {
      rulesCol = app.findCollectionByNameOrId('commission_rules')
    } catch (_) {
      rulesCol = new Collection({
        name: 'commission_rules',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'seller',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'percentage', type: 'number', required: true, min: 0, max: 100 },
          { name: 'minimum_sales', type: 'number', min: 0 },
          { name: 'maximum_sales', type: 'number', min: 0 },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_commission_rules_seller ON commission_rules (seller)',
          'CREATE INDEX idx_commission_rules_active ON commission_rules (active)',
          'CREATE UNIQUE INDEX idx_commission_rules_seller_active ON commission_rules (seller) WHERE active = 1',
        ],
      })
      app.save(rulesCol)
    }

    // =========================================================
    // 2. commissions collection
    //    fields: seller (relation→users), sale (relation→sales),
    //            sale_value (number), commission_percentage (number),
    //            commission_value (number), status (select),
    //            reference_month (text YYYY-MM), paid_at (date),
    //            created/updated
    //    Unique index on sale to avoid duplicate commissions.
    // =========================================================
    let commissionsCol
    try {
      commissionsCol = app.findCollectionByNameOrId('commissions')
    } catch (_) {
      commissionsCol = new Collection({
        name: 'commissions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'seller',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'sale',
            type: 'relation',
            required: true,
            collectionId: salesId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'sale_value', type: 'number', required: true, min: 0 },
          { name: 'commission_percentage', type: 'number', required: true, min: 0, max: 100 },
          { name: 'commission_value', type: 'number', required: true, min: 0 },
          {
            name: 'status',
            type: 'select',
            values: ['pending', 'approved', 'paid', 'cancelled'],
            maxSelect: 1,
          },
          { name: 'reference_month', type: 'text', required: true },
          { name: 'paid_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_commissions_sale ON commissions (sale)',
          'CREATE INDEX idx_commissions_seller ON commissions (seller)',
          'CREATE INDEX idx_commissions_reference_month ON commissions (reference_month)',
          'CREATE INDEX idx_commissions_status ON commissions (status)',
        ],
      })
      app.save(commissionsCol)
    }

    // =========================================================
    // 3. Seed demo commission rules (3-5%) for existing sellers
    // =========================================================
    let users = []
    try {
      users = app.findRecordsByFilter('users', '1=1', 'name', 100, 0)
    } catch (_) {}

    const percentages = [5, 3, 4, 3, 5]
    for (let i = 0; i < users.length; i++) {
      const u = users[i]

      // idempotent: skip if an active rule already exists for this seller
      let existing = []
      try {
        existing = app.findRecordsByFilter('commission_rules', 'seller = {:sid}', 'created', 1, 0, {
          sid: u.id,
        })
      } catch (_) {}
      if (existing && existing.length > 0) continue

      const rec = new Record(rulesCol)
      rec.set('seller', u.id)
      rec.set('percentage', percentages[i % percentages.length])
      rec.set('active', true)
      app.save(rec)
    }
  },
  (app) => {
    // best-effort revert
    try {
      app.delete(app.findCollectionByNameOrId('commissions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('commission_rules'))
    } catch (_) {}
  },
)
