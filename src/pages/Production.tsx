import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Package, AlertCircle, RefreshCcw, Download, FilterX } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Movement, Item, Collaborator } from '@/lib/types'
import {
  fetchProductionMovements,
  createProducaoSaida,
  createProducaoRetorno,
  getActiveProductionItems,
} from '@/services/production'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useIsMobile } from '@/hooks/use-mobile'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const outSchema = z.object({
  item_id: z.string().min(1, 'Item é obrigatório'),
  colaborador_id: z.string().min(1, 'Colaborador é obrigatório'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que 0'),
  ordem_producao: z.string().optional(),
  motivo: z.string().optional(),
})

const returnSchema = z.object({
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que 0'),
  motivo: z.string().optional(),
})

function ProductionOutModal({ isOpen, onClose, items, collaborators, userId }: any) {
  const form = useForm({
    resolver: zodResolver(outSchema),
    defaultValues: {
      item_id: '',
      colaborador_id: '',
      quantidade: 1,
      ordem_producao: '',
      motivo: '',
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen)
      form.reset({ item_id: '', colaborador_id: '', quantidade: 1, ordem_producao: '', motivo: '' })
  }, [isOpen, form])

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      await createProducaoSaida({ ...data, usuario_id: userId })
      toast.success('Saída registrada com sucesso!')
      onClose()
    } catch (err) {
      const errs = extractFieldErrors(err)
      Object.entries(errs).forEach(([k, v]) => form.setError(k as any, { message: v }))
      if (Object.keys(errs).length === 0) toast.error('Erro ao registrar saída')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saída para Produção</DialogTitle>
          <DialogDescription>Selecione o item, o colaborador e a quantidade.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colaborador_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colaborador</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um colaborador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {collaborators.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ordem_producao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Produção</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: OP-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Registrar Saída'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ProductionReturnModal({ item, onClose, userId }: any) {
  const isOpen = !!item

  const form = useForm({
    resolver: zodResolver(returnSchema),
    defaultValues: { quantidade: item?.currentQuantity || 1, motivo: '' },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && item) form.reset({ quantidade: item.currentQuantity, motivo: '' })
  }, [isOpen, item, form])

  const onSubmit = async (data: any) => {
    if (!item) return
    try {
      setIsSubmitting(true)
      await createProducaoRetorno({
        item_id: item.item_id,
        colaborador_id: item.colaborador_id,
        quantidade: data.quantidade,
        motivo: data.motivo,
        usuario_id: userId,
      })
      toast.success('Retorno registrado com sucesso!')
      onClose()
    } catch (err) {
      const errs = extractFieldErrors(err)
      Object.entries(errs).forEach(([k, v]) => form.setError(k as any, { message: v }))
      if (Object.keys(errs).length === 0) toast.error('Erro ao registrar retorno')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Retorno</DialogTitle>
          <DialogDescription>
            Devolvendo: {item?.expand?.item_id?.nome} (de{' '}
            {item?.expand?.colaborador_id?.nome_completo})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade a retornar (Máx: {item?.currentQuantity})</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max={item?.currentQuantity} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição / Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Como o item retornou?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Confirmar Retorno'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProductionItemsPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [items, setItems] = useState<Item[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  const [isOutModalOpen, setIsOutModalOpen] = useState(false)
  const [returnItem, setReturnItem] = useState<any>(null)

  // Filters state
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedColaborador, setSelectedColaborador] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<string>('all')
  const [ordemProducaoFilter, setOrdemProducaoFilter] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const movs = await fetchProductionMovements()
      setMovements(movs)

      const [itemsData, collabsData] = await Promise.all([
        pb.collection('itens').getFullList<Item>({ sort: 'nome' }),
        pb.collection('colaboradores').getFullList<Collaborator>({ sort: 'nome_completo' }),
      ])
      setItems(itemsData)
      setCollaborators(collabsData)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Saída de Estoque FERRAMENTAS - Oficina Graf'
    loadData()
  }, [])

  useRealtime('movimentacoes', () => {
    fetchProductionMovements().then(setMovements).catch(console.error)
  })

  const activeItems = getActiveProductionItems(movements)
  const historyItems = movements
    .filter((m) => {
      if (
        selectedColaborador &&
        selectedColaborador !== 'all' &&
        m.colaborador_id !== selectedColaborador
      )
        return false
      if (selectedItem && selectedItem !== 'all' && m.item_id !== selectedItem) return false

      if (
        ordemProducaoFilter &&
        (!m.ordem_producao ||
          !m.ordem_producao.toLowerCase().includes(ordemProducaoFilter.toLowerCase()))
      ) {
        return false
      }

      const movDateStr = m.data_movimento || m.created
      if (movDateStr) {
        const movDate = new Date(movDateStr)
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`)
          if (movDate < start) return false
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`)
          if (movDate > end) return false
        }
      }
      return true
    })
    .sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedColaborador('all')
    setSelectedItem('all')
    setOrdemProducaoFilter('')
  }

  const exportCSV = () => {
    if (historyItems.length === 0) {
      toast.error('Nenhum dado para exportar')
      return
    }
    const headers = [
      'Tipo',
      'Data',
      'Colaborador',
      'Item',
      'Ordem de Produção',
      'Quantidade',
      'Motivo/OS',
    ]
    const rows = historyItems.map((item) => {
      const tipo = item.tipo_movimento === 'producao_saida' ? 'Saída' : 'Retorno'
      const date =
        item.data_movimento || item.created
          ? format(new Date(item.data_movimento || item.created || 0), 'dd/MM/yyyy HH:mm', {
              locale: ptBR,
            })
          : '-'
      const colab = item.expand?.colaborador_id?.nome_completo || '-'
      const itemName = item.expand?.item_id?.nome || '-'
      const op = item.ordem_producao || '-'
      const qtd = item.quantidade || 0
      const obs = item.motivo || '-'
      return [tipo, date, colab, itemName, op, qtd, obs]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `historico_saida_ferramentas_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Não foi possível carregar os itens</h2>
        <Button onClick={loadData} variant="outline" className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saída de Estoque FERRAMENTAS</h1>
          <p className="text-muted-foreground">
            Controle simples de ferramentas e itens que saem para uso e retornam ao estoque.
          </p>
        </div>
        <Button onClick={() => setIsOutModalOpen(true)}>
          <Package className="mr-2 h-4 w-4" /> Registrar Saída
        </Button>
      </div>

      <Tabs defaultValue="em-uso" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="em-uso">Em Uso</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="em-uso">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg bg-muted/20 p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum item em produção</h3>
              <Button onClick={() => setIsOutModalOpen(true)} variant="outline" className="mt-4">
                Registrar Saída
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {activeItems.map((item) => (
                <Card key={`${item.item_id}-${item.colaborador_id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold">{item.expand?.item_id?.nome}</div>
                      <Badge variant="secondary">{item.currentQuantity} unid.</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Colaborador: {item.expand?.colaborador_id?.nome_completo}
                    </div>
                    {item.ordem_producao && (
                      <div className="text-sm text-muted-foreground">OP: {item.ordem_producao}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Saída:{' '}
                      {item.created
                        ? format(new Date(item.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </div>
                    {item.motivo && (
                      <div className="text-sm border-l-2 pl-2 text-muted-foreground">
                        {item.motivo}
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      className="w-full mt-2 min-h-[44px]"
                      onClick={() => setReturnItem(item)}
                      aria-label={`Registrar retorno de ${item.expand?.item_id?.nome}`}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Registrar Retorno
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Ordem Prod.</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Data de Saída</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeItems.map((item) => (
                    <TableRow key={`${item.item_id}-${item.colaborador_id}`}>
                      <TableCell className="font-medium">{item.expand?.item_id?.nome}</TableCell>
                      <TableCell>{item.expand?.colaborador_id?.nome_completo}</TableCell>
                      <TableCell>{item.ordem_producao || '-'}</TableCell>
                      <TableCell>{item.currentQuantity}</TableCell>
                      <TableCell>
                        {item.created
                          ? format(new Date(item.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground max-w-[200px] truncate"
                        title={item.motivo}
                      >
                        {item.motivo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          onClick={() => setReturnItem(item)}
                          aria-label={`Registrar retorno de ${item.expand?.item_id?.nome}`}
                        >
                          Retornar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {collaborators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem de Produção</Label>
                  <Input
                    type="text"
                    placeholder="Filtrar por Ordem de Produção"
                    value={ordemProducaoFilter}
                    onChange={(e) => setOrdemProducaoFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  <FilterX className="mr-2 h-4 w-4" /> Limpar Filtros
                </Button>
                <Button onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" /> Extrair Relatório
                </Button>
              </div>
            </CardContent>
          </Card>

          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">Nenhum registro encontrado.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <Badge
                        variant={
                          item.tipo_movimento === 'producao_saida' ? 'destructive' : 'default'
                        }
                      >
                        {item.tipo_movimento === 'producao_saida' ? 'Saída' : 'Retorno'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.created
                          ? format(new Date(item.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </span>
                    </div>
                    <div className="font-semibold">{item.expand?.item_id?.nome}</div>
                    <div className="text-sm">
                      Colab: {item.expand?.colaborador_id?.nome_completo}
                    </div>
                    {item.ordem_producao && (
                      <div className="text-sm">OP: {item.ordem_producao}</div>
                    )}
                    <div className="text-sm">Qtd: {item.quantidade}</div>
                    {item.motivo && (
                      <div className="text-sm text-muted-foreground truncate">{item.motivo}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Ordem Prod.</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge
                          variant={
                            item.tipo_movimento === 'producao_saida' ? 'destructive' : 'default'
                          }
                          className="font-normal"
                        >
                          {item.tipo_movimento === 'producao_saida' ? 'Saída' : 'Retorno'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.expand?.item_id?.nome}</TableCell>
                      <TableCell>{item.expand?.colaborador_id?.nome_completo}</TableCell>
                      <TableCell>{item.ordem_producao || '-'}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>
                        {item.created
                          ? format(new Date(item.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.motivo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProductionOutModal
        isOpen={isOutModalOpen}
        onClose={() => setIsOutModalOpen(false)}
        items={items}
        collaborators={collaborators}
        userId={user?.id}
      />
      <ProductionReturnModal
        item={returnItem}
        onClose={() => setReturnItem(null)}
        userId={user?.id}
      />
    </div>
  )
}
