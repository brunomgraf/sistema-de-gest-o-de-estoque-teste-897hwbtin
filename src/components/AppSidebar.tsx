import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  ShoppingBag,
  ArrowDownToLine,
  FileCheck,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import useMainStore from '@/stores/main'

const MENU_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'Compras', url: '/compras', icon: ShoppingBag },
  { title: 'Ordens de Compra', url: '/ordens-de-compra', icon: FileCheck },
  { title: 'Recebimento', url: '/recebimento', icon: ArrowDownToLine },
  { title: 'Fornecedores', url: '/fornecedores', icon: Truck },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useMainStore()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center border-b px-6">
        <h1 className="text-xl font-bold tracking-tight text-primary">Gestão Estoque</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-4 gap-2 px-2">
              {MENU_ITEMS.map((item) => {
                const isActive =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="h-10">
                      <Link to={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span className="text-base font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
