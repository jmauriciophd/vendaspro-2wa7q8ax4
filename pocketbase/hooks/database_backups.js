// Modulo de Backup do Banco de Dados e Restauracao Real
// VendasPro - Skip Cloud (PocketBase)

// Helper em escopo de arquivo se nao utilizado em VM pool, mas por regra colocamos logica inline
// Lista de collections do sistema para exportacao segura
// Apenas as collections do CRM sao exportadas e restauradas para integridade operacional

// 1. GET /backend/v1/backups - Listar backups (exige backups.view)
routerAdd(
  'GET',
  '/backend/v1/backups',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canView = isSuper || role === 'admin' || perms.indexOf('backups.view') !== -1
    if (!canView) {
      throw new ForbiddenError('Acesso negado: permissão backups.view necessária.')
    }

    // Buscar backups
    const page = parseInt(e.requestInfo().query.page || '1', 10)
    const limit = parseInt(e.requestInfo().query.limit || '30', 10)
    const offset = (page - 1) * limit

    let records = []
    try {
      records = $app.findRecordsByFilter('database_backups', '', '-created', limit, offset)
    } catch (err) {
      records = []
    }

    let total = 0
    try {
      total = $app.countRecords('database_backups')
    } catch (_) {}

    // Mapear campos sem expor dados internos do servidor
    const items = records.map((r) => {
      let createdByName = 'Sistema Automático'
      let createdByEmail = ''
      const creatorId = r.getString('created_by')
      if (creatorId) {
        try {
          const u = $app.findRecordById('users', creatorId)
          createdByName = u.getString('name') || u.getString('email')
          createdByEmail = u.getString('email')
        } catch (_) {}
      }

      return {
        id: r.id,
        filename: r.getString('filename'),
        size: r.getInt('size'),
        checksum: r.getString('checksum'),
        database_type: r.getString('database_type'),
        backup_type: r.getString('backup_type'),
        status: r.getString('status'),
        created_by: creatorId,
        created_by_name: createdByName,
        created_by_email: createdByEmail,
        completed_at: r.getString('completed_at'),
        restored_at: r.getString('restored_at'),
        error_message: r.getString('error_message'),
        collections_included: r.get('collections_included') || [],
        records_count: r.getInt('records_count'),
        is_protected: r.get('is_protected') === true,
        retention_days: r.getInt('retention_days'),
        notes: r.getString('notes'),
        created: r.getString('created'),
        updated: r.getString('updated'),
      }
    })

    return e.json(200, {
      items: items,
      totalItems: total,
      page: page,
      limit: limit,
    })
  },
  $apis.requireAuth(),
)

// 2. POST /backend/v1/backups - Criar novo backup REAL (exige backups.create)
routerAdd(
  'POST',
  '/backend/v1/backups',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canCreate = isSuper || role === 'admin' || perms.indexOf('backups.create') !== -1
    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canCreate) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_FAILED')
        audit.set('module', 'backups')
        audit.set('description', 'Tentativa não autorizada de criar backup do banco de dados')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError('Acesso negado: permissão backups.create necessária.')
    }

    const body = e.requestInfo().body || {}
    const notes = body.notes || 'Backup manual solicitado via painel'
    const isProtected = Boolean(body.is_protected)
    const backupType = body.backup_type || 'manual'

    // Criar registro inicial com status 'processing'
    const backupCol = $app.findCollectionByNameOrId('database_backups')
    const backupRecord = new Record(backupCol)

    const now = new Date()
    const timestampStr = now
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14) // YYYYMMDDHHmmss
    const filename = 'vendaspro-backup-' + timestampStr + '.json'

    backupRecord.set('filename', filename)
    backupRecord.set('database_type', 'SQLite / PocketBase')
    backupRecord.set('backup_type', backupType)
    backupRecord.set('status', 'processing')
    backupRecord.set('created_by', auth.id)
    backupRecord.set('is_protected', isProtected)
    backupRecord.set('notes', notes)
    $app.save(backupRecord)

    // Collections que compõem o banco de dados do VendasPro
    const TARGET_COLLECTIONS = [
      'company_settings',
      'customers',
      'products',
      'deals',
      'sales',
      'sale_items',
      'sales_targets',
      'reminders',
      'commission_rules',
      'commissions',
      'notifications',
      'category_goals',
      'payment_providers',
      'financial_accounts',
      'payment_provider_configs',
      'payment_charges',
      'payment_charge_messages',
      'payment_webhook_events',
      'payment_audit_log',
      'audit_logs',
      'users',
    ]

    try {
      const backupData = {
        meta: {
          system: 'VendasPro CRM',
          version: '1.0.0',
          database_engine: 'SQLite / PocketBase',
          backup_id: backupRecord.id,
          filename: filename,
          created_at: now.toISOString(),
          created_by: auth.id,
          created_by_email: auth.getString('email'),
          backup_type: backupType,
          format_version: '2.0',
        },
        schema: [],
        records: {},
        summary: {
          total_collections: 0,
          total_records: 0,
        },
      }

      let totalRecordsCount = 0
      const includedCollectionsList = []

      for (let i = 0; i < TARGET_COLLECTIONS.length; i++) {
        const colName = TARGET_COLLECTIONS[i]
        try {
          const col = $app.findCollectionByNameOrId(colName)
          const fieldsMeta = (col.fields || []).map((f) => ({
            name: f.name,
            type: f.type,
            required: Boolean(f.required),
          }))

          backupData.schema.push({
            name: col.name,
            type: col.type,
            fields: fieldsMeta,
          })

          // Buscar todos os registros da collection (sem expor senhas/tokens)
          const records = $app.findRecordsByFilter(colName, '', 'created', 10000, 0)
          const sanitizedRecords = records.map((r) => {
            const rawObj = {}
            const fieldNames = col.fields ? col.fields.map((f) => f.name) : []
            rawObj.id = r.id
            rawObj.created = r.getString('created')
            rawObj.updated = r.getString('updated')

            for (let fIdx = 0; fIdx < fieldNames.length; fIdx++) {
              const fName = fieldNames[fIdx]
              if (fName === 'password' || fName === 'tokenKey' || fName === 'passwordHash') {
                // NUNCA exportar hashes de senha nos backups JSON por segurança
                continue
              }
              rawObj[fName] = r.get(fName)
            }

            if (colName === 'users') {
              rawObj.email = r.getString('email')
              rawObj.verified = r.getBool('verified')
            }

            return rawObj
          })

          backupData.records[colName] = sanitizedRecords
          totalRecordsCount += sanitizedRecords.length
          includedCollectionsList.push({
            name: colName,
            count: sanitizedRecords.length,
          })
        } catch (colErr) {
          // Se collection não existir ainda, apenas ignora
        }
      }

      backupData.summary.total_collections = includedCollectionsList.length
      backupData.summary.total_records = totalRecordsCount

      const jsonString = JSON.stringify(backupData, null, 2)
      const jsonBytes = $security.sha256(jsonString) // Checksum SHA-256
      const fileSize = jsonString.length

      // Salvar arquivo usando filesystem do PocketBase
      const fileObj = $filesystem.fileFromBytes(new TextEncoder().encode(jsonString), filename)
      backupRecord.set('backup_file', fileObj)
      backupRecord.set('size', fileSize)
      backupRecord.set('checksum', jsonBytes)
      backupRecord.set('status', 'completed')
      backupRecord.set('records_count', totalRecordsCount)
      backupRecord.set('collections_included', includedCollectionsList)
      backupRecord.set('completed_at', new Date().toISOString())
      backupRecord.set('error_message', '')
      $app.save(backupRecord)

      // Registrar no audit_logs
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_CREATED')
        audit.set('module', 'backups')
        audit.set(
          'description',
          'Backup gerado com sucesso: ' +
            filename +
            ' (' +
            totalRecordsCount +
            ' registros, ' +
            (fileSize / 1024).toFixed(1) +
            ' KB)',
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('before', {})
        audit.set('after', {
          backup_id: backupRecord.id,
          filename: filename,
          size: fileSize,
          checksum: jsonBytes,
          records_count: totalRecordsCount,
          backup_type: backupType,
        })
        audit.set('result', 'success')
        $app.save(audit)
      } catch (_) {}

      return e.json(201, {
        success: true,
        message: 'Backup criado com sucesso.',
        backup: {
          id: backupRecord.id,
          filename: filename,
          size: fileSize,
          checksum: jsonBytes,
          records_count: totalRecordsCount,
          status: 'completed',
          created: backupRecord.getString('created'),
        },
      })
    } catch (err) {
      backupRecord.set('status', 'failed')
      backupRecord.set('error_message', 'Erro ao processar dados do banco de dados.')
      try {
        $app.save(backupRecord)
      } catch (_) {}

      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_FAILED')
        audit.set('module', 'backups')
        audit.set('description', 'Falha ao gerar backup: ' + filename)
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'error')
        $app.save(audit)
      } catch (_) {}

      throw new BadRequestError(
        'Não foi possível concluir a geração do backup. Consulte os logs de auditoria.',
      )
    }
  },
  $apis.requireAuth(),
)

// 3. GET /backend/v1/backups/{id}/download - Download seguro autenticado e auditado (exige backups.download)
routerAdd(
  'GET',
  '/backend/v1/backups/{id}/download',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canDownload = isSuper || role === 'admin' || perms.indexOf('backups.download') !== -1
    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canDownload) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_DOWNLOAD_BLOCKED')
        audit.set('module', 'backups')
        audit.set('description', 'Tentativa não autorizada de download de backup')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError('Acesso negado: permissão backups.download necessária.')
    }

    const backupId = e.requestInfo().params.id
    let backupRecord = null
    try {
      backupRecord = $app.findRecordById('database_backups', backupId)
    } catch (_) {
      throw new NotFoundError('Registro de backup não encontrado.')
    }

    const filename = backupRecord.getString('filename')
    const fileKey = backupRecord.getString('backup_file')

    if (!fileKey) {
      throw new BadRequestError('Arquivo de backup não disponível para este registro.')
    }

    // Buscar bytes do arquivo protegido via filesystem
    let fileBytes = null
    try {
      const col = $app.findCollectionByNameOrId('database_backups')
      const fileKeyPath = backupRecord.baseFilesPath() + '/' + fileKey
      fileBytes = $filesystem.fileReader(fileKeyPath)
    } catch (fsErr) {
      // Fallback caso baseFilesPath seja diferente
    }

    // Auditoria do download
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('action', 'BACKUP_DOWNLOADED')
      audit.set('module', 'backups')
      audit.set(
        'description',
        'Download realizado do backup: ' + filename + ' (ID: ' + backupId + ')',
      )
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('before', {})
      audit.set('after', {
        backup_id: backupId,
        filename: filename,
        size: backupRecord.getInt('size'),
      })
      audit.set('result', 'success')
      $app.save(audit)
    } catch (_) {}

    // Servir o arquivo através de download token ou envio direto
    const token = $app.createFileDownloadToken('database_backups', backupRecord.id, fileKey)
    const downloadUrl =
      '/api/files/' +
      backupRecord.collection().id +
      '/' +
      backupRecord.id +
      '/' +
      fileKey +
      '?token=' +
      token

    return e.json(200, {
      download_url: downloadUrl,
      filename: filename,
      size: backupRecord.getInt('size'),
      checksum: backupRecord.getString('checksum'),
    })
  },
  $apis.requireAuth(),
)

// 4. POST /backend/v1/backups/{id}/restore - Restauração segura e crítica (exige backups.restore)
routerAdd(
  'POST',
  '/backend/v1/backups/{id}/restore',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canRestore = isSuper || perms.indexOf('backups.restore') !== -1
    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canRestore) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_RESTORE_BLOCKED')
        audit.set('module', 'backups')
        audit.set('description', 'Tentativa não autorizada de restaurar o banco de dados')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError(
        'Acesso negado: permissão backups.restore é restrita ao Super Admin.',
      )
    }

    const body = e.requestInfo().body || {}
    const confirmationText = (body.confirmation || '').trim()

    // Validação estrita da palavra de confirmação
    if (confirmationText !== 'RESTAURAR') {
      throw new BadRequestError(
        'Confirmação inválida. É obrigatório digitar exatamente RESTAURAR para autorizar a restauração.',
      )
    }

    const backupId = e.requestInfo().params.id
    let backupRecord = null
    try {
      backupRecord = $app.findRecordById('database_backups', backupId)
    } catch (_) {
      throw new NotFoundError('Registro de backup não encontrado.')
    }

    const filename = backupRecord.getString('filename')
    const fileKey = backupRecord.getString('backup_file')

    if (!fileKey) {
      throw new BadRequestError('Este backup não possui arquivo físico salvo para restauração.')
    }

    // Registrar início da restauração
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('action', 'BACKUP_RESTORE_STARTED')
      audit.set('module', 'backups')
      audit.set(
        'description',
        'Início da restauração do banco de dados a partir do backup ' + filename,
      )
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'success')
      $app.save(audit)
    } catch (_) {}

    // 1. Criar automaticamente um backup de segurança do estado ATUAL antes de restaurar
    let safetyBackupRecord = null
    try {
      const backupCol = $app.findCollectionByNameOrId('database_backups')
      safetyBackupRecord = new Record(backupCol)
      const safetyFilename =
        'safety-pre-restore-' +
        new Date()
          .toISOString()
          .replace(/[-:T.]/g, '')
          .slice(0, 14) +
        '.json'
      safetyBackupRecord.set('filename', safetyFilename)
      safetyBackupRecord.set('database_type', 'SQLite / PocketBase')
      safetyBackupRecord.set('backup_type', 'pre_restore_safety')
      safetyBackupRecord.set('status', 'processing')
      safetyBackupRecord.set('created_by', auth.id)
      safetyBackupRecord.set('is_protected', true)
      safetyBackupRecord.set(
        'notes',
        'Backup automático de segurança gerado antes de restaurar o backup ' + filename,
      )
      $app.save(safetyBackupRecord)

      // Exportar estado atual para segurança
      const TARGET_COLLECTIONS = [
        'company_settings',
        'customers',
        'products',
        'deals',
        'sales',
        'sale_items',
        'sales_targets',
        'reminders',
        'commission_rules',
        'commissions',
        'notifications',
        'category_goals',
        'payment_providers',
        'financial_accounts',
        'payment_provider_configs',
        'payment_charges',
        'payment_charge_messages',
        'payment_webhook_events',
        'payment_audit_log',
      ]

      const safetyData = {
        meta: {
          system: 'VendasPro CRM',
          purpose: 'Pre-restore safety snapshot',
          created_at: new Date().toISOString(),
          created_by: auth.id,
        },
        records: {},
      }

      let safetyCount = 0
      for (let sIdx = 0; sIdx < TARGET_COLLECTIONS.length; sIdx++) {
        const cName = TARGET_COLLECTIONS[sIdx]
        try {
          const cRecords = $app.findRecordsByFilter(cName, '', 'created', 10000, 0)
          safetyData.records[cName] = cRecords.map((r) => {
            const raw = { id: r.id }
            const col = $app.findCollectionByNameOrId(cName)
            const fNames = col.fields ? col.fields.map((f) => f.name) : []
            for (let fI = 0; fI < fNames.length; fI++) {
              raw[fNames[fI]] = r.get(fNames[fI])
            }
            return raw
          })
          safetyCount += cRecords.length
        } catch (_) {}
      }

      const safetyJsonStr = JSON.stringify(safetyData, null, 2)
      const safetyFileObj = $filesystem.fileFromBytes(
        new TextEncoder().encode(safetyJsonStr),
        safetyFilename,
      )
      safetyBackupRecord.set('backup_file', safetyFileObj)
      safetyBackupRecord.set('size', safetyJsonStr.length)
      safetyBackupRecord.set('checksum', $security.sha256(safetyJsonStr))
      safetyBackupRecord.set('status', 'completed')
      safetyBackupRecord.set('records_count', safetyCount)
      safetyBackupRecord.set('completed_at', new Date().toISOString())
      $app.save(safetyBackupRecord)
    } catch (safetyErr) {
      // Se o backup de segurança falhar, ABORTA a restauração imediatamente
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_RESTORE_FAILED')
        audit.set('module', 'backups')
        audit.set('description', 'Restauração abortada: falha ao gerar backup prévio de segurança.')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'error')
        $app.save(audit)
      } catch (_) {}

      throw new BadRequestError(
        'Não foi possível gerar a cópia prévia de segurança. Por integridade dos dados, a restauração foi cancelada.',
      )
    }

    // 2. Carregar e parsear o arquivo de backup a restaurar
    let parsedBackup = null
    try {
      // Ler o arquivo do backup armazenado
      // Como estamos no ambiente PocketBase pb_hooks, podemos recuperar o token/stream ou ler o registro
      // Obter dados diretamente do arquivo salvo
      const filePath = backupRecord.baseFilesPath() + '/' + fileKey
      const reader = $filesystem.fileReader(filePath)
      // Ler todo o conteúdo do reader
      const contentStr = new TextDecoder().decode(reader.readAll())
      parsedBackup = JSON.parse(contentStr)
    } catch (readErr) {
      // Fallback: se não conseguir ler direto do disco, tenta parsear se houver cache
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_RESTORE_FAILED')
        audit.set('module', 'backups')
        audit.set(
          'description',
          'Falha ao ler arquivo de backup: arquivo corrompido ou inacessível.',
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'error')
        $app.save(audit)
      } catch (_) {}

      throw new BadRequestError('Não foi possível ler o arquivo de backup selecionado.')
    }

    if (!parsedBackup || !parsedBackup.records) {
      throw new BadRequestError(
        'Estrutura de arquivo de backup inválida ou sem dados de registros.',
      )
    }

    // 3. Executar Restauração dos Dados em Ordem Topológica de Dependências
    // Ordem de inserção: tabelas independentes primeiro, depois dependentes
    const RESTORE_ORDER = [
      'company_settings',
      'customers',
      'products',
      'category_goals',
      'payment_providers',
      'financial_accounts',
      'payment_provider_configs',
      'deals',
      'sales',
      'sale_items',
      'sales_targets',
      'reminders',
      'commission_rules',
      'commissions',
      'payment_charges',
      'payment_charge_messages',
      'payment_webhook_events',
      'payment_audit_log',
      'notifications',
    ]

    let restoredCollectionsCount = 0
    let restoredRecordsTotal = 0

    try {
      // Transação de restauração
      $app.runInTransaction((txApp) => {
        for (let rIdx = 0; rIdx < RESTORE_ORDER.length; rIdx++) {
          const colName = RESTORE_ORDER[rIdx]
          const recordsToRestore = parsedBackup.records[colName]

          if (!Array.isArray(recordsToRestore) || recordsToRestore.length === 0) {
            continue
          }

          let targetCol = null
          try {
            targetCol = txApp.findCollectionByNameOrId(colName)
          } catch (_) {
            continue
          }

          // Upsert / Reconciliação dos registros por ID
          for (let recIdx = 0; recIdx < recordsToRestore.length; recIdx++) {
            const item = recordsToRestore[recIdx]
            if (!item || !item.id) continue

            let existingRecord = null
            try {
              existingRecord = txApp.findRecordById(colName, item.id)
            } catch (_) {
              existingRecord = null
            }

            const rec = existingRecord || new Record(targetCol)
            if (!existingRecord) {
              rec.set('id', item.id)
            }

            // Preencher campos permitidos da collection
            const fieldList = targetCol.fields ? targetCol.fields.map((f) => f.name) : []
            for (let fKey = 0; fKey < fieldList.length; fKey++) {
              const fieldName = fieldList[fKey]
              if (fieldName === 'created' || fieldName === 'updated') continue
              if (fieldName in item) {
                rec.set(fieldName, item[fieldName])
              }
            }

            txApp.save(rec)
            restoredRecordsTotal++
          }

          restoredCollectionsCount++
        }
      })

      // Atualizar status do backup para 'restored'
      backupRecord.set('status', 'restored')
      backupRecord.set('restored_at', new Date().toISOString())
      $app.save(backupRecord)

      // Log de auditoria de sucesso
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_RESTORED')
        audit.set('module', 'backups')
        audit.set(
          'description',
          'Banco de dados restaurado com sucesso a partir do backup ' +
            filename +
            ' (' +
            restoredRecordsTotal +
            ' registros em ' +
            restoredCollectionsCount +
            ' collections)',
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('before', {
          safety_backup_id: safetyBackupRecord ? safetyBackupRecord.id : null,
        })
        audit.set('after', {
          restored_backup_id: backupId,
          filename: filename,
          records_restored: restoredRecordsTotal,
          collections_restored: restoredCollectionsCount,
        })
        audit.set('result', 'success')
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Banco de dados restaurado com sucesso!',
        summary: {
          backup_id: backupId,
          filename: filename,
          records_restored: restoredRecordsTotal,
          collections_restored: restoredCollectionsCount,
          safety_backup_id: safetyBackupRecord ? safetyBackupRecord.id : null,
        },
      })
    } catch (restoreErr) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_RESTORE_FAILED')
        audit.set('module', 'backups')
        audit.set('description', 'Falha durante a execução da restauração dos dados: ' + filename)
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'error')
        $app.save(audit)
      } catch (_) {}

      throw new BadRequestError(
        'Falha ao restaurar os registros do banco de dados. Os dados atuais foram preservados no backup de segurança.',
      )
    }
  },
  $apis.requireAuth(),
)

// 5. DELETE /backend/v1/backups/{id} - Excluir backup físico e metadados (exige backups.delete)
routerAdd(
  'DELETE',
  '/backend/v1/backups/{id}',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canDelete = isSuper || perms.indexOf('backups.delete') !== -1
    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canDelete) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_DELETE_BLOCKED')
        audit.set('module', 'backups')
        audit.set('description', 'Tentativa não autorizada de excluir backup do banco de dados')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError('Acesso negado: permissão backups.delete é restrita ao Super Admin.')
    }

    const backupId = e.requestInfo().params.id
    let backupRecord = null
    try {
      backupRecord = $app.findRecordById('database_backups', backupId)
    } catch (_) {
      throw new NotFoundError('Registro de backup não encontrado.')
    }

    if (backupRecord.get('is_protected') === true && !isSuper) {
      throw new ForbiddenError(
        'Este backup está protegido contra exclusão. Apenas o Super Admin pode removê-lo.',
      )
    }

    const filename = backupRecord.getString('filename')
    const backupType = backupRecord.getString('backup_type')
    const size = backupRecord.getInt('size')

    try {
      $app.delete(backupRecord)

      // Auditoria de exclusão
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_DELETED')
        audit.set('module', 'backups')
        audit.set(
          'description',
          'Backup removido permanentemente: ' + filename + ' (ID: ' + backupId + ')',
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('before', {
          backup_id: backupId,
          filename: filename,
          backup_type: backupType,
          size: size,
        })
        audit.set('after', {})
        audit.set('result', 'success')
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Backup excluído com sucesso.',
      })
    } catch (delErr) {
      throw new BadRequestError('Não foi possível excluir o backup informado.')
    }
  },
  $apis.requireAuth(),
)

// 6. GET /backend/v1/backups/settings - Obter configurações de retenção e automação (exige backups.settings ou backups.view)
routerAdd(
  'GET',
  '/backend/v1/backups/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canView =
      isSuper ||
      role === 'admin' ||
      perms.indexOf('backups.settings') !== -1 ||
      perms.indexOf('backups.view') !== -1
    if (!canView) {
      throw new ForbiddenError('Acesso negado: permissão necessária.')
    }

    let settingsRecord = null
    try {
      const list = $app.findRecordsByFilter('database_backup_settings', '', '-created', 1, 0)
      if (list && list.length > 0) settingsRecord = list[0]
    } catch (_) {}

    if (!settingsRecord) {
      return e.json(200, {
        auto_backup_enabled: true,
        frequency: 'daily',
        execution_time: '03:00',
        retention_days: 30,
        max_backups_kept: 15,
        include_audit_logs: true,
        last_run_at: null,
        last_run_status: 'idle',
      })
    }

    return e.json(200, {
      id: settingsRecord.id,
      auto_backup_enabled: settingsRecord.getBool('auto_backup_enabled'),
      frequency: settingsRecord.getString('frequency') || 'daily',
      execution_time: settingsRecord.getString('execution_time') || '03:00',
      retention_days: settingsRecord.getInt('retention_days') || 30,
      max_backups_kept: settingsRecord.getInt('max_backups_kept') || 15,
      include_audit_logs: settingsRecord.getBool('include_audit_logs'),
      last_run_at: settingsRecord.getString('last_run_at'),
      last_run_status: settingsRecord.getString('last_run_status'),
      updated: settingsRecord.getString('updated'),
    })
  },
  $apis.requireAuth(),
)

// 7. POST /backend/v1/backups/settings - Atualizar configurações de retenção e automação (exige backups.settings)
routerAdd(
  'POST',
  '/backend/v1/backups/settings',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const isSuper =
      auth.get('is_super_admin') === true || auth.getString('email') === 'jmauriciophd@gmail.com'
    const role = auth.getString('role')
    let perms = []
    try {
      const p = auth.get('permissions')
      if (Array.isArray(p)) perms = p
      else if (typeof p === 'string' && p) perms = JSON.parse(p)
    } catch (_) {}

    const canSettings = isSuper || role === 'admin' || perms.indexOf('backups.settings') !== -1
    const ip = e.realIP() || ''
    const ua = (e.request.header.get('user-agent') || '').substring(0, 250)

    if (!canSettings) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('action', 'BACKUP_SETTINGS_BLOCKED')
        audit.set('module', 'backups')
        audit.set('description', 'Tentativa não autorizada de alterar configurações de backup')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError('Acesso negado: permissão backups.settings necessária.')
    }

    const body = e.requestInfo().body || {}
    const settingsCol = $app.findCollectionByNameOrId('database_backup_settings')

    let settingsRecord = null
    try {
      const list = $app.findRecordsByFilter('database_backup_settings', '', '-created', 1, 0)
      if (list && list.length > 0) settingsRecord = list[0]
    } catch (_) {}

    const prevData = settingsRecord
      ? {
          auto_backup_enabled: settingsRecord.getBool('auto_backup_enabled'),
          frequency: settingsRecord.getString('frequency'),
          execution_time: settingsRecord.getString('execution_time'),
          retention_days: settingsRecord.getInt('retention_days'),
          max_backups_kept: settingsRecord.getInt('max_backups_kept'),
        }
      : {}

    if (!settingsRecord) {
      settingsRecord = new Record(settingsCol)
    }

    if (body.auto_backup_enabled !== undefined) {
      settingsRecord.set('auto_backup_enabled', Boolean(body.auto_backup_enabled))
    }
    if (body.frequency) {
      settingsRecord.set('frequency', body.frequency)
    }
    if (body.execution_time) {
      settingsRecord.set('execution_time', body.execution_time)
    }
    if (body.retention_days !== undefined) {
      settingsRecord.set('retention_days', parseInt(body.retention_days, 10) || 30)
    }
    if (body.max_backups_kept !== undefined) {
      settingsRecord.set('max_backups_kept', parseInt(body.max_backups_kept, 10) || 15)
    }
    if (body.include_audit_logs !== undefined) {
      settingsRecord.set('include_audit_logs', Boolean(body.include_audit_logs))
    }
    settingsRecord.set('updated_by', auth.id)

    $app.save(settingsRecord)

    const newData = {
      auto_backup_enabled: settingsRecord.getBool('auto_backup_enabled'),
      frequency: settingsRecord.getString('frequency'),
      execution_time: settingsRecord.getString('execution_time'),
      retention_days: settingsRecord.getInt('retention_days'),
      max_backups_kept: settingsRecord.getInt('max_backups_kept'),
    }

    // Registrar auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('action', 'BACKUP_SETTINGS_UPDATED')
      audit.set('module', 'backups')
      audit.set('description', 'Configurações de retenção e automação de backup atualizadas')
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('before', prevData)
      audit.set('after', newData)
      audit.set('result', 'success')
      $app.save(audit)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Configurações de backup atualizadas com sucesso.',
      settings: {
        id: settingsRecord.id,
        auto_backup_enabled: settingsRecord.getBool('auto_backup_enabled'),
        frequency: settingsRecord.getString('frequency'),
        execution_time: settingsRecord.getString('execution_time'),
        retention_days: settingsRecord.getInt('retention_days'),
        max_backups_kept: settingsRecord.getInt('max_backups_kept'),
        include_audit_logs: settingsRecord.getBool('include_audit_logs'),
      },
    })
  },
  $apis.requireAuth(),
)

// 8. Cron Job para Backup Automático Diário e Aplicação da Política de Retenção
cronAdd('daily_database_backup_job', '0 3 * * *', () => {
  let settings = null
  try {
    const list = $app.findRecordsByFilter('database_backup_settings', '', '-created', 1, 0)
    if (list && list.length > 0) settings = list[0]
  } catch (_) {}

  if (settings && settings.getBool('auto_backup_enabled') === false) {
    return
  }

  const now = new Date()
  const timestampStr = now
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14)
  const filename = 'vendaspro-auto-backup-' + timestampStr + '.json'

  const backupCol = $app.findCollectionByNameOrId('database_backups')
  const backupRecord = new Record(backupCol)
  backupRecord.set('filename', filename)
  backupRecord.set('database_type', 'SQLite / PocketBase')
  backupRecord.set('backup_type', 'automatic')
  backupRecord.set('status', 'processing')
  backupRecord.set('is_protected', false)
  backupRecord.set('notes', 'Backup automático programado')
  $app.save(backupRecord)

  const TARGET_COLLECTIONS = [
    'company_settings',
    'customers',
    'products',
    'deals',
    'sales',
    'sale_items',
    'sales_targets',
    'reminders',
    'commission_rules',
    'commissions',
    'notifications',
    'category_goals',
    'payment_providers',
    'financial_accounts',
    'payment_provider_configs',
    'payment_charges',
    'payment_charge_messages',
    'payment_webhook_events',
    'payment_audit_log',
    'audit_logs',
    'users',
  ]

  try {
    const backupData = {
      meta: {
        system: 'VendasPro CRM',
        version: '1.0.0',
        database_engine: 'SQLite / PocketBase',
        backup_id: backupRecord.id,
        filename: filename,
        created_at: now.toISOString(),
        backup_type: 'automatic',
      },
      schema: [],
      records: {},
      summary: {
        total_collections: 0,
        total_records: 0,
      },
    }

    let totalRecordsCount = 0
    const includedCollectionsList = []

    for (let i = 0; i < TARGET_COLLECTIONS.length; i++) {
      const colName = TARGET_COLLECTIONS[i]
      try {
        const col = $app.findCollectionByNameOrId(colName)
        const records = $app.findRecordsByFilter(colName, '', 'created', 10000, 0)
        const sanitizedRecords = records.map((r) => {
          const rawObj = {
            id: r.id,
            created: r.getString('created'),
            updated: r.getString('updated'),
          }
          const fieldNames = col.fields ? col.fields.map((f) => f.name) : []
          for (let fIdx = 0; fIdx < fieldNames.length; fIdx++) {
            const fName = fieldNames[fIdx]
            if (fName === 'password' || fName === 'tokenKey' || fName === 'passwordHash') continue
            rawObj[fName] = r.get(fName)
          }
          if (colName === 'users') {
            rawObj.email = r.getString('email')
            rawObj.verified = r.getBool('verified')
          }
          return rawObj
        })

        backupData.records[colName] = sanitizedRecords
        totalRecordsCount += sanitizedRecords.length
        includedCollectionsList.push({ name: colName, count: sanitizedRecords.length })
      } catch (_) {}
    }

    backupData.summary.total_collections = includedCollectionsList.length
    backupData.summary.total_records = totalRecordsCount

    const jsonString = JSON.stringify(backupData, null, 2)
    const jsonBytes = $security.sha256(jsonString)
    const fileSize = jsonString.length

    const fileObj = $filesystem.fileFromBytes(new TextEncoder().encode(jsonString), filename)
    backupRecord.set('backup_file', fileObj)
    backupRecord.set('size', fileSize)
    backupRecord.set('checksum', jsonBytes)
    backupRecord.set('status', 'completed')
    backupRecord.set('records_count', totalRecordsCount)
    backupRecord.set('collections_included', includedCollectionsList)
    backupRecord.set('completed_at', new Date().toISOString())
    $app.save(backupRecord)

    // Atualizar settings com last_run
    if (settings) {
      settings.set('last_run_at', new Date().toISOString())
      settings.set('last_run_status', 'success')
      $app.save(settings)
    }

    // APLICAR POLÍTICA DE RETENÇÃO AUTOMÁTICA
    const maxKept = settings ? settings.getInt('max_backups_kept') || 15 : 15
    const retentionDays = settings ? settings.getInt('retention_days') || 30 : 30

    try {
      const allBackups = $app.findRecordsByFilter(
        'database_backups',
        'backup_type = "automatic" && is_protected = false',
        '-created',
        100,
        0,
      )
      if (allBackups.length > maxKept) {
        const toDelete = allBackups.slice(maxKept)
        for (let dIdx = 0; dIdx < toDelete.length; dIdx++) {
          try {
            $app.delete(toDelete[dIdx])
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Log de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('action', 'BACKUP_CREATED')
      audit.set('module', 'backups')
      audit.set('description', 'Backup automático diário gerado pelo sistema: ' + filename)
      audit.set('result', 'success')
      $app.save(audit)
    } catch (_) {}
  } catch (err) {
    backupRecord.set('status', 'failed')
    backupRecord.set('error_message', 'Falha na execução do backup automático')
    try {
      $app.save(backupRecord)
    } catch (_) {}
  }
})
