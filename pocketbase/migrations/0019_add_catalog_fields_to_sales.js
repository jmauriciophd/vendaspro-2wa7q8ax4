migrate(
  (app) => {
    const salesCol = app.findCollectionByNameOrId('sales')
    const pagesCol = app.findCollectionByNameOrId('sale_pages')
    const templatesCol = app.findCollectionByNameOrId('page_templates')

    // Adiciona campos de rastreamento de catálogo na coleção `sales` se não existirem
    if (!salesCol.fields.getByName('sale_page')) {
      salesCol.fields.add(
        new RelationField({
          name: 'sale_page',
          collectionId: pagesCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!salesCol.fields.getByName('sale_template')) {
      salesCol.fields.add(
        new RelationField({
          name: 'sale_template',
          collectionId: templatesCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!salesCol.fields.getByName('origin_channel')) {
      salesCol.fields.add(
        new TextField({
          name: 'origin_channel',
        }),
      )
    }
    if (!salesCol.fields.getByName('campaign_name')) {
      salesCol.fields.add(
        new TextField({
          name: 'campaign_name',
        }),
      )
    }
    if (!salesCol.fields.getByName('shipping_address')) {
      salesCol.fields.add(
        new JSONField({
          name: 'shipping_address',
        }),
      )
    }
    if (!salesCol.fields.getByName('order_notes')) {
      salesCol.fields.add(
        new TextField({
          name: 'order_notes',
        }),
      )
    }
    app.save(salesCol)
  },
  (app) => {
    const salesCol = app.findCollectionByNameOrId('sales')
    if (salesCol.fields.getByName('sale_page')) salesCol.fields.removeByName('sale_page')
    if (salesCol.fields.getByName('sale_template')) salesCol.fields.removeByName('sale_template')
    if (salesCol.fields.getByName('origin_channel')) salesCol.fields.removeByName('origin_channel')
    if (salesCol.fields.getByName('campaign_name')) salesCol.fields.removeByName('campaign_name')
    if (salesCol.fields.getByName('shipping_address'))
      salesCol.fields.removeByName('shipping_address')
    if (salesCol.fields.getByName('order_notes')) salesCol.fields.removeByName('order_notes')
    app.save(salesCol)
  },
)
