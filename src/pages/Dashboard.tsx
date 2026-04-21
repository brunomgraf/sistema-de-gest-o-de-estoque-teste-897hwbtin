import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, Users, FileText, ArrowRight, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalItems: 0,
    criticalItems: 0,
    totalSuppliers: 0,
    pendingOrders: 0,
  })
  const [recentMovements, setRecentMovements] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [items, critical, suppliers, orders, movements] = await Promise.all([
        pb.collection('itens').getList(1, 1),
        pb.collection('itens').getList(1, 1, {
          filter: 'status_critico = true || quantidade_atual <= quantidade_minima',
        }),
        pb.collection('fornecedores').getList(1, 1),
        pb.collection('ordens_compra').getList(1, 1, { filter: 'status = "pendente"' }),
        pb.collection('movimentacoes').getList(1, 10, {
          sort: '-data_movimento',
          expand: 'item_id,usuario_id',
        }),
      ])

      setStats({
        totalItems: items.totalItems,
        criticalItems: critical.totalItems,
        totalSuppliers: suppliers.totalItems,
        pendingOrders: orders.totalItems,
      })
      setRecentMovements(movements.items)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('itens', () => {
    loadData()
  })
  useRealtime('movimentacoes', () => {
    loadData()
  })
  useRealtime('fornecedores', () => {
    loadData()
  })
  useRealtime('ordens_compra', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total de Itens"
          value={stats.totalItems}
          icon={Package}
          onClick={() => navigate('/estoque')}
        />
        <MetricCard
          title="Itens em Alerta"
          value={stats.criticalItems}
          icon={AlertTriangle}
          variant="destructive"
          onClick={() => navigate('/estoque?filter=critico')}
        />
        <MetricCard
          title="Fornecedores"
          value={stats.totalSuppliers}
          icon={Users}
          onClick={() => navigate('/fornecedores')}
        />
        <MetricCard
          title="Ordens Pendentes"
          value={stats.pendingOrders}
          icon={FileText}
          onClick={() => navigate('/ordens-de-compra')}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Movimentações Recentes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/relatorios')}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                recentMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{format(new Date(m.data_movimento), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">
                      {m.expand?.item_id?.nome || 'Item Desconhecido'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.tipo_movimento === 'entrada' ? 'default' : 'destructive'}
                        className={
                          m.tipo_movimento === 'entrada'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : ''
                        }
                      >
                        {m.tipo_movimento === 'entrada' ? (
                          <span className="flex items-center">
                            <ArrowRight className="w-3 h-3 mr-1" /> Entrada
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <ArrowLeft className="w-3 h-3 mr-1" /> Saída
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.quantidade}</TableCell>
                    <TableCell className="text-muted-foreground">{m.motivo || '-'}</TableCell>
                    <TableCell>{m.expand?.usuario_id?.name || 'Sistema'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, variant = 'default', onClick }: any) {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:ring-2 ring-primary/50 transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={`h-4 w-4 ${variant === 'destructive' ? 'text-red-500' : 'text-muted-foreground'}`}
        />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === 'destructive' ? 'text-red-600' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
