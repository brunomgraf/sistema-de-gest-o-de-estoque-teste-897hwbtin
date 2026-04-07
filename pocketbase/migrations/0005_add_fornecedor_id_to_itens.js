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
    itens.indexes.push('CREATE INDEX idx_itens_fornecedor ON itens (fornecedor_id)')
    app.save(itens)
  },
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.removeByName('fornecedor_id')
    itens.indexes = itens.indexes.filter((idx) => !idx.includes('idx_itens_fornecedor'))
    app.save(itens)
  },
)
