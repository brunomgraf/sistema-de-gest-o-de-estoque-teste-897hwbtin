import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useEffect } from 'react'
import { MainStoreProvider } from '@/stores/main'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import ItemDetails from './pages/ItemDetails'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'
import Purchases from './pages/Purchases'
import PurchaseOrders from './pages/PurchaseOrders'
import Receiving from './pages/Receiving'
import NotFound from './pages/NotFound'

const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estoque" element={<Inventory />} />
        <Route path="/estoque/:id" element={<ItemDetails />} />
        <Route path="/compras" element={<Purchases />} />
        <Route path="/ordens-de-compra" element={<PurchaseOrders />} />
        <Route path="/recebimento" element={<Receiving />} />
        <Route path="/fornecedores" element={<Suppliers />} />
        <Route path="/relatorios" element={<Reports />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <MainStoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <AppContent />
      </TooltipProvider>
    </MainStoreProvider>
  </BrowserRouter>
)

export default App
