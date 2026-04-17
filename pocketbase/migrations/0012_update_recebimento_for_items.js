migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimento')

    if (!col.fields.getByName('item_id')) {
      col.fields.add(
        new RelationField({
          name: 'item_id',
          collectionId: app.findCollectionByNameOrId('itens').id,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
    }

    col.addIndex('idx_recebimento_item', false, 'item_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimento')
    col.fields.removeByName('item_id')
    col.removeIndex('idx_recebimento_item')
    app.save(col)
  },
)
