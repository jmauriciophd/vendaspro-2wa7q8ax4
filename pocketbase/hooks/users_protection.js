// Hook de proteção da collection `users` e RBAC com auditoria automática.
//
// 1. Proteção estrita do Super Admin (is_super_admin = true):
//    - Bloqueia exclusão de super admin
//    - Bloqueia desativação (active=false)
//    - Bloqueia alteração de role para outro valor diferente de 'admin'
//    - Bloqueia remoção da flag is_super_admin
//    - Bloqueia alteração de email por terceiros
//    - Bloqueia qualquer modificação feita por outro usuário (apenas o próprio super admin pode editar seu nome)
//    - Tentativas bloqueadas geram Audit Log com result = 'blocked'
//
// 2. Permissões Granulares (RBAC):
//    - Helper `can(user, permission)` verifica super admin, roles e array de permissões
//    - Operações sensíveis exigem a permissão correspondente
//
// 3. Auditoria Automática (Audit Logs):
//    - Criação de usuário (users.create) -> Audit Log (success/blocked)
//    - Edição de usuário (users.edit) -> Audit Log (diff before/after sem senhas)
//    - Exclusão de usuário (users.delete) -> Audit Log
//    - NUNCA registrar senhas, hashes, tokens ou segredos

onRecordCreateRequest((e) => {
  const auth = e.auth
  const body = e.requestInfo().body || {}
  const targetEmail = (body.email || '').trim().toLowerCase()
  const ip = e.requestInfo().remoteIp || ''
  const ua = (e.requestInfo().headers['user-agent'] || '').substring(0, 250)

  // Verifica permissão para criar usuário
  const isSuper = auth && auth.get('is_super_admin') === true
  const role = auth ? auth.getString('role') : ''
  let perms = []
  try {
    const p = auth ? auth.get('permissions') : null
    if (Array.isArray(p)) perms = p
    else if (typeof p === 'string' && p) perms = JSON.parse(p)
  } catch (_) {}

  const canCreate = isSuper || role === 'admin' || perms.indexOf('users.create') !== -1

  if (!auth || !canCreate) {
    // Log de tentativa bloqueada
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (auth) audit.set('actor', auth.id)
      audit.set('action', 'user_create_attempt')
      audit.set('module', 'users')
      audit.set(
        'description',
        'Tentativa não autorizada de criar usuário: ' + (targetEmail || 'sem email'),
      )
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'blocked')
      $app.save(audit)
    } catch (_) {}

    throw new ForbiddenError(
      'Apenas usuários com permissão users.create podem cadastrar novos membros na equipe.',
    )
  }

  // Validação de email duplicado
  if (targetEmail) {
    try {
      const existing = $app.findAuthRecordByEmail('users', targetEmail)
      if (existing && existing.id) {
        throw new BadRequestError('Já existe um usuário cadastrado com o e-mail informado.')
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  // Não permitir marcar is_super_admin na criação a menos que seja o próprio super admin
  if (body.is_super_admin && !isSuper) {
    body.is_super_admin = false
  }

  return e.next()
}, 'users')

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('target', record.id)
    audit.set('action', 'user_created')
    audit.set('module', 'users')
    audit.set(
      'description',
      'Usuário ' +
        (record.getString('name') || record.getString('email')) +
        ' (' +
        record.getString('role') +
        ') criado',
    )
    audit.set('before', {})
    audit.set('after', {
      email: record.getString('email'),
      name: record.getString('name'),
      role: record.getString('role'),
      active: record.get('active') !== false,
      permissions: record.get('permissions') || [],
    })
    audit.set('result', 'success')
    $app.save(audit)
  } catch (_) {}

  return e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  const auth = e.auth
  const record = e.record
  const body = e.requestInfo().body || {}
  const ip = e.requestInfo().remoteIp || ''
  const ua = (e.requestInfo().headers['user-agent'] || '').substring(0, 250)

  if (!auth) {
    throw new ForbiddenError('Autenticação necessária.')
  }

  const isActorSuper = auth.get('is_super_admin') === true
  const actorRole = auth.getString('role')
  let actorPerms = []
  try {
    const p = auth.get('permissions')
    if (Array.isArray(p)) actorPerms = p
    else if (typeof p === 'string' && p) actorPerms = JSON.parse(p)
  } catch (_) {}

  const isTargetSuper =
    record.get('is_super_admin') === true || record.getString('email') === 'jmauriciophd@gmail.com'
  const isSelf = auth.id === record.id

  // 1. Proteção Super Admin
  if (isTargetSuper) {
    if (!isSelf) {
      // Registrar log bloqueado
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('target', record.id)
        audit.set('action', 'super_admin_modify_attempt')
        audit.set('module', 'users')
        audit.set(
          'description',
          'Tentativa não autorizada de modificar a conta do Super Administrador',
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError(
        'A conta do Super Administrador não pode ser alterada por outros usuários.',
      )
    }

    // Mesmo o próprio super admin não pode se desativar, alterar papel, nem tirar is_super_admin
    if (body.active === false || body.active === 'false') {
      throw new ForbiddenError('O Super Administrador não pode ser desativado.')
    }
    if (body.role && body.role !== 'admin') {
      throw new ForbiddenError('O Super Administrador não pode ter seu cargo alterado.')
    }
    if (body.is_super_admin === false || body.is_super_admin === 'false') {
      throw new ForbiddenError('A flag de Super Administrador não pode ser removida.')
    }
  }

  // 2. Permissão de edição para outros usuários
  if (!isSelf) {
    const canEdit = isActorSuper || actorRole === 'admin' || actorPerms.indexOf('users.edit') !== -1
    const canDisable =
      isActorSuper || actorRole === 'admin' || actorPerms.indexOf('users.disable') !== -1

    if (
      body.active !== undefined &&
      (body.active === false || body.active === 'false') &&
      !canDisable
    ) {
      throw new ForbiddenError('Sem permissão para desativar usuários (users.disable necessária).')
    }

    if (!canEdit) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('target', record.id)
        audit.set('action', 'user_edit_attempt')
        audit.set('module', 'users')
        audit.set(
          'description',
          'Tentativa não autorizada de editar usuário ' + record.getString('email'),
        )
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new ForbiddenError('Sem permissão para editar outros usuários (users.edit necessária).')
    }
  }

  return e.next()
}, 'users')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const orig = record.original()

  try {
    const prevData = {
      name: orig.getString('name'),
      email: orig.getString('email'),
      role: orig.getString('role'),
      active: orig.get('active') !== false,
      permissions: orig.get('permissions') || [],
      is_super_admin: orig.get('is_super_admin') === true,
    }

    const newData = {
      name: record.getString('name'),
      email: record.getString('email'),
      role: record.getString('role'),
      active: record.get('active') !== false,
      permissions: record.get('permissions') || [],
      is_super_admin: record.get('is_super_admin') === true,
    }

    const diffParts = []
    if (prevData.role !== newData.role) {
      diffParts.push('Papel: ' + prevData.role + ' → ' + newData.role)
    }
    if (prevData.active !== newData.active) {
      diffParts.push(
        'Status: ' +
          (prevData.active ? 'Ativo' : 'Inativo') +
          ' → ' +
          (newData.active ? 'Ativo' : 'Inativo'),
      )
    }
    if (prevData.name !== newData.name) {
      diffParts.push('Nome: ' + prevData.name + ' → ' + newData.name)
    }
    const prevPermsStr = JSON.stringify(prevData.permissions)
    const newPermsStr = JSON.stringify(newData.permissions)
    if (prevPermsStr !== newPermsStr) {
      diffParts.push('Permissões alteradas')
    }

    const action = diffParts.length > 0 ? 'user_updated' : 'user_profile_updated'
    const desc =
      diffParts.length > 0
        ? 'Usuário ' + record.getString('email') + ' atualizado (' + diffParts.join(', ') + ')'
        : 'Usuário ' + record.getString('email') + ' atualizado'

    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('target', record.id)
    audit.set('action', action)
    audit.set('module', 'users')
    audit.set('description', desc)
    audit.set('before', prevData)
    audit.set('after', newData)
    audit.set('result', 'success')
    $app.save(audit)
  } catch (_) {}

  return e.next()
}, 'users')

onRecordDeleteRequest((e) => {
  const auth = e.auth
  const record = e.record
  const ip = e.requestInfo().remoteIp || ''
  const ua = (e.requestInfo().headers['user-agent'] || '').substring(0, 250)

  // 1. Super Admin nunca pode ser excluído
  const isTargetSuper =
    record.get('is_super_admin') === true || record.getString('email') === 'jmauriciophd@gmail.com'
  if (isTargetSuper) {
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (auth) audit.set('actor', auth.id)
      audit.set('target', record.id)
      audit.set('action', 'super_admin_delete_attempt')
      audit.set('module', 'users')
      audit.set('description', 'Tentativa de exclusão do Super Administrador BLOQUEADA')
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'blocked')
      $app.save(audit)
    } catch (_) {}

    throw new ForbiddenError(
      'O Super Administrador do sistema não pode ser excluído sob nenhuma circunstância.',
    )
  }

  // 2. Validação de permissão para deletar
  if (!auth) {
    throw new ForbiddenError('Autenticação necessária.')
  }

  const isActorSuper = auth.get('is_super_admin') === true
  const actorRole = auth.getString('role')
  let actorPerms = []
  try {
    const p = auth.get('permissions')
    if (Array.isArray(p)) actorPerms = p
    else if (typeof p === 'string' && p) actorPerms = JSON.parse(p)
  } catch (_) {}

  const canDelete =
    isActorSuper || actorRole === 'admin' || actorPerms.indexOf('users.delete') !== -1

  if (!canDelete) {
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('target', record.id)
      audit.set('action', 'user_delete_attempt')
      audit.set('module', 'users')
      audit.set(
        'description',
        'Tentativa não autorizada de excluir usuário ' + record.getString('email'),
      )
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'blocked')
      $app.save(audit)
    } catch (_) {}

    throw new ForbiddenError('Sem permissão para excluir usuários (users.delete necessária).')
  }

  return e.next()
}, 'users')

onRecordAfterDeleteSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('action', 'user_deleted')
    audit.set('module', 'users')
    audit.set(
      'description',
      'Usuário ' + (record.getString('name') || record.getString('email')) + ' excluído do sistema',
    )
    audit.set('before', {
      email: record.getString('email'),
      name: record.getString('name'),
      role: record.getString('role'),
    })
    audit.set('after', {})
    audit.set('result', 'success')
    $app.save(audit)
  } catch (_) {}

  return e.next()
}, 'users')
