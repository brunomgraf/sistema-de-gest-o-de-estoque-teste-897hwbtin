import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Search } from 'lucide-react'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppSidebar } from './AppSidebar'
import useMainStore from '@/stores/main'

export default function Layout() {
  const { user, logout } = useMainStore()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return <Navigate to="/login" replace />

  const pathnames = location.pathname.split('/').filter((x) => x)
  const breadcrumbNameMap: Record<string, string> = {
    'saida-estoque': 'Saida de Estoque ITENS',
    producao: 'Saida de Estoque FERRAMENTAS',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1" />
            <div className="hidden md:block w-px h-4 bg-border mx-2" />
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {pathnames.map((value, index) => {
                  const to = `/${pathnames.slice(0, index + 1).join('/')}`
                  const isLast = index === pathnames.length - 1
                  const title =
                    breadcrumbNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1)
                  return (
                    <div key={to} className="flex items-center gap-2">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={to}>{title}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative w-full max-w-sm hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar no sistema..."
                className="pl-8 bg-muted/50"
              />
            </div>
            <div className="flex flex-col items-end mr-2 hidden sm:flex">
              <span className="text-sm font-semibold leading-none">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 animate-fade-in-up bg-slate-50/50 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
