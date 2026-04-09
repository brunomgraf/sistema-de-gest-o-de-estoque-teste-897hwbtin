migrate(
  (app) => {
    const solicitacoes = app.findCollectionByNameOrId('solicitacoes_compra')
    solicitacoes.updateRule = "@request.auth.id != '' && status != 'finalizado'"
    solicitacoes.deleteRule = "@request.auth.role = 'admin' && status != 'finalizado'"
    app.save(solicitacoes)

    const cotacoes = app.findCollectionByNameOrId('cotacoes')
    cotacoes.updateRule = "@request.auth.id != '' && solicitacao_id.status != 'finalizado'"
    cotacoes.deleteRule = "@request.auth.role = 'admin' && solicitacao_id.status != 'finalizado'"
    app.save(cotacoes)

    const ordens = app.findCollectionByNameOrId('ordens_compra')
    ordens.updateRule = "(@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
    app.save(ordens)
  },
  (app) => {
    const solicitacoes = app.findCollectionByNameOrId('solicitacoes_compra')
    solicitacoes.updateRule = "@request.auth.id != ''"
    solicitacoes.deleteRule = "@request.auth.role = 'admin'"
    app.save(solicitacoes)

    const cotacoes = app.findCollectionByNameOrId('cotacoes')
    cotacoes.updateRule = "@request.auth.id != ''"
    cotacoes.deleteRule = "@request.auth.role = 'admin'"
    app.save(cotacoes)

    const ordens = app.findCollectionByNameOrId('ordens_compra')
    ordens.updateRule = "@request.auth.id != '' && @request.body.numero_oc = numero_oc"
    app.save(ordens)
  },
)
