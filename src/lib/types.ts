export type Role = 'admin' | 'gerente' | 'operador'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  leadTime: number
}

export type SupplierPreference = 'primary' | 'secondary' | 'tertiary'

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
  requestedBy?: string
  productionOrder?: string
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
}
