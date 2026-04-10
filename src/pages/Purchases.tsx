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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Check,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface DraftQuote {
  id: string
  supplierId: string
  price: string
  deliveryDate: Date | undefined
  paymentMethod: string
  shippingMethod: string
}

export default function Purchases() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canFinalize = user?.role === 'admin' || user?.role === 'gestor'

  const [tickets, setTickets] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [draftQuotes, setDraftQuotes] = useState<DraftQuote[]>([])
  const [ticketQuantity, setTicketQuantity] = useState('')

  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [isReportOpen, setIsReportOpen] = useState(false)

  // Approval Form State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [quoteToApprove, setQuoteToApprove] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalData, setApprovalData] = useState({
    aprovador_nome: '',
    data_aprovacao: undefined as Date | undefined,
    hora_aprovacao: '',
    observacoes: '',
  })

  const [ordensCompra, setOrdensCompra] = useState<any[]>([])
  const [isDownloading, setIsDownloading] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [ticketsRes, quotesRes, suppliersRes, ocRes] = await Promise.all([
        pb
          .collection('solicitacoes_compra')
          .getFullList({ expand: 'item_id.fornecedor_id', sort: '-created' }),
        pb.collection('cotacoes').getFullList({ expand: 'fornecedor_id' }),
        pb.collection('fornecedores').getFullList({ sort: 'nome' }),
        pb.collection('ordens_compra').getFullList(),
      ])
      setTickets(ticketsRes)
      setQuotes(quotesRes)
      setSuppliers(suppliersRes)
      setOrdensCompra(ocRes)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('solicitacoes_compra', loadData)
  useRealtime('cotacoes', loadData)
  useRealtime('fornecedores', loadData)
  useRealtime('aprovacoes_financeiras', loadData)
  useRealtime('ordens_compra', loadData)

  useEffect(() => {
    if (selectedTicketId) {
      const ticket = tickets.find((t) => t.id === selectedTicketId)
      if (ticket) setTicketQuantity(ticket.quantidade_sugerida.toString())
    }
  }, [selectedTicketId, tickets])

  const enrichedTickets = useMemo(() => {
    return tickets.map((ticket) => {
      const item = ticket.expand?.item_id
      const defaultSupplier = item?.expand?.fornecedor_id
      const ticketQuotes = quotes.filter((q) => q.solicitacao_id === ticket.id)
      const winnerQuote = ticketQuotes.find((q) => q.is_winner)
      const ordemCompra = winnerQuote
        ? ordensCompra.find((oc) => oc.cotacao_id === winnerQuote.id)
        : null

      return {
        id: ticket.id,
        itemId: item?.id,
        itemName: item?.nome || 'Item desconhecido',
        itemCode: item?.sku || '-',
        currentQuantity: item?.quantidade_atual || 0,
        minQuantity: item?.quantidade_minima || 0,
        recommendedQuantity: ticket.quantidade_sugerida,
        supplierId: defaultSupplier?.id,
        supplierName: defaultSupplier?.nome || 'Não definido',
        status: ticket.status,
        requestDate: ticket.created,
        ordemCompra: ordemCompra
          ? {
              id: ordemCompra.id,
              numero_oc: ordemCompra.numero_oc,
              created: ordemCompra.created,
            }
          : null,
        quotes: ticketQuotes.map((q) => ({
          id: q.id,
          supplierId: q.fornecedor_id,
          supplierName: q.expand?.fornecedor_id?.nome || 'Desconhecido',
          price: q.valor_ofertado,
          expectedDeliveryDate: q.prazo_entrega,
          paymentMethod: q.condicao_pagamento,
          shippingMethod: q.frete,
          isWinner: q.is_winner,
        })),
      }
    })
  }, [tickets, quotes, ordensCompra])

  const selectedTicket = useMemo(() => {
    return enrichedTickets.find((t) => t.id === selectedTicketId) || null
  }, [enrichedTickets, selectedTicketId])

  const updateTicketQuantity = async () => {
    const qty = parseInt(ticketQuantity, 10)
    if (!isNaN(qty) && qty > 0 && selectedTicketId) {
      try {
        await pb.collection('solicitacoes_compra').update(selectedTicketId, {
          quantidade_sugerida: qty,
        })
        toast.success('Quantidade atualizada')
      } catch (e) {
        toast.error('Erro ao atualizar quantidade.')
      }
    }
  }

  const handleOpenDetails = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    const ticket = enrichedTickets.find((t) => t.id === ticketId)

    if (ticket && ticket.quotes.length === 0 && ticket.supplierId) {
      setDraftQuotes([
        {
          id: Math.random().toString(36).substring(2, 9),
          supplierId: ticket.supplierId,
          price: '',
          deliveryDate: undefined,
          paymentMethod: '',
          shippingMethod: '',
        },
      ])
    } else {
      setDraftQuotes([])
    }
  }

  const handleAddQuote = async () => {
    if (!selectedTicketId) return

    for (const draft of draftQuotes) {
      const price = parseFloat(draft.price)
      if (!draft.supplierId) {
        toast.error('Selecione um fornecedor para todas as cotações.')
        return
      }
      if (isNaN(price) || price <= 0) {
        toast.error('O preço da cotação deve ser maior que zero.')
        return
      }
      if (!draft.deliveryDate) {
        toast.error('Selecione a data de entrega para todas as cotações.')
        return
      }
    }

    try {
      for (const draft of draftQuotes) {
        const deliveryDateStr = format(draft.deliveryDate!, 'yyyy-MM-dd')
        await pb.collection('cotacoes').create({
          solicitacao_id: selectedTicketId,
          fornecedor_id: draft.supplierId,
          valor_ofertado: parseFloat(draft.price),
          prazo_entrega: deliveryDateStr,
          condicao_pagamento: draft.paymentMethod,
          frete: draft.shippingMethod,
          is_winner: false,
        })
      }

      const ticket = tickets.find((t) => t.id === selectedTicketId)
      if (ticket && ticket.status === 'pendente') {
        await pb.collection('solicitacoes_compra').update(selectedTicketId, {
          status: 'em_cotacao',
        })
      }

      setDraftQuotes([])
      toast.success('Cotação adicionada com sucesso.')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao adicionar cotação.')
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação?')) return
    try {
      await pb.collection('solicitacoes_compra').delete(ticketId)
      toast.success('Solicitação excluída com sucesso')
      if (selectedTicketId === ticketId) setSelectedTicketId(null)
    } catch (e) {
      toast.error('Erro ao excluir solicitação.')
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta cotação?')) return
    try {
      await pb.collection('cotacoes').delete(quoteId)
      toast.success('Cotação excluída com sucesso')
    } catch (e) {
      toast.error('Erro ao excluir cotação.')
    }
  }

  const openApprovalModal = (quoteId: string) => {
    setQuoteToApprove(quoteId)
    setApprovalData({
      aprovador_nome: user?.name || '',
      data_aprovacao: new Date(),
      hora_aprovacao: format(new Date(), 'HH:mm'),
      observacoes: '',
    })
    setApprovalModalOpen(true)
  }

  const handleApproveQuote = async () => {
    if (!selectedTicketId || !quoteToApprove) return
    if (
      !approvalData.aprovador_nome ||
      !approvalData.data_aprovacao ||
      !approvalData.hora_aprovacao
    ) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setIsApproving(true)
    try {
      const dateStr = format(approvalData.data_aprovacao, 'yyyy-MM-dd') + ' 12:00:00.000Z'

      // Atualiza as cotações primeiro para que o hook do backend encontre a cotação vencedora
      const ticketQuotes = quotes.filter((q) => q.solicitacao_id === selectedTicketId)
      await Promise.all(
        ticketQuotes.map((q) =>
          pb.collection('cotacoes').update(q.id, { is_winner: q.id === quoteToApprove }),
        ),
      )

      // Cria a aprovação (o hook do backend interceptará e criará a OC automaticamente)
      await pb.collection('aprovacoes_financeiras').create({
        solicitacao_id: selectedTicketId,
        aprovador_nome: approvalData.aprovador_nome,
        data_aprovacao: dateStr,
        hora_aprovacao: approvalData.hora_aprovacao,
        observacoes: approvalData.observacoes,
      })

      let newOcId = ''
      try {
        const newOc = await pb
          .collection('ordens_compra')
          .getFirstListItem(`cotacao_id = '${quoteToApprove}'`)
        toast.success(`Aprovação registrada e Ordem de Compra gerada: ${newOc.numero_oc}`)
        newOcId = newOc.id
      } catch (err) {
        toast.success('Aprovação financeira registrada e Ordem de Compra gerada!')
      }

      setApprovalModalOpen(false)
      setQuoteToApprove(null)

      if (newOcId) {
        // Delay to allow the success toast to be seen and then navigate to print
        setTimeout(() => {
          navigate(`/ordens-de-compra?poId=${newOcId}&print=true`)
        }, 1000)
      }
    } catch (e: any) {
      console.error(e)
      try {
        const ticketQuotes = quotes.filter((q) => q.solicitacao_id === selectedTicketId)
        await Promise.all(
          ticketQuotes.map((q) => pb.collection('cotacoes').update(q.id, { is_winner: false })),
        )
      } catch (rollbackErr) {
        console.error('Failed to rollback is_winner flag:', rollbackErr)
      }
      toast.error('Falha ao gerar Ordem de Compra. Verifique a conexão e tente novamente.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleDownloadOC = async (ticketId: string, ordemCompra: any) => {
    setIsDownloading(ticketId)
    try {
      const res = await fetch(`${pb.baseUrl}/backend/v1/gerar_oc_pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ id_compra: ticketId }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Falha ao gerar PDF')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      a.download = `OC_${ordemCompra.id}_${dateStr}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Ordem de Compra baixada com sucesso!')
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Erro ao baixar Ordem de Compra.')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligible = enrichedTickets
        .filter((t) => t.status !== 'finalizado' && t.status !== 'cancelado')
        .map((t) => t.id)
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
        const detailedQuotes = ticket.quotes.filter((q) => !q.isWinner)
        return {
          ...ticket,
          quotes: detailedQuotes,
        }
      })
  }, [enrichedTickets, selectedRequests])

  const handleDownloadCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent +=
      'Item,Codigo,Qtd_Solicitada,Fornecedor,Preco_Unitario,Total,Pagamento,Frete,Data_Entrega\n'

    selectedReportData.forEach((ticket) => {
      const itemName = `"${ticket.itemName.replace(/"/g, '""')}"`
      if (ticket.quotes.length === 0) {
        csvContent += `${itemName},${ticket.itemCode},${ticket.recommendedQuantity},Nenhuma cotacao,-,-,-,-,-\n`
      } else {
        ticket.quotes.forEach((q) => {
          const supName = `"${q.supplierName.replace(/"/g, '""')}"`
          const dateStr = q.expectedDeliveryDate
            ? format(new Date(q.expectedDeliveryDate + 'T12:00:00'), 'dd/MM/yyyy')
            : '-'
          csvContent += `${itemName},${ticket.itemCode},${ticket.recommendedQuantity},${supName},${q.price.toFixed(2)},${(q.price * ticket.recommendedQuantity).toFixed(2)},"${q.paymentMethod || '-'}","${q.shippingMethod || '-'}","${dateStr}"\n`
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
                <p>Quantidade Solicitada: <strong>${ticket.recommendedQuantity}</strong></p>
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
                      <td class="text-right"><strong>R$ ${(q.price * ticket.recommendedQuantity).toFixed(2)}</strong></td>
                      <td>${q.paymentMethod || '-'}</td>
                      <td>${q.shippingMethod || '-'}</td>
                      <td class="text-right">${q.expectedDeliveryDate ? format(new Date(q.expectedDeliveryDate + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</td>
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

  const eligibleForReportCount = enrichedTickets.filter(
    (t) => t.status !== 'finalizado' && t.status !== 'cancelado',
  ).length

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
              <TableHead>SKU</TableHead>
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
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação de compra pendente.
                </TableCell>
              </TableRow>
            ) : (
              enrichedTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className={
                    ticket.currentQuantity <= ticket.minQuantity &&
                    ticket.status !== 'finalizado' &&
                    ticket.status !== 'cancelado'
                      ? 'bg-red-50/50'
                      : ''
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRequests.includes(ticket.id)}
                      onCheckedChange={() => toggleSelection(ticket.id)}
                      disabled={ticket.status === 'finalizado' || ticket.status === 'cancelado'}
                      aria-label={`Selecionar ${ticket.itemName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ticket.itemName}</TableCell>
                  <TableCell>{ticket.itemCode}</TableCell>
                  <TableCell>{ticket.supplierName}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium',
                      ticket.currentQuantity <= ticket.minQuantity ? 'text-destructive' : '',
                    )}
                  >
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
                    <div className="flex flex-col items-start gap-1">
                      <Badge
                        variant={
                          ticket.status === 'pendente'
                            ? 'destructive'
                            : ticket.status === 'finalizado'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {ticket.status === 'pendente' && 'Pendente'}
                        {ticket.status === 'em_cotacao' && 'Em Cotação'}
                        {ticket.status === 'finalizado' && 'Finalizado'}
                        {ticket.status === 'cancelado' && 'Cancelado'}
                      </Badge>
                      {ticket.status === 'finalizado' && ticket.ordemCompra && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {ticket.ordemCompra.numero_oc}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetails(ticket.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </Button>
                      {canFinalize &&
                        ticket.status !== 'finalizado' &&
                        ticket.status !== 'cancelado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                            onClick={() => handleDeleteTicket(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes da Solicitação
              {selectedTicket?.status === 'finalizado' && selectedTicket?.ordemCompra && (
                <Badge variant="default" className="bg-primary hover:bg-primary/90">
                  OC: {selectedTicket.ordemCompra.numero_oc}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Gerencie cotações de fornecedores para o item:{' '}
              <strong className="text-foreground">{selectedTicket?.itemName}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="py-2 border-b space-y-4 mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket-quantity">Quantidade Solicitada</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ticket-quantity"
                      type="number"
                      min="1"
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(e.target.value)}
                      disabled={
                        selectedTicket.status === 'finalizado' ||
                        selectedTicket.status === 'cancelado'
                      }
                    />
                    {selectedTicket.status !== 'finalizado' &&
                      selectedTicket.status !== 'cancelado' && (
                        <Button variant="secondary" onClick={updateTicketQuantity}>
                          Atualizar
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTicket &&
            selectedTicket.status !== 'finalizado' &&
            selectedTicket.status !== 'cancelado' && (
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between px-3 font-normal',
                                !draft.supplierId && 'text-muted-foreground',
                              )}
                            >
                              <span className="truncate">
                                {draft.supplierId
                                  ? suppliers.find((s) => s.id === draft.supplierId)?.nome
                                  : 'Selecione...'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar fornecedor..." />
                              <CommandList>
                                <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {suppliers.map((s) => (
                                    <CommandItem
                                      key={s.id}
                                      value={s.nome}
                                      onSelect={() => {
                                        const newDrafts = [...draftQuotes]
                                        newDrafts[index].supplierId = s.id
                                        setDraftQuotes(newDrafts)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          draft.supplierId === s.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {s.nome}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                      draftQuotes.some(
                        (d) =>
                          !d.supplierId || !d.price || !d.deliveryDate || parseFloat(d.price) <= 0,
                      )
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
                    const total = quote.price * selectedTicket.recommendedQuantity
                    const hasWinner = selectedTicket.quotes.some((q) => q.isWinner)
                    return (
                      <TableRow key={quote.id} className={quote.isWinner ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">
                          {quote.supplierName}
                          {quote.isWinner && (
                            <Badge
                              variant="default"
                              className="ml-2 bg-green-600 hover:bg-green-700"
                            >
                              Aprovada
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
                          {quote.expectedDeliveryDate
                            ? format(
                                new Date(quote.expectedDeliveryDate + 'T12:00:00'),
                                'dd/MM/yyyy',
                              )
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {selectedTicket.status !== 'finalizado' &&
                              selectedTicket.status !== 'cancelado' &&
                              canFinalize &&
                              !quote.isWinner &&
                              !hasWinner && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                  onClick={() => openApprovalModal(quote.id)}
                                >
                                  <Check className="w-4 h-4 mr-2" /> Aprovar
                                </Button>
                              )}

                            {quote.isWinner && selectedTicket.ordemCompra && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-primary text-primary hover:bg-primary/5"
                                  onClick={() =>
                                    navigate(
                                      `/ordens-de-compra?poId=${selectedTicket.ordemCompra.id}&print=true`,
                                    )
                                  }
                                >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Imprimir Ordem de Compra
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDownloadOC(selectedTicket.id, selectedTicket.ordemCompra)
                                  }
                                  disabled={isDownloading === selectedTicket.id}
                                >
                                  {isDownloading === selectedTicket.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  PDF
                                </Button>
                              </div>
                            )}

                            {selectedTicket.status !== 'finalizado' &&
                              selectedTicket.status !== 'cancelado' &&
                              canFinalize && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                                  onClick={() => handleDeleteQuote(quote.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                          </div>
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

      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovação Financeira</DialogTitle>
            <DialogDescription>
              Registre a aprovação financeira para a cotação selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Aprovador (Financeiro) *</Label>
              <Input
                value={approvalData.aprovador_nome}
                onChange={(e) =>
                  setApprovalData({ ...approvalData, aprovador_nome: e.target.value })
                }
                placeholder="Nome do responsável"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Aprovação *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !approvalData.data_aprovacao && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {approvalData.data_aprovacao ? (
                        format(approvalData.data_aprovacao, 'dd/MM/yyyy')
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={approvalData.data_aprovacao}
                      onSelect={(date) =>
                        setApprovalData({ ...approvalData, data_aprovacao: date })
                      }
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora de Aprovação *</Label>
                <Input
                  type="time"
                  value={approvalData.hora_aprovacao}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, hora_aprovacao: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={approvalData.observacoes}
                onChange={(e) => setApprovalData({ ...approvalData, observacoes: e.target.value })}
                placeholder="Observações adicionais (opcional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalModalOpen(false)}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button onClick={handleApproveQuote} disabled={isApproving}>
              {isApproving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
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
                        Código: {ticket.itemCode} | Quantidade Solicitada:{' '}
                        {ticket.recommendedQuantity}
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
                              R$ {(quote.price * ticket.recommendedQuantity).toFixed(2)}
                            </TableCell>
                            <TableCell>{quote.paymentMethod || '-'}</TableCell>
                            <TableCell>{quote.shippingMethod || '-'}</TableCell>
                            <TableCell className="text-right">
                              {quote.expectedDeliveryDate
                                ? format(
                                    new Date(quote.expectedDeliveryDate + 'T12:00:00'),
                                    'dd/MM/yyyy',
                                  )
                                : '-'}
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
