migrate(
  (app) => {
    // 1. Limpeza de dados de teste de todas as collections de negócio respeitando as relações/FKs
    // Ordem de deleção: filhos antes dos pais

    const tablesToClean = [
      'payment_audit_log',
      'payment_charge_messages',
      'payment_webhook_events',
      'payment_charges',
      'financial_accounts',
      'payment_provider_configs',
      'payment_providers',
      'notifications',
      'commissions',
      'commission_rules',
      'email_logs',
      'reminders',
      'sales_targets',
      'category_goals',
      'sale_items',
      'sales',
      'deals',
      'customers',
      'products',
    ]

    for (let i = 0; i < tablesToClean.length; i++) {
      const table = tablesToClean[i]
      try {
        if (app.hasTable(table)) {
          app
            .db()
            .newQuery('DELETE FROM ' + table)
            .execute()
        }
      } catch (err) {
        console.log('Erro ao limpar tabela ' + table + ': ' + err)
      }
    }

    // 2. Limpeza de usuários de teste mantendo unicamente jmauriciophd@gmail.com
    try {
      if (app.hasTable('users')) {
        app
          .db()
          .newQuery("DELETE FROM users WHERE email != 'jmauriciophd@gmail.com' OR email IS NULL")
          .execute()
      }
    } catch (err) {
      console.log('Erro ao limpar usuários de teste: ' + err)
    }

    // 3. Garantir que jmauriciophd@gmail.com exista com role='admin', active=true e emailVerified=true
    const targetEmail = 'jmauriciophd@gmail.com'
    try {
      const adminRecord = app.findAuthRecordByEmail('_pb_users_auth_', targetEmail)
      adminRecord.set('role', 'admin')
      adminRecord.set('active', true)
      adminRecord.setVerified(true)
      app.save(adminRecord)
    } catch (_) {
      // Se não existir, cria o usuário admin sem senha em texto puro fixa (será redefinida via reset/recuperação)
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const newAdmin = new Record(usersCol)
      newAdmin.setEmail(targetEmail)
      // PocketBase exige setPassword de 8+ chars para salvar novo record de auth
      // Geramos um segredo aleatório não determinístico para não deixar senha padrão
      newAdmin.setPassword($security.randomString(32))
      newAdmin.setVerified(true)
      newAdmin.set('name', 'Administrador')
      newAdmin.set('role', 'admin')
      newAdmin.set('active', true)
      app.save(newAdmin)
    }

    // 4. Remover cadastro público: ajustar regras da collection users
    // createRule: apenas admin autenticado pode criar usuários
    // listRule / viewRule: admin e gerente ou o próprio usuário
    // updateRule: admin ou o próprio usuário
    // deleteRule: admin apenas
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    usersCol.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || id = @request.auth.id)"
    usersCol.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || id = @request.auth.id)"
    usersCol.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    usersCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(usersCol)
  },
  (app) => {
    // Reverter regras de users se necessário
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.createRule = ''
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      usersCol.updateRule = 'id = @request.auth.id'
      usersCol.deleteRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
