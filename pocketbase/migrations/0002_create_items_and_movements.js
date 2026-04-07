migrate(
  (app) => {
    const itemsCollection = new Collection({
      name: 'items',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'current_quantity', type: 'number', required: true },
        { name: 'min_quantity', type: 'number', required: true },
        { name: 'cost_price', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(itemsCollection)

    const savedItems = app.findCollectionByNameOrId('items')

    const movementsCollection = new Collection({
      name: 'stock_movements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: savedItems.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'type', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true },
        { name: 'unit_price', type: 'number', required: true },
        { name: 'production_order', type: 'text' },
        { name: 'observation', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_stock_movements_po ON stock_movements (production_order)'],
    })
    app.save(movementsCollection)
  },
  (app) => {
    const movementsCollection = app.findCollectionByNameOrId('stock_movements')
    app.delete(movementsCollection)
    const itemsCollection = app.findCollectionByNameOrId('items')
    app.delete(itemsCollection)
  },
)
