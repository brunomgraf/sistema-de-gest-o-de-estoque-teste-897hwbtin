import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  FileText,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { FornecedorContato } from '@/lib/types'
import { toast } from 'sonner'

const contactSchema = z.object({
  data_contato: z.string().min(1, 'Data é obrigatória'),
  tipo: z.enum(['email', 'telefone', 'reuniao', 'outros']),
  descricao: z.string().min(3, 'Descrição é obrigatória'),
})

type ContactFormValues = z.infer<typeof contactSchema>

export default function SupplierProfile() {
  const { id } = useParams<{ id: string }>()
  const user = pb.authStore.record
  const [supplier, setSupplier] = useState<any>(null)
  const [contacts, setContacts] = useState<FornecedorContato[]>([])
  const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      data_contato: new Date().toISOString().split('T')[0],
      tipo: 'email',
      descricao: '',
    },
  })

  const loadData = async () => {
    if (!id) return
    try {
      const [suppRes, contRes, ordersRes, receiptsRes] = await Promise.all([
        pb.collection('fornecedores').getOne(id),
        pb.collection('fornecedor_contatos').getFullList({
          filter: `fornecedor_id = "${id}"`,
          sort: '-data_contato',
          expand: 'usuario_id',
        }),
        pb.collection('ordens_compra').getFullList({
          filter: `fornecedor_id = "${id}" && (status = 'entregue' || status = 'recebido')`,
        }),
        pb.collection('recebimento').getFullList(),
      ])

      setSupplier(suppRes)
      setContacts(contRes as unknown as FornecedorContato[])

      let total = 0,
        onTime = 0,
        late = 0
      ordersRes.forEach((order) => {
        if (!order.data_entrega_prevista) return
        total++
        const expected = new Date(order.data_entrega_prevista)
        const receipt = receiptsRes.find((r) => r.ordem_compra_id === order.id)
        const actual = receipt
          ? new Date(receipt.data_recebimento || receipt.created)
          : new Date(order.updated)

        expected.setHours(0, 0, 0, 0)
        actual.setHours(0, 0, 0, 0)

        if (actual <= expected) onTime++
        else late++
      })
      setStats({ total, onTime, late })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados do fornecedor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'gestor') loadData()
  }, [id, user])

  useRealtime('fornecedor_contatos', () => {
    if (user?.role === 'admin' || user?.role === 'gestor') loadData()
  })

  const onSubmitContact = async (data: ContactFormValues) => {
    if (!id || !user) return
    try {
      await pb.collection('fornecedor_contatos').create({
        fornecedor_id: id,
        usuario_id: user.id,
        data_contato: new Date(data.data_contato).toISOString(),
        tipo: data.tipo,
        descricao: data.descricao,
      })
      toast.success('Contato registrado com sucesso')
      setDialogOpen(false)
      form.reset()
      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao registrar contato')
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'gestor') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Acesso restrito.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!supplier) {
    return <div className="p-6">Fornecedor não encontrado.</div>
  }

  const percentOnTime = stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0
  const getPerformanceColor = (pct: number) => {
    if (stats.total === 0) return 'text-muted-foreground'
    if (pct > 90) return 'text-emerald-500'
    if (pct >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'telefone':
        return <Phone className="h-4 w-4" />
      case 'reuniao':
        return <CalendarIcon className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/fornecedores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{supplier.nome}</h2>
          <p className="text-muted-foreground">Perfil e CRM do Fornecedor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div>{supplier.email || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Telefone</div>
              <div>{supplier.telefone || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Endereço / Contato</div>
              <div>{supplier.endereco || '-'}</div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Taxa de Pontualidade
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(percentOnTime)}`}>
                {stats.total > 0 ? `${percentOnTime.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.onTime} entregas no prazo de {stats.total} pedidos fechados
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          <Tabs defaultValue="history" className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="history">Histórico de Contatos</TabsTrigger>
                  <TabsTrigger value="performance">Desempenho</TabsTrigger>
                </TabsList>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Registrar Contato
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Registro de Contato</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmitContact)}
                        className="space-y-4 pt-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="data_contato"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tipo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Contato</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="telefone">Telefone</SelectItem>
                                    <SelectItem value="reuniao">Reunião</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resumo / Descrição</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Descreva os detalhes da interação..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">Salvar Registro</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="history" className="m-0 space-y-4">
                {contacts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                    Nenhum registro de contato encontrado.
                  </div>
                ) : (
                  <div className="space-y-4 border-l-2 border-muted ml-3 pl-4 py-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="relative">
                        <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="capitalize flex gap-1 items-center bg-background"
                              >
                                <TypeIcon type={contact.tipo} />
                                {contact.tipo}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">
                                {format(new Date(contact.data_contato), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              por {contact.expand?.usuario_id?.name || 'Usuário'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{contact.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="performance" className="m-0">
                <div className="py-6 flex flex-col items-center justify-center text-center border rounded-lg border-dashed">
                  <Activity className={`h-12 w-12 mb-4 ${getPerformanceColor(percentOnTime)}`} />
                  <h3 className="text-xl font-bold mb-2">Métrica de Pontualidade</h3>
                  <div className="grid grid-cols-2 gap-8 mt-4 text-left">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedidos Fechados</p>
                      <p className="text-3xl font-semibold">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entregues no Prazo</p>
                      <p className="text-3xl font-semibold text-emerald-500">{stats.onTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasados</p>
                      <p className="text-3xl font-semibold text-red-500">{stats.late}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confiabilidade</p>
                      <p className={`text-3xl font-semibold ${getPerformanceColor(percentOnTime)}`}>
                        {stats.total > 0 ? `${percentOnTime.toFixed(1)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
