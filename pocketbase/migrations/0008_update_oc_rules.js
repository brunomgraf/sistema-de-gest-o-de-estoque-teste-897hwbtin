migrate(
  (app) => {
    const ordens = app.findCollectionByNameOrId('ordens_compra')
    ordens.updateRule =
      "(@request.auth.role = 'admin' || @request.auth.role = 'gestor') && (@request.body.numero_oc = '' || @request.body.numero_oc = numero_oc)"
    app.save(ordens)

    const aprovacoes = app.findCollectionByNameOrId('aprovacoes_financeiras')
    aprovacoes.updateRule = "@request.auth.role = 'admin' && solicitacao_id.status != 'finalizado'"
    aprovacoes.deleteRule = "@request.auth.role = 'admin' && solicitacao_id.status != 'finalizado'"
    app.save(aprovacoes)
  },
  (app) => {
    const ordens = app.findCollectionByNameOrId('ordens_compra')
    ordens.updateRule = "(@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    app.save(ordens)

    const aprovacoes = app.findCollectionByNameOrId('aprovacoes_financeiras')
    aprovacoes.updateRule = "@request.auth.role = 'admin'"
    aprovacoes.deleteRule = "@request.auth.role = 'admin'"
    app.save(aprovacoes)
  },
)
