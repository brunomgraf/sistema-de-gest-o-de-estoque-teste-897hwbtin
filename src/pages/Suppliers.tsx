import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
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
import { useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { Skeleton } from '@/components/ui/skeleton'

export default function Suppliers() {
  const user = pb.authStore.record
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const loadData = async () => {
    try {
      const res = await pb.collection('fornecedores').getFullList({ sort: 'nome' })
      setSuppliers(
        res.map((s) => ({
          id: s.id,
          name: s.nome,
          email: s.email,
          phone: s.telefone,
          contact: s.endereco, // Using endereco as contact for now
          leadTime: 0,
        })),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('fornecedores', () => {
    loadData()
  })

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

  const canEdit = user?.role === 'admin' || user?.role === 'gerente'
  const canAdd = user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Razão Social / Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Lead Time (Dias)</TableHead>
              {canEdit && <TableHead className="w-[100px] text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="h-24">
                  <Skeleton className="h-12 w-full" />
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                  Nenhum fornecedor cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSupplier(supplier)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  )}
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
