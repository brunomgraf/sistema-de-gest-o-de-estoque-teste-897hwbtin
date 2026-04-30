migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('solicitacoes_compra')
    if (!col.fields.getByName('descricao')) {
      col.fields.add(new TextField({ name: 'descricao' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('solicitacoes_compra')
    col.fields.removeByName('descricao')
    app.save(col)
  },
)
