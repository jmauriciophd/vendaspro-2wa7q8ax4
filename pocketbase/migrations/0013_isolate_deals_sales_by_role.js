// Isolamento por papel: vendedor só vê seus próprios deals e vendas.
// Admin e gerente continuam vendo tudo.
//
// Regras aplicadas:
//   - deals:   list/view restritos a (owner = @request.auth.id) quando role = "vendedor"
//   - sales:   list/view restritos a (seller = @request.auth.id) quando role = "vendedor"
//   - create/update/delete: admin/gerente sempre; vendedor somente nos próprios registros
//
// Observação: regras do PocketBase v0.36 não suportam OR com OR aninhado de forma
// confiável para expressões de papel, então usamos a expressão:
//   role do auth via @request.auth.role (campo select em users).

migrate(
  (app) => {
    // ----- deals -----
    const deals = app.findCollectionByNameOrId('deals')
    // Vendedor só vê/edita os próprios (owner). Admin/gerente veem tudo.
    deals.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || owner = @request.auth.id)"
    deals.viewRule = deals.listRule
    deals.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || owner = @request.auth.id)"
    deals.updateRule = deals.createRule
    deals.deleteRule = deals.createRule
    app.save(deals)

    // ----- sales -----
    const sales = app.findCollectionByNameOrId('sales')
    sales.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || seller = @request.auth.id)"
    sales.viewRule = sales.listRule
    sales.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gerente' || seller = @request.auth.id)"
    sales.updateRule = sales.createRule
    sales.deleteRule = sales.createRule
    app.save(sales)
  },
  (app) => {
    // Reverte para o estado anterior (qualquer auth)
    const deals = app.findCollectionByNameOrId('deals')
    deals.listRule = "@request.auth.id != ''"
    deals.viewRule = "@request.auth.id != ''"
    deals.createRule = "@request.auth.id != ''"
    deals.updateRule = "@request.auth.id != ''"
    deals.deleteRule = "@request.auth.id != ''"
    app.save(deals)

    const sales = app.findCollectionByNameOrId('sales')
    sales.listRule = "@request.auth.id != ''"
    sales.viewRule = "@request.auth.id != ''"
    sales.createRule = "@request.auth.id != ''"
    sales.updateRule = "@request.auth.id != ''"
    sales.deleteRule = "@request.auth.id != ''"
    app.save(sales)
  },
)
