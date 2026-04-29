export type Role = 'admin' | 'gerente' | 'operador'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Collaborator {
  id: string
  nome_completo: string
  cargo: string
  setor: string
  user_id?: string
  created: string
  updated: string
}

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  leadTime: number
}

export interface FornecedorContato {
  id: string
  fornecedor_id: string
  usuario_id: string
  data_contato: string
  tipo: 'email' | 'telefone' | 'reuniao' | 'outros'
  descricao: string
  created: string
  updated: string
  expand?: {
    usuario_id?: User
  }
}

export type SupplierPreference = 'primary' | 'secondary' | 'tertiary'

export interface ItemFornecedor {
  id: string
  item_id: string
  fornecedor_id: string
  observacao?: string
  created: string
  updated: string
}

export interface ItemSupplier {
  supplierId: string
  preference: SupplierPreference
}

export interface Item {
  id: string
  code: string
  name: string
  currentQuantity: number
  minQuantity: number
  suppliers: ItemSupplier[]
  costPrice: number
  pdfUrl?: string
  shelfLocation?: string
  posicao_estoque?: string
  foto?: string
  collectionId?: string
  collectionName?: string
}

export type MovementType = 'in' | 'out' | 'adjust'

export interface Movement {
  id: string
  itemId: string
  type: MovementType
  quantity: number
  date: string
  observation?: string
  userId: string
  solicitante?: string
  ordem_servico?: string
  unitPrice?: number
}

export type TicketStatus = 'pendente' | 'em_cotacao' | 'concluido'

export interface Quote {
  id: string
  supplierId: string
  price: number
  expectedDeliveryDate: string
  isWinner?: boolean
  paymentMethod?: string
  shippingMethod?: string
}

export interface PurchaseTicket {
  id: string
  itemId: string
  status: TicketStatus
  requestDate: string
  quotes: Quote[]
  quantity: number
}

export interface POItem {
  itemId: string
  quantity: number
  price: number
  purchaseTicketId: string
}

export interface AprovacaoFinanceira {
  id: string
  solicitacao_id: string
  aprovador_nome: string
  data_aprovacao: string
  hora_aprovacao: string
  observacoes?: string
  created: string
  updated: string
}

export interface PurchaseOrder {
  id: string
  number: string
  supplierId: string
  items: POItem[]
  totalValue: number
  expectedDeliveryDate: string
  status: 'pendente' | 'recebido'
  paymentMethod?: string
  freightType?: string
  numero_oc?: string
  tipo_entrega?: string
  descricao_produtos?: string
  condicoes_pagamento?: string
  cotacao_id?: string
}
