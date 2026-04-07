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
import useMainStore from '@/stores/main'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { Supplier } from '@/lib/types'

export default function Suppliers() {
  const store = useMainStore() as any
  const suppliers: Supplier[] = store.suppliers || []
  const user = store.user
  const addSupplier = store.addSupplier
  const updateSupplier = store.updateSupplier

  const [open, setOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

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
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell className="text-right">{supplier.leadTime}</TableCell>
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
            ))}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                  Nenhum fornecedor cadastrado.
                </TableCell>
              </TableRow>
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
              onSubmit={(data) => {
                if (updateSupplier) {
                  updateSupplier(editingSupplier.id, data)
                } else if (useMainStore.setState) {
                  useMainStore.setState((state: any) => ({
                    suppliers: state.suppliers.map((s: Supplier) =>
                      s.id === editingSupplier.id ? { ...s, ...data } : s,
                    ),
                  }))
                }
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
