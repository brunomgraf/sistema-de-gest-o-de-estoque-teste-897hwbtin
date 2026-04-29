migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')
    col.fields.add(
      new TextField({
        name: 'ordem_producao',
        required: false,
        system: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')
    col.fields.removeByName('ordem_producao')
    app.save(col)
  },
)
