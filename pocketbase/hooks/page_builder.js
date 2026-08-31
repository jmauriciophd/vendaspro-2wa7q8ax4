// Page Builder Backend API Hook — VendasPro
// Endpoints para gerenciamento seguro de templates, páginas, publicações,
// checkout atômico com recálculo backend, pagamentos Mercado Pago, auditoria e analytics.

// ---------------------------------------------------------------------------
// 1. GET /backend/v1/builder/public/page/{identifier} (PÚBLICO - sem auth admin)
// Carrega os dados da página/catálogo por Slug ou Token
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/builder/public/page/{identifier}', (e) => {
  const ident = (e.request.pathValue('identifier') || '').trim()
  if (!ident) return e.json(400, { message: 'Identificador obrigatório.' })

  let page = null
  try {
    page = $app.findFirstRecordByData('sale_pages', 'slug', ident)
  } catch (_) {
    try {
      page = $app.findFirstRecordByData('sale_pages', 'access_token', ident)
    } catch (_) {}
  }

  if (!page) {
    return e.json(404, { message: 'Página ou catálogo não encontrado ou indisponível.' })
  }

  const status = page.get('status') || 'draft'
  const isAuth = !!e.auth

  // Se não estiver publicado e usuário não for admin/dono, bloqueia
  if (status !== 'published') {
    if (!isAuth) {
      return e.json(403, {
        message: 'Este catálogo não está disponível no momento (status: ' + status + ').',
      })
    }
    const role = e.auth.get('role') || 'vendedor'
    const uid = e.auth.id
    const seller = page.get('seller') || ''
    if (role === 'vendedor' && seller !== uid && page.get('created_by') !== uid) {
      return e.json(403, { message: 'Acesso negado a este rascunho de página.' })
    }
  }

  // Checa datas de expiração
  const now = new Date()
  const startDate = page.get('start_date') ? new Date(page.get('start_date')) : null
  const endDate = page.get('end_date') ? new Date(page.get('end_date')) : null
  if (status === 'published') {
    if (startDate && now < startDate) {
      return e.json(403, {
        message:
          'Este catálogo estará disponível a partir de ' + startDate.toLocaleDateString('pt-BR'),
      })
    }
    if (endDate && now > endDate) {
      return e.json(403, {
        message: 'Este catálogo expirou em ' + endDate.toLocaleDateString('pt-BR'),
      })
    }
  }

  // Informações da Empresa
  let companyData = null
  try {
    const cos = $app.findRecordsByFilter('company_settings', '1=1', 'created', 1, 0)
    if (cos && cos.length > 0) {
      const c = cos[0]
      companyData = {
        name: c.get('name') || 'VendasPro',
        cnpj: c.get('cnpj') || '',
        ie: c.get('ie') || '',
        phone: c.get('phone') || '',
        email: c.get('email') || '',
        address: c.get('address') || '',
        city: c.get('city') || '',
        state: c.get('state') || '',
        logo: c.get('logo') || '',
      }
    }
  } catch (_) {}

  // Informações do Vendedor Responsável
  let sellerData = null
  const sellerId = page.get('seller') || ''
  if (sellerId) {
    try {
      const u = $app.findRecordById('users', sellerId)
      sellerData = {
        id: u.id,
        name: u.get('name') || 'Equipe Comercial',
        email: u.get('email') || '',
        avatar: u.get('avatar') || '',
      }
    } catch (_) {}
  }

  // Informações do Cliente Alvo (se página exclusiva)
  let targetCustomerData = null
  const targetCustId = page.get('target_customer') || ''
  if (targetCustId) {
    try {
      const cust = $app.findRecordById('customers', targetCustId)
      targetCustomerData = {
        id: cust.id,
        name: cust.get('name') || '',
        owner_name: cust.get('owner_name') || '',
        cnpj: cust.get('cnpj') || '',
        phone: cust.get('phone') || cust.get('phone_whatsapp') || '',
        email: cust.get('email') || '',
        city: cust.get('city') || '',
        state: cust.get('state') || '',
        address: cust.get('address') || '',
      }
    } catch (_) {}
  }

  // Lista de produtos reais e ativos do catálogo
  let products = []
  try {
    const prods = $app.findRecordsByFilter('products', 'active = true', 'name', 500, 0)
    for (let i = 0; i < prods.length; i++) {
      const p = prods[i]
      products.push({
        id: p.id,
        name: p.get('name') || '',
        category: p.get('category') || 'outros',
        unit: p.get('unit') || 'un',
        price: p.get('price') || 0,
        code: p.get('code') || '',
        stock: p.get('stock') !== undefined ? p.get('stock') : 999,
        ncm: p.get('ncm') || '',
        cfop: p.get('cfop') || '',
        active: p.get('active') === true,
      })
    }
  } catch (_) {}

  // Incrementa contador de visualizações
  try {
    const currentViews = page.get('views_count') || 0
    page.set('views_count', currentViews + 1)
    $app.save(page)
  } catch (_) {}

  return e.json(200, {
    page: {
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      access_token: page.get('access_token'),
      type: page.get('type'),
      status: page.get('status'),
      visibility: page.get('visibility'),
      template: page.get('template'),
      campaign_name: page.get('campaign_name'),
      start_date: page.get('start_date'),
      end_date: page.get('end_date'),
      layout_data: page.get('layout_data') || {},
      settings: page.get('settings') || {},
      seo_title: page.get('seo_title'),
      seo_description: page.get('seo_description'),
      seo_image: page.get('seo_image'),
      custom_css: page.get('custom_css'),
      custom_html: page.get('custom_html'),
      views_count: page.get('views_count') || 0,
      version: page.get('version') || 1,
    },
    company: companyData,
    seller: sellerData,
    target_customer: targetCustomerData,
    products: products,
  })
})

// ---------------------------------------------------------------------------
// 2. POST /backend/v1/builder/checkout/create-order (PÚBLICO / CLIENTE IDENTIFICADO)
// Processa o pedido com validação atômica no backend, cálculo estrito de estoque,
// criação do pedido em `sales` e geração de cobrança com Mercado Pago
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/builder/checkout/create-order', (e) => {
  const body = e.requestInfo().body || {}
  const pageId = (body.page_id || '').toString().trim()
  const customerId = (body.customer_id || '').toString().trim()
  const items = Array.isArray(body.items) ? body.items : []
  const paymentMethod = (body.payment_method || 'pix').toString().trim().toLowerCase()
  const installments = parseInt(body.installments, 10) || 1
  const shippingAddress = body.shipping_address || {}
  const orderNotes = (body.order_notes || '').toString()

  if (!pageId) return e.json(400, { message: 'ID da página/catálogo é obrigatório.' })
  if (!customerId) return e.json(400, { message: 'Identificação do cliente é obrigatória.' })
  if (items.length === 0) return e.json(400, { message: 'O carrinho está vazio.' })

  // 1. Valida página
  let page = null
  try {
    page = $app.findRecordById('sale_pages', pageId)
  } catch (_) {
    return e.json(404, { message: 'Catálogo ou página não encontrada.' })
  }
  if (page.get('status') !== 'published') {
    return e.json(400, { message: 'Este catálogo não está disponível para novos pedidos.' })
  }

  // 2. Valida cliente
  let customer = null
  try {
    customer = $app.findRecordById('customers', customerId)
  } catch (_) {
    return e.json(404, { message: 'Cliente cadastrado não encontrado.' })
  }

  const sellerId = page.get('seller') || ''
  const templateId = page.get('template') || ''
  const campaignName = page.get('campaign_name') || ''

  // 3. Validação estrita de preços e estoque no BACKEND (NUNCA confiar no frontend)
  let calculatedTotal = 0
  const validatedItems = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const prodId = (item.product_id || item.product || '').toString()
    const quantity = Number(item.quantity || 0)

    if (!prodId || quantity <= 0) {
      return e.json(400, { message: 'Item inválido ou quantidade incorreta.' })
    }

    let product = null
    try {
      product = $app.findRecordById('products', prodId)
    } catch (_) {
      return e.json(400, { message: 'Produto não encontrado: ID ' + prodId })
    }

    if (!product.get('active')) {
      return e.json(400, { message: 'O produto "' + product.get('name') + '" está inativo.' })
    }

    const currentStock = Number(product.get('stock') !== undefined ? product.get('stock') : 999)
    if (currentStock < quantity) {
      return e.json(400, {
        message:
          'Estoque insuficiente para o produto "' +
          product.get('name') +
          '". Disponível: ' +
          currentStock +
          ' ' +
          (product.get('unit') || 'un') +
          '.',
      })
    }

    const officialPrice = Number(product.get('price') || 0)
    const itemSubtotal = Math.round(officialPrice * quantity * 100) / 100
    calculatedTotal += itemSubtotal

    validatedItems.push({
      productRecord: product,
      productId: product.id,
      productName: product.get('name') || '',
      unitPrice: officialPrice,
      quantity: quantity,
      subtotal: itemSubtotal,
    })
  }

  calculatedTotal = Math.round(calculatedTotal * 100) / 100

  // 4. Executa transação atômica: criação de Sale, SaleItems, baixa de estoque e atualização de contadores
  let saleId = ''
  let saleRecord = null

  try {
    $app.runInTransaction(function (txApp) {
      const salesCol = txApp.findCollectionByNameOrId('sales')
      const now = new Date()
      const pad = function (n) {
        return n < 10 ? '0' + n : '' + n
      }
      const ymd =
        now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate())

      // Mapeia método de pagamento para a coleção sales
      let salePaymentMethod = 'pix'
      if (paymentMethod === 'credit_card' || paymentMethod === 'cartao_credito')
        salePaymentMethod = 'cartao_credito'
      else if (paymentMethod === 'debit_card' || paymentMethod === 'cartao_debito')
        salePaymentMethod = 'cartao_debito'
      else if (paymentMethod === 'boleto') salePaymentMethod = 'boleto'
      else if (paymentMethod === 'dinheiro') salePaymentMethod = 'dinheiro'

      const sale = new Record(salesCol)
      sale.set('customer', customer.id)
      if (sellerId) sale.set('seller', sellerId)
      sale.set('sale_date', ymd)
      sale.set('total', calculatedTotal)
      sale.set('payment_method', salePaymentMethod)
      sale.set('payment_status', 'pendente')
      sale.set('notes', orderNotes || 'Pedido gerado via Catálogo Online: ' + page.get('title'))
      sale.set('sale_page', page.id)
      if (templateId) sale.set('sale_template', templateId)
      sale.set('origin_channel', 'catalogo_online')
      if (campaignName) sale.set('campaign_name', campaignName)
      if (shippingAddress) sale.set('shipping_address', shippingAddress)
      if (orderNotes) sale.set('order_notes', orderNotes)

      txApp.save(sale)
      saleId = sale.id
      saleRecord = sale

      // Cria os itens e decrementa o estoque de forma atômica
      const itemsCol = txApp.findCollectionByNameOrId('sale_items')
      for (let j = 0; j < validatedItems.length; j++) {
        const vi = validatedItems[j]
        const sItem = new Record(itemsCol)
        sItem.set('sale', sale.id)
        sItem.set('product', vi.productId)
        sItem.set('quantity', vi.quantity)
        sItem.set('unit_price', vi.unitPrice)
        txApp.save(sItem)

        // Baixa de estoque
        const pRec = vi.productRecord
        const oldStock = Number(pRec.get('stock') !== undefined ? pRec.get('stock') : 999)
        pRec.set('stock', Math.max(0, oldStock - vi.quantity))
        txApp.save(pRec)
      }

      // Calcula comissão com base na regra existente do vendedor
      if (sellerId) {
        let commPercentage = 3 // padrão 3% se não houver regra
        try {
          const rules = txApp.findRecordsByFilter(
            'commission_rules',
            'seller = {:s} && active = true',
            '-created',
            1,
            0,
            { s: sellerId },
          )
          if (rules && rules.length > 0) {
            commPercentage = Number(rules[0].get('percentage') || 3)
          }
        } catch (_) {}

        const commVal = Math.round(calculatedTotal * (commPercentage / 100) * 100) / 100
        const commCol = txApp.findCollectionByNameOrId('commissions')
        const commRec = new Record(commCol)
        commRec.set('seller', sellerId)
        commRec.set('sale', sale.id)
        commRec.set('sale_value', calculatedTotal)
        commRec.set('commission_percentage', commPercentage)
        commRec.set('commission_value', commVal)
        commRec.set('status', 'pending')
        commRec.set('reference_month', now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1))
        txApp.save(commRec)
      }

      // Atualiza métricas na página de venda
      const txPage = txApp.findRecordById('sale_pages', page.id)
      const currentOrders = txPage.get('orders_count') || 0
      const currentSales = txPage.get('sales_total') || 0
      txPage.set('orders_count', currentOrders + 1)
      txPage.set('sales_total', Math.round((currentSales + calculatedTotal) * 100) / 100)
      txApp.save(txPage)

      // Registra evento no analytics
      const anaCol = txApp.findCollectionByNameOrId('page_analytics_events')
      const ana = new Record(anaCol)
      ana.set('page', page.id)
      ana.set('event_type', 'order_completed')
      ana.set('customer', customer.id)
      if (sellerId) ana.set('seller', sellerId)
      ana.set('payload', {
        sale_id: sale.id,
        total: calculatedTotal,
        items_count: validatedItems.length,
      })
      txApp.save(ana)

      // Registra notificação para o vendedor
      if (sellerId) {
        const notifCol = txApp.findCollectionByNameOrId('notifications')
        const notif = new Record(notifCol)
        notif.set('user', sellerId)
        notif.set('type', 'order')
        notif.set('title', 'Novo Pedido Online')
        notif.set(
          'message',
          'Novo pedido #' +
            sale.id.slice(-6).toUpperCase() +
            ' de ' +
            (customer.get('name') || 'Cliente') +
            ' no valor de R$ ' +
            calculatedTotal.toFixed(2).replace('.', ','),
        )
        notif.set('reference_type', 'sale')
        notif.set('reference_id', sale.id)
        notif.set('is_read', false)
        txApp.save(notif)
      }

      // Log de Auditoria
      const auditCol = txApp.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (sellerId) audit.set('target', sellerId)
      audit.set('action', 'ORDER_CREATED')
      audit.set('module', 'catalogs')
      audit.set(
        'description',
        'Pedido #' +
          sale.id.slice(-6).toUpperCase() +
          ' gerado pelo catálogo ' +
          page.get('title') +
          ' no valor de R$ ' +
          calculatedTotal,
      )
      audit.set('after', {
        sale_id: sale.id,
        page_id: page.id,
        total: calculatedTotal,
        customer_id: customer.id,
      })
      audit.set('result', 'success')
      txApp.save(audit)
    })
  } catch (err) {
    return e.json(500, {
      message:
        'Erro ao processar transação do pedido: ' +
        (err && err.message ? err.message : String(err)),
    })
  }

  // 5. Gera a Cobrança no Gateway de Pagamento Mercado Pago
  let paymentCharge = null
  let paymentError = ''

  try {
    let mpProvider = null
    try {
      mpProvider = $app.findFirstRecordByData('payment_providers', 'slug', 'mercadopago')
    } catch (_) {
      // Fallback para qualquer provedor ativo
      const provs = $app.findRecordsByFilter(
        'payment_providers',
        'status = "active"',
        'created',
        1,
        0,
      )
      if (provs && provs.length > 0) mpProvider = provs[0]
    }

    if (mpProvider) {
      const providerId = mpProvider.id
      const provSlug = (mpProvider.get('slug') || '').toLowerCase()
      const provEnv = (mpProvider.get('environment') || 'sandbox').toLowerCase()

      let apiKey = (mpProvider.get('api_key') || '').toString().trim()
      try {
        const cfg = $app.findFirstRecordByData(
          'payment_provider_configs',
          'provider_id',
          providerId,
        )
        if (cfg && cfg.get('api_key')) apiKey = String(cfg.get('api_key')).trim()
      } catch (_) {}

      const isRealKey =
        Boolean(apiKey) &&
        apiKey.indexOf('DEMO') < 0 &&
        apiKey.indexOf('demo') < 0 &&
        (provEnv === 'production' ||
          apiKey.startsWith('TEST-') ||
          apiKey.startsWith('APP_USR-') ||
          apiKey.startsWith('PROD-'))

      const now = new Date()
      const pad = function (n) {
        return n < 10 ? '0' + n : '' + n
      }
      const ymd = now.getUTCFullYear() + '' + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
      const suffix = $security.randomString(6).toUpperCase()
      const externalId = 'CHG-' + ymd + '-' + suffix

      // Conta financeira
      let accountId = ''
      try {
        const accs = $app.findRecordsByFilter(
          'financial_accounts',
          'provider_id = {:p} && active = true',
          '-is_default',
          1,
          0,
          { p: providerId },
        )
        if (accs && accs.length > 0) accountId = accs[0].id
      } catch (_) {}

      const chargeCol = $app.findCollectionByNameOrId('payment_charges')
      const rec = new Record(chargeCol)
      rec.set('sale_id', saleId)
      rec.set('client_id', customer.id)
      if (sellerId) rec.set('seller_id', sellerId)
      rec.set('provider_id', providerId)
      if (accountId) rec.set('financial_account_id', accountId)
      rec.set('external_charge_id', externalId)
      rec.set(
        'payment_method',
        paymentMethod === 'cartao_credito'
          ? 'credit_card'
          : paymentMethod === 'cartao_debito'
            ? 'debit_card'
            : paymentMethod,
      )
      rec.set('original_amount', calculatedTotal)
      rec.set('discount_amount', 0)
      rec.set('final_amount', calculatedTotal)
      rec.set('installments', installments)
      rec.set('status', 'pending')

      // Vencimento +3 dias
      const expDate = new Date(now.getTime())
      expDate.setUTCDate(expDate.getUTCDate() + 3)
      rec.set(
        'expires_at',
        expDate.getUTCFullYear() +
          '-' +
          pad(expDate.getUTCMonth() + 1) +
          '-' +
          pad(expDate.getUTCDate()) +
          ' 23:59:59.000Z',
      )

      const custName = customer.get('name') || customer.get('owner_name') || 'Cliente'
      const custEmail = customer.get('email') || 'cliente@vendaspro.com'
      const dueDate =
        expDate.getUTCFullYear() +
        '-' +
        pad(expDate.getUTCMonth() + 1) +
        '-' +
        pad(expDate.getUTCDate())

      // Chamada Mercado Pago
      if (provSlug === 'mercadopago' && isRealKey) {
        if (paymentMethod === 'pix') {
          try {
            const res = $http.send({
              url: 'https://api.mercadopago.com/v1/payments',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalId,
              },
              body: JSON.stringify({
                transaction_amount: calculatedTotal,
                description:
                  'Pedido #' + saleId.slice(-6).toUpperCase() + ' - ' + page.get('title'),
                payment_method_id: 'pix',
                date_of_expiration: dueDate + 'T23:59:59.000Z',
                payer: { email: custEmail, first_name: custName },
              }),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              const pr = res.json || {}
              const ppi =
                (pr.point_of_interaction && pr.point_of_interaction.transaction_data) || {}
              rec.set('pix_code', ppi.qr_code || pr.qr_code || '')
              rec.set('pix_qrcode', ppi.qr_code_base64 || '')
              rec.set('payment_url', ppi.ticket_url || '')
              rec.set('provider_response', pr)
            }
          } catch (ePix) {
            paymentError = 'Mercado Pago PIX: ' + String(ePix)
          }
        } else if (paymentMethod === 'boleto') {
          try {
            const res = $http.send({
              url: 'https://api.mercadopago.com/v1/payments',
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalId,
              },
              body: JSON.stringify({
                transaction_amount: calculatedTotal,
                description:
                  'Pedido #' + saleId.slice(-6).toUpperCase() + ' - ' + page.get('title'),
                payment_method_id: 'bolbradesco',
                date_of_expiration: dueDate + 'T23:59:59.000Z',
                payer: { email: custEmail, first_name: custName },
              }),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              const pr = res.json || {}
              const td = pr.transaction_details || {}
              rec.set('boleto_barcode', String(td.barcode || pr.barcode || ''))
              rec.set(
                'boleto_digitable_line',
                String(td.verification_code || pr.digitable_line || ''),
              )
              rec.set('boleto_nosso_numero', String(pr.id || ''))
              rec.set('boleto_document_number', externalId)
              rec.set('boleto_url', String(td.external_resource_url || ''))
              rec.set('payment_url', String(td.external_resource_url || ''))
              rec.set('provider_response', pr)
            }
          } catch (eBol) {
            paymentError = 'Mercado Pago Boleto: ' + String(eBol)
          }
        } else {
          // Checkout Pro Oficial para Cartão / Link de Pagamento Seguro (sem guardar cartão)
          try {
            const res = $http.send({
              url: 'https://api.mercadopago.com/checkout/preferences',
              method: 'POST',
              headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [
                  {
                    id: saleId,
                    title: 'Pedido #' + saleId.slice(-6).toUpperCase() + ' - ' + page.get('title'),
                    description: 'Venda via catálogo online',
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: calculatedTotal,
                  },
                ],
                payer: { name: custName, email: custEmail },
                external_reference: externalId,
                statement_descriptor: 'VENDASPRO',
              }),
              timeout: 20,
            })
            if (res && res.statusCode >= 200 && res.statusCode < 300) {
              const pr = res.json || {}
              const checkoutUrl =
                provEnv === 'sandbox'
                  ? pr.sandbox_init_point || pr.init_point
                  : pr.init_point || pr.sandbox_init_point
              rec.set('payment_url', checkoutUrl || '')
              rec.set('provider_response', pr)
            }
          } catch (eLink) {
            paymentError = 'Mercado Pago Checkout: ' + String(eLink)
          }
        }
      }

      $app.save(rec)

      paymentCharge = {
        id: rec.id,
        external_charge_id: externalId,
        payment_method: rec.get('payment_method'),
        final_amount: calculatedTotal,
        payment_url: rec.get('payment_url') || '',
        pix_code: rec.get('pix_code') || '',
        pix_qrcode: rec.get('pix_qrcode') || '',
        boleto_url: rec.get('boleto_url') || '',
        boleto_digitable_line: rec.get('boleto_digitable_line') || '',
        expires_at: rec.get('expires_at') || '',
      }
    }
  } catch (chargeErr) {
    paymentError = 'Falha ao instanciar cobrança: ' + String(chargeErr)
  }

  return e.json(200, {
    success: true,
    message: 'Pedido realizado com sucesso!',
    sale: {
      id: saleId,
      order_number: '#' + saleId.slice(-6).toUpperCase(),
      total: calculatedTotal,
      items_count: validatedItems.length,
      customer_name: customer.get('name') || '',
      created: new Date().toISOString(),
    },
    payment_charge: paymentCharge,
    payment_warning: paymentError,
  })
})

// ---------------------------------------------------------------------------
// 3. POST /backend/v1/builder/analytics/event (PÚBLICO)
// Registra telemetria de visualizações, cliques e adição ao carrinho
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/builder/analytics/event', (e) => {
  const body = e.requestInfo().body || {}
  const pageId = (body.page_id || '').toString().trim()
  const eventType = (body.event_type || 'page_view').toString().trim()

  if (!pageId) return e.json(400, { message: 'page_id é obrigatório.' })

  let page = null
  try {
    page = $app.findRecordById('sale_pages', pageId)
  } catch (_) {
    return e.json(404, { message: 'Página não encontrada.' })
  }

  const col = $app.findCollectionByNameOrId('page_analytics_events')
  const rec = new Record(col)
  rec.set('page', page.id)
  rec.set('event_type', eventType)
  if (body.customer_id) rec.set('customer', body.customer_id)
  if (page.get('seller')) rec.set('seller', page.get('seller'))
  if (body.product_id) rec.set('product_id', String(body.product_id))
  rec.set('device_type', (body.device_type || 'desktop').toString())
  rec.set('referrer', (body.referrer || '').toString())
  rec.set(
    'ip_address',
    (e.requestInfo().headers['x-forwarded-for'] || '').toString().split(',')[0].trim(),
  )
  rec.set('user_agent', (e.requestInfo().headers['user-agent'] || '').toString())
  rec.set('payload', body.payload || {})
  $app.save(rec)

  return e.json(200, { success: true, id: rec.id })
})

// ---------------------------------------------------------------------------
// 4. GET /backend/v1/builder/seller/dashboard (AUTH - Vendedor ou Admin)
// Retorna estatísticas de performance de catálogos do vendedor logado
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/builder/seller/dashboard',
  (e) => {
    if (!e.auth) return e.json(401, { message: 'Não autenticado.' })
    const userId = e.auth.id
    const role = e.auth.get('role') || 'vendedor'

    let filter = role === 'vendedor' ? 'seller = {:s}' : '1=1'
    let params = role === 'vendedor' ? { s: userId } : {}

    let pages = []
    try {
      pages = $app.findRecordsByFilter('sale_pages', filter, '-created', 100, 0, params)
    } catch (_) {}

    let totalViews = 0
    let totalOrders = 0
    let totalRevenue = 0
    const pagesList = []

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]
      const v = p.get('views_count') || 0
      const o = p.get('orders_count') || 0
      const s = p.get('sales_total') || 0
      totalViews += v
      totalOrders += o
      totalRevenue += s

      pagesList.push({
        id: p.id,
        title: p.get('title') || '',
        slug: p.get('slug') || '',
        access_token: p.get('access_token') || '',
        type: p.get('type') || 'catalogo',
        status: p.get('status') || 'draft',
        views_count: v,
        orders_count: o,
        sales_total: s,
        conversion_rate: v > 0 ? Math.round((o / v) * 1000) / 10 : 0,
        target_customer: p.get('target_customer') || '',
        created: p.get('created') || '',
        public_url: '/v/' + (p.get('slug') || p.get('access_token')),
      })
    }

    // Preenche nome do cliente alvo se houver
    for (let j = 0; j < pagesList.length; j++) {
      const cid = pagesList[j].target_customer
      if (cid) {
        try {
          pagesList[j].customer_name = $app.findRecordById('customers', cid).get('name')
        } catch (_) {
          pagesList[j].customer_name = ''
        }
      }
    }

    const overallConversion =
      totalViews > 0 ? Math.round((totalOrders / totalViews) * 1000) / 10 : 0

    return e.json(200, {
      summary: {
        total_catalogs: pages.length,
        published_catalogs: pages.filter(function (p) {
          return p.get('status') === 'published'
        }).length,
        total_views: totalViews,
        total_orders: totalOrders,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        conversion_rate: overallConversion,
      },
      catalogs: pagesList,
    })
  },
  $apis.requireAuth(),
)
