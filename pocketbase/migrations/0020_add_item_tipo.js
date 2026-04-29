migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    col.fields.add(
      new SelectField({
        name: 'tipo',
        values: ['item', 'ferramenta'],
        maxSelect: 1,
        required: false,
      }),
    )
    app.save(col)

    app.db().newQuery(`UPDATE itens SET tipo = 'item' WHERE tipo IS NULL OR tipo = ''`).execute()

    const col2 = app.findCollectionByNameOrId('itens')
    const tipoField = col2.fields.getByName('tipo')
    if (tipoField) {
      tipoField.required = true
    }
    col2.addIndex('idx_itens_tipo', false, 'tipo', '')
    app.save(col2)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.removeIndex('idx_itens_tipo')
    col.fields.removeByName('tipo')
    app.save(col)
  },
)
