migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const dealsId = app.findCollectionByNameOrId('deals').id

    // =========================================================
    // 1. sales_targets collection
    //    fields: user (relation→users), month (text YYYY-MM),
    //            target (number), created/updated (autodate)
    // =========================================================
    let targetsCol
    try {
      targetsCol = app.findCollectionByNameOrId('sales_targets')
    } catch (_) {
      targetsCol = new Collection({
        name: 'sales_targets',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'month', type: 'text', required: true },
          { name: 'target', type: 'number', required: true, min: 0 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sales_targets_user ON sales_targets (user)',
          'CREATE INDEX idx_sales_targets_month ON sales_targets (month)',
        ],
      })
      app.save(targetsCol)
    }

    // =========================================================
    // 2. reminders collection
    //    fields: deal (relation→deals), user (relation→users),
    //            message (text), due_date (date),
    //            status (select: pending/done), created/updated
    // =========================================================
    let remindersCol
    try {
      remindersCol = app.findCollectionByNameOrId('reminders')
    } catch (_) {
      remindersCol = new Collection({
        name: 'reminders',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'deal',
            type: 'relation',
            required: true,
            collectionId: dealsId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'message', type: 'text', required: true },
          { name: 'due_date', type: 'date' },
          {
            name: 'status',
            type: 'select',
            values: ['pending', 'done'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_reminders_user ON reminders (user)',
          'CREATE INDEX idx_reminders_status ON reminders (status)',
          'CREATE INDEX idx_reminders_due_date ON reminders (due_date)',
          'CREATE INDEX idx_reminders_deal ON reminders (deal)',
        ],
      })
      app.save(remindersCol)
    }

    // =========================================================
    // 3. Seed demo sales_targets for recent months
    // =========================================================
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'jmauriciophd@gmail.com')
    } catch (_) {
      try {
        const list = app.findRecordsByFilter('users', '1=1', 'created', 1, 0)
        if (list && list.length > 0) adminUser = list[0]
      } catch (e) {}
    }

    if (adminUser) {
      const now = new Date()
      const monthKey = (offset) => {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      }

      const months = [
        { key: monthKey(-2), target: 18000 },
        { key: monthKey(-1), target: 22000 },
        { key: monthKey(0), target: 25000 },
        { key: monthKey(1), target: 26000 },
      ]

      for (const m of months) {
        // idempotent: skip if a target already exists for this user+month
        let exists = []
        try {
          exists = app.findRecordsByFilter(
            'sales_targets',
            'user = {:uid} && month = {:mk}',
            'created',
            1,
            0,
            { uid: adminUser.id, mk: m.key },
          )
        } catch (_) {}
        if (exists && exists.length > 0) continue

        const rec = new Record(targetsCol)
        rec.set('user', adminUser.id)
        rec.set('month', m.key)
        rec.set('target', m.target)
        app.save(rec)
      }
    }

    // =========================================================
    // 4. Seed demo reminders linked to existing deals
    // =========================================================
    let deals = []
    try {
      deals = app.findRecordsByFilter('deals', '1=1', '-created', 10, 0)
    } catch (_) {}

    if (adminUser && deals && deals.length > 0) {
      const now = new Date()
      const dayOffset = (days) => {
        const d = new Date(now.getTime() + days * 86400000)
        return d.toISOString().split('T')[0] + ' 00:00:00.000Z'
      }

      const seedReminders = [
        {
          dealIdx: 0,
          message: 'Retomar contato com o mercadinho e confirmar o pedido de reposição.',
          due_date: dayOffset(2),
          status: 'pending',
        },
        {
          dealIdx: 1,
          message: 'Enviar nova proposta com desconto progressivo para volume.',
          due_date: dayOffset(-1),
          status: 'pending',
        },
        {
          dealIdx: 2,
          message: 'Cobrar retorno sobre a cotação enviada no WhatsApp.',
          due_date: dayOffset(4),
          status: 'pending',
        },
      ]

      for (const r of seedReminders) {
        const deal = deals[r.dealIdx]
        if (!deal) continue

        // idempotent: skip if a reminder already exists for this deal+message
        let exists = []
        try {
          exists = app.findRecordsByFilter(
            'reminders',
            'deal = {:did} && message = {:msg}',
            'created',
            1,
            0,
            { did: deal.id, msg: r.message },
          )
        } catch (_) {}
        if (exists && exists.length > 0) continue

        const rec = new Record(remindersCol)
        rec.set('deal', deal.id)
        rec.set('user', adminUser.id)
        rec.set('message', r.message)
        rec.set('due_date', r.due_date)
        rec.set('status', r.status)
        app.save(rec)
      }
    }
  },
  (app) => {
    // best-effort revert
    try {
      app.delete(app.findCollectionByNameOrId('reminders'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sales_targets'))
    } catch (_) {}
  },
)
