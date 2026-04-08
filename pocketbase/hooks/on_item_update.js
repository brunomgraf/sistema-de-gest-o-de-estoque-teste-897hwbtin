onRecordAfterUpdateSuccess((e) => {
  const item = e.record
  const qtyAtual = item.get('quantidade_atual')
  const qtyMin = item.get('quantidade_minima')

  if (qtyAtual <= qtyMin) {
    let hasActive = false
    try {
      const activeRecords = $app.findRecordsByFilter(
        'solicitacoes_compra',
        "item_id = {:itemId} && (status = 'pendente' || status = 'em_cotacao')",
        '-created',
        1,
        0,
        { itemId: item.id },
      )
      if (activeRecords.length > 0) {
        hasActive = true
      }
    } catch (_) {}

    if (!hasActive) {
      const suggested = qtyMin - qtyAtual > 0 ? qtyMin - qtyAtual : 1
      const col = $app.findCollectionByNameOrId('solicitacoes_compra')
      const ticket = new Record(col)
      ticket.set('item_id', item.id)
      ticket.set('quantidade_sugerida', suggested)
      ticket.set('status', 'pendente')
      $app.save(ticket)
    }
  }
  e.next()
}, 'itens')
