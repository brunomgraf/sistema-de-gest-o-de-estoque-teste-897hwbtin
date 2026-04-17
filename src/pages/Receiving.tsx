import { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDownToLine, CheckCircle2, Eye, Loader2, AlertTriangle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Receiving() {
  const { user } = useAuth()
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  // States for itemized receiving
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [enrichedPOs, setEnrichedPOs] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [poRes, itRes] = await Promise.all([
        pb
          .collection('ordens_compra')
          .getFullList({ sort: '-data_pedido', expand: 'fornecedor_id' }),
        pb.collection('itens').getFullList(),
      ])

      const pos = await Promise.all(
        poRes.map(async (po) => {
          const poItems = await pb
            .collection('itens_ordem_compra')
            .getFullList({ filter: `ordem_compra_id = "${po.id}"` })
          return {
            id: po.id,
            number: 'OC-' + po.id.slice(0, 6).toUpperCase(),
            supplierId: po.fornecedor_id,
            supplierName: po.expand?.fornecedor_id?.nome || 'Fornecedor desconhecido',
            items: poItems.map((i) => ({
              itemId: i.item_id,
              quantity: i.quantidade,
              price: i.valor_unitario,
            })),
            totalValue: po.valor_total,
            expectedDeliveryDate: po.data_entrega_prevista,
            status: po.status,
          }
        }),
      )

      setEnrichedPOs(pos)
      setItems(itRes)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar dados: ' + getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ordens_compra', () => {
    loadData()
  })
  useRealtime('itens_ordem_compra', () => {
    loadData()
  })
  useRealtime('itens', () => {
    loadData()
  })

  const openReceiveModal = (po: any) => {
    setReceivingPoId(po.id)
    const initial: Record<string, number> = {}
    po.items.forEach((it: any) => {
      initial[it.itemId] = it.quantity // Default to expected quantity
    })
    setReceivedQuantities(initial)
  }

  const submitReception = async () => {
    if (!user || !receivingPoId) return

    const po = enrichedPOs.find((p) => p.id === receivingPoId)
    if (!po) return

    setIsSubmitting(true)
    try {
      for (const it of po.items) {
        const recQty = receivedQuantities[it.itemId] || 0
        if (recQty > 0) {
          const itemObj = items.find((i) => i.id === it.itemId)
          if (!itemObj) continue

          const newQty = (itemObj.quantidade_atual || 0) + recQty

          // Update stock
          await pb.collection('itens').update(it.itemId, { quantidade_atual: newQty })

          // Create movement
          await pb.collection('movimentacoes').create({
            item_id: it.itemId,
            tipo_movimento: 'entrada',
            quantidade: recQty,
            data_movimento: new Date().toISOString(),
            motivo: `Recebimento OC ${po.number}`,
            usuario_id: user.id,
          })

          // Create itemized receiving record
          await pb.collection('recebimento').create({
            ordem_compra_id: po.id,
            item_id: it.itemId,
            quantidade_recebida: recQty,
            data_recebimento: new Date().toISOString(),
            status_verificacao: recQty === it.quantity ? 'ok' : 'divergente',
          })
        }
      }

      // Update PO status
      await pb.collection('ordens_compra').update(po.id, { status: 'entregue' })

      toast.success('Recebimento concluído e estoque atualizado!')
      setReceivingPoId(null)
    } catch (e: any) {
      toast.error('Erro ao finalizar recebimento: ' + getErrorMessage(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPo = useMemo(() => {
    return enrichedPOs.find((p) => p.id === selectedPoId) || null
  }, [enrichedPOs, selectedPoId])

  const receivingPo = useMemo(() => {
    return enrichedPOs.find((p) => p.id === receivingPoId) || null
  }, [enrichedPOs, receivingPoId])

  const hasDivergences = receivingPo?.items.some((it: any) => {
    const recQty = receivedQuantities[it.itemId] ?? 0
    return recQty !== it.quantity
  })

  const isZeroReceived =
    receivingPo?.items.every((it: any) => (receivedQuantities[it.itemId] || 0) === 0) ?? true

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowDownToLine className="h-8 w-8 text-primary" />
          Recebimento (Ordens de Compra)
        </h2>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Ordem</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Total de Itens</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Previsão de Entrega</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24">
                  <Skeleton className="h-12 w-full" />
                </TableCell>
              </TableRow>
            ) : enrichedPOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de compra pendente. Confirme uma cotação em "Compras" para gerar um
                  documento.
                </TableCell>
              </TableRow>
            ) : (
              enrichedPOs.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-bold">{po.number}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell className="text-right font-medium">{po.items.length}</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    R$ {po.totalValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {po.expectedDeliveryDate
                      ? format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={po.status === 'pendente' ? 'secondary' : 'default'}
                      className={po.status === 'entregue' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {po.status === 'pendente' ? 'Aguardando' : 'Recebido'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPoId(po.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver OC
                      </Button>
                      {po.status === 'pendente' && (
                        <Button size="sm" onClick={() => openReceiveModal(po)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Receber
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View PO Details Dialog */}
      <Dialog open={!!selectedPoId} onOpenChange={(open) => !open && setSelectedPoId(null)}>
        <DialogContent className="max-w-4xl bg-slate-50">
          <DialogHeader>
            <DialogTitle className="sr-only">Detalhes da Ordem de Compra</DialogTitle>
            <DialogDescription className="sr-only">
              Documento formatado da Ordem de Compra
            </DialogDescription>
          </DialogHeader>

          {selectedPo && (
            <div className="bg-white p-8 rounded border shadow-sm text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    ORDEM DE COMPRA
                  </h2>
                  <p className="text-xl font-bold text-slate-400 mt-1">{selectedPo.number}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-bold text-lg text-slate-900">{selectedPo.supplierName}</p>
                  <p className="text-sm text-slate-500">
                    Data Acordada:{' '}
                    <span className="font-medium text-slate-700">
                      {selectedPo.expectedDeliveryDate
                        ? format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')
                        : '-'}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Hora Acordada:{' '}
                    <span className="font-medium text-slate-700">
                      {selectedPo.expectedDeliveryDate
                        ? format(new Date(selectedPo.expectedDeliveryDate), 'HH:mm')
                        : '-'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="min-h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-semibold">Item</TableHead>
                      <TableHead className="text-right text-slate-500 font-semibold">
                        Qtd.
                      </TableHead>
                      <TableHead className="text-right text-slate-500 font-semibold">
                        Valor Unitário
                      </TableHead>
                      <TableHead className="text-right text-slate-500 font-semibold">
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((it: any, idx: number) => {
                      const itemObj = items.find((i) => i.id === it.itemId)
                      return (
                        <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-700">
                            {itemObj?.nome || 'Item desconhecido'}
                          </TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right">R$ {it.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-slate-900">
                            R$ {(it.quantity * it.price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end pt-6 border-t border-slate-200 mt-6">
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  Total da Ordem de Compra
                </p>
                <p className="text-3xl font-black text-slate-900">
                  R$ {selectedPo.totalValue.toFixed(2)}
                </p>
              </div>

              {selectedPo.status === 'entregue' && (
                <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4">
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-1.5 text-sm font-bold shadow-sm">
                    DOCUMENTO RECEBIDO E ESTOQUE ATUALIZADO
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Itemized Reception Validation Dialog */}
      <Dialog open={!!receivingPoId} onOpenChange={(open) => !open && setReceivingPoId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
            <DialogDescription>
              Verifique as quantidades físicas recebidas de cada item. O estoque será atualizado com
              estes valores.
            </DialogDescription>
          </DialogHeader>

          {receivingPo && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-md border flex justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Ordem de Compra</p>
                  <p className="font-bold text-lg">{receivingPo.number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">Fornecedor</p>
                  <p className="font-bold">{receivingPo.supplierName}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qtd. Solicitada</TableHead>
                    <TableHead className="text-right w-40">Qtd. Recebida</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivingPo.items.map((it: any) => {
                    const itemObj = items.find((i) => i.id === it.itemId)
                    const recQty = receivedQuantities[it.itemId] ?? 0
                    const diff = recQty - it.quantity
                    return (
                      <TableRow key={it.itemId}>
                        <TableCell className="font-medium">
                          {itemObj?.nome || 'Item desconhecido'}
                        </TableCell>
                        <TableCell className="text-slate-500">{itemObj?.sku || '-'}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            className="w-24 ml-auto text-right"
                            value={recQty.toString()}
                            onChange={(e) => {
                              const val = e.target.value
                              setReceivedQuantities((prev) => ({
                                ...prev,
                                [it.itemId]: val === '' ? 0 : parseInt(val, 10),
                              }))
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {diff === 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              OK
                            </Badge>
                          ) : diff > 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Excedente (+{diff})
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200"
                            >
                              Faltante ({diff})
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {hasDivergences && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Atenção: Quantidades divergentes</p>
                    <p>
                      Existem itens com quantidades diferentes do solicitado. Confirme se as
                      informações estão corretas antes de finalizar.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setReceivingPoId(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button onClick={submitReception} disabled={isSubmitting || isZeroReceived}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Finalizar Recebimento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
