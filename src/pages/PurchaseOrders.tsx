import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileCheck, Search, FileText, AlertTriangle, Printer } from 'lucide-react'
import useMainStore from '@/stores/main'
import { format } from 'date-fns'

export default function PurchaseOrders() {
  const { purchaseOrders, suppliers, items, updatePurchaseOrderDetails } = useMainStore()

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  useEffect(() => {
    const poId = searchParams.get('poId')
    if (poId) {
      setSelectedPoId(poId)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (!searchTerm) return true
      const matchesTicket = po.items.some((item) =>
        item.purchaseTicketId.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      const matchesPo = po.number.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesTicket || matchesPo
    })
  }, [purchaseOrders, searchTerm])

  const selectedPo = useMemo(() => {
    return purchaseOrders.find((p) => p.id === selectedPoId) || null
  }, [purchaseOrders, selectedPoId])

  const selectedSupplier = useMemo(() => {
    return selectedPo ? suppliers.find((s) => s.id === selectedPo.supplierId) : null
  }, [selectedPo, suppliers])

  const handleUpdateDetails = (field: 'paymentMethod' | 'freightType', value: string) => {
    if (selectedPoId) {
      updatePurchaseOrderDetails(selectedPoId, { [field]: value })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 relative">
      <div className="print:hidden flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileCheck className="h-8 w-8 text-primary" />
          Ordens de Compra
        </h2>
      </div>

      <div className="print:hidden flex items-center space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por Ticket de Solicitação ou Nº da OC..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="print:hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Qtd. Itens</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Data Prevista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de compra encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((po) => {
                const supplier = suppliers.find((s) => s.id === po.supplierId)
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.number}</TableCell>
                    <TableCell>{supplier?.name || 'Fornecedor Desconhecido'}</TableCell>
                    <TableCell className="text-right">{po.items.length}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {po.totalValue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={po.status === 'pendente' ? 'secondary' : 'default'}>
                        {po.status === 'pendente' ? 'Pendente' : 'Recebido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPoId(po.id)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Documento
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedPoId} onOpenChange={(open) => !open && setSelectedPoId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between mt-2">
              <span className="flex items-center gap-3">
                Ordem de Compra: {selectedPo?.number}
                <Badge
                  variant={selectedPo?.status === 'pendente' ? 'secondary' : 'default'}
                  className="text-sm"
                >
                  {selectedPo?.status === 'pendente' ? 'Pendente' : 'Recebido'}
                </Badge>
              </span>
              <Button onClick={handlePrint} variant="outline" className="mr-6 print:hidden">
                <Printer className="w-4 h-4 mr-2" /> Imprimir PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedPo && (
            <div className="space-y-6 mt-4">
              <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-start gap-3 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="font-medium">
                  IMPORTANTE: O número desta Ordem de Compra ({selectedPo.number}) deve constar
                  obrigatoriamente na Nota Fiscal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 border rounded-md bg-muted/20">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-2">
                    Dados do Fornecedor
                  </h4>
                  <p className="font-medium text-lg">
                    {selectedSupplier?.name || 'Fornecedor Desconhecido'}
                  </p>
                  <p className="text-sm">{selectedSupplier?.email || 'N/A'}</p>
                  <p className="text-sm">{selectedSupplier?.phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-2">
                    Detalhes da Entrega
                  </h4>
                  <p className="font-medium text-lg">
                    {format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    às {format(new Date(selectedPo.expectedDeliveryDate), 'HH:mm')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de pagamento acordado</Label>
                  <Input
                    id="paymentMethod"
                    value={selectedPo.paymentMethod || ''}
                    onChange={(e) => handleUpdateDetails('paymentMethod', e.target.value)}
                    placeholder="Ex: Boleto 30/60/90, PIX, etc."
                    disabled={selectedPo.status === 'recebido'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freightType">Tipo do frete</Label>
                  <Input
                    id="freightType"
                    value={selectedPo.freightType || ''}
                    onChange={(e) => handleUpdateDetails('freightType', e.target.value)}
                    placeholder="Ex: CIF, FOB"
                    disabled={selectedPo.status === 'recebido'}
                  />
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Ticket Ref.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((poItem, idx) => {
                      const itemDetails = items.find((i) => i.id === poItem.itemId)
                      const total = poItem.quantity * poItem.price
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {itemDetails?.code || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {itemDetails?.name || 'Item desconhecido'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {poItem.purchaseTicketId}
                          </TableCell>
                          <TableCell className="text-right">{poItem.quantity}</TableCell>
                          <TableCell className="text-right">R$ {poItem.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end p-4 border-t bg-muted/10">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">
                    Valor Total da Ordem
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    R$ {selectedPo.totalValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Area - A4 Portrait Optimization */}
      {selectedPo && (
        <div
          id="printable-area"
          className="hidden print:flex flex-col absolute inset-0 bg-white text-black p-8 w-[210mm] min-h-[297mm] box-border"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">Ordem de Compra</h1>
              <p className="text-xl font-mono mt-1">Nº {selectedPo.number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">EMPRESA EXEMPLO LTDA</h2>
              <p className="text-sm">CNPJ: 00.000.000/0001-00</p>
              <p className="text-sm">Rua Fictícia, 123 - Centro</p>
              <p className="text-sm">São Paulo - SP, 01000-000</p>
              <div className="mt-2">
                <p className="text-sm font-semibold">Data de Emissão:</p>
                <p className="text-sm">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          </div>

          {/* Alert */}
          <div className="border-2 border-black p-3 mb-6 bg-gray-100 print:bg-transparent">
            <p className="font-bold text-sm uppercase text-center">
              Importante: O número desta Ordem de Compra ({selectedPo.number}) deve constar
              obrigatoriamente na Nota Fiscal.
            </p>
          </div>

          {/* Info blocks */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="border border-black p-4 rounded-sm">
              <h3 className="font-bold uppercase border-b border-black pb-2 mb-2">
                Dados do Fornecedor
              </h3>
              <p className="font-bold text-base">
                {selectedSupplier?.name || 'Fornecedor Desconhecido'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Email:</span> {selectedSupplier?.email || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Telefone:</span> {selectedSupplier?.phone || 'N/A'}
              </p>
            </div>
            <div className="border border-black p-4 rounded-sm">
              <h3 className="font-bold uppercase border-b border-black pb-2 mb-2">
                Condições Comerciais
              </h3>
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">Pagamento:</span>{' '}
                  {selectedPo.paymentMethod || 'Não informada'}
                </p>
                <p>
                  <span className="font-semibold">Frete (Shipping):</span>{' '}
                  {selectedPo.freightType || 'Não informado'}
                </p>
                <p>
                  <span className="font-semibold">Data de Entrega:</span>{' '}
                  {format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 mb-6">
            <table className="w-full text-sm text-left border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent">
                  <th className="p-2 border border-black font-bold w-24">Código</th>
                  <th className="p-2 border border-black font-bold">Descrição do Item</th>
                  <th className="p-2 text-right border border-black font-bold w-20">Qtd</th>
                  <th className="p-2 text-right border border-black font-bold w-28">V. Unit</th>
                  <th className="p-2 text-right border border-black font-bold w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedPo.items.map((poItem, idx) => {
                  const itemDetails = items.find((i) => i.id === poItem.itemId)
                  const total = poItem.quantity * poItem.price
                  return (
                    <tr key={idx}>
                      <td className="p-2 border border-black font-mono text-xs">
                        {itemDetails?.code || 'N/A'}
                      </td>
                      <td className="p-2 border border-black">
                        {itemDetails?.name || 'Item desconhecido'}
                        <div className="text-xs text-gray-500 mt-0.5">
                          Ref: {poItem.purchaseTicketId}
                        </div>
                      </td>
                      <td className="p-2 text-right border border-black">{poItem.quantity}</td>
                      <td className="p-2 text-right border border-black">
                        R$ {poItem.price.toFixed(2)}
                      </td>
                      <td className="p-2 text-right border border-black font-medium">
                        R$ {total.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="flex justify-end shrink-0 mb-12">
            <div className="border-2 border-black p-4 min-w-[300px] text-right">
              <p className="text-sm uppercase font-bold text-gray-700 mb-1">
                Total da Ordem de Compra
              </p>
              <p className="text-2xl font-bold">R$ {selectedPo.totalValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-auto pt-12 grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-b border-black mb-2 mx-4"></div>
              <p className="font-bold text-sm">Assinatura do Comprador</p>
              <p className="text-xs text-gray-500 mt-1">Carimbo e Assinatura</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-2 mx-4"></div>
              <p className="font-bold text-sm">Assinatura do Fornecedor</p>
              <p className="text-xs text-gray-500 mt-1">
                Carimbo e Assinatura (Acorde / Recebimento)
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
            Documento gerado automaticamente pelo Sistema de Gestão de Estoque.
          </div>
        </div>
      )}
    </div>
  )
}
