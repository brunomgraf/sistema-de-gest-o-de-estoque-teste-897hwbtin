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
  ArrowRightLeft,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const OPERATIONAL_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Saída de Estoque ITENS', url: '/saida-estoque', icon: PackageMinus },
  { title: 'Saída de Estoque FERRAMENTAS', url: '/producao', icon: Package },
  { title: 'Itens / Estoque', url: '/estoque', icon: Package },
  { title: 'Movimentações', url: '/movimentacoes', icon: ArrowRightLeft },
  { title: 'Solicitações de Compra', url: '/compras', icon: ShoppingBag },
  { title: 'Ordens de Compra', url: '/ordens-de-compra', icon: FileCheck },
  { title: 'Recebimento', url: '/recebimento', icon: ArrowDownToLine },
  { title: 'Fornecedores', url: '/fornecedores', icon: Truck, roles: ['admin', 'gestor'] },
  { title: 'Colaboradores', url: '/collaborators', icon: UsersIcon },
]

const ADMIN_ITEMS = [
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Divergências', url: '/relatorios/divergencias', icon: AlertTriangle },
  {
    title: 'Inventário',
    url: '/relatorios/inventario',
    icon: FileCheck,
    roles: ['admin', 'gestor'],
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
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operacional
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 gap-2 px-2">
              {OPERATIONAL_ITEMS.filter(
                (item) => !item.roles || item.roles.includes(user?.role || ''),
              ).map((item) => {
                const isActive =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="h-11">
                      <Link to={item.url} aria-label={item.title}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-base font-medium truncate" title={item.title}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 gap-2 px-2">
              {ADMIN_ITEMS.filter(
                (item) => !item.roles || item.roles.includes(user?.role || ''),
              ).map((item) => {
                const isActive =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="h-11">
                      <Link to={item.url} aria-label={item.title}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-base font-medium truncate" title={item.title}>
                          {item.title}
                        </span>
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
