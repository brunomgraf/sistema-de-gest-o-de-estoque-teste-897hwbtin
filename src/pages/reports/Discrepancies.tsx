import { useState, useEffect, useMemo } from 'react'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import { AlertTriangle, Search, FileText, Printer, FileSpreadsheet } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type ReceiptHistoryItem = {
  id: string
  data_recebimento: string
  quantidade_recebida: number
  status_verificacao: string
}

type DiscrepancyItem = {
  id: string
  ordem_compra_id: string
  numero_oc: string
  fornecedor_id: string
  fornecedor_nome: string
  item_nome: string
  item_sku: string
  data_pedido: string
  quantidade_solicitada: number
  quantidade_recebida: number
  divergencia: number
  historico_recebimento: ReceiptHistoryItem[]
}

type Fornecedor = {
  id: string
  nome: string
}

export default function Discrepancies() {
  const { user } = useAuth()

  const [items, setItems] = useState<DiscrepancyItem[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [ocSearch, setOcSearch] = useState<string>('')

  const [selectedItem, setSelectedItem] = useState<DiscrepancyItem | null>(null)

  const loadData = async () => {
    try {
      const [iocs, recs, forns] = await Promise.all([
        pb.collection('itens_ordem_compra').getFullList({
          expand: 'ordem_compra_id.fornecedor_id,item_id',
        }),
        pb.collection('recebimento').getFullList(),
        pb.collection('fornecedores').getFullList({ sort: 'nome' }),
      ])

      setFornecedores(forns.map((f) => ({ id: f.id, nome: f.nome })))

      const results: DiscrepancyItem[] = []

      for (const ioc of iocs) {
        const oc = ioc.expand?.ordem_compra_id
        if (!oc) continue

        const iocRecs = recs.filter(
          (r) => r.ordem_compra_id === ioc.ordem_compra_id && r.item_id === ioc.item_id,
        )
        const receivedQty = iocRecs.reduce((acc, r) => acc + (r.quantidade_recebida || 0), 0)
        const requestedQty = ioc.quantidade || 0

        if (receivedQty < requestedQty) {
          results.push({
            id: ioc.id,
            ordem_compra_id: oc.id,
            numero_oc: oc.numero_oc || oc.id,
            fornecedor_id: oc.fornecedor_id,
            fornecedor_nome: oc.expand?.fornecedor_id?.nome || 'Desconhecido',
            item_nome: ioc.expand?.item_id?.nome || 'Desconhecido',
            item_sku: ioc.expand?.item_id?.sku || 'N/A',
            data_pedido: oc.data_pedido,
            quantidade_solicitada: requestedQty,
            quantidade_recebida: receivedQty,
            divergencia: requestedQty - receivedQty,
            historico_recebimento: iocRecs
              .map((r) => ({
                id: r.id,
                data_recebimento: r.data_recebimento,
                quantidade_recebida: r.quantidade_recebida,
                status_verificacao: r.status_verificacao || 'N/A',
              }))
              .sort(
                (a, b) =>
                  new Date(b.data_recebimento).getTime() - new Date(a.data_recebimento).getTime(),
              ),
          })
        }
      }

      setItems(
        results.sort(
          (a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime(),
        ),
      )
    } catch (error) {
      console.error('Failed to load discrepancies:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('itens_ordem_compra', loadData)
  useRealtime('recebimento', loadData)
  useRealtime('ordens_compra', loadData)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      let matchesDate = true
      if (dateRange?.from) {
        const itemDate = parseISO(item.data_pedido)
        const start = startOfDay(dateRange.from)
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
        matchesDate = isWithinInterval(itemDate, { start, end })
      }

      const matchesSupplier = supplierFilter === 'all' || item.fornecedor_id === supplierFilter
      const matchesOc = !ocSearch || item.numero_oc.toLowerCase().includes(ocSearch.toLowerCase())

      return matchesDate && matchesSupplier && matchesOc
    })
  }, [items, dateRange, supplierFilter, ocSearch])

  const handleExportExcel = () => {
    const headers = [
      'Data do Pedido',
      'Número da OC',
      'Fornecedor',
      'SKU',
      'Item',
      'Qtd. Solicitada',
      'Qtd. Recebida',
      'Divergência',
    ]
    const rows = filteredItems.map((item) => [
      format(parseISO(item.data_pedido), 'dd/MM/yyyy'),
      item.numero_oc,
      `"${item.fornecedor_nome}"`,
      item.item_sku,
      `"${item.item_nome}"`,
      item.quantidade_solicitada,
      item.quantidade_recebida,
      item.divergencia,
    ])

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `divergencias_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Divergências - Oficina Graf</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .brand { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; color: #444; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .text-right { text-align: right; }
            .danger { color: #d9534f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">Oficina Graf</div>
            <div class="title">Relatório de Divergências</div>
            <div class="meta">Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Data Pedido</th>
                <th>Nº OC</th>
                <th>Fornecedor</th>
                <th>SKU</th>
                <th>Item</th>
                <th class="text-right">Qtd. Solicitada</th>
                <th class="text-right">Qtd. Recebida</th>
                <th class="text-right">Divergência</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems
                .map(
                  (item) => `
                <tr>
                  <td>${format(parseISO(item.data_pedido), 'dd/MM/yyyy')}</td>
                  <td>${item.numero_oc}</td>
                  <td>${item.fornecedor_nome}</td>
                  <td>${item.item_sku}</td>
                  <td>${item.item_nome}</td>
                  <td class="text-right">${item.quantidade_solicitada}</td>
                  <td class="text-right">${item.quantidade_recebida}</td>
                  <td class="text-right danger">${item.divergencia}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  if (user?.role !== 'admin' && user?.role !== 'gestor') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Relatório de Divergências
          </h1>
          <p className="text-muted-foreground">
            Acompanhe itens com quantidade recebida menor que a solicitada em ordens de compra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0 || loading}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={handleExportPDF} disabled={filteredItems.length === 0 || loading}>
            <Printer className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>Refine a busca por data, fornecedor ou número da OC.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período da OC</Label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número da OC</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por OC..."
                  className="pl-9"
                  value={ocSearch}
                  onChange={(e) => setOcSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº OC</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd Solicitada</TableHead>
                <TableHead className="text-right">Qtd Recebida</TableHead>
                <TableHead className="text-right">Divergência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhuma divergência encontrada com os filtros atuais.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedItem(item)}
                  >
                    <TableCell className="font-medium">{item.numero_oc}</TableCell>
                    <TableCell>{format(parseISO(item.data_pedido), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{item.fornecedor_nome}</TableCell>
                    <TableCell>{item.item_nome}</TableCell>
                    <TableCell className="text-right">{item.quantidade_solicitada}</TableCell>
                    <TableCell className="text-right">{item.quantidade_recebida}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-bold">
                        {item.divergencia}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Divergência</SheetTitle>
            <SheetDescription>Ordem de Compra: {selectedItem?.numero_oc}</SheetDescription>
          </SheetHeader>

          {selectedItem && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{selectedItem.fornecedor_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {format(parseISO(selectedItem.data_pedido), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Item</p>
                  <p className="font-medium">{selectedItem.item_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qtd. Solicitada</p>
                  <p className="font-medium">{selectedItem.quantidade_solicitada}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qtd. Recebida</p>
                  <p className="font-medium">{selectedItem.quantidade_recebida}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Divergência</p>
                  <Badge variant="destructive" className="mt-1">
                    {selectedItem.divergencia}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium border-b pb-2 mb-4">Histórico de Recebimentos</h4>
                {selectedItem.historico_recebimento.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum recebimento registrado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedItem.historico_recebimento.map((hist) => (
                      <div
                        key={hist.id}
                        className="flex flex-col gap-1 p-3 border rounded-md text-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-primary">
                            {hist.data_recebimento
                              ? format(parseISO(hist.data_recebimento), 'dd/MM/yyyy')
                              : 'Data não informada'}
                          </span>
                          <Badge variant="outline">{hist.status_verificacao}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          Quantidade recebida:{' '}
                          <span className="font-medium text-foreground">
                            {hist.quantidade_recebida}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
