migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('items')
    if (!col.fields.getByName('shelf_location')) {
      col.fields.add(new TextField({ name: 'shelf_location' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('items')
    col.fields.removeByName('shelf_location')
    app.save(col)
  },
)
