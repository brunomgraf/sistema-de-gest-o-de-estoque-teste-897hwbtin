migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')

    if (!col.fields.getByName('solicitante')) {
      col.fields.add(new TextField({ name: 'solicitante', required: true }))
    }

    if (!col.fields.getByName('ordem_servico')) {
      col.fields.add(new TextField({ name: 'ordem_servico', required: true }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')
    col.fields.removeByName('solicitante')
    col.fields.removeByName('ordem_servico')
    app.save(col)
  },
)
