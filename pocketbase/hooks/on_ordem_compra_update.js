onRecordUpdateRequest((e) => {
  const newRecord = e.record
  const oldRecord = $app.findRecordById('ordens_compra', newRecord.id)

  const readOnlyFields = [
    'numero_oc',
    'fornecedor_id',
    'valor_total',
    'data_pedido',
    'cotacao_id',
    'tipo_entrega',
    'condicoes_pagamento',
    'descricao_produtos',
  ]

  for (const field of readOnlyFields) {
    const newVal = newRecord.get(field)
    const oldVal = oldRecord.get(field)

    // Uses strict string comparison to avoid false positives (e.g., matching Date objects or integers to strings)
    // This allows updates to pass without false immutability constraint violations
    if (String(newVal) !== String(oldVal)) {
      throw new BadRequestError(
        `O campo ${field} é imutável e não pode ser modificado após a criação.`,
      )
    }
  }

  const oldStatus = oldRecord.get('status')
  const newStatus = newRecord.get('status')

  if (oldStatus === newStatus) {
    return e.next()
  }

  if (oldStatus !== 'pendente') {
    throw new BadRequestError(
      'Não é possível alterar o status de uma ordem de compra que já foi finalizada ou cancelada.',
    )
  }

  if (newStatus === 'entregue') {
    const user = e.auth
    if (!user) throw new UnauthorizedError('Usuário não autenticado.')

    $app.runInTransaction((txApp) => {
      txApp.save(newRecord)

      const itemsOC = txApp.findRecordsByFilter(
        'itens_ordem_compra',
        `ordem_compra_id = "${newRecord.id}"`,
        '',
        1000,
        0,
      )

      let totalQuantity = 0
      for (const ioc of itemsOC) {
        const qtd = ioc.get('quantidade')
        totalQuantity += qtd
        const itemId = ioc.get('item_id')

        const item = txApp.findRecordById('itens', itemId)
        const currentQtd = item.get('quantidade_atual') || 0
        item.set('quantidade_atual', currentQtd + qtd)
        txApp.save(item)

        const movCollection = txApp.findCollectionByNameOrId('movimentacoes')
        const mov = new Record(movCollection)
        mov.set('item_id', itemId)
        mov.set('tipo_movimento', 'entrada')
        mov.set('quantidade', qtd)
        mov.set('data_movimento', new Date().toISOString())
        mov.set(
          'motivo',
          `Recebimento da Ordem de Compra ${newRecord.get('numero_oc') || newRecord.id}`,
        )
        mov.set('usuario_id', user.id)
        txApp.save(mov)
      }

      try {
        const recebimento = txApp.findFirstRecordByFilter(
          'recebimento',
          `ordem_compra_id = "${newRecord.id}"`,
        )
        recebimento.set('data_recebimento', new Date().toISOString())
        recebimento.set('quantidade_recebida', totalQuantity)
        recebimento.set('status_verificacao', 'recebido')
        txApp.save(recebimento)
      } catch (_) {
        const recCollection = txApp.findCollectionByNameOrId('recebimento')
        const recebimento = new Record(recCollection)
        recebimento.set('ordem_compra_id', newRecord.id)
        recebimento.set('data_recebimento', new Date().toISOString())
        recebimento.set('quantidade_recebida', totalQuantity)
        recebimento.set('status_verificacao', 'recebido')
        txApp.save(recebimento)
      }
    })

    return e.json(200, newRecord)
  } else if (newStatus === 'cancelado') {
    $app.runInTransaction((txApp) => {
      txApp.save(newRecord)
    })
    return e.json(200, newRecord)
  }

  e.next()
}, 'ordens_compra')
