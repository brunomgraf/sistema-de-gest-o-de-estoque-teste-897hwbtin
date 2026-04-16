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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileCheck,
  Search,
  FileText,
  AlertTriangle,
  Printer,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function PurchaseOrders() {
  const { user } = useAuth()
  const canEditStatus = user?.role === 'admin' || user?.role === 'gestor'

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null)

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [aprovacoes, setAprovacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const [approvalFormOpen, setApprovalFormOpen] = useState(false)
  const [approvalData, setApprovalData] = useState({ aprovador_nome: '', observacoes: '' })

  const loadData = async () => {
    try {
      const [poRes, supRes, itRes, aprovRes, cotacoesRes] = await Promise.all([
        pb
          .collection('ordens_compra')
          .getFullList({ sort: '-data_pedido', expand: 'fornecedor_id' }),
        pb.collection('fornecedores').getFullList(),
        pb.collection('itens').getFullList(),
        pb.collection('aprovacoes_financeiras').getFullList({ sort: '-data_aprovacao' }),
        pb.collection('cotacoes').getFullList(),
      ])

      const pos = await Promise.all(
        poRes.map(async (po) => {
          const poItems = await pb
            .collection('itens_ordem_compra')
            .getFullList({ filter: `ordem_compra_id = "${po.id}"` })
          const cotacao = cotacoesRes.find((c) => c.id === po.cotacao_id)
          return {
            id: po.id,
            solicitacao_id: cotacao?.solicitacao_id,
            number: po.numero_oc || 'OC-' + po.id.slice(0, 6).toUpperCase(),
            supplierId: po.fornecedor_id,
            supplierName: po.expand?.fornecedor_id?.nome,
            items: poItems.map((i) => ({
              itemId: i.item_id,
              quantity: i.quantidade,
              price: i.valor_unitario,
            })),
            totalValue: po.valor_total,
            expectedDeliveryDate: po.data_entrega_prevista,
            status: po.status,
            tipo_entrega: po.tipo_entrega,
            descricao_produtos: po.descricao_produtos,
            condicoes_pagamento: po.condicoes_pagamento,
            cotacao_id: po.cotacao_id,
          }
        }),
      )

      setPurchaseOrders(pos)
      setSuppliers(supRes)
      setItems(itRes)
      setAprovacoes(aprovRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ordens_compra', loadData)
  useRealtime('aprovacoes_financeiras', loadData)

  useEffect(() => {
    const poId = searchParams.get('poId')
    const shouldPrint = searchParams.get('print') === 'true'

    if (poId) {
      setSelectedPoId(poId)
      setSearchParams({})

      if (shouldPrint) {
        // Wait for dialog to open and data to render
        setTimeout(() => {
          handlePrint()
        }, 500)
      }
    }
  }, [searchParams, setSearchParams])

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (!searchTerm) return true
      const matchesTicket = po.items.some((item) =>
        item.itemId?.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const handlePrint = () => {
    window.print()
  }

  const handleSaveApproval = async () => {
    if (!selectedPoId || !approvalData.aprovador_nome) {
      toast.error('Preencha o nome do aprovador.')
      return
    }
    if (!selectedPo?.solicitacao_id) {
      toast.error('Não é possível aprovar: Solicitação de compra não encontrada para esta OC.')
      return
    }
    try {
      await pb.collection('aprovacoes_financeiras').create({
        solicitacao_id: selectedPo.solicitacao_id,
        aprovador_nome: approvalData.aprovador_nome,
        data_aprovacao: format(new Date(), 'yyyy-MM-dd') + ' 12:00:00.000Z',
        hora_aprovacao: format(new Date(), 'HH:mm'),
        observacoes: approvalData.observacoes,
      })
      toast.success('Aprovação registrada com sucesso!')
      setApprovalFormOpen(false)
      setApprovalData({ aprovador_nome: '', observacoes: '' })
    } catch (e) {
      console.error(e)
      toast.error('Erro ao registrar aprovação.')
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!window.confirm(`Deseja alterar o status desta OC para ${newStatus.toUpperCase()}?`)) return
    setIsUpdatingStatus(true)
    try {
      await pb.collection('ordens_compra').update(id, { status: newStatus })
      toast.success('Ordem de Compra atualizada com sucesso!')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao atualizar OC: ' + getErrorMessage(e))
    } finally {
      setIsUpdatingStatus(false)
    }
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
            placeholder="Filtrar por Nº da OC..."
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24">
                  <Skeleton className="h-12 w-full" />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de compra encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.number}</TableCell>
                  <TableCell>{po.supplierName || 'Fornecedor Desconhecido'}</TableCell>
                  <TableCell className="text-right">{po.items.length}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {po.totalValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {po.expectedDeliveryDate
                      ? format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        po.status === 'pendente'
                          ? 'secondary'
                          : po.status === 'cancelado'
                            ? 'destructive'
                            : 'default'
                      }
                    >
                      {po.status === 'pendente'
                        ? 'Pendente'
                        : po.status === 'cancelado'
                          ? 'Cancelado'
                          : 'Entregue'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedPoId(po.id)}>
                          <FileText className="mr-2 h-4 w-4" /> Ver Documento
                        </DropdownMenuItem>
                        {po.status === 'pendente' && canEditStatus && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(po.id, 'entregue')}>
                              <Check className="mr-2 h-4 w-4 text-green-600" /> Marcar como Entregue
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(po.id, 'cancelado')}
                            >
                              <X className="mr-2 h-4 w-4 text-red-600" /> Cancelar OC
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
                  variant={
                    selectedPo?.status === 'pendente'
                      ? 'secondary'
                      : selectedPo?.status === 'cancelado'
                        ? 'destructive'
                        : 'default'
                  }
                  className="text-sm"
                >
                  {selectedPo?.status === 'pendente'
                    ? 'Pendente'
                    : selectedPo?.status === 'cancelado'
                      ? 'Cancelado'
                      : 'Entregue'}
                </Badge>
                {selectedPo?.status === 'pendente' && canEditStatus && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-4 print:hidden border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => handleUpdateStatus(selectedPo.id, 'entregue')}
                    disabled={isUpdatingStatus}
                  >
                    <Check className="w-4 h-4 mr-2" /> Marcar como Entregue
                  </Button>
                )}
                {selectedPo?.status === 'pendente' && canEditStatus && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="print:hidden border-red-600 text-red-600 hover:bg-red-50"
                    onClick={() => handleUpdateStatus(selectedPo.id, 'cancelado')}
                    disabled={isUpdatingStatus}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancelar OC
                  </Button>
                )}
              </span>
              <Button onClick={handlePrint} variant="outline" className="mr-6 print:hidden">
                <Printer className="w-4 h-4 mr-2" /> Imprimir Ordem de Compra
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
                    {selectedPo.expectedDeliveryDate
                      ? format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                  {selectedPo.expectedDeliveryDate && (
                    <p className="text-sm text-muted-foreground">
                      às {format(new Date(selectedPo.expectedDeliveryDate), 'HH:mm')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 border rounded-md bg-muted/5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">
                    Condições de Pagamento
                  </p>
                  <p className="font-medium">{selectedPo.condicoes_pagamento || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">
                    Tipo de Entrega
                  </p>
                  <p className="font-medium">{selectedPo.tipo_entrega || '-'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">
                    Descrição dos Produtos
                  </p>
                  <p className="font-medium">{selectedPo.descricao_produtos || '-'}</p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Item</TableHead>
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
                            {itemDetails?.sku || itemDetails?.code || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {itemDetails?.nome || 'Item desconhecido'}
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

              <div className="mt-8 border-t pt-6 print:hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">Aprovações Financeiras</h4>
                  <Button
                    size="sm"
                    onClick={() => setApprovalFormOpen(true)}
                    disabled={selectedPo.status !== 'pendente'}
                  >
                    Registrar Aprovação
                  </Button>
                </div>

                {aprovacoes.filter((a) => a.solicitacao_id === selectedPo.solicitacao_id).length ===
                0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aprovação registrada.</p>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Aprovador</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aprovacoes
                          .filter((a) => a.solicitacao_id === selectedPo.solicitacao_id)
                          .map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                {format(new Date(a.data_aprovacao), 'dd/MM/yyyy')}{' '}
                                {a.hora_aprovacao}
                              </TableCell>
                              <TableCell className="font-medium">{a.aprovador_nome}</TableCell>
                              <TableCell>{a.observacoes || '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approvalFormOpen} onOpenChange={setApprovalFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Aprovação Financeira</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Aprovador *</Label>
              <Input
                value={approvalData.aprovador_nome}
                onChange={(e) =>
                  setApprovalData({ ...approvalData, aprovador_nome: e.target.value })
                }
                placeholder="Nome do responsável pela aprovação"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={approvalData.observacoes}
                onChange={(e) => setApprovalData({ ...approvalData, observacoes: e.target.value })}
                placeholder="Ex: Aprovado conforme orçamento recebido"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveApproval}>Salvar Aprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Area - A4 Portrait Optimization */}
      {selectedPo && (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body * { visibility: hidden; }
              #printable-area, #printable-area * { visibility: visible; }
              #printable-area { position: absolute; left: 0; top: 0; width: 100%; min-height: 100%; background: white; margin: 0; padding: 10mm; }
            }
          `,
            }}
          />
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
                <h2 className="text-xl font-bold">OFICINA GRAF</h2>
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
                  <span className="font-semibold">Telefone:</span>{' '}
                  {selectedSupplier?.phone || 'N/A'}
                </p>
              </div>
              <div className="border border-black p-4 rounded-sm">
                <h3 className="font-bold uppercase border-b border-black pb-2 mb-2">
                  Condições Comerciais
                </h3>
                <div className="space-y-1">
                  <p>
                    <span className="font-semibold">Pagamento:</span>{' '}
                    {selectedPo.condicoes_pagamento || 'Não informada'}
                  </p>
                  <p>
                    <span className="font-semibold">Frete/Entrega:</span>{' '}
                    {selectedPo.tipo_entrega || 'Não informado'}
                  </p>
                  <p>
                    <span className="font-semibold">Data de Entrega:</span>{' '}
                    {selectedPo.expectedDeliveryDate
                      ? format(new Date(selectedPo.expectedDeliveryDate), 'dd/MM/yyyy')
                      : '-'}
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
                          {itemDetails?.sku || itemDetails?.code || 'N/A'}
                        </td>
                        <td className="p-2 border border-black">
                          {itemDetails?.nome || 'Item desconhecido'}
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
            <div className="flex justify-end shrink-0 mb-6">
              <div className="border-2 border-black p-4 min-w-[300px] text-right">
                <p className="text-sm uppercase font-bold text-gray-700 mb-1">
                  Total da Ordem de Compra
                </p>
                <p className="text-2xl font-bold">R$ {selectedPo.totalValue.toFixed(2)}</p>
              </div>
            </div>

            {/* Aprovações */}
            {aprovacoes.filter((a) => a.solicitacao_id === selectedPo.solicitacao_id).length >
              0 && (
              <div className="mb-6 border border-black p-4 rounded-sm text-sm">
                <h3 className="font-bold uppercase border-b border-black pb-2 mb-2">
                  Aprovações Financeiras Registradas
                </h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold pb-1 w-1/4">Aprovador</th>
                      <th className="text-left font-semibold pb-1 w-1/4">Data</th>
                      <th className="text-left font-semibold pb-1 w-1/2">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aprovacoes
                      .filter((a) => a.solicitacao_id === selectedPo.solicitacao_id)
                      .map((a) => (
                        <tr key={a.id}>
                          <td className="py-1">{a.aprovador_nome}</td>
                          <td className="py-1">
                            {format(new Date(a.data_aprovacao), 'dd/MM/yyyy')} {a.hora_aprovacao}
                          </td>
                          <td className="py-1">{a.observacoes || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-auto pt-8 grid grid-cols-2 gap-12">
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
        </>
      )}
    </div>
  )
}
