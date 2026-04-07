migrate(
  (app) => {
    // 1. Seed User
    let user
    try {
      user = app.findAuthRecordByEmail('users', 'projetos@oficinagraf.com.br')
    } catch (_) {
      const users = app.findCollectionByNameOrId('users')
      user = new Record(users)
      user.setEmail('projetos@oficinagraf.com.br')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('role', 'admin')
      user.set('name', 'Admin')
      app.save(user)
    }

    // 2. Seed Itens
    const itensCol = app.findCollectionByNameOrId('itens')
    const itensSeed = [
      {
        nome: 'Papel A4',
        sku: 'PAP-A4-01',
        quantidade_atual: 500,
        quantidade_minima: 100,
        valor_unitario: 25.5,
        status_critico: false,
      },
      {
        nome: 'Tinta Preta',
        sku: 'TNT-PR-01',
        quantidade_atual: 5,
        quantidade_minima: 10,
        valor_unitario: 120.0,
        status_critico: true,
      },
      {
        nome: 'Grampos',
        sku: 'GRP-01',
        quantidade_atual: 1000,
        quantidade_minima: 200,
        valor_unitario: 5.0,
        status_critico: false,
      },
    ]

    for (const item of itensSeed) {
      try {
        app.findFirstRecordByData('itens', 'sku', item.sku)
      } catch (_) {
        const record = new Record(itensCol)
        record.set('nome', item.nome)
        record.set('sku', item.sku)
        record.set('quantidade_atual', item.quantidade_atual)
        record.set('quantidade_minima', item.quantidade_minima)
        record.set('valor_unitario', item.valor_unitario)
        record.set('status_critico', item.status_critico)
        app.save(record)
      }
    }

    // 3. Seed Fornecedores
    const fornecedoresCol = app.findCollectionByNameOrId('fornecedores')
    const fornecedoresSeed = [
      { nome: 'Distribuidora Graf', email: 'contato@distgraf.com.br', telefone: '11999999999' },
      {
        nome: 'Papelaria Central',
        email: 'vendas@papelariacentral.com.br',
        telefone: '11888888888',
      },
    ]

    for (const f of fornecedoresSeed) {
      try {
        app.findFirstRecordByData('fornecedores', 'nome', f.nome)
      } catch (_) {
        const record = new Record(fornecedoresCol)
        record.set('nome', f.nome)
        record.set('email', f.email)
        record.set('telefone', f.telefone)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert Seed Data
    try {
      const f1 = app.findFirstRecordByData('fornecedores', 'nome', 'Distribuidora Graf')
      app.delete(f1)
    } catch (_) {}
    try {
      const f2 = app.findFirstRecordByData('fornecedores', 'nome', 'Papelaria Central')
      app.delete(f2)
    } catch (_) {}

    const skus = ['PAP-A4-01', 'TNT-PR-01', 'GRP-01']
    for (const sku of skus) {
      try {
        const item = app.findFirstRecordByData('itens', 'sku', sku)
        app.delete(item)
      } catch (_) {}
    }

    try {
      const user = app.findAuthRecordByEmail('users', 'projetos@oficinagraf.com.br')
      app.delete(user)
    } catch (_) {}
  },
)
