// 0008 — Coleção `category_goals`
// Metas de vendas por categoria de produto (mês/ano), com índice único em (category, month, year).

migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('category_goals')
    } catch (_) {
      col = new Collection({
        name: 'category_goals',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'category', type: 'text', required: true, max: 100 },
          { name: 'target_value', type: 'number', required: true, min: 0 },
          { name: 'month', type: 'number', required: true, min: 1, max: 12, onlyInt: true },
          { name: 'year', type: 'number', required: true, min: 2000, max: 2100, onlyInt: true },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_category_goals_unique ON category_goals (category, month, year)',
          'CREATE INDEX idx_category_goals_period ON category_goals (month, year)',
          'CREATE INDEX idx_category_goals_active ON category_goals (active)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('category_goals'))
    } catch (_) {}
  },
)
