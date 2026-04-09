migrate(
  (app) => {
    let solicitacoes
    try {
      solicitacoes = app.findCollectionByNameOrId('solicitacoes_compra')
    } catch (_) {
      throw new Error('solicitacoes_compra collection not found')
    }

    const collection = new Collection({
      name: 'aprovacoes_financeiras',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'solicitacao_id',
          type: 'relation',
          required: true,
          collectionId: solicitacoes.id,
          maxSelect: 1,
        },
        { name: 'aprovador_nome', type: 'text', required: true },
        { name: 'data_aprovacao', type: 'date', required: true },
        { name: 'hora_aprovacao', type: 'text', required: true },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('aprovacoes_financeiras')
      app.delete(collection)
    } catch (_) {}
  },
)
