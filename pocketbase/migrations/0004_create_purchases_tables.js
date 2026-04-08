migrate(
  (app) => {
    const solicitacoesCompra = new Collection({
      name: 'solicitacoes_compra',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('itens').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'quantidade_sugerida', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'em_cotacao', 'finalizado', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_solic_item ON solicitacoes_compra (item_id)',
        'CREATE INDEX idx_solic_status ON solicitacoes_compra (status)',
      ],
    })
    app.save(solicitacoesCompra)

    const cotacoes = new Collection({
      name: 'cotacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'solicitacao_id',
          type: 'relation',
          required: true,
          collectionId: solicitacoesCompra.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('fornecedores').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'valor_ofertado', type: 'number', required: true },
        { name: 'prazo_entrega', type: 'text', required: true },
        { name: 'condicao_pagamento', type: 'text', required: false },
        { name: 'frete', type: 'text', required: false },
        { name: 'is_winner', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cotacoes_solic ON cotacoes (solicitacao_id)'],
    })
    app.save(cotacoes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('cotacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('solicitacoes_compra'))
    } catch (_) {}
  },
)
