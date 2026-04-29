import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Package, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import pb from '@/lib/pocketbase/client'
import {
  fetchProductionMovements,
  createProducaoSaida,
  createProducaoRetorno,
  getActiveProductionItems,
} from '@/services/production'
import { Movement, Item, Collaborator } from '@/lib/types'

const checkoutSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item'),
  colaborador_id: z.string().min(1, 'Selecione um colaborador'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  motivo: z.string().optional(),
})

const returnSchema = z.object({
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  motivo: z.string().optional(),
})

export default function ProductionItemsPage() {
  const isMobile = useIsMobile()
  const [movements, setMovements] = useState<Movement[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [returnItem, setReturnItem] = useState<(Movement & { currentQuantity: number }) | null>(
    null,
  )

  const checkoutForm = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { item_id: '', colaborador_id: '', quantidade: 1, motivo: '' },
  })

  const returnForm = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: { quantidade: 1, motivo: '' },
  })

  const loadData = async () => {
    try {
      setError(false)
      const [movs, its, cols] = await Promise.all([
        fetchProductionMovements(),
        pb.collection('itens').getFullList<Item>({ sort: 'nome' }),
        pb.collection('colaboradores').getFullList<Collaborator>({ sort: 'nome_completo' }),
      ])
      setMovements(movs)
      setItems(its)
      setCollaborators(cols)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('movimentacoes', () => {
    loadData()
  })

  useEffect(() => {
    if (returnItem) {
      returnForm.reset({ quantidade: returnItem.currentQuantity, motivo: '' })
    }
  }, [returnItem, returnForm])

  const onCheckout = async (data: z.infer<typeof checkoutSchema>) => {
    try {
      await createProducaoSaida({
        item_id: data.item_id,
        colaborador_id: data.colaborador_id,
        quantidade: data.quantidade,
        motivo: data.motivo,
        usuario_id: pb.authStore.record!.id,
      })
      toast.success('Saída registrada com sucesso!')
      setIsCheckoutOpen(false)
      checkoutForm.reset()
    } catch (e) {
      toast.error('Erro ao registrar saída')
    }
  }

  const onReturn = async (data: z.infer<typeof returnSchema>) => {
    if (!returnItem) return
    if (data.quantidade > returnItem.currentQuantity) {
      returnForm.setError('quantidade', {
        message: `Quantidade máxima é ${returnItem.currentQuantity}`,
      })
      return
    }
    try {
      await createProducaoRetorno({
        item_id: returnItem.item_id!,
        colaborador_id: returnItem.colaborador_id!,
        quantidade: data.quantidade,
        motivo: data.motivo,
        usuario_id: pb.authStore.record!.id,
      })
      toast.success('Retorno registrado com sucesso!')
      setReturnItem(null)
    } catch (e) {
      toast.error('Erro ao registrar retorno')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-full max-w-[400px] mt-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Não foi possivel carregar as informações.</p>
        <Button onClick={loadData} variant="outline" className="min-h-[44px]">
          Tentar novamente
        </Button>
      </div>
    )
  }

  const activeItems = getActiveProductionItems(movements)
  const historyItems = [...movements].sort(
    (a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime(),
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Itens em Produção</h2>
          <p className="text-muted-foreground mt-1">
            Controle simples de ferramentas e itens que saem para uso e retornam ao estoque.
          </p>
        </div>
        <Button onClick={() => setIsCheckoutOpen(true)} className="w-full sm:w-auto min-h-[44px]">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Saída
        </Button>
      </div>

      <Tabs defaultValue="em-uso" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 h-auto p-1">
          <TabsTrigger value="em-uso" className="min-h-[40px]">
            Em Uso
          </TabsTrigger>
          <TabsTrigger value="historico" className="min-h-[40px]">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="em-uso" className="mt-0">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20 border-dashed mt-4 mx-1">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum item em produção</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Todos os itens e ferramentas estão no estoque.
              </p>
              <Button
                onClick={() => setIsCheckoutOpen(true)}
                variant="outline"
                className="min-h-[44px]"
              >
                <Plus className="mr-2 h-4 w-4" /> Registrar Saída
              </Button>
            </div>
          ) : isMobile ? (
            <div className="grid gap-4 mt-4">
              {activeItems.map((item) => (
                <Card key={`${item.item_id}-${item.colaborador_id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-tight">
                      {item.expand?.item_id?.nome}
                    </CardTitle>
                    <CardDescription>{item.expand?.colaborador_id?.nome_completo}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span className="font-medium bg-muted px-2 py-1 rounded">
                        Qtd: {item.currentQuantity}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(item.created!), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    {item.motivo && (
                      <p className="text-sm text-muted-foreground mb-4 bg-muted/30 p-2 rounded">
                        {item.motivo}
                      </p>
                    )}
                    <Button
                      className="w-full min-h-[44px]"
                      variant="secondary"
                      onClick={() => setReturnItem(item)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Registrar Retorno
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Colaborador</TableHead>
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
                      <TableCell>
                        <Badge variant="secondary">{item.currentQuantity}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created!), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.motivo}>
                        {item.motivo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => setReturnItem(item)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retornar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          {historyItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg mt-4 border border-dashed">
              Nenhum histórico encontrado.
            </div>
          ) : isMobile ? (
            <div className="grid gap-3 mt-4">
              {historyItems.map((mov) => (
                <Card
                  key={mov.id}
                  className={cn(
                    'border-l-4',
                    mov.tipo_movimento === 'producao_saida'
                      ? 'border-l-orange-500'
                      : 'border-l-green-500',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-2">
                        <p className="font-semibold text-sm leading-tight">
                          {mov.expand?.item_id?.nome}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mov.expand?.colaborador_id?.nome_completo}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <Badge
                          variant={
                            mov.tipo_movimento === 'producao_saida' ? 'outline' : 'secondary'
                          }
                          className={cn(
                            'mb-1',
                            mov.tipo_movimento === 'producao_saida' &&
                              'border-orange-200 text-orange-700',
                          )}
                        >
                          {mov.tipo_movimento === 'producao_saida' ? 'Saída' : 'Retorno'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(mov.created!), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        Qtd: {mov.quantidade}
                      </span>
                    </div>
                    {mov.motivo && (
                      <p className="text-xs mt-3 bg-muted/50 p-2 rounded">{mov.motivo}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyItems.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(mov.created!), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            mov.tipo_movimento === 'producao_saida' ? 'outline' : 'secondary'
                          }
                          className={
                            mov.tipo_movimento === 'producao_saida'
                              ? 'border-orange-200 text-orange-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }
                        >
                          {mov.tipo_movimento === 'producao_saida' ? 'Saída' : 'Retorno'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{mov.expand?.item_id?.nome}</TableCell>
                      <TableCell>{mov.expand?.colaborador_id?.nome_completo}</TableCell>
                      <TableCell>{mov.quantidade}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={mov.motivo}>
                        {mov.motivo || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
            <DialogDescription>
              Selecione o item, colaborador e a quantidade para registrar a saída.
            </DialogDescription>
          </DialogHeader>
          <Form {...checkoutForm}>
            <form onSubmit={checkoutForm.handleSubmit(onCheckout)} className="space-y-4">
              <FormField
                control={checkoutForm.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item/Ferramenta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Selecione o item..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nome} (Estoque: {item.quantidade_atual})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkoutForm.control}
                name="colaborador_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colaborador</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Selecione o colaborador..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {collaborators.map((c) => (
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
              <FormField
                control={checkoutForm.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" className="min-h-[44px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkoutForm.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Motivo da saída ou detalhes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setIsCheckoutOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-[44px]">
                  Confirmar Saída
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnItem} onOpenChange={(open) => !open && setReturnItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Retorno</DialogTitle>
            <DialogDescription>
              Confirme o retorno do item para finalizar o uso na produção.
            </DialogDescription>
          </DialogHeader>
          {returnItem && (
            <Form {...returnForm}>
              <form onSubmit={returnForm.handleSubmit(onReturn)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md mb-4 border">
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Item</span>
                    <span className="font-medium">{returnItem.expand?.item_id?.nome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Colaborador</span>
                    <span className="font-medium">
                      {returnItem.expand?.colaborador_id?.nome_completo}
                    </span>
                  </div>
                </div>
                <FormField
                  control={returnForm.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quantidade Retornada (Máx: {returnItem.currentQuantity})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={returnItem.currentQuantity}
                          className="min-h-[44px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={returnForm.control}
                  name="motivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observação (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Retorno OK, precisa de manutenção..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setReturnItem(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-h-[44px]">
                    Confirmar Retorno
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
