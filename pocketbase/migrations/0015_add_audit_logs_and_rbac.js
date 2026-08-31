migrate(
  (app) => {
    // 1. Atualizar a collection `users` adicionando permissions (json) e is_super_admin (bool)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('permissions')) {
      usersCol.fields.add(
        new JSONField({
          name: 'permissions',
          required: false,
        }),
      )
    }
    if (!usersCol.fields.getByName('is_super_admin')) {
      usersCol.fields.add(
        new BoolField({
          name: 'is_super_admin',
          required: false,
        }),
      )
    }
    app.save(usersCol)

    // 2. Marcar jmauriciophd@gmail.com como is_super_admin = true
    try {
      const superAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'jmauriciophd@gmail.com')
      superAdmin.set('is_super_admin', true)
      superAdmin.set('role', 'admin')
      app.save(superAdmin)
    } catch (_) {}

    // 3. Criar collection `audit_logs`
    // Campos: actor (relation users), target (relation users), action (text), module (text),
    // description (text), ip (text), user_agent (text), before (json), after (json),
    // result (select: success | blocked | error)
    // Regras: list/view para admin ou usuário com permissão audit.view.
    // createRule liberado para usuários autenticados (ou preenchido via hooks).
    // updateRule e deleteRule NULOS (imutável, ninguém edita/deleta).
    const auditLogsCollection = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.is_super_admin = true || @request.auth.permissions ~ 'audit.view')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.is_super_admin = true || @request.auth.permissions ~ 'audit.view')",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'actor',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'target',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'action',
          type: 'text',
          required: true,
        },
        {
          name: 'module',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: false,
        },
        {
          name: 'ip',
          type: 'text',
          required: false,
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
        },
        {
          name: 'before',
          type: 'json',
          required: false,
        },
        {
          name: 'after',
          type: 'json',
          required: false,
        },
        {
          name: 'result',
          type: 'select',
          required: true,
          values: ['success', 'blocked', 'error'],
          maxSelect: 1,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_audit_logs_created ON audit_logs (created DESC)',
        'CREATE INDEX idx_audit_logs_actor ON audit_logs (actor)',
        'CREATE INDEX idx_audit_logs_target ON audit_logs (target)',
        'CREATE INDEX idx_audit_logs_action ON audit_logs (action)',
        'CREATE INDEX idx_audit_logs_module ON audit_logs (module)',
        'CREATE INDEX idx_audit_logs_result ON audit_logs (result)',
      ],
    })
    app.save(auditLogsCollection)
  },
  (app) => {
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      app.delete(auditCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const pField = usersCol.fields.getByName('permissions')
      if (pField) usersCol.fields.removeByName('permissions')
      const saField = usersCol.fields.getByName('is_super_admin')
      if (saField) usersCol.fields.removeByName('is_super_admin')
      app.save(usersCol)
    } catch (_) {}
  },
)
