routerAdd(
  'POST',
  '/backend/v1/approve-purchase',
  (e) => {
    const body = e.requestInfo().body
    const solicId = body.solicitacao_id
    const quoteId = body.quote_id
    const aprovNome = body.aprovador_nome
    const dataAprov = body.data_aprovacao
    const horaAprov = body.hora_aprovacao
    const obs = body.observacoes || ''

    if (!solicId || !quoteId || !aprovNome || !dataAprov || !horaAprov) {
      throw new BadRequestError('Dados obrigatórios faltando.')
    }

    let responseData = {}

    $app.runInTransaction((txApp) => {
      try {
        const solic = txApp.findRecordById('solicitacoes_compra', solicId)
        if (solic.get('status') === 'finalizado') {
          throw new Error('Solicitação já finalizada.')
        }

        const quote = txApp.findRecordById('cotacoes', quoteId)
        if (quote.get('solicitacao_id') !== solicId) {
          throw new Error('Cotação não pertence a esta solicitação.')
        }

        quote.set('is_winner', true)
        txApp.save(quote)

        const otherQuotes = txApp.findRecordsByFilter(
          'cotacoes',
          `solicitacao_id = {:id} && id != {:qid}`,
          '',
          100,
          0,
          { id: solicId, qid: quoteId },
        )
        for (let q of otherQuotes) {
          q.set('is_winner', false)
          txApp.save(q)
        }

        solic.set('status', 'finalizado')
        txApp.save(solic)

        const aprovCol = txApp.findCollectionByNameOrId('aprovacoes_financeiras')
        const aprov = new Record(aprovCol)
        aprov.set('solicitacao_id', solicId)
        aprov.set('aprovador_nome', aprovNome)
        aprov.set('data_aprovacao', dataAprov)
        aprov.set('hora_aprovacao', horaAprov)
        aprov.set('observacoes', obs)
        txApp.save(aprov)

        const ocCol = txApp.findCollectionByNameOrId('ordens_compra')
        const oc = new Record(ocCol)

        const year = new Date().getFullYear()
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        const numeroOc = `OC-${year}-${randomNum}-${quoteId.substring(0, 4).toUpperCase()}`

        oc.set('numero_oc', numeroOc)
        oc.set('fornecedor_id', quote.get('fornecedor_id'))
        oc.set('data_pedido', new Date().toISOString())

        const prazo = quote.get('prazo_entrega')
        if (prazo && !prazo.includes('T')) {
          oc.set('data_entrega_prevista', prazo + ' 12:00:00.000Z')
        } else {
          oc.set('data_entrega_prevista', prazo)
        }

        oc.set('status', 'pendente')
        oc.set('valor_total', quote.get('valor_ofertado') * solic.get('quantidade_sugerida'))
        oc.set('tipo_entrega', quote.get('frete'))
        oc.set('condicoes_pagamento', quote.get('condicao_pagamento'))
        oc.set('cotacao_id', quoteId)
        txApp.save(oc)

        const itemOcCol = txApp.findCollectionByNameOrId('itens_ordem_compra')
        const itemOc = new Record(itemOcCol)
        itemOc.set('ordem_compra_id', oc.get('id'))
        itemOc.set('item_id', solic.get('item_id'))
        itemOc.set('quantidade', solic.get('quantidade_sugerida'))
        itemOc.set('valor_unitario', quote.get('valor_ofertado'))
        txApp.save(itemOc)

        const recCol = txApp.findCollectionByNameOrId('recebimento')
        const rec = new Record(recCol)
        rec.set('ordem_compra_id', oc.get('id'))
        rec.set('quantidade_recebida', 0)
        rec.set('status_verificacao', 'Pendente')
        txApp.save(rec)

        responseData = {
          success: true,
          numero_oc: oc.get('numero_oc'),
          oc_id: oc.get('id'),
        }
      } catch (error) {
        throw new BadRequestError(`Falha na aprovação: ${error.message}`)
      }
    })

    return e.json(200, responseData)
  },
  $apis.requireAuth(),
)
