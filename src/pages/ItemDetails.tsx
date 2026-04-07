import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowDownToLine, ExternalLink, PackageOpen, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatDate } from '@/lib/format'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import { StockOutForm } from '@/components/forms/StockOutForm'
import { ItemForm } from '@/components/forms/ItemForm'
import { Skeleton } from '@/components/ui/skeleton'

const PREFERENCE_LABELS = {
  primary: 'Preferencial',
  secondary: 'Secundário',
  tertiary: 'Terciário',
} as const

const PREFERENCE_COLORS = {
  primary: 'bg-green-100 text-green-700 hover:bg-green-200',
  secondary: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  tertiary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
} as const

export default function ItemDetails() {
  const { id } = useParams()
  const [item, setItem] = useState<any>(null)
  const [itemMovements, setItemMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const user = pb.authStore.record
  const [stockOutOpen, setStockOutOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const itemRes = await pb.collection('itens').getOne(id)
      setItem({
        id: itemRes.id,
        code: itemRes.sku,
        name: itemRes.nome,
        currentQuantity: itemRes.quantidade_atual,
        minQuantity: itemRes.quantidade_minima,
        costPrice: itemRes.valor_unitario,
        suppliers: [],
      })

      const movs = await pb.collection('movimentacoes').getList(1, 10, {
        filter: `item_id = "${id}"`,
        sort: '-data_movimento',
        expand: 'usuario_id',
      })
      setItemMovements(movs.items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('itens', () => {
    loadData()
  })
  useRealtime('movimentacoes', () => {
    loadData()
  })

  const updateItem = async (itemId: string, data: any) => {
    await pb.collection('itens').update(itemId, {
      nome: data.name,
      sku: data.code,
      quantidade_atual: data.currentQuantity,
      quantidade_minima: data.minQuantity,
      valor_unitario: data.costPrice,
      status_critico: data.currentQuantity <= data.minQuantity,
    })
  }

  const recordMovement = async (data: any) => {
    await pb.collection('movimentacoes').create({
      item_id: data.itemId,
      tipo_movimento: data.type === 'in' ? 'entrada' : 'saida',
      quantidade: data.quantity,
      motivo: data.observation,
      usuario_id: data.userId,
      data_movimento: new Date().toISOString(),
    })

    const currentItem = await pb.collection('itens').getOne(data.itemId)
    const newQtd =
      data.type === 'in'
        ? currentItem.quantidade_atual + data.quantity
        : currentItem.quantidade_atual - data.quantity

    await pb.collection('itens').update(data.itemId, {
      quantidade_atual: newQtd,
      status_critico: newQtd <= currentItem.quantidade_minima,
    })
  }

  const canEdit = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'gerente'

  if (loading)
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!item)
    return <div className="p-8 text-center text-xl text-muted-foreground">Item não encontrado.</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/estoque">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">{item.name}</h2>
            <ItemStatusBadge item={item} />
          </div>
          <div className="text-muted-foreground ml-10 flex gap-4">
            <span>Código: {item.code}</span>
            <span>|</span>
            <span>Local: {item.shelfLocation || 'Não definida'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Editar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Item</DialogTitle>
                </DialogHeader>
                <ItemForm
                  defaultValues={item}
                  onSubmit={(d) => {
                    updateItem(item.id, d)
                    setEditOpen(false)
                  }}
                  onCancel={() => setEditOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={stockOutOpen} onOpenChange={setStockOutOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Dar Baixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Baixa de Estoque</DialogTitle>
              </DialogHeader>
              <StockOutForm
                maxQuantity={item.currentQuantity}
                onSubmit={(d) => {
                  recordMovement({
                    itemId: item.id,
                    type: 'out',
                    quantity: d.quantity,
                    observation: d.observation,
                    userId: user!.id,
                    requestedBy: d.requestedBy,
                  } as any)
                  setStockOutOpen(false)
                }}
                onCancel={() => setStockOutOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <PackageOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.currentQuantity}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Estoque Mínimo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.minQuantity}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Valor Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(item.costPrice)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fornecedores Vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.suppliers.map((itemSupplier) => {
                    const sup = suppliers.find((s) => s.id === itemSupplier.supplierId)
                    if (!sup) return null
                    return (
                      <TableRow key={`${sup.id}-${itemSupplier.preference}`}>
                        <TableCell className="font-medium">{sup.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">{sup.contact}</div>
                          <div className="text-xs text-muted-foreground">{sup.phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={PREFERENCE_COLORS[itemSupplier.preference]}
                            variant="secondary"
                          >
                            {PREFERENCE_LABELS[itemSupplier.preference]}
                          </Badge>
                        </TableCell>
                        <TableCell>{sup.leadTime} dias</TableCell>
                      </TableRow>
                    )
                  })}
                  {item.suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum fornecedor vinculado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimas Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>OP</TableHead>
                    <TableHead>Solicitado por</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.data_movimento)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={m.tipo_movimento === 'entrada' ? 'default' : 'destructive'}
                          className={
                            m.tipo_movimento === 'entrada'
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : ''
                          }
                        >
                          {m.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.quantidade}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{m.expand?.usuario_id?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">
                        {m.motivo || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {itemMovements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Sem movimentações
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentação Técnica</CardTitle>
            </CardHeader>
            <CardContent>
              {item.pdfUrl ? (
                <Button asChild className="w-full sm:w-auto" variant="outline">
                  <a href={item.pdfUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ver Documentação Técnica
                  </a>
                </Button>
              ) : (
                <div className="text-muted-foreground text-sm">Nenhum PDF vinculado.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
