migrate(
  (app) => {
    // Update movimentacoes to include solicitante and ordem_servico
    const mov = app.findCollectionByNameOrId('movimentacoes')

    if (!mov.fields.getByName('solicitante')) {
      mov.fields.add(new TextField({ name: 'solicitante' }))
    }

    if (!mov.fields.getByName('ordem_servico')) {
      mov.fields.add(new TextField({ name: 'ordem_servico' }))
    }

    app.save(mov)

    // Update itens to include fornecedor_id
    const itens = app.findCollectionByNameOrId('itens')

    if (!itens.fields.getByName('fornecedor_id')) {
      const fornecedores = app.findCollectionByNameOrId('fornecedores')
      itens.fields.add(
        new RelationField({
          name: 'fornecedor_id',
          collectionId: fornecedores.id,
          maxSelect: 1,
        }),
      )
    }

    app.save(itens)
  },
  (app) => {
    const mov = app.findCollectionByNameOrId('movimentacoes')
    mov.fields.removeByName('solicitante')
    mov.fields.removeByName('ordem_servico')
    app.save(mov)

    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.removeByName('fornecedor_id')
    app.save(itens)
  },
)
