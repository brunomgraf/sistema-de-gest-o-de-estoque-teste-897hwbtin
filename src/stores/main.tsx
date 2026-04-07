import React, { createContext, useContext, useState, ReactNode } from 'react'
import {
  Item,
  Movement,
  PurchaseTicket,
  Quote,
  PurchaseOrder,
  POItem,
  Supplier,
  TicketStatus,
  User,
} from '@/lib/types'
import { MOCK_ITEMS, MOCK_MOVEMENTS, MOCK_SUPPLIERS, MOCK_USERS } from '@/lib/mock'
import { toast } from '@/hooks/use-toast'

interface MainStore {
  user: User | null
  items: Item[]
  suppliers: Supplier[]
  movements: Movement[]
  purchaseTickets: PurchaseTicket[]
  purchaseOrders: PurchaseOrder[]
  addItem: (item: Omit<Item, 'id'>) => void
  updateItem: (id: string, item: Partial<Item>) => void
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void
  recordMovement: (movement: Omit<Movement, 'id' | 'date'>) => void
  updatePurchaseTicketStatus: (id: string, status: TicketStatus) => void
  updatePurchaseTicketQuantity: (id: string, quantity: number) => void
  addQuoteToTicket: (ticketId: string, quote: Omit<Quote, 'id'>) => void
  setWinningQuote: (ticketId: string, quoteId: string) => void
  receivePurchaseOrder: (poId: string) => void
  updatePurchaseOrderDetails: (id: string, details: Partial<PurchaseOrder>) => void
}

const StoreContext = createContext<MainStore | undefined>(undefined)

export function MainStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS)
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)
  const [movements, setMovements] = useState<Movement[]>(MOCK_MOVEMENTS)

  const [purchaseTickets, setPurchaseTickets] = useState<PurchaseTicket[]>(() => {
    return MOCK_ITEMS.filter((item) => item.currentQuantity < item.minQuantity).map((item) => ({
      id: `tkt-${item.id}`,
      itemId: item.id,
      status: 'pendente',
      requestDate: new Date().toISOString(),
      quotes: [],
      quantity: Math.max(1, item.minQuantity - item.currentQuantity),
    }))
  })
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])

  const addItem = (item: Omit<Item, 'id'>) => {
    const newItem = { ...item, id: `i${Date.now()}` }
    setItems((prev) => [...prev, newItem])
    toast({ title: 'Sucesso', description: 'Item cadastrado com sucesso.' })
  }

  const updateItem = (id: string, updates: Partial<Item>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    toast({ title: 'Sucesso', description: 'Item atualizado.' })
  }

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: `s${Date.now()}` }
    setSuppliers((prev) => [...prev, newSupplier])
    toast({ title: 'Sucesso', description: 'Fornecedor cadastrado.' })
  }

  const recordMovement = (movement: Omit<Movement, 'id' | 'date'>) => {
    const item = items.find((i) => i.id === movement.itemId)
    const unitPrice = item?.costPrice || 0

    const newMovement: Movement = {
      ...movement,
      id: `m${Date.now()}`,
      date: new Date().toISOString(),
      unitPrice,
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === movement.itemId) {
          const change = movement.type === 'in' ? movement.quantity : -movement.quantity
          return { ...item, currentQuantity: item.currentQuantity + change }
        }
        return item
      }),
    )

    setMovements((prev) => [newMovement, ...prev])
    toast({ title: 'Sucesso', description: 'Movimentação registrada.' })
  }

  const updatePurchaseTicketStatus = (id: string, status: TicketStatus) => {
    setPurchaseTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  const updatePurchaseTicketQuantity = (id: string, quantity: number) => {
    setPurchaseTickets((prev) => prev.map((t) => (t.id === id ? { ...t, quantity } : t)))
  }

  const addQuoteToTicket = (ticketId: string, quote: Omit<Quote, 'id'>) => {
    const newQuote: Quote = { ...quote, id: `q${Date.now()}` }
    setPurchaseTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return { ...t, quotes: [...t.quotes, newQuote], status: 'em_cotacao' }
        }
        return t
      }),
    )
    toast({ title: 'Cotação adicionada', description: 'A cotação foi registrada com sucesso.' })
  }

  const setWinningQuote = (ticketId: string, quoteId: string) => {
    setPurchaseTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updatedQuotes = t.quotes.map((q) => ({
            ...q,
            isWinner: q.id === quoteId,
          }))
          return { ...t, quotes: updatedQuotes, status: 'concluido' }
        }
        return t
      }),
    )

    const ticket = purchaseTickets.find((t) => t.id === ticketId)
    const quote = ticket?.quotes.find((q) => q.id === quoteId)

    if (ticket && quote) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === ticket.itemId ? { ...item, costPrice: quote.price } : item,
        ),
      )

      setPurchaseOrders((prev) => {
        const existingPoIndex = prev.findIndex(
          (p) => p.supplierId === quote.supplierId && p.status === 'pendente',
        )
        const newItem: POItem = {
          itemId: ticket.itemId,
          quantity: ticket.quantity,
          price: quote.price,
          purchaseTicketId: ticket.id,
        }

        if (existingPoIndex >= 0) {
          const updated = [...prev]
          const po = updated[existingPoIndex]
          const newTotal = po.totalValue + newItem.price * newItem.quantity

          const newDate =
            new Date(quote.expectedDeliveryDate) > new Date(po.expectedDeliveryDate)
              ? quote.expectedDeliveryDate
              : po.expectedDeliveryDate

          updated[existingPoIndex] = {
            ...po,
            items: [...po.items, newItem],
            totalValue: newTotal,
            expectedDeliveryDate: newDate,
          }

          toast({
            title: 'Item consolidado',
            description: `Item adicionado à Ordem de Compra existente (${po.number}).`,
          })
          return updated
        } else {
          const year = new Date().getFullYear()
          const newPo: PurchaseOrder = {
            id: `po-${Date.now()}`,
            number: `OC-${year}-${String(prev.length + 1).padStart(3, '0')}`,
            supplierId: quote.supplierId,
            items: [newItem],
            totalValue: newItem.price * newItem.quantity,
            expectedDeliveryDate: quote.expectedDeliveryDate,
            status: 'pendente',
          }

          toast({
            title: 'Ordem de Compra gerada',
            description: `Nova Ordem de Compra (${newPo.number}) gerada com sucesso.`,
          })
          return [...prev, newPo]
        }
      })
    }
  }

  const updatePurchaseOrderDetails = (id: string, details: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? { ...po, ...details } : po)))
  }

  const receivePurchaseOrder = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'recebido' } : po)),
    )

    const po = purchaseOrders.find((p) => p.id === poId)
    if (po) {
      po.items.forEach((item) => {
        recordMovement({
          itemId: item.itemId,
          type: 'in',
          quantity: item.quantity > 0 ? item.quantity : 1,
          userId: user?.id || 'u1',
          observation: `Recebimento da Ordem de Compra ${po.number}`,
        })
      })
      toast({
        title: 'Recebimento Concluído',
        description: `Ordem de Compra ${po.number} recebida e estoque atualizado.`,
      })
    }
  }

  return (
    <StoreContext.Provider
      value={{
        user,
        items,
        suppliers,
        movements,
        addItem,
        updateItem,
        addSupplier,
        recordMovement,
        purchaseTickets,
        purchaseOrders,
        updatePurchaseTicketStatus,
        updatePurchaseTicketQuantity,
        addQuoteToTicket,
        setWinningQuote,
        receivePurchaseOrder,
        updatePurchaseOrderDetails,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export default function useMainStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useMainStore must be used within a MainStoreProvider')
  return context
}
