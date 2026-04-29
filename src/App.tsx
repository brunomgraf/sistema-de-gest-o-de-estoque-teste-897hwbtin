import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useEffect } from 'react'
import { MainStoreProvider } from '@/stores/main'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import ItemDetails from './pages/ItemDetails'
import Suppliers from './pages/Suppliers'
import SupplierProfile from './pages/SupplierProfile'
import Reports from './pages/Reports'
import Discrepancies from './pages/reports/Discrepancies'
import InventoryReport from './pages/reports/InventoryReport'
import Purchases from './pages/Purchases'
import PurchaseOrders from './pages/PurchaseOrders'
import Receiving from './pages/Receiving'
import ProductionItemsPage from './pages/Production'
import StockOutPage from './pages/StockOutPage'
import NotFound from './pages/NotFound'
import UsersPage from './pages/Users'
import CollaboratorsPage from './pages/Collaborators'

const AppContent = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estoque" element={<Inventory />} />
          <Route path="/estoque/:id" element={<ItemDetails />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/ordens-de-compra" element={<PurchaseOrders />} />
          <Route path="/recebimento" element={<Receiving />} />
          <Route path="/producao" element={<ProductionItemsPage />} />
          <Route path="/saida-estoque" element={<StockOutPage />} />
          <Route path="/fornecedores" element={<Suppliers />} />
          <Route path="/fornecedores/:id" element={<SupplierProfile />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/relatorios/divergencias" element={<Discrepancies />} />
          <Route path="/relatorios/inventario" element={<InventoryReport />} />
          <Route path="/configuracoes/usuarios" element={<UsersPage />} />
          <Route path="/collaborators" element={<CollaboratorsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <MainStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <AppContent />
        </TooltipProvider>
      </MainStoreProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
