migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord

    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'jmauriciophd@gmail.com')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('jmauriciophd@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'João Maurício')
      app.save(userRecord)
    }

    // 10 Products
    const productsCol = app.findCollectionByNameOrId('products')
    const initialProducts = [
      { name: 'Arroz 5kg', category: 'graos', unit: 'pacote', price: 24.9, active: true },
      { name: 'Feijão Carioca 1kg', category: 'graos', unit: 'pacote', price: 7.5, active: true },
      { name: 'Óleo de Soja 900ml', category: 'mercearia', unit: 'un', price: 6.8, active: true },
      { name: 'Açúcar Cristal 5kg', category: 'graos', unit: 'pacote', price: 19.9, active: true },
      {
        name: 'Café Torrado 500g',
        category: 'mercearia',
        unit: 'pacote',
        price: 14.5,
        active: true,
      },
      { name: 'Leite Integral 1L', category: 'mercearia', unit: 'un', price: 5.9, active: true },
      { name: 'Refrigerante 2L', category: 'bebidas', unit: 'un', price: 9.9, active: true },
      { name: 'Sabão em Pó 1kg', category: 'limpeza', unit: 'pacote', price: 12.9, active: true },
      { name: 'Detergente 500ml', category: 'limpeza', unit: 'un', price: 3.5, active: true },
      {
        name: 'Biscoito Recheado',
        category: 'mercearia',
        unit: 'pacote',
        price: 4.2,
        active: true,
      },
    ]

    const productRecords = {}
    for (const prod of initialProducts) {
      let pRec
      try {
        pRec = app.findFirstRecordByData('products', 'name', prod.name)
      } catch (_) {
        pRec = new Record(productsCol)
        pRec.set('name', prod.name)
        pRec.set('category', prod.category)
        pRec.set('unit', prod.unit)
        pRec.set('price', prod.price)
        pRec.set('active', prod.active)
        app.save(pRec)
      }
      productRecords[prod.name] = pRec
    }

    // 5 Customers
    const customersCol = app.findCollectionByNameOrId('customers')
    const initialCustomers = [
      {
        name: 'Mercado Bom Preço',
        cnpj: '12.345.678/0001-90',
        owner_name: 'Antônio Ferreira',
        phone: '(11) 98765-4321',
        email: 'bompreco@mercados.com.br',
        address: 'Rua das Flores',
        number: '120',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Pinheiros',
        size: 'pequeno',
        status: 'ativo',
        notes: 'Mercado tradicional de bairro, compra semanalmente grãos e laticínios.',
      },
      {
        name: 'Supermercado Silva',
        cnpj: '98.765.432/0001-10',
        owner_name: 'Carlos Silva',
        phone: '(11) 97654-3210',
        email: 'contato@supermercadosilva.com.br',
        address: 'Av. Tiradentes',
        number: '1540',
        city: 'Guarulhos',
        state: 'SP',
        neighborhood: 'Centro',
        size: 'medio',
        status: 'ativo',
        notes: 'Supermercado de médio porte com 4 caixas. Bom giro de bebidas e limpeza.',
      },
      {
        name: 'Mercadinho da Praça',
        cnpj: '45.678.901/0001-23',
        owner_name: 'Maria Aparecida',
        phone: '(11) 96543-2109',
        email: 'mercadinho.praca@gmail.com',
        address: 'Praça da Matriz',
        number: '45',
        city: 'Osasco',
        state: 'SP',
        neighborhood: 'Vila Yara',
        size: 'pequeno',
        status: 'ativo',
        notes: 'Clientela de conveniência, pedidos com entrega quinzenal.',
      },
      {
        name: 'Mercado São José',
        cnpj: '34.567.890/0001-45',
        owner_name: 'José Roberto',
        phone: '(11) 95432-1098',
        email: 'saojose.mercado@uol.com.br',
        address: 'Rua Bela Vista',
        number: '890',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Mooca',
        size: 'medio',
        status: 'ativo',
        notes: 'Mercadinho familiar antigo, paga sempre pontualmente no boleto ou PIX.',
      },
      {
        name: 'Atacadão do Bairro',
        cnpj: '23.456.789/0001-67',
        owner_name: 'Fernando Guimarães',
        phone: '(11) 94321-0987',
        email: 'compras@atacadaodobairro.com.br',
        address: 'Av. do Cursino',
        number: '3200',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Saúde',
        size: 'grande',
        status: 'ativo',
        notes: 'Maior volume da região. Negocia faturado em 30 dias.',
      },
    ]

    const customerRecords = {}
    for (const cust of initialCustomers) {
      let cRec
      try {
        cRec = app.findFirstRecordByData('customers', 'name', cust.name)
      } catch (_) {
        cRec = new Record(customersCol)
        cRec.set('name', cust.name)
        cRec.set('cnpj', cust.cnpj)
        cRec.set('owner_name', cust.owner_name)
        cRec.set('phone', cust.phone)
        cRec.set('email', cust.email)
        cRec.set('address', cust.address)
        cRec.set('number', cust.number)
        cRec.set('city', cust.city)
        cRec.set('state', cust.state)
        cRec.set('neighborhood', cust.neighborhood)
        cRec.set('size', cust.size)
        cRec.set('status', cust.status)
        cRec.set('notes', cust.notes)
        app.save(cRec)
      }
      customerRecords[cust.name] = cRec
    }

    // 6 Deals distributed across stages
    const dealsCol = app.findCollectionByNameOrId('deals')
    const now = new Date()
    const daysFromNow = (d) => {
      const target = new Date(now.getTime() + d * 86400000)
      return target.toISOString().split('T')[0] + ' 12:00:00.000Z'
    }

    const initialDeals = [
      {
        title: 'Reposição Mensal de Grãos e Mercearia',
        customer: customerRecords['Mercado Bom Preço'].id,
        value: 3450.0,
        stage: 'prospeccao',
        expected_close_date: daysFromNow(10),
        owner: userRecord.id,
        notes: 'Apresentar nova tabela de descontos progressivos para compras acima de 100 fardos.',
      },
      {
        title: 'Kit Bebidas e Sucos para o Verão',
        customer: customerRecords['Supermercado Silva'].id,
        value: 5800.0,
        stage: 'negociacao',
        expected_close_date: daysFromNow(5),
        owner: userRecord.id,
        notes: 'Negociando prazo de pagamento em 21/28 dias.',
      },
      {
        title: 'Proposta Linha Limpeza Completa',
        customer: customerRecords['Mercadinho da Praça'].id,
        value: 1980.0,
        stage: 'proposta',
        expected_close_date: daysFromNow(3),
        owner: userRecord.id,
        notes: 'Proposta enviada em PDF no WhatsApp do responsável.',
      },
      {
        title: 'Pedido Fechado Grãos e Óleos',
        customer: customerRecords['Mercado São José'].id,
        value: 4230.0,
        stage: 'fechado',
        expected_close_date: daysFromNow(-2),
        owner: userRecord.id,
        notes: 'Venda confirmada, faturada para entrega na próxima terça.',
      },
      {
        title: 'Cotação Atacado Biscoitos e Matinais',
        customer: customerRecords['Atacadão do Bairro'].id,
        value: 12500.0,
        stage: 'proposta',
        expected_close_date: daysFromNow(7),
        owner: userRecord.id,
        notes: 'Aguardando aprovação do setor de suprimentos da rede.',
      },
      {
        title: 'Proposta Bebidas Especiais',
        customer: customerRecords['Supermercado Silva'].id,
        value: 2800.0,
        stage: 'perdido',
        expected_close_date: daysFromNow(-15),
        owner: userRecord.id,
        notes: 'Concorrente ofereceu bonificação de 10 caixas.',
      },
    ]

    for (const deal of initialDeals) {
      try {
        app.findFirstRecordByData('deals', 'title', deal.title)
      } catch (_) {
        const dRec = new Record(dealsCol)
        dRec.set('title', deal.title)
        dRec.set('customer', deal.customer)
        dRec.set('value', deal.value)
        dRec.set('stage', deal.stage)
        dRec.set('expected_close_date', deal.expected_close_date)
        dRec.set('owner', deal.owner)
        dRec.set('notes', deal.notes)
        app.save(dRec)
      }
    }

    // 5 Sales in last 6 months + sale items
    const salesCol = app.findCollectionByNameOrId('sales')
    const saleItemsCol = app.findCollectionByNameOrId('sale_items')

    const monthsAgo = (m, day = 15) => {
      const d = new Date(now.getFullYear(), now.getMonth() - m, day)
      return d.toISOString().split('T')[0] + ' 12:00:00.000Z'
    }

    const initialSales = [
      {
        customerName: 'Mercado Bom Preço',
        saleDate: monthsAgo(4, 10),
        paymentMethod: 'pix',
        paymentStatus: 'pago',
        notes: 'Primeiro pedido faturado do trimestre.',
        items: [
          { productName: 'Arroz 5kg', qty: 30, price: 24.9 }, // 747.00
          { productName: 'Feijão Carioca 1kg', qty: 40, price: 7.5 }, // 300.00
          { productName: 'Óleo de Soja 900ml', qty: 50, price: 6.8 }, // 340.00 -> 1387.00
        ],
      },
      {
        customerName: 'Supermercado Silva',
        saleDate: monthsAgo(3, 20),
        paymentMethod: 'boleto',
        paymentStatus: 'pago',
        notes: 'Pedido recorrente mensal.',
        items: [
          { productName: 'Refrigerante 2L', qty: 100, price: 9.9 }, // 990.00
          { productName: 'Sabão em Pó 1kg', qty: 40, price: 12.9 }, // 516.00
          { productName: 'Detergente 500ml', qty: 80, price: 3.5 }, // 280.00
          { productName: 'Biscoito Recheado', qty: 60, price: 4.2 }, // 252.00 -> 2038.00
        ],
      },
      {
        customerName: 'Mercadinho da Praça',
        saleDate: monthsAgo(2, 5),
        paymentMethod: 'cartao_credito',
        paymentStatus: 'pago',
        notes: 'Entrega rápida com frete grátis.',
        items: [
          { productName: 'Café Torrado 500g', qty: 30, price: 14.5 }, // 435.00
          { productName: 'Açúcar Cristal 5kg', qty: 20, price: 19.9 }, // 398.00
          { productName: 'Leite Integral 1L', qty: 50, price: 5.9 }, // 295.00 -> 1128.00
        ],
      },
      {
        customerName: 'Mercado São José',
        saleDate: monthsAgo(1, 18),
        paymentMethod: 'pix',
        paymentStatus: 'pago',
        notes: 'Pedido de reposição quinzenal.',
        items: [
          { productName: 'Arroz 5kg', qty: 50, price: 24.9 }, // 1245.00
          { productName: 'Feijão Carioca 1kg', qty: 60, price: 7.5 }, // 450.00
          { productName: 'Óleo de Soja 900ml', qty: 40, price: 6.8 }, // 272.00
          { productName: 'Café Torrado 500g', qty: 25, price: 14.5 }, // 362.50 -> 2329.50
        ],
      },
      {
        customerName: 'Atacadão do Bairro',
        saleDate: monthsAgo(0, 3), // este mês
        paymentMethod: 'boleto',
        paymentStatus: 'pago',
        notes: 'Grande carga quinzenal com desconto de atacado.',
        items: [
          { productName: 'Arroz 5kg', qty: 120, price: 24.9 }, // 2988.00
          { productName: 'Açúcar Cristal 5kg', qty: 80, price: 19.9 }, // 1592.00
          { productName: 'Refrigerante 2L', qty: 150, price: 9.9 }, // 1485.00
          { productName: 'Sabão em Pó 1kg', qty: 60, price: 12.9 }, // 774.00 -> 6839.00
        ],
      },
    ]

    for (const saleData of initialSales) {
      const custRec = customerRecords[saleData.customerName]
      if (!custRec) continue

      let total = 0
      for (const item of saleData.items) {
        total += item.qty * item.price
      }
      // Round to 2 decimals
      total = Math.round(total * 100) / 100

      let sRec
      try {
        sRec = app.findFirstRecordByData('sales', 'notes', saleData.notes)
      } catch (_) {
        sRec = new Record(salesCol)
        sRec.set('customer', custRec.id)
        sRec.set('seller', userRecord.id)
        sRec.set('sale_date', saleData.saleDate)
        sRec.set('total', total)
        sRec.set('payment_method', saleData.paymentMethod)
        sRec.set('payment_status', saleData.paymentStatus)
        sRec.set('notes', saleData.notes)
        app.save(sRec)

        // Create items for this sale
        for (const item of saleData.items) {
          const prodRec = productRecords[item.productName]
          if (!prodRec) continue
          const itemRec = new Record(saleItemsCol)
          itemRec.set('sale', sRec.id)
          itemRec.set('product', prodRec.id)
          itemRec.set('quantity', item.qty)
          itemRec.set('unit_price', item.price)
          app.save(itemRec)
        }
      }
    }
  },
  (app) => {
    // down migration
  },
)
