import { create } from 'zustand'
import pb from '@/lib/pocketbase/client'
import { ReactNode, useEffect } from 'react'

interface MainStore {
  user: any
  setUser: (user: any) => void

  // Dummy arrays to prevent crashes on unmigrated / mocked components like Purchases
  purchaseOrders: any[]
  purchaseTickets: any[]
  suppliers: any[]
  items: any[]
  movements: any[]

  // Dummy actions to fulfill components expecting the mocked implementation
  updatePurchaseOrderDetails: (id: string, details: any) => void
  receivePurchaseOrder: (id: string) => void
  addQuoteToTicket: (id: string, data: any) => void
  setWinningQuote: (ticketId: string, quoteId: string) => void
  updatePurchaseTicketQuantity: (ticketId: string, qty: number) => void
}

const useMainStore = create<MainStore>((set) => ({
  user: pb.authStore.record,
  setUser: (user) => set({ user }),

  purchaseOrders: [],
  purchaseTickets: [],
  suppliers: [],
  items: [],
  movements: [],

  updatePurchaseOrderDetails: () => {},
  receivePurchaseOrder: () => {},
  addQuoteToTicket: () => {},
  setWinningQuote: () => {},
  updatePurchaseTicketQuantity: () => {},
}))

export const MainStoreProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    return pb.authStore.onChange((token, record) => {
      useMainStore.setState({ user: record })
    })
  }, [])

  return children
}

export default useMainStore
