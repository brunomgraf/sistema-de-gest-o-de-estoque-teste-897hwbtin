migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.add(
      new FileField({
        name: 'foto',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        thumbs: ['100x100'],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.removeByName('foto')
    app.save(col)
  },
)
