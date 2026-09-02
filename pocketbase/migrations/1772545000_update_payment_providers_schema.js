/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('payment_providers')

    // Adiciona campo 'priority' se não existir
    let hasPriority = false
    let hasConfig = false
    for (let i = 0; i < collection.fields.length; i++) {
      if (collection.fields[i].name === 'priority') hasPriority = true
      if (collection.fields[i].name === 'config') hasConfig = true
    }

    if (!hasPriority) {
      collection.fields.add(
        new NumberField({
          name: 'priority',
          min: 0,
        }),
      )
    }

    if (!hasConfig) {
      collection.fields.add(
        new JSONField({
          name: 'config',
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    // down migration
  },
)
