import pb from '@/lib/pocketbase/client'
import { Movement } from '@/lib/types'

export const fetchProductionMovements = async (filters?: {
  colaborador_id?: string
  ordem_producao?: string
  startDate?: string
  endDate?: string
}): Promise<Movement[]> => {
  let filterStr = "(tipo_movimento = 'producao_saida' || tipo_movimento = 'producao_retorno')"

  if (filters?.colaborador_id && filters.colaborador_id !== 'all') {
    filterStr += ` && colaborador_id = '${filters.colaborador_id}'`
  }

  if (filters?.ordem_producao) {
    filterStr += ` && ordem_producao ~ '${filters.ordem_producao}'`
  }

  if (filters?.startDate) {
    filterStr += ` && data_movimento >= '${filters.startDate} 00:00:00.000Z'`
  }

  if (filters?.endDate) {
    filterStr += ` && data_movimento <= '${filters.endDate} 23:59:59.999Z'`
  }

  return pb.collection('movimentacoes').getFullList<Movement>({
    filter: filterStr,
    expand: 'item_id,colaborador_id,usuario_id',
    sort: 'created',
  })
}

export const createProducaoSaida = async (data: {
  item_id: string
  colaborador_id: string
  quantidade: number
  motivo?: string
  usuario_id: string
  ordem_producao?: string
}) => {
  return pb.collection('movimentacoes').create({
    ...data,
    tipo_movimento: 'producao_saida',
    data_movimento: new Date().toISOString(),
  })
}

export const createProducaoRetorno = async (data: {
  item_id: string
  colaborador_id: string
  quantidade: number
  motivo?: string
  usuario_id: string
}) => {
  return pb.collection('movimentacoes').create({
    ...data,
    tipo_movimento: 'producao_retorno',
    data_movimento: new Date().toISOString(),
  })
}

export const getActiveProductionItems = (movements: Movement[]) => {
  const activeMap = new Map<string, Movement & { currentQuantity: number }>()

  for (const mov of movements) {
    if (!mov.item_id || !mov.colaborador_id) continue

    const key = `${mov.item_id}-${mov.colaborador_id}`
    if (mov.tipo_movimento === 'producao_saida') {
      if (activeMap.has(key)) {
        const existing = activeMap.get(key)!
        existing.currentQuantity += mov.quantidade || 0
      } else {
        activeMap.set(key, { ...mov, currentQuantity: mov.quantidade || 0 })
      }
    } else if (mov.tipo_movimento === 'producao_retorno') {
      if (activeMap.has(key)) {
        const existing = activeMap.get(key)!
        existing.currentQuantity -= mov.quantidade || 0
        if (existing.currentQuantity <= 0) {
          activeMap.delete(key)
        }
      }
    }
  }

  return Array.from(activeMap.values()).sort((a, b) => {
    return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime()
  })
}
