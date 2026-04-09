onRecordCreate((e) => {
  const aprovacao = e.record
  const solicitacaoId = aprovacao.get('solicitacao_id')

  $app.runInTransaction((txApp) => {
    // 1. Fetch winning quote
    const quotes = txApp.findRecordsByFilter(
      'cotacoes',
      `solicitacao_id = '${solicitacaoId}' && is_winner = true`,
      '',
      1,
      0,
    )
    if (!quotes || quotes.length === 0) {
      throw new BadRequestError('Nenhuma cotação vencedora encontrada para esta solicitação.')
    }
    const quote = quotes[0]

    // 2. Fetch solicitacao
    const solicitacao = txApp.findRecordById('solicitacoes_compra', solicitacaoId)
    if (solicitacao.get('status') === 'finalizado') {
      throw new BadRequestError('Esta solicitação já foi finalizada.')
    }

    // 3. Generate OC Number (e.g., OC-YYYY-XXXX)
    const currentYear = new Date().getFullYear().toString()
    const lastOcs = txApp.findRecordsByFilter(
      'ordens_compra',
      `numero_oc LIKE 'OC-${currentYear}-%'`,
      '-numero_oc',
      1,
      0,
    )

    let seq = 1
    if (lastOcs && lastOcs.length > 0) {
      const lastNum = lastOcs[0].get('numero_oc')
      const parts = lastNum.split('-')
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10)
        if (!isNaN(parsed)) {
          seq = parsed + 1
        }
      }
    }
    const numeroOc = `OC-${currentYear}-${seq.toString().padStart(4, '0')}`

    // 4. Create ordens_compra
    const ocCol = txApp.findCollectionByNameOrId('ordens_compra')
    const newOc = new Record(ocCol)
    newOc.set('fornecedor_id', quote.get('fornecedor_id'))
    newOc.set('data_pedido', new Date().toISOString().split('T')[0] + ' 12:00:00.000Z')

    const prazoEntrega = quote.get('prazo_entrega')
    if (prazoEntrega) {
      newOc.set('data_entrega_prevista', prazoEntrega + ' 12:00:00.000Z')
    }

    newOc.set('status', 'pendente')
    newOc.set('valor_total', quote.get('valor_ofertado') * solicitacao.get('quantidade_sugerida'))
    newOc.set('numero_oc', numeroOc)
    newOc.set('tipo_entrega', quote.get('frete'))
    newOc.set('condicoes_pagamento', quote.get('condicao_pagamento'))

    try {
      const item = txApp.findRecordById('itens', solicitacao.get('item_id'))
      newOc.set('descricao_produtos', item.get('nome'))
    } catch (_) {}

    newOc.set('cotacao_id', quote.id)

    txApp.save(newOc)

    // 5. Create itens_ordem_compra
    const itemOcCol = txApp.findCollectionByNameOrId('itens_ordem_compra')
    const newItemOc = new Record(itemOcCol)
    newItemOc.set('ordem_compra_id', newOc.id)
    newItemOc.set('item_id', solicitacao.get('item_id'))
    newItemOc.set('quantidade', solicitacao.get('quantidade_sugerida'))
    newItemOc.set('valor_unitario', quote.get('valor_ofertado'))
    txApp.save(newItemOc)

    // 6. Update solicitacoes_compra status
    solicitacao.set('status', 'finalizado')
    txApp.save(solicitacao)
  })

  e.next()
}, 'aprovacoes_financeiras')
