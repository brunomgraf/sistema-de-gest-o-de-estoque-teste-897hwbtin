import { useState, useMemo } from 'react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowDownToLine, CheckCircle2, Eye, Info } from 'lucide-react'
import useMainStore from '@/stores/main'
import { format } from 'date-fns'

export default function Receiving() {
  const { purchaseOrders, items, suppliers, receivePurchaseOrder } = useMainStore()
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  const enrichedPOs = useMemo(() => {
    return purchaseOrders.map((po) => {
      const supplier = suppliers.find((s) => s.id === po.supplierId)
      return {
        ...po,
        supplierName: supplier?.name || 'Fornecedor desconhecido',
      }
    })
  }, [purchaseOrders, suppliers])

  const selectedPo = useMemo(() => {
    return enrichedPOs.find((p) => p.id === selectedPoId) || null
  }, [enrichedPOs, selectedPoId])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowDownToLine className="h-8 w-8 text-primary" />
          Recebimento (Ordens de Compra)
        </h2>
      </div>

      <Alert className="mb-6 bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-900">
        <Info className="h-4 w-4 !text-blue-800 dark:!text-blue-200" />
        <AlertTitle className="font-semibold">Aviso sobre Dados Locais</AlertTitle>
        <AlertDescription>
          Como não há banco de dados conectado, as Ordens de Compra geradas e consolidadas são
          gerenciadas na memória local. Elas serão redefinidas caso a página seja recarregada.
        </AlertDescription>
      </Alert>

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
            {enrichedPOs.length === 0 ? (
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
                    {format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={po.status === 'pendente' ? 'secondary' : 'default'}
                      className={po.status === 'recebido' ? 'bg-green-600 hover:bg-green-700' : ''}
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
                        <Button size="sm" onClick={() => receivePurchaseOrder(po.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirmar
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
                      {format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Hora Acordada:{' '}
                    <span className="font-medium text-slate-700">
                      {format(new Date(selectedPo.expectedDeliveryDate), 'HH:mm')}
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
                    {selectedPo.items.map((it, idx) => {
                      const itemObj = items.find((i) => i.id === it.itemId)
                      return (
                        <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-700">
                            {itemObj?.name || 'Item desconhecido'}
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

              {selectedPo.status === 'recebido' && (
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
    </div>
  )
}
