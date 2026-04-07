migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    if (!col.fields.getByName('fornecedor_id')) {
      try {
        const fornecedores = app.findCollectionByNameOrId('fornecedores')
        col.fields.add(
          new RelationField({
            name: 'fornecedor_id',
            collectionId: fornecedores.id,
            maxSelect: 1,
          }),
        )
      } catch (e) {
        // Fallback if the collection 'fornecedores' cannot be resolved
        col.fields.add(new TextField({ name: 'fornecedor_id' }))
      }
    }

    // Clear any malformed indexes that might have caused the issue
    if (col.indexes) {
      col.indexes = col.indexes.filter(
        (idx) => idx.toUpperCase().includes('CREATE INDEX ') && idx.toUpperCase().includes(' ON '),
      )
    }

    // Safely add the new index using the built-in helper
    col.addIndex('idx_itens_fornecedor_id', false, 'fornecedor_id', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.removeIndex('idx_itens_fornecedor_id')
    col.fields.removeByName('fornecedor_id')
    app.save(col)
  },
)
