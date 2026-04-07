migrate(
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    const fornecedores = app.findCollectionByNameOrId('fornecedores')

    itens.fields.add(
      new RelationField({
        name: 'fornecedor_id',
        collectionId: fornecedores.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    itens.addIndex('idx_itens_fornecedor', false, 'fornecedor_id', '')
    app.save(itens)
  },
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.removeByName('fornecedor_id')
    itens.removeIndex('idx_itens_fornecedor')
    app.save(itens)
  },
)
