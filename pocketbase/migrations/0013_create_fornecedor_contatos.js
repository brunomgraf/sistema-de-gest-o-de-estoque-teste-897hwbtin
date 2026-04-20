migrate(
  (app) => {
    const collection = new Collection({
      name: 'fornecedor_contatos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('fornecedores').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'usuario_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_contato', type: 'date', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['email', 'telefone', 'reuniao', 'outros'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fornecedor_contatos_fornecedor ON fornecedor_contatos (fornecedor_id)',
        'CREATE INDEX idx_fornecedor_contatos_data ON fornecedor_contatos (data_contato DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('fornecedor_contatos')
    app.delete(collection)
  },
)
