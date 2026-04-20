migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.add(new TextField({ name: 'posicao_estoque' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.removeByName('posicao_estoque')
    app.save(col)
  },
)
