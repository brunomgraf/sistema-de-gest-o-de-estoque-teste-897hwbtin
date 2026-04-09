migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_compra')

    if (!col.fields.getByName('numero_oc')) {
      col.fields.add(new TextField({ name: 'numero_oc' }))
    }
    if (!col.fields.getByName('tipo_entrega')) {
      col.fields.add(new TextField({ name: 'tipo_entrega' }))
    }
    if (!col.fields.getByName('condicoes_pagamento')) {
      col.fields.add(new TextField({ name: 'condicoes_pagamento' }))
    }
    if (!col.fields.getByName('descricao_produtos')) {
      col.fields.add(new TextField({ name: 'descricao_produtos' }))
    }
    if (!col.fields.getByName('cotacao_id')) {
      col.fields.add(
        new RelationField({
          name: 'cotacao_id',
          collectionId: app.findCollectionByNameOrId('cotacoes').id,
          maxSelect: 1,
        }),
      )
    }

    // As required, the numero_oc field must be immutable by clients via API rules
    col.createRule = "@request.auth.id != '' && @request.body.numero_oc = ''"
    col.updateRule = "@request.auth.id != '' && @request.body.numero_oc = numero_oc"

    app.save(col)

    // Populate existing records to avoid UNIQUE constraint violation on empty strings
    const existing = app.findRecordsByFilter('ordens_compra', "numero_oc = ''", '', 1000, 0)
    for (let i = 0; i < existing.length; i++) {
      existing[i].set('numero_oc', `OC-LEGACY-${existing[i].id}`)
      app.saveNoValidate(existing[i])
    }

    col.addIndex('idx_ordens_compra_numero_oc', true, 'numero_oc', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_compra')
    col.removeIndex('idx_ordens_compra_numero_oc')
    col.fields.removeByName('numero_oc')
    col.fields.removeByName('tipo_entrega')
    col.fields.removeByName('condicoes_pagamento')
    col.fields.removeByName('descricao_produtos')
    col.fields.removeByName('cotacao_id')
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    app.save(col)
  },
)
