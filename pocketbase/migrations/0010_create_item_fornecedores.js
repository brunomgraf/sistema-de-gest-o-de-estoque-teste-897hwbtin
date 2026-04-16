migrate(
  (app) => {
    const collection = new Collection({
      name: 'item_fornecedores',
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
        {
          name: 'fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('fornecedores').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'observacao',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_item_fornecedores_item ON item_fornecedores (item_id)',
        'CREATE INDEX idx_item_fornecedores_forn ON item_fornecedores (fornecedor_id)',
        'CREATE UNIQUE INDEX idx_item_fornecedores_unique ON item_fornecedores (item_id, fornecedor_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('item_fornecedores')
    app.delete(collection)
  },
)
