// 0012 — Suporte a boleto bancário.
//
// 1. Adiciona em `payment_charges` os campos de boleto:
//      boleto_url            (text)  — link do PDF/HTML do boleto
//      boleto_barcode        (text)  — código de barras (44 dígitos)
//      boleto_digitable_line (text)  — linha digitável (47-48 caracteres)
//      boleto_nosso_numero   (text)  — nosso número
//      boleto_document_number(text)  — número do documento
// 2. Backfill: para cobranças demo existentes com payment_method='boleto'
//    e sem boleto_barcode, gera dados simulados realistas (código de barras
//    44 dígitos, linha digitável 47 caracteres, nosso número, URL fake).

migrate(
  (app) => {
    const chargesCol = app.findCollectionByNameOrId('payment_charges')

    const addField = function (name, ctor) {
      if (!chargesCol.fields.getByName(name)) {
        chargesCol.fields.add(ctor)
      }
    }

    addField('boleto_url', new TextField({ name: 'boleto_url', max: 1000 }))
    addField('boleto_barcode', new TextField({ name: 'boleto_barcode', max: 100 }))
    addField('boleto_digitable_line', new TextField({ name: 'boleto_digitable_line', max: 100 }))
    addField('boleto_nosso_numero', new TextField({ name: 'boleto_nosso_numero', max: 100 }))
    addField('boleto_document_number', new TextField({ name: 'boleto_document_number', max: 100 }))
    app.save(chargesCol)

    // -----------------------------------------------------------------
    // Backfill de cobranças boleto demo.
    // -----------------------------------------------------------------
    // Gera um código de barras (44 dígitos) e linha digitável (47 dígitos)
    // com aparência realista (bancos 237 = Bradesco, 341 = Itaú). Não é
    // validável — é apenas uma representação visual para o demo.
    const randomDigits = function (n) {
      let s = ''
      for (let i = 0; i < n; i++) {
        s += Math.floor(Math.random() * 10).toString()
      }
      return s
    }

    // barcode: 4 banco + 1 moeda(9) + 14 valor + 25 livre = 44
    const buildBarcode = function (bankCode, amount) {
      const moeda = '9'
      const valorStr = String(Math.round(amount * 100))
      const valorPad = valorStr.padStart(14, '0')
      const livre = randomDigits(25)
      return bankCode + moeda + valorPad + livre
    }

    // linha digitável (47): bloco1(9) + bloco2(10) + bloco3(10) + bloco4(1 dv geral) + bloco5(14 valor)
    // com DVs fictícios por bloco.
    const dv10 = function (seq) {
      let soma = 0
      let peso = 2
      for (let i = seq.length - 1; i >= 0; i--) {
        let n = parseInt(seq.charAt(i), 10) * peso
        while (n > 9) n = (n % 10) + Math.floor(n / 10)
        soma += n
        peso = peso === 2 ? 1 : 2
      }
      const mod = soma % 10
      return mod === 0 ? '0' : String(10 - mod)
    }

    const buildDigitableLine = function (bankCode, amount) {
      const moeda = '9'
      // bloco 1: banco(4) + moeda(1) + 4 primeiros do campo livre = 9
      const livre = randomDigits(25)
      const b1 = bankCode + moeda + livre.substring(0, 4)
      const d1 = dv10(b1)
      // bloco 2: posições 5..14 do campo livre = 10
      const b2 = livre.substring(4, 14)
      const d2 = dv10(b2)
      // bloco 3: posições 15..24 do campo livre = 10
      const b3 = livre.substring(14, 24)
      const d3 = dv10(b3)
      // bloco 4: DV geral (fictício)
      const dGeral = randomDigits(1)
      // bloco 5: valor (14)
      const valorStr = String(Math.round(amount * 100))
      const valorPad = valorStr.padStart(14, '0')
      return b1 + d1 + b2 + d2 + b3 + d3 + dGeral + valorPad
    }

    const formatDigitable = function (line) {
      // XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXX.XXXXXX.XXXXXX
      return (
        line.substring(0, 5) +
        '.' +
        line.substring(5, 9) +
        ' ' +
        line.substring(10, 15) +
        '.' +
        line.substring(15, 20) +
        ' ' +
        line.substring(21, 26) +
        '.' +
        line.substring(26, 31) +
        ' ' +
        line.substring(32, 33) +
        ' ' +
        line.substring(33, 37) +
        '.' +
        line.substring(37, 43) +
        '.' +
        line.substring(43, 47)
      )
    }

    let charges = []
    try {
      charges = app.findRecordsByFilter('payment_charges', '1=1', 'created', 0, 0)
    } catch (_) {}

    let updated = 0
    for (let i = 0; i < charges.length; i++) {
      const c = charges[i]
      const method = c.get('payment_method') || ''
      if (method !== 'boleto') continue
      if (c.get('boleto_barcode')) continue // já preenchido

      const amount = Number(c.get('final_amount') || 0)
      const extId = c.get('external_charge_id') || ''
      const bankCode = '237' // Bradesco (placeholder)
      const barcode = buildBarcode(bankCode, amount)
      const line = buildDigitableLine(bankCode, amount)
      const nossoNum = randomDigits(11)
      const docNum = extId || 'DOC-' + randomDigits(8)
      const url = 'https://boleto.vendaspro.demo/' + bankCode + '/' + nossoNum

      c.set('boleto_url', url)
      c.set('boleto_barcode', barcode)
      c.set('boleto_digitable_line', line)
      c.set('boleto_nosso_numero', nossoNum)
      c.set('boleto_document_number', docNum)

      // garante payment_url apontando para o boleto quando vazio
      if (!c.get('payment_url')) {
        c.set('payment_url', url)
      }

      app.save(c)
      updated++
    }

    console.log('0012: campos de boleto adicionados; ' + updated + ' cobranças boleto preenchidas.')
  },
  (app) => {
    // best-effort revert
    const chargesCol = app.findCollectionByNameOrId('payment_charges')
    const removeField = function (name) {
      try {
        const f = chargesCol.fields.getByName(name)
        if (f) chargesCol.fields.remove(f)
      } catch (_) {}
    }
    removeField('boleto_url')
    removeField('boleto_barcode')
    removeField('boleto_digitable_line')
    removeField('boleto_nosso_numero')
    removeField('boleto_document_number')
    try {
      app.save(chargesCol)
    } catch (_) {}
  },
)
