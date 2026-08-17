migrate(
  (app) => {
    // 1. customers collection
    const customers = new Collection({
      name: 'customers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'owner_name', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'number', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'neighborhood', type: 'text' },
        { name: 'size', type: 'select', values: ['pequeno', 'medio', 'grande'], maxSelect: 1 },
        { name: 'status', type: 'select', values: ['ativo', 'inativo'], maxSelect: 1 },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_customers_status ON customers (status)',
        'CREATE INDEX idx_customers_city ON customers (city)',
      ],
    })
    app.save(customers)

    // 2. products collection
    const products = new Collection({
      name: 'products',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          values: ['graos', 'bebidas', 'limpeza', 'mercearia', 'higiene', 'outros'],
          maxSelect: 1,
        },
        { name: 'unit', type: 'text' },
        { name: 'price', type: 'number', required: true },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_products_category ON products (category)'],
    })
    app.save(products)

    const customersId = customers.id
    const productsId = products.id

    // 3. deals collection
    const deals = new Collection({
      name: 'deals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'customer',
          type: 'relation',
          required: true,
          collectionId: customersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'value', type: 'number' },
        {
          name: 'stage',
          type: 'select',
          values: ['prospeccao', 'negociacao', 'proposta', 'fechado', 'perdido'],
          maxSelect: 1,
        },
        { name: 'expected_close_date', type: 'date' },
        {
          name: 'owner',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_deals_stage ON deals (stage)',
        'CREATE INDEX idx_deals_customer ON deals (customer)',
        'CREATE INDEX idx_deals_owner ON deals (owner)',
      ],
    })
    app.save(deals)

    // 4. sales collection
    const sales = new Collection({
      name: 'sales',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'customer',
          type: 'relation',
          collectionId: customersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'seller',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'sale_date', type: 'date' },
        { name: 'total', type: 'number' },
        {
          name: 'payment_method',
          type: 'select',
          values: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto'],
          maxSelect: 1,
        },
        { name: 'payment_status', type: 'select', values: ['pago', 'pendente'], maxSelect: 1 },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sales_sale_date ON sales (sale_date)',
        'CREATE INDEX idx_sales_customer ON sales (customer)',
        'CREATE INDEX idx_sales_seller ON sales (seller)',
      ],
    })
    app.save(sales)

    const salesId = sales.id

    // 5. sale_items collection
    const saleItems = new Collection({
      name: 'sale_items',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'sale',
          type: 'relation',
          required: true,
          collectionId: salesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'product',
          type: 'relation',
          required: true,
          collectionId: productsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'unit_price', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_sale_items_sale ON sale_items (sale)'],
    })
    app.save(saleItems)
  },
  (app) => {
    const collections = ['sale_items', 'sales', 'deals', 'products', 'customers']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
