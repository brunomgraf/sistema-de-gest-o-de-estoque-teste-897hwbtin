import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatCurrency } from '@/lib/format'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import { ItemForm } from '@/components/forms/ItemForm'

export default function Inventory() {
  const { items, suppliers, user, addItem } = useMainStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') || 'todos'
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'critico') return item.currentQuantity < item.minQuantity
    if (filter === 'atencao')
      return (
        item.currentQuantity >= item.minQuantity && item.currentQuantity <= item.minQuantity * 1.2
      )
    if (filter === 'ok') return item.currentQuantity > item.minQuantity * 1.2

    return true
  })

  const canAdd = user?.role === 'admin' || user?.role === 'gerente'

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Estoque</h2>
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 items-start sm:items-center">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              if (v === 'todos') {
                searchParams.delete('filter')
                setSearchParams(searchParams)
              } else {
                setSearchParams({ filter: v })
              }
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="ok">OK</TabsTrigger>
              <TabsTrigger value="atencao">Atenção</TabsTrigger>
              <TabsTrigger value="critico">Crítico</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white"
            />
          </div>
          {canAdd && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" /> Novo Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Item</DialogTitle>
                </DialogHeader>
                <ItemForm
                  onSubmit={(data) => {
                    addItem(data)
                    setOpen(false)
                  }}
                  onCancel={() => setOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-right">Qtd. Atual</TableHead>
              <TableHead className="text-right">Qtd. Mínima</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Valor Custo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const supplier = suppliers.find((s) => s.id === item.supplierId)
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/estoque/${item.id}`)}
                >
                  <TableCell>
                    <ItemStatusBadge item={item} />
                  </TableCell>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.shelfLocation || '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{item.currentQuantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.minQuantity}
                  </TableCell>
                  <TableCell>{supplier?.name || 'Desconhecido'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                </TableRow>
              )
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
