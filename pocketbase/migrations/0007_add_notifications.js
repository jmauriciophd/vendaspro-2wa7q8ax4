// 0007 — Coleção `notifications`
// Notificações automáticas do sistema (comissões, pedidos, cotações, estoque, sistema).
// O usuário só vê suas próprias notificações (regra por @request.auth.id).

migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    let col
    try {
      col = app.findCollectionByNameOrId('notifications')
    } catch (_) {
      col = new Collection({
        name: 'notifications',
        type: 'base',
        // Usuário só vê/manipula suas próprias notificações.
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        // Criação pode ser feita por sistema (hooks) ou pelo próprio usuário.
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['commission', 'order', 'quote', 'stock', 'system'],
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'message', type: 'text', required: true },
          { name: 'reference_type', type: 'text', max: 50 },
          { name: 'reference_id', type: 'text', max: 100 },
          { name: 'is_read', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notifications_user ON notifications (user)',
          'CREATE INDEX idx_notifications_user_read ON notifications (user, is_read)',
          'CREATE INDEX idx_notifications_created ON notifications (created DESC)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notifications'))
    } catch (_) {}
  },
)
