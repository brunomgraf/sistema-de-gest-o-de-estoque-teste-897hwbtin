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
      col.indexes =