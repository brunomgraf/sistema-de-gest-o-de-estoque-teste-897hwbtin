import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  ShoppingBag,
  ArrowDownToLine,
  FileCheck,
  LogOut,
  PackageMinus,
  AlertTriangle,
  Users as UsersIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const MENU_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'Saída de Estoque', url: '/saida-estoque', icon: PackageMinus },
  { title: 'Compras', url: '/compras', icon: ShoppingBag },
  { title: 'Ordens de Compra', url: '/ordens-de-compra', icon: FileCheck },
  { title: 'Recebimento', url: '/recebimento', icon: ArrowDownToLine },
  { title: 'Produção', url: '/producao', icon: Package },
  { title: 'Fornecedores (CRM)', url: '/fornecedores', icon: Truck, roles: ['admin', 'gestor'] },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Divergências', url: '/relatorios/divergencias', icon: AlertTriangle },
  {
    title: 'Inventário',
    url: '/relatorios/inventario',
    icon: FileCheck,
    roles: ['admin', 'gestor'],
  },
  {
    title: 'Colaboradores',
    url: '/collaborators',
    icon: UsersIcon,
  },
  {
    title: 'Configurações / Usuários',
    url: '/configuracoes/usuarios',
    icon: UsersIcon,
    roles: ['admin'],
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-6 py-2">
        <span className="text-xl font-bold tracking-tight text-primary">Oficina Graf</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-4 gap-2 px-2">
              {MENU_ITEMS.filter(
                (item) => !item.roles || item.roles.includes(user?.role || ''),
              ).map((item) => {
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
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary uppercase">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair do sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
