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

    app.save(oc)

    app
      .db()
      .newQuery(
        "UPDATE ordens_compra SET numero_oc = 'OC-' || hex(randomblob(4)) WHERE numero_oc IS NULL OR numero_oc = ''",
      )
      .execute()

    const ocUpdated = app.findCollectionByNameOrId('ordens_compra')

    if (!ocUpdated.indexes) {
      ocUpdated.indexes = []
    }

    const idxQuery = 'CREATE UNIQUE INDEX `idx_oc_numero` ON `ordens_compra` (`numero_oc`)'
    if (!ocUpdated.indexes.includes(idxQuery)) {
      ocUpdated.indexes.push(idxQuery)
    }

    app.save(ocUpdated)
  },
  (app) => {
    const oc = app.findCollectionByNameOrId('ordens_compra')
    if (oc.indexes) {
      oc.indexes = oc.indexes.filter((idx) => !idx.includes('idx_oc_numero'))
    }
    if (oc.fields.getByName('numero_oc')) oc.fields.removeByName('numero_oc')
    if (oc.fields.getByName('tipo_entrega')) oc.fields.removeByName('tipo_entrega')
    if (oc.fields.getByName('descricao_produtos')) oc.fields.removeByName('descricao_produtos')
    if (oc.fields.getByName('condicoes_pagamento')) oc.fields.removeByName('condicoes_pagamento')
    if (oc.fields.getByName('cotacao_id')) oc.fields.removeByName('cotacao_id')
    app.save(oc)
  },
)
