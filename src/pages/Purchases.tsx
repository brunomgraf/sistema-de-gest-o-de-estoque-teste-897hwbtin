import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ShoppingBag,
  Eye,
  Trophy,
  Plus,
  CalendarIcon,
  Trash2,
  FileText,
  Download,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useMainStore from '@/stores/main'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DraftQuote {
  id: string
  supplierId: string
  price: string
  deliveryDate: Date | undefined
  paymentMethod: string
  shippingMethod: string
}

export default function Purchases() {
  const {
    purchaseTickets,
    items,
    suppliers,
    addQuoteToTicket,
    setWinningQuote,
    updatePurchaseTicketQuantity,
    purchaseOrders,
    updatePurchaseOrderDetails,
  } = useMainStore()

  const navigate = useNavigate()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const [draftQuotes, setDraftQuotes] = useState<DraftQuote[]>([])
  const [ticketQuantity, setTicketQuantity] = useState('')

  const [pendingPoUpdate, setPendingPoUpdate] = useState<{
    ticketId: string
    paymentMethod: string
    freightType: string
  } | null>(null)

  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [isReportOpen, setIsReportOpen] = useState(false)

  useEffect(() => {
    if (pendingPoUpdate) {
      const po = purchaseOrders.find((p) =>
        p.items.some((i) => i.purchaseTicketId === pendingPoUpdate.ticketId),
      )
      if (po) {
        if (pendingPoUpdate.paymentMethod || pendingPoUpdate.freightType) {
          updatePurchaseOrderDetails(po.id, {
            paymentMethod: pendingPoUpdate.paymentMethod,
            freightType: pendingPoUpdate.freightType,
          })
        }
        setPendingPoUpdate(null)
        setSelectedTicketId(null)
        navigate(`/ordens-de-compra?poId=${po.id}`)
      }
    }
  }, [purchaseOrders, pendingPoUpdate, updatePurchaseOrderDetails, navigate])

  useEffect(() => {
    if (selectedTicketId) {
      const ticket = purchaseTickets.find((t) => t.id === selectedTicketId)
      if (ticket) setTicketQuantity(ticket.quantity.toString())
    }
  }, [selectedTicketId, purchaseTickets])

  const handleQuantityChange = (val: string) => {
    setTicketQuantity(val)
    const qty = parseInt(val, 10)
    if (!isNaN(qty) && qty > 0 && selectedTicketId) {
      updatePurchaseTicketQuantity(selectedTicketId, qty)
    }
  }

  const enrichedTickets = useMemo(() => {
    return purchaseTickets.map((ticket) => {
      const item = items.find((i) => i.id === ticket.itemId)!
      const primarySupplierRef = item?.suppliers?.find((s) => s.preference === 'primary')
      const supplier = primarySupplierRef
        ? suppliers.find((s) => s.id === primarySupplierRef.supplierId)
        : null

      return {
        ...ticket,
        itemName: item?.name || 'Item desconhecido',
        itemCode: item?.code || '-',
        currentQuantity: item?.currentQuantity || 0,
        minQuantity: item?.minQuantity || 0,
        recommendedQuantity: ticket.quantity,
        supplierName: supplier ? supplier.name : 'Não definido',
      }
    })
  }, [purchaseTickets, items, suppliers])

  const selectedTicket = useMemo(() => {
    return purchaseTickets.find((t) => t.id === selectedTicketId) || null
  }, [purchaseTickets, selectedTicketId])

  const selectedItem = useMemo(() => {
    return selectedTicket ? items.find((i) => i.id === selectedTicket.itemId) : null
  }, [selectedTicket, items])

  const handleOpenDetails = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    const ticket = purchaseTickets.find((t) => t.id === ticketId)
    const item = items.find((i) => i.id === ticket?.itemId)
    if (item && item.suppliers) {
      setDraftQuotes(
        item.suppliers.map((s) => ({
          id: Math.random().toString(36).substring(2, 9),
          supplierId: s.supplierId,
          price: '',
          deliveryDate: undefined,
          paymentMethod: '',
          shippingMethod: '',
        })),
      )
    } else {
      setDraftQuotes([])
    }
  }

  const handleAddQuote = () => {
    if (!selectedTicketId) return

    draftQuotes.forEach((draft) => {
      if (draft.supplierId && draft.price && draft.deliveryDate) {
        const deliveryDate = new Date(draft.deliveryDate)
        deliveryDate.setHours(12, 0)

        addQuoteToTicket(selectedTicketId, {
          supplierId: draft.supplierId,
          price: parseFloat(draft.price) || 0,
          expectedDeliveryDate: deliveryDate.toISOString(),
          paymentMethod: draft.paymentMethod,
          shippingMethod: draft.shippingMethod,
        })
      }
    })

    setDraftQuotes([])
  }

  const handleSetWinner = (quoteId: string) => {
    if (!selectedTicketId) return
    const ticket = purchaseTickets.find((t) => t.id === selectedTicketId)
    const quote = ticket?.quotes.find((q) => q.id === quoteId)

    setWinningQuote(selectedTicketId, quoteId)
    setPendingPoUpdate({
      ticketId: selectedTicketId,
      paymentMethod: quote?.paymentMethod || '',
      freightType: quote?.shippingMethod || '',
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligible = enrichedTickets.filter((t) => t.status !== 'concluido').map((t) => t.id)
      setSelectedRequests(eligible)
    } else {
      setSelectedRequests([])
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectedReportData = useMemo(() => {
    return enrichedTickets
      .filter((t) => selectedRequests.includes(t.id))
      .map((ticket) => {
        const detailedQuotes = ticket.quotes
          .map((q) => {
            const sup = suppliers.find((s) => s.id === q.supplierId)
            return {
              ...q,
              supplierName: sup?.name || 'Desconhecido',
            }
          })
          .filter((q) => !q.isWinner)

        return {
          ...ticket,
          quotes: detailedQuotes,
        }
      })
  }, [enrichedTickets, selectedRequests, suppliers])

  const handleDownloadCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent +=
      'Item,Codigo,Qtd_Solicitada,Fornecedor,Preco_Unitario,Total,Pagamento,Frete,Data_Entrega\n'

    selectedReportData.forEach((ticket) => {
      const itemName = `"${ticket.itemName.replace(/"/g, '""')}"`
      if (ticket.quotes.length === 0) {
        csvContent += `${itemName},${ticket.itemCode},${ticket.quantity},Nenhuma cotacao,-,-,-,-,-\n`
      } else {
        ticket.quotes.forEach((q) => {
          const supName = `"${q.supplierName.replace(/"/g, '""')}"`
          const date = format(new Date(q.expectedDeliveryDate), 'dd/MM/yyyy')
          csvContent += `${itemName},${ticket.itemCode},${ticket.quantity},${supName},${q.price.toFixed(2)},${(q.price * ticket.quantity).toFixed(2)},"${q.paymentMethod || '-'}","${q.shippingMethod || '-'}","${date}"\n`
        })
      }
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cotacoes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=650')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Cotações</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; }
            .text-right { text-align: right; }
            .mb-4 { margin-bottom: 1rem; }
            .font-bold { font-weight: bold; }
            .header { margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
            .item-header { background-color: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
            .item-header h3 { margin: 0 0 4px 0; font-size: 16px; }
            .item-header p { margin: 0; font-size: 14px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Relatório Comparativo de Cotações</h2>
            <p style="color: #6b7280; margin: 0;">Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          ${selectedReportData
            .map(
              (ticket) => `
            <div class="mb-4" style="page-break-inside: avoid;">
              <div class="item-header">
                <h3>${ticket.itemName} (Código: ${ticket.itemCode})</h3>
                <p>Quantidade Solicitada: <strong>${ticket.quantity}</strong></p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th class="text-right">Preço Un.</th>
                    <th class="text-right">Total</th>
                    <th>Pagamento</th>
                    <th>Frete</th>
                    <th class="text-right">Entrega</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    ticket.quotes.length === 0
                      ? `<tr><td colspan="6" style="text-align:center; color: #6b7280;">Nenhuma cotação registrada.</td></tr>`
                      : ticket.quotes
                          .map(
                            (q) => `
                    <tr>
                      <td>${q.supplierName}</td>
                      <td class="text-right">R$ ${q.price.toFixed(2)}</td>
                      <td class="text-right"><strong>R$ ${(q.price * ticket.quantity).toFixed(2)}</strong></td>
                      <td>${q.paymentMethod || '-'}</td>
                      <td>${q.shippingMethod || '-'}</td>
                      <td class="text-right">${format(new Date(q.expectedDeliveryDate), 'dd/MM/yyyy')}</td>
                    </tr>
                  `,
                          )
                          .join('')
                  }
                </tbody>
              </table>
            </div>
          `,
            )
            .join('')}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const eligibleForReportCount = enrichedTickets.filter((t) => t.status !== 'concluido').length

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-8 w-8 text-primary" />
          Solicitações de Compra
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsReportOpen(true)}
            disabled={selectedRequests.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar Cotações ({selectedRequests.length})
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectedRequests.length > 0 &&
                    selectedRequests.length === eligibleForReportCount
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Fornecedor Preferencial</TableHead>
              <TableHead className="text-right">Qtd. Atual</TableHead>
              <TableHead className="text-right">Mínima</TableHead>
              <TableHead className="text-right">Comprar</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação de compra pendente.
                </TableCell>
              </TableRow>
            ) : (
              enrichedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRequests.includes(ticket.id)}
                      onCheckedChange={() => toggleSelection(ticket.id)}
                      disabled={ticket.status === 'concluido'}
                      aria-label={`Selecionar ${ticket.itemName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ticket.itemName}</TableCell>
                  <TableCell>{ticket.supplierName}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {ticket.currentQuantity}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {ticket.minQuantity}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {ticket.recommendedQuantity}
                  </TableCell>
                  <TableCell>{format(new Date(ticket.requestDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ticket.status === 'pendente'
                          ? 'destructive'
                          : ticket.status === 'concluido'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {ticket.status === 'pendente' && 'Pendente'}
                      {ticket.status === 'em_cotacao' && 'Em Cotação'}
                      {ticket.status === 'concluido' && 'Concluído'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(ticket.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Gerencie cotações de fornecedores para o item:{' '}
              <strong className="text-foreground">{selectedItem?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="py-2 border-b space-y-4 mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket-quantity">Quantidade Solicitada</Label>
                  <Input
                    id="ticket-quantity"
                    type="number"
                    min="1"
                    value={ticketQuantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    disabled={selectedTicket.status === 'concluido'}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedTicket && selectedTicket.status !== 'concluido' && (
            <div className="grid gap-4 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Nova(s) Cotação(ões)</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraftQuotes([
                      ...draftQuotes,
                      {
                        id: Math.random().toString(36).substring(2, 9),
                        supplierId: '',
                        price: '',
                        deliveryDate: undefined,
                        paymentMethod: '',
                        shippingMethod: '',
                      },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Fornecedor
                </Button>
              </div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {draftQuotes.map((draft, index) => (
                  <div
                    key={draft.id}
                    className="grid grid-cols-12 gap-3 items-end border p-3 rounded-md relative bg-muted/10"
                  >
                    <div className="col-span-12 sm:col-span-3 space-y-2">
                      <Label>Fornecedor</Label>
                      <Select
                        value={draft.supplierId}
                        onValueChange={(val) => {
                          const newDrafts = [...draftQuotes]
                          newDrafts[index].supplierId = val
                          setDraftQuotes(newDrafts)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-2 space-y-2">
                      <Label>Preço Unitário (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={draft.price}
                        onChange={(e) => {
                          const newDrafts = [...draftQuotes]
                          newDrafts[index].price = e.target.value
                          setDraftQuotes(newDrafts)
                        }}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-2 space-y-2">
                      <Label>Pagamento</Label>
                      <Input
                        placeholder="Ex: 30 dias"
                        value={draft.paymentMethod}
                        onChange={(e) => {
                          const newDrafts = [...draftQuotes]
                          newDrafts[index].paymentMethod = e.target.value
                          setDraftQuotes(newDrafts)
                        }}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-2 space-y-2">
                      <Label>Frete</Label>
                      <Input
                        placeholder="Ex: CIF"
                        value={draft.shippingMethod}
                        onChange={(e) => {
                          const newDrafts = [...draftQuotes]
                          newDrafts[index].shippingMethod = e.target.value
                          setDraftQuotes(newDrafts)
                        }}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-3 space-y-2">
                      <Label>Entrega</Label>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full justify-start text-left font-normal px-3',
                                !draft.deliveryDate && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {draft.deliveryDate ? (
                                format(draft.deliveryDate, 'dd/MM/yyyy')
                              ) : (
                                <span>Data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={draft.deliveryDate}
                              onSelect={(date) => {
                                const newDrafts = [...draftQuotes]
                                newDrafts[index].deliveryDate = date
                                setDraftQuotes(newDrafts)
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                          onClick={() => {
                            const newDrafts = [...draftQuotes]
                            newDrafts.splice(index, 1)
                            setDraftQuotes(newDrafts)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {draftQuotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    Nenhuma cotação em rascunho. Clique em "Adicionar Fornecedor" para começar.
                  </p>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleAddQuote}
                  disabled={
                    draftQuotes.length === 0 ||
                    draftQuotes.some((d) => !d.supplierId || !d.price || !d.deliveryDate)
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Salvar Cotação(ões)
                </Button>
              </div>
            </div>
          )}

          <div className="py-4 space-y-4">
            <h3 className="font-semibold">Cotações Registradas</h3>
            {selectedTicket?.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma cotação registrada para esta solicitação.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Preço Un.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Frete</TableHead>
                    <TableHead className="text-right">Entrega</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTicket?.quotes.map((quote) => {
                    const sup = suppliers.find((s) => s.id === quote.supplierId)
                    const total = quote.price * selectedTicket.quantity
                    return (
                      <TableRow key={quote.id} className={quote.isWinner ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">
                          {sup?.name}
                          {quote.isWinner && (
                            <Badge
                              variant="default"
                              className="ml-2 bg-green-600 hover:bg-green-700"
                            >
                              Ganhador
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">R$ {quote.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote.paymentMethod || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote.shippingMethod || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {format(new Date(quote.expectedDeliveryDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {selectedTicket.status !== 'concluido' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => handleSetWinner(quote.id)}
                            >
                              <Trophy className="w-4 h-4 mr-2" /> Escolher
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Relatório Comparativo de Cotações</DialogTitle>
            <DialogDescription>
              Visualize as cotações selecionadas e exporte para aprovação financeira.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
            {selectedReportData.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma solicitação selecionada.</p>
            ) : (
              selectedReportData.map((ticket) => (
                <div key={ticket.id} className="border rounded-md p-4 bg-card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{ticket.itemName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Código: {ticket.itemCode} | Quantidade Solicitada: {ticket.quantity}
                      </p>
                    </div>
                    <Badge variant="secondary">{ticket.quotes.length} Cotações</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Preço Un.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Frete</TableHead>
                        <TableHead className="text-right">Entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticket.quotes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma cotação registrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ticket.quotes.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell className="font-medium">{quote.supplierName}</TableCell>
                            <TableCell className="text-right">
                              R$ {quote.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {(quote.price * ticket.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>{quote.paymentMethod || '-'}</TableCell>
                            <TableCell>{quote.shippingMethod || '-'}</TableCell>
                            <TableCell className="text-right">
                              {format(new Date(quote.expectedDeliveryDate), 'dd/MM/yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button variant="outline" onClick={handleDownloadCSV}>
              <Download className="w-4 h-4 mr-2" />
              Excel / CSV
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
