/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    if (!usersCol.fields.getByName('phone')) {
      usersCol.fields.add(
        new TextField({
          name: 'phone',
          type: 'text',
          required: false,
        }),
      )
    }

    // Garante que o campo avatar aceita imagens padrão
    const avatarField = usersCol.fields.getByName('avatar')
    if (avatarField) {
      avatarField.mimeRanges = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
      ]
      avatarField.maxSize = 5242880 // 5MB
    }

    app.save(usersCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (usersCol.fields.getByName('phone')) {
      usersCol.fields.removeByName('phone')
      app.save(usersCol)
    }
  },
)
