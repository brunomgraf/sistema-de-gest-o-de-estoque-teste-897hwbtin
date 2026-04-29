migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')

    if (!col.fields.getByName('colaborador_id')) {
      const relation = new RelationField({
        name: 'colaborador_id',
        collectionId: app.findCollectionByNameOrId('colaboradores').id,
        maxSelect: 1,
        cascadeDelete: false,
      })
      col.fields.add(relation)
    }

    const tipoMovimento = col.fields.getByName('tipo_movimento')
    if (tipoMovimento) {
      tipoMovimento.values = ['entrada', 'saida', 'producao_saida', 'producao_retorno']
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('movimentacoes')

    if (col.fields.getByName('colaborador_id')) {
      col.fields.removeByName('colaborador_id')
    }

    const tipoMovimento = col.fields.getByName('tipo_movimento')
    if (tipoMovimento) {
      tipoMovimento.values = ['entrada', 'saida']
    }

    app.save(col)
  },
)
