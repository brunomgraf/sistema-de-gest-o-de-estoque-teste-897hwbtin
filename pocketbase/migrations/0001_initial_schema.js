migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'gestor', 'operador'],
          maxSelect: 1,
          required: true,
        }),
      )
      app.save(users)
    }

    const listRule = '@request.auth.id != ""'
    const viewRule = '@request.auth.id != ""'
    const createRule = '@request.auth.id != ""'
    const updateRule = '@request.auth.id != ""'
    const deleteRule = "@request.auth.role = 'admin'"

    const itens = new Collection({
      name: 'itens',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'sku', type: 'text', required: true },
        { name: 'quantidade_atual', type: 'number' },
        { name: 'quantidade_minima', type: 'number' },
        { name: 'valor_unitario', type: 'number' },
        { name: 'status_critico', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_itens_sku ON itens (sku)'],
    })
    app.save(itens)

    const fornecedores = new Collection({
      name: 'fornecedores',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_fornecedores_nome ON fornecedores (nome)'],
    })
    app.save(fornecedores)

    const ordensCompra = new Collection({
      name: 'ordens_compra',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        {
          name: 'fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: fornecedores.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_pedido', type: 'date', required: true },
        { name: 'data_entrega_prevista', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'entregue', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'valor_total', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_oc_fornecedor ON ordens_compra (fornecedor_id)',
        'CREATE INDEX idx_oc_status ON ordens_compra (status)',
      ],
    })
    app.save(ordensCompra)

    const itensOrdemCompra = new Collection({
      name: 'itens_ordem_compra',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        {
          name: 'ordem_compra_id',
          type: 'relation',
          required: true,
          collectionId: ordensCompra.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'quantidade', type: 'number', required: true },
        { name: 'valor_unitario', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ioc_ordem ON itens_ordem_compra (ordem_compra_id)',
        'CREATE INDEX idx_ioc_item ON itens_ordem_compra (item_id)',
      ],
    })
    app.save(itensOrdemCompra)

    const recebimento = new Collection({
      name: 'recebimento',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        {
          name: 'ordem_compra_id',
          type: 'relation',
          required: true,
          collectionId: ordensCompra.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data_recebimento', type: 'date', required: true },
        { name: 'quantidade_recebida', type: 'number', required: true },
        { name: 'status_verificacao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_recebimento_oc ON recebimento (ordem_compra_id)'],
    })
    app.save(recebimento)

    const movimentacoes = new Collection({
      name: 'movimentacoes',
      type: 'base',
      listRule,
      viewRule,
      createRule,
      updateRule,
      deleteRule,
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_movimento',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'quantidade', type: 'number', required: true },
        { name: 'data_movimento', type: 'date', required: true },
        { name: 'motivo', type: 'text' },
        {
          name: 'usuario_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mov_item ON movimentacoes (item_id)',
        'CREATE INDEX idx_mov_usuario ON movimentacoes (usuario_id)',
      ],
    })
    app.save(movimentacoes)
  },
  (app) => {
    const collections = [
      'movimentacoes',
      'recebimento',
      'itens_ordem_compra',
      'ordens_compra',
      'fornecedores',
      'itens',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }

    try {
      const users = app.findCollectionByNameOrId('users')
      users.fields.removeByName('role')
      app.save(users)
    } catch (_) {}
  },
)
