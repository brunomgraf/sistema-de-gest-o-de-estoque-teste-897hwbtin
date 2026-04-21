migrate(
  (app) => {
    const collections = [
      'recebimento',
      'movimentacoes',
      'itens_ordem_compra',
      'aprovacoes_financeiras',
      'ordens_compra',
      'cotacoes',
      'solicitacoes_compra',
      'item_fornecedores',
      'fornecedor_contatos',
      'itens',
      'fornecedores',
    ]

    app.runInTransaction((txApp) => {
      for (const name of collections) {
        if (txApp.hasTable(name)) {
          try {
            const count = txApp.countRecords(name)
            if (count > 0) {
              txApp.db().newQuery(`DELETE FROM ${name}`).execute()
              console.log(`Cleared ${count} records from ${name}`)
            }
          } catch (e) {
            console.log(`Error checking or clearing ${name}:`, e)
          }
        }
      }
    })
  },
  (app) => {
    // Cannot restore deleted data
  },
)
