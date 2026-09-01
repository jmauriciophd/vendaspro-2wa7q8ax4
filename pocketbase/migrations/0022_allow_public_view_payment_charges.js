migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('payment_charges')
      col.viewRule = ''
      app.save(col)
    } catch (err) {
      console.log('0022: erro ao atualizar viewRule de payment_charges: ' + err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('payment_charges')
      col.viewRule = "@request.auth.id != ''"
      app.save(col)
    } catch (_) {}
  },
)
