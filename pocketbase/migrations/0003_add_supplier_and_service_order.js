migrate(
  (app) => {
    const itensCol = app.findCollectionByNameOrId('itens')
    if (!itensCol.fields.getByName('fornecedor_id')) {
      itensCol.fields.add(
        new RelationField({
          name: 'fornecedor_id',
          collectionId: app.findCollectionByNameOrId('fornecedores').id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(itensCol)
    }

    const movCol = app.findCollectionByNameOrId('movimentacoes')
    if (!movCol.fields.getByName('ordem_servico')) {
      movCol.fields.add(new TextField({ name: 'ordem_servico' }))
      app.save(movCol)
    }
  },
  (app) => {
    const itensCol = app.findCollectionByNameOrId('itens')
    if (itensCol.fields.getByName('fornecedor_id')) {
      itensCol.fields.removeByName('fornecedor_id')
      app.save(itensCol)
    }

    const movCol = app.findCollectionByNameOrId('movimentacoes')
    if (movCol.fields.getByName('ordem_servico')) {
      movCol.fields.removeByName('ordem_servico')
      app.save(movCol)
    }
  },
)
