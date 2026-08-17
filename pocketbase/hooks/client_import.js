// Importação de clientes via CSV
//
// POST /backend/v1/clients/import
// Body: { clients: [{ name, email, phone, document, cnpj, address, city,
//                     state, zip_code, type, phone_whatsapp, telegram }] }
// Valida nome obrigatório, email/documento/cnpj únicos (evita duplicatas).
// Retorna { success, duplicates, errors, details }

routerAdd(
  'POST',
  '/backend/v1/clients/import',
  (e) => {
    const body = e.requestInfo().body || {}
    const clients = body.clients
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return e.json(400, { message: 'Lista de clientes vazia.' })
    }

    const customersCol = $app.findCollectionByNameOrId('customers')

    let success = 0
    let duplicates = 0
    let errors = 0
    const details = []

    // normaliza valores
    const norm = function (v) {
      if (v === null || v === undefined) return ''
      return String(v).trim()
    }

    for (let i = 0; i < clients.length; i++) {
      const c = clients[i] || {}
      const row = i + 1

      const name = norm(c.name)
      const email = norm(c.email)
      const phone = norm(c.phone)
      const cnpj = norm(c.cnpj)
      const document = norm(c.document)
      const address = norm(c.address)
      const city = norm(c.city)
      const state = norm(c.state)
      const zipCode = norm(c.zip_code)
      const type = norm(c.type)
      const phoneWhatsapp = norm(c.phone_whatsapp)
      const telegram = norm(c.telegram)

      if (!name) {
        errors++
        details.push({ row: row, name: '', status: 'error', reason: 'Nome obrigatório' })
        continue
      }

      // CNPJ: prioriza cnpj; se vazio, usa document (CPF/CNPJ)
      const cnpjValue = cnpj || document

      // checa duplicidade por email
      let isDuplicate = false
      if (email) {
        let existing = []
        try {
          existing = $app.findRecordsByFilter('customers', 'email = {:em}', 'created', 1, 0, {
            em: email,
          })
        } catch (_) {}
        if (existing && existing.length > 0) isDuplicate = true
      }
      if (!isDuplicate && cnpjValue) {
        let existing = []
        try {
          existing = $app.findRecordsByFilter('customers', 'cnpj = {:cn}', 'created', 1, 0, {
            cn: cnpjValue,
          })
        } catch (_) {}
        if (existing && existing.length > 0) isDuplicate = true
      }

      if (isDuplicate) {
        duplicates++
        details.push({
          row: row,
          name: name,
          status: 'duplicate',
          reason: 'Email ou documento já cadastrado',
        })
        continue
      }

      // mapeia type -> size (pequeno/medio/grande)
      let size = 'pequeno'
      const t = type.toLowerCase()
      if (t === 'medio' || t === 'médio' || t === 'media' || t === 'média') size = 'medio'
      else if (t === 'grande' || t === 'large') size = 'grande'
      else if (t === 'pequeno' || t === 'small') size = 'pequeno'

      try {
        const rec = new Record(customersCol)
        rec.set('name', name)
        if (email) rec.set('email', email)
        if (phone) rec.set('phone', phone)
        if (cnpjValue) rec.set('cnpj', cnpjValue)
        if (address) rec.set('address', address)
        if (city) rec.set('city', city)
        if (state) rec.set('state', state)
        if (zipCode) rec.set('notes', 'CEP: ' + zipCode)
        rec.set('size', size)
        rec.set('status', 'ativo')
        if (phoneWhatsapp) rec.set('phone_whatsapp', phoneWhatsapp)
        if (telegram) rec.set('telegram', telegram)
        $app.save(rec)
        success++
        details.push({ row: row, name: name, status: 'success', id: rec.id })
      } catch (err) {
        errors++
        const msg = (err && err.message) || String(err)
        details.push({ row: row, name: name, status: 'error', reason: msg })
      }
    }

    return e.json(200, {
      success: success,
      duplicates: duplicates,
      errors: errors,
      details: details,
    })
  },
  $apis.requireAuth(),
)
