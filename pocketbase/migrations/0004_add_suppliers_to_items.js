migrate(
  (app) => {
    const items = app.findCollectionByNameOrId('items')
    const suppliers = app.findCollectionByNameOrId('suppliers')

    items.fields.add(
      new RelationField({
        name: 'suppliers',
        collectionId: suppliers.id,
        cascadeDelete: false,
        maxSelect: 99,
      }),
    )
    app.save(items)
  },
  (app) => {
    const items = app.findCollectionByNameOrId('items')
    items.fields.removeByName('suppliers')
    app.save(items)
  },
)
