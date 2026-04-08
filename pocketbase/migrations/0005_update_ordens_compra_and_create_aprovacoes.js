migrate(
  (app) => {
    const oc = app.findCollectionByNameOrId('ordens_compra')

    oc.listRule = "@request.auth.id != ''"
    oc.viewRule = "@request.auth.id != ''"
    oc.createRule = "@request.auth.id != ''"
    oc.updateRule = "@request.auth.id != ''"
    oc.deleteRule = "@request.auth.role = 'admin'"

    if (!oc.fields.getByName('numero_oc')) {
      oc.fields.add(new TextField({ name: 'numero_oc' }))
    }
    if (!oc.fields.getByName('tipo_entrega')) {
      oc.fields.add(new TextField({ name: 'tipo_entrega' }))
    }
    if (!oc.fields.getByName('descricao_produtos')) {
      oc.fields.add(new TextField({ name: 'descricao_produtos' }))
    }
    if (!oc.fields.getByName('condicoes_pagamento')) {
      oc.fields.add(new TextField({ name: 'condicoes_pagamento' }))
    }
    if (!oc.fields.getByName('cotacao_id')) {
      try {
        const cotacoes = app.findCollectionByNameOrId('cotacoes')
        oc.fields.add(
          new RelationField({ name: 'cotacao_id', collectionId: cotacoes.id, maxSelect: 1 }),
        )
      } catch (_) {}
    }

    // Salva a collection primeiro para que as novas colunas existam no banco de dados
    app.save(oc)

    // Preenche dados vazios para que o índice único não falhe (gerando um valor aleatório para cada)
    app
      .db()
      .newQuery(
        "UPDATE ordens_compra SET numero_oc = 'OC-' || hex(randomblob(4)) WHERE numero_oc IS NULL OR numero_oc = ''",
      )
      .execute()

    // Adiciona o índice único corretamente usando a API
    const ocUpdated = app.findCollectionByNameOrId('ordens_compra')
    ocUpdated.addIndex('idx_oc_numero', true, 'numero_oc', '')
    app.save(ocUpdated)

    let aprovacoes
    try {
      aprovacoes = app.findCollectionByNameOrId('aprovacoes_financeiras')
    } catch (_) {
      aprovacoes = new Collection({
        name: 'aprovacoes_financeiras',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'ordem_compra_id',
            type: 'relation',
            required: true,
            collectionId: oc.id,
            maxSelect: 1,
          },
          { name: 'aprovador', type: 'text', required: true },
          { name: 'data_aprovacao', type: 'date', required: true },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(aprovacoes)
    }
  },
  (app) => {
    try {
      const aprovacoes = app.findCollectionByNameOrId('aprovacoes_financeiras')
      app.delete(aprovacoes)
    } catch (_) {}

    const oc = app.findCollectionByNameOrId('ordens_compra')
    oc.removeIndex('idx_oc_numero')
    if (oc.fields.getByName('numero_oc')) oc.fields.removeByName('numero_oc')
    if (oc.fields.getByName('tipo_entrega')) oc.fields.removeByName('tipo_entrega')
    if (oc.fields.getByName('descricao_produtos')) oc.fields.removeByName('descricao_produtos')
    if (oc.fields.getByName('condicoes_pagamento')) oc.fields.removeByName('condicoes_pagamento')
    if (oc.fields.getByName('cotacao_id')) oc.fields.removeByName('cotacao_id')
    app.save(oc)
  },
)
