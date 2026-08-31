migrate(
  (app) => {
    // 1. Criar collection `database_backups` (metadados e armazenamento de backups do sistema)
    const backupsCol = new Collection({
      name: 'database_backups',
      type: 'base',
      listRule: null, // Superuser / pb_hooks apenas
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'filename', type: 'text', required: true },
        {
          name: 'backup_file',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 104857600, // 100MB
          mimeTypes: [
            'application/json',
            'text/plain',
            'application/gzip',
            'application/octet-stream',
          ],
          protected: true, // Arquivo privado protegido no PocketBase
        },
        { name: 'size', type: 'number' },
        { name: 'checksum', type: 'text' }, // SHA-256
        { name: 'database_type', type: 'text' }, // "SQLite / PocketBase"
        {
          name: 'backup_type',
          type: 'select',
          required: true,
          values: ['manual', 'automatic', 'pre_restore_safety'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'processing', 'completed', 'failed', 'restored'],
          maxSelect: 1,
        },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'completed_at', type: 'date' },
        { name: 'restored_at', type: 'date' },
        { name: 'error_message', type: 'text' },
        { name: 'collections_included', type: 'json' },
        { name: 'records_count', type: 'number' },
        { name: 'is_protected', type: 'bool' }, // Protegido contra exclusão automática
        { name: 'retention_days', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_database_backups_created ON database_backups (created DESC)',
        'CREATE INDEX idx_database_backups_status ON database_backups (status)',
        'CREATE INDEX idx_database_backups_type ON database_backups (backup_type)',
        'CREATE INDEX idx_database_backups_creator ON database_backups (created_by)',
      ],
    })
    app.save(backupsCol)

    // 2. Criar collection `database_backup_settings` (configuração de backup automático e retenção)
    const settingsCol = new Collection({
      name: 'database_backup_settings',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'auto_backup_enabled', type: 'bool' },
        {
          name: 'frequency',
          type: 'select',
          required: true,
          values: ['daily', 'weekly', 'monthly'],
          maxSelect: 1,
        },
        { name: 'execution_time', type: 'text' }, // "03:00"
        { name: 'retention_days', type: 'number' }, // Ex: 30 dias
        { name: 'max_backups_kept', type: 'number' }, // Ex: 10 backups
        { name: 'include_audit_logs', type: 'bool' },
        { name: 'last_run_at', type: 'date' },
        { name: 'last_run_status', type: 'text' },
        {
          name: 'updated_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(settingsCol)

    // 3. Inserir configuração inicial padrão se não existir
    try {
      const existingSettings = app.findRecordsByFilter(
        'database_backup_settings',
        '',
        '-created',
        1,
        0,
      )
      if (!existingSettings || existingSettings.length === 0) {
        const defaultSettings = new Record(settingsCol)
        defaultSettings.set('auto_backup_enabled', true)
        defaultSettings.set('frequency', 'daily')
        defaultSettings.set('execution_time', '03:00')
        defaultSettings.set('retention_days', 30)
        defaultSettings.set('max_backups_kept', 15)
        defaultSettings.set('include_audit_logs', true)
        app.save(defaultSettings)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const sCol = app.findCollectionByNameOrId('database_backup_settings')
      app.delete(sCol)
    } catch (_) {}
    try {
      const bCol = app.findCollectionByNameOrId('database_backups')
      app.delete(bCol)
    } catch (_) {}
  },
)
