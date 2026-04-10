migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recebimento')

    const qtdField = col.fields.getByName('quantidade_recebida')
    if (qtdField) {
      qtdField.required = false
    }

    const dataField = col.fields.getByName('data_recebimento')
    if (dataField) {
      dataField.required = false
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recebimento')

    const qtdField = col.fields.getByName('quantidade_recebida')
    if (qtdField) {
      qtdField.required = true
    }

    const dataField = col.fields.getByName('data_recebimento')
    if (dataField) {
      dataField.required = true
    }

    app.save(col)
  },
)
