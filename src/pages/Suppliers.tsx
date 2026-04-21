import { useState, useEffect } from 'react'
import { Plus, Pencil, Search, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function PerformanceBadge({ stats }: { stats?: { total: number; onTime: number; late: number } }) {
  if (!stats || stats.total === 0)
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sem dados
      </Badge>
    )

  const percent = (stats.onTime / stats.total) * 100

  if (percent > 90) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        Excelente ({percent.toFixed(0)}%)
      </Badge>
    )
  } else if (percent >= 70) {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        Regular ({percent.toFixed(0)}%)
      </Badge>
    )
  } else {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
        Ruim ({percent.toFixed(0)}%)
      </Badge>
    )
  }
}

export default function Suppliers() {
  const user = pb.authStore.record
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [open, setOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const loadData = async () => {
    try {
      const [res, resOrders, resReceipts] = await Promise.all([
        pb.collection('fornecedores').getFullList({ sort: 'nome' }),
        pb
          .collection('ordens_compra')
          .getFullList({ filter: "status = 'entregue' || status = 'recebido'" }),
        pb.collection('recebimento').getFullList(),
      ])

      const stats: Record<string, { total: number; onTime: number; late: number }> = {}

      resOrders.forEach((order) => {
        const supplierId = order.fornecedor_id
        if (!stats[supplierId]) stats[supplierId] = { total: 0, onTime: 0, late: 0 }

        const expectedDateStr = order.data_entrega_prevista
        if (!expectedDateStr) return

        stats[supplierId].total++

        const expectedDate = new Date(expectedDateStr)
        const receipt = resReceipts.find((r) => r.ordem_compra_id === order.id)

        let actualDate = null
        if (receipt) {
          actualDate = new Date(receipt.data_recebimento || receipt.created)
        } else {
          actualDate = new Date(order.updated)
        }

        expectedDate.setHours(0, 0, 0, 0)
        actualDate.setHours(0, 0, 0, 0)

        if (actualDate <= expectedDate) {
          stats[supplierId].onTime++
        } else {
          stats[supplierId].late++
        }
      })

      setSuppliers(
        res.map((s) => ({
          id: s.id,
          name: s.nome,
          email: s.email || '',
          phone: s.telefone || '',
          contact: s.endereco || '',
          leadTime: 0,
          stats: stats[s.id] || { total: 0, onTime: 0, late: 0 },
        })),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'gestor') {
      loadData()
    }
  }, [user])

  useRealtime('fornecedores', () => {
    if (user?.role === 'admin' || user?.role === 'gestor') loadData()
  })

  if (user?.role !== 'admin' && user?.role !== 'gestor') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Acesso restrito à gestão ou administração.
      </div>
    )
  }

  const addSupplier = async (data: any) => {
    await pb.collection('fornecedores').create({
      nome: data.name,
      email: data.email,
      telefone: data.phone,
      endereco: data.contact,
    })
  }

  const updateSupplier = async (id: string, data: any) => {
    await pb.collection('fornecedores').update(id, {
      nome: data.name,
      email: data.email,
      telefone: data.phone,
      endereco: data.contact,
    })
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const canEdit = user?.role === 'admin' || user?.role === 'gestor'
  const canAdd = user?.role === 'admin' || user?.role === 'gestor'
  const canDelete = user?.role === 'admin'

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Fornecedores (CRM)</h2>
        {canAdd && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Fornecedor</DialogTitle>
              </DialogHeader>
              <SupplierForm
                onSubmit={(data) => {
                  addSupplier(data)
                  setOpen(false)
                }}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="flex flex-col">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Razão Social / Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Desempenho</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-full max-w-md" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="group">
                  <TableCell className="font-medium">
                    <Link
                      to={`/fornecedores/${supplier.id}`}
                      className="hover:underline text-primary"
                    >
                      {supplier.name}
                    </Link>
                    <div className="text-xs text-muted-foreground font-normal">
                      {supplier.email}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.contact}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>
                    <PerformanceBadge stats={supplier.stats} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSupplier(supplier)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
                              try {
                                await pb.collection('fornecedores').delete(supplier.id)
                                toast.success('Fornecedor excluído com sucesso')
                              } catch (e) {
                                toast.error('Erro ao excluir fornecedor')
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/fornecedores/${supplier.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editingSupplier} onOpenChange={(val) => !val && setEditingSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              defaultValues={editingSupplier}
              onSubmit={async (data) => {
                await updateSupplier(editingSupplier.id, data)
                setEditingSupplier(null)
              }}
              onCancel={() => setEditingSupplier(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
