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
    if (newRecord.get(field) != oldRecord.get(field)) {
      throw new BadRequestError(
        `O campo ${field} é imutável e não pode ser modificado após a criação.`,
      )
    }
  }

  e.next()
}, 'ordens_compra')
