// Hook de proteção da collection `users`:
// 1. Proteção do admin principal (jmauriciophd@gmail.com):
//    - Bloqueia exclusão (nem mesmo o próprio admin via API)
//    - Bloqueia desativação (active=false)
//    - Bloqueia alteração de role para outro valor diferente de 'admin'
//    - Bloqueia alteração de email
//    - Bloqueia updates feitos por quem não seja o próprio admin ou admin autenticado
// 2. Restrição de criação de usuários apenas por administradores autenticados e validação clara de email duplicado.

onRecordCreateRequest((e) => {
  const auth = e.auth
  if (!auth || auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas administradores autenticados podem cadastrar novos usuários.')
  }

  // Validação de email duplicado amigável
  const body = e.requestInfo().body || {}
  const targetEmail = (body.email || '').trim().toLowerCase()
  if (targetEmail) {
    try {
      const existing = $app.findAuthRecordByEmail('users', targetEmail)
      if (existing && existing.id) {
        throw new BadRequestError('Já existe um usuário cadastrado com o e-mail informado.')
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
      // Se deu erro de not found no findAuthRecordByEmail, o e-mail está livre
    }
  }

  return e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  const auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Autenticação necessária.')
  }

  const record = e.record
  const isTargetMainAdmin = record.getString('email') === 'jmauriciophd@gmail.com'

  if (isTargetMainAdmin) {
    // Apenas o próprio admin principal pode atualizar seu próprio registro
    if (auth.id !== record.id) {
      throw new ForbiddenError('Apenas o próprio administrador principal pode alterar sua conta.')
    }

    const body = e.requestInfo().body || {}

    // Impedir desativação
    if (body.active === false || body.active === 'false') {
      throw new ForbiddenError('O administrador principal não pode ser desativado.')
    }

    // Impedir rebaixamento de cargo (role)
    if (body.role && body.role !== 'admin') {
      throw new ForbiddenError('O administrador principal não pode ter seu cargo alterado.')
    }

    // Impedir alteração de e-mail
    if (body.email && body.email.toLowerCase() !== 'jmauriciophd@gmail.com') {
      throw new ForbiddenError('O e-mail do administrador principal não pode ser alterado.')
    }
  }

  return e.next()
}, 'users')

onRecordDeleteRequest((e) => {
  const record = e.record
  if (record.getString('email') === 'jmauriciophd@gmail.com') {
    throw new ForbiddenError('O administrador principal do sistema não pode ser excluído.')
  }

  const auth = e.auth
  if (!auth || auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas administradores podem excluir usuários.')
  }

  return e.next()
}, 'users')
