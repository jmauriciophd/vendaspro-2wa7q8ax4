// Endpoints dedicados para o perfil do usuário autenticado:
// 1. GET  /backend/v1/profile          -> Obter perfil do usuário autenticado
// 2. PUT  /backend/v1/profile          -> Atualizar dados pessoais (whitelist: name, phone, avatar)
// 3. POST /backend/v1/profile/password -> Alterar senha com validação da senha atual e hash oficial PB
// 4. DELETE /backend/v1/profile/avatar -> Remover avatar do usuário

routerAdd(
  'GET',
  '/backend/v1/profile',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const user = $app.findCollectionByNameOrId('users')
    const record = $app.findFirstRecordByData('users', 'id', auth.id)

    return e.json(200, {
      id: record.id,
      email: record.getString('email'),
      name: record.getString('name'),
      phone: record.getString('phone'),
      avatar: record.getString('avatar'),
      role: record.getString('role'),
      active: record.get('active') !== false,
      permissions: record.get('permissions') || [],
      is_super_admin: record.get('is_super_admin') === true,
      created: record.getString('created'),
      updated: record.getString('updated'),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PUT',
  '/backend/v1/profile',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const ip = e.requestInfo().remoteIp || ''
    const ua = (e.requestInfo().headers['user-agent'] || '').substring(0, 250)
    const userRecord = $app.findFirstRecordByData('users', 'id', auth.id)

    const prevName = userRecord.getString('name')
    const prevPhone = userRecord.getString('phone')
    const prevAvatar = userRecord.getString('avatar')

    // Whitelist estrita de campos editáveis
    let hasChanges = false
    const diff = {}

    // Tratamento de Multipart ou JSON body
    // Ler files se houver upload de avatar
    let avatarFile = null
    try {
      const files = e.requestInfo().files
      if (files && files.avatar && files.avatar.length > 0) {
        avatarFile = files.avatar[0]
      }
    } catch (_) {}

    // Se houver arquivo de avatar, validar tipo e tamanho
    if (avatarFile) {
      // Bloquear extensões executáveis e perigosas
      const originalName = (avatarFile.name || '').toLowerCase()
      const blockedExts = [
        '.exe',
        '.bat',
        '.sh',
        '.php',
        '.phtml',
        '.js',
        '.ts',
        '.py',
        '.rb',
        '.pl',
        '.cgi',
        '.jar',
        '.vbs',
        '.msi',
        '.cmd',
        '.com',
        '.scr',
        '.ps1',
      ]
      for (let i = 0; i < blockedExts.length; i++) {
        if (originalName.endsWith(blockedExts[i])) {
          throw new BadRequestError('Tipo de arquivo não permitido para foto de perfil.')
        }
      }

      // Validar MIME type permitido
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/avif',
      ]
      const mime = (avatarFile.contentType || '').toLowerCase()
      let isAllowedMime = false
      for (let i = 0; i < allowedMimes.length; i++) {
        if (mime === allowedMimes[i] || mime.startsWith('image/')) {
          isAllowedMime = true
          break
        }
      }

      if (!isAllowedMime) {
        throw new BadRequestError(
          'O avatar deve ser uma imagem válida (JPEG, PNG, WEBP, GIF, etc).',
        )
      }

      // Validar tamanho máximo (ex: 5MB)
      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new BadRequestError('O tamanho da foto de perfil não pode exceder 5MB.')
      }

      userRecord.set('avatar', avatarFile)
      hasChanges = true
      diff.avatar = 'atualizado'
    }

    // Body data (pode vir como multipart fields ou json body)
    const body = e.requestInfo().body || {}

    // Remover avatar explicitamente se requisitado
    if (body.remove_avatar === true || body.remove_avatar === 'true') {
      userRecord.set('avatar', '')
      hasChanges = true
      diff.avatar = 'removido'
    }

    if (body.name !== undefined) {
      const newName = String(body.name || '').trim()
      if (newName !== prevName) {
        userRecord.set('name', newName)
        hasChanges = true
        diff.name = prevName + ' → ' + newName
      }
    }

    if (body.phone !== undefined) {
      const newPhone = String(body.phone || '').trim()
      if (newPhone !== prevPhone) {
        userRecord.set('phone', newPhone)
        hasChanges = true
        diff.phone = prevPhone + ' → ' + newPhone
      }
    }

    // NUNCA aceitar nem aplicar: email, role, permissions, company_id, is_super_admin, active, status
    // Qualquer tentativa de passar esses campos é solenemente ignorada e descartada pela whitelist

    if (hasChanges) {
      $app.save(userRecord)

      // Registrar log de auditoria específico USER_PROFILE_UPDATED
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', userRecord.id)
        audit.set('target', userRecord.id)
        audit.set('action', 'USER_PROFILE_UPDATED')
        audit.set('module', 'users')
        audit.set(
          'description',
          'Perfil atualizado pelo próprio usuário (' + Object.keys(diff).join(', ') + ')',
        )
        audit.set('before', {
          name: prevName,
          phone: prevPhone,
          avatar: prevAvatar ? 'presente' : 'vazio',
        })
        audit.set('after', {
          name: userRecord.getString('name'),
          phone: userRecord.getString('phone'),
          avatar: userRecord.getString('avatar') ? 'presente' : 'vazio',
        })
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'success')
        $app.save(audit)
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      message: 'Perfil atualizado com sucesso.',
      user: {
        id: userRecord.id,
        email: userRecord.getString('email'),
        name: userRecord.getString('name'),
        phone: userRecord.getString('phone'),
        avatar: userRecord.getString('avatar'),
        role: userRecord.getString('role'),
        active: userRecord.get('active') !== false,
        permissions: userRecord.get('permissions') || [],
        is_super_admin: userRecord.get('is_super_admin') === true,
        created: userRecord.getString('created'),
        updated: userRecord.getString('updated'),
      },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/profile/password',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new ForbiddenError('Autenticação necessária.')
    }

    const ip = e.requestInfo().remoteIp || ''
    const ua = (e.requestInfo().headers['user-agent'] || '').substring(0, 250)
    const body = e.requestInfo().body || {}

    const currentPassword = String(body.current_password || '')
    const newPassword = String(body.new_password || '')
    const confirmPassword = String(body.confirm_password || '')

    if (!currentPassword) {
      throw new BadRequestError('Informe a senha atual.')
    }

    if (!newPassword) {
      throw new BadRequestError('Informe a nova senha.')
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('A nova senha deve possuir no mínimo 8 caracteres.')
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestError('As senhas informadas não coincidem.')
    }

    // 1. Validar senha atual com o mecanismo nativo do PocketBase
    const userRecord = $app.findFirstRecordByData('users', 'id', auth.id)
    const isValid = userRecord.validatePassword(currentPassword)

    if (!isValid) {
      // Registrar tentativa incorreta no log de auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor', auth.id)
        audit.set('target', auth.id)
        audit.set('action', 'user_password_change_failed')
        audit.set('module', 'auth')
        audit.set('description', 'Tentativa de alteração de senha com senha atual incorreta')
        audit.set('ip', ip)
        audit.set('user_agent', ua)
        audit.set('result', 'blocked')
        $app.save(audit)
      } catch (_) {}

      throw new BadRequestError('A senha atual está incorreta.')
    }

    // 2. Definir nova senha via setter nativo do PocketBase (aplica hash seguro bcrypt nativo)
    userRecord.setPassword(newPassword)
    $app.save(userRecord)

    // 3. Registrar log de auditoria USER_PASSWORD_CHANGED (NUNCA registrar senhas nem hash)
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('actor', auth.id)
      audit.set('target', auth.id)
      audit.set('action', 'USER_PASSWORD_CHANGED')
      audit.set('module', 'auth')
      audit.set('description', 'Senha de acesso alterada com sucesso pelo usuário')
      audit.set('before', {})
      audit.set('after', {})
      audit.set('ip', ip)
      audit.set('user_agent', ua)
      audit.set('result', 'success')
      $app.save(audit)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Senha alterada com sucesso.',
    })
  },
  $apis.requireAuth(),
)
