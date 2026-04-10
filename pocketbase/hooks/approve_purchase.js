routerAdd(
  'POST',
  '/backend/v1/approve-purchase',
  (e) => {
    const body = e.requestInfo().body
    const solicitacao_id = body.solicitacao_id
    const quote_id = body.quote_id
    const aprovador_nome = body.aprovador_nome
    const data_aprovacao = body.data_aprovacao
    const hora_aprovacao = body.hora_aprovacao
    const observacoes = body.observacoes

    if (!solicitacao_id || !quote_id || !aprovador_nome) {
      throw new BadRequestError('Dados incompletos.')
    }

    let newOcId = ''
    let newOcNumber = ''

    $app.runInTransaction((txApp) => {
      // 1. Validate solicitacao
      const solicitacao = txApp.findRecordById('solicitacoes_compra', solicitacao_id)
      if (solicitacao.get('status') === 'finalizado') {
        throw new BadRequestError('Esta solicitação já foi finalizada.')
      }

      // 2. Set winning quote
      const quotes = txApp.findRecordsByFilter(
        'cotacoes',
        `solicitacao_id = '${solicitacao_id}'`,
        '-created',
        100,
        0,
      )
      let winningQuote = null

      for (const q of quotes) {
        if (q.id === quote_id) {
          q.set('is_winner', true)
          winningQuote = q
        } else {
          q.set('is_winner', false)
        }
        txApp.save(q)
      }

      if (!winningQuote) {
        throw new BadRequestError('Cotação vencedora não encontrada.')
      }

      // 3. Create aprovacao financeira
      const aprovCol = txApp.findCollectionByNameOrId('aprovacoes_financeiras')
      const aprov = new Record(aprovCol)
      aprov.set('solicitacao_id', solicitacao_id)
      aprov.set('aprovador_nome', aprovador_nome)
      aprov.set('data_aprovacao', data_aprovacao)
      aprov.set('hora_aprovacao', hora_aprovacao)
      aprov.set('observacoes', observacoes || '')
      txApp.save(aprov)

      // 4. Generate sequential OC Number
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
      newOcNumber = numeroOc

      // 5. Create Ordem de Compra
      const ocCol = txApp.findCollectionByNameOrId('ordens_compra')
      const newOc = new Record(ocCol)
      newOc.set('fornecedor_id', winningQuote.get('fornecedor_id'))

      const todayStr = new Date().toISOString().split('T')[0] + ' 12:00:00.000Z'
      newOc.set('data_pedido', todayStr)

      const prazoEntrega = winningQuote.get('prazo_entrega')
      if (prazoEntrega) {
        newOc.set('data_entrega_prevista', prazoEntrega + ' 12:00:00.000Z')
      }

      newOc.set('status', 'pendente')
      newOc.set(
        'valor_total',
        winningQuote.get('valor_ofertado') * solicitacao.get('quantidade_sugerida'),
      )
      newOc.set('numero_oc', numeroOc)
      newOc.set('tipo_entrega', winningQuote.get('frete'))
      newOc.set('condicoes_pagamento', winningQuote.get('condicao_pagamento'))

      try {
        const item = txApp.findRecordById('itens', solicitacao.get('item_id'))
        newOc.set('descricao_produtos', item.get('nome'))
      } catch (_) {}

      newOc.set('cotacao_id', winningQuote.id)
      txApp.save(newOc)
      newOcId = newOc.id

      // 6. Create Itens da Ordem de Compra
      const itemOcCol = txApp.findCollectionByNameOrId('itens_ordem_compra')
      const newItemOc = new Record(itemOcCol)
      newItemOc.set('ordem_compra_id', newOc.id)
      newItemOc.set('item_id', solicitacao.get('item_id'))
      newItemOc.set('quantidade', solicitacao.get('quantidade_sugerida'))
      newItemOc.set('valor_unitario', winningQuote.get('valor_ofertado'))
      txApp.save(newItemOc)

      // 7. Create Recebimento Ticket
      const recCol = txApp.findCollectionByNameOrId('recebimento')
      const newRec = new Record(recCol)
      newRec.set('ordem_compra_id', newOc.id)
      newRec.set('data_recebimento', todayStr)
      newRec.set('quantidade_recebida', 0)
      newRec.set('status_verificacao', 'aguardando_entrega')
      txApp.save(newRec)

      // 8. Update Solicitacao to finalizado
      solicitacao.set('status', 'finalizado')
      txApp.save(solicitacao)
    })

    return e.json(200, { success: true, oc_id: newOcId, numero_oc: newOcNumber })
  },
  $apis.requireAuth(),
)
