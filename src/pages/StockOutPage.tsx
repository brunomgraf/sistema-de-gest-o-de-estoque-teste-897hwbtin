import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Plus, Trash2, ArrowLeft, Check, ChevronsUpDown } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

const schema = z.object({
  solicitante: z.string().min(1, 'Solicitante é obrigatório'),
  ordem_servico: z.string().min(1, 'Ordem de Serviço é obrigatória'),
  data_movimento: z.date({
    required_error: 'Data é obrigatória',
  }),
  motivo: z.string().optional(),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, 'Selecione um item'),
        quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
      }),
    )
    .min(1, 'Adicione pelo menos um item'),
})

type FormValues = z.infer<typeof schema>

export default function StockOutPage() {
  const navigate = useNavigate()
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loadingCollabs, setLoadingCollabs] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      solicitante: '',
      ordem_servico: '',
      data_movimento: new Date(),
      motivo: '',
      items: [{ item_id: '', quantidade: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: 'items',
    control: form.control,
  })

  useEffect(() => {
    document.title = 'Saida de Estoque ITENS - Oficina Graf'
    const fetchItems = async () => {
      try {
        const records = await pb.collection('itens').getFullList({
          filter: 'tipo = "item"',
          sort: 'nome',
        })
        setAvailableItems(records)
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar itens')
      }
    }

    const fetchCollabs = async () => {
      try {
        const records = await pb.collection('colaboradores').getFullList({ sort: 'nome_completo' })
        setCollaborators(records)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingCollabs(false)
      }
    }

    fetchItems()
    fetchCollabs()
  }, [])

  const onSubmit = async (data: FormValues) => {
    try {
      const userId = pb.authStore.record?.id
      if (!userId) throw new Error('Usuário não autenticado')

      // Validate available quantities
      for (const item of data.items) {
        const dbItem = availableItems.find((i) => i.id === item.item_id)
        if (!dbItem) {
          toast.error('Item inválido selecionado')
          return
        }
        if (item.quantidade > dbItem.quantidade_atual) {
          toast.error(
            `Quantidade indisponível para o item ${dbItem.nome}. Saldo: ${dbItem.quantidade_atual}`,
          )
          return
        }
      }

      // Process all creations
      for (const item of data.items) {
        await pb.collection('movimentacoes').create({
          item_id: item.item_id,
          tipo_movimento: 'saida',
          quantidade: item.quantidade,
          data_movimento: data.data_movimento.toISOString(),
          motivo: data.motivo || '',
          usuario_id: userId,
          solicitante: data.solicitante,
          ordem_servico: data.ordem_servico,
        })

        const dbItem = availableItems.find((i) => i.id === item.item_id)
        const newQty = dbItem.quantidade_atual - item.quantidade
        await pb.collection('itens').update(item.item_id, {
          quantidade_atual: newQty,
          status_critico: newQty <= (dbItem.quantidade_minima || 0),
        })
      }

      toast.success('Saída de estoque registrada com sucesso!')
      navigate('/estoque')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao registrar saída')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4 border-b pb-4">
        <Link to="/estoque">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Saida de Estoque ITENS</h2>
          <p className="text-muted-foreground">
            Registre a retirada de múltiplos itens do estoque.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Movimentação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="solicitante"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2.5">
                      <FormLabel className="mb-2">Solicitante *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground',
                              )}
                              disabled={loadingCollabs || collaborators.length === 0}
                            >
                              {field.value
                                ? collaborators.find((c) => c.nome_completo === field.value)
                                    ?.nome_completo || field.value
                                : loadingCollabs
                                  ? 'Carregando...'
                                  : collaborators.length === 0
                                    ? 'Nenhum colaborador cadastrado'
                                    : 'Selecione um colaborador'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0"
                          align="start"
                          style={{ width: 'var(--radix-popover-trigger-width)' }}
                        >
                          <Command>
                            <CommandInput placeholder="Buscar colaborador..." />
                            <CommandList>
                              <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                              <CommandGroup>
                                {collaborators.map((c) => (
                                  <CommandItem
                                    value={c.nome_completo}
                                    key={c.id}
                                    onSelect={() => {
                                      form.setValue('solicitante', c.nome_completo, {
                                        shouldValidate: true,
                                      })
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        c.nome_completo === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {c.nome_completo}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ordem_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Serviço (OS) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: OS-2023-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_movimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2.5">
                      <FormLabel className="mb-2">Data de Saída *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                    <FormLabel>Motivo / Observação (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo da saída..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Itens da Requisição</CardTitle>
                <CardDescription>Adicione os itens que serão retirados do estoque.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ item_id: '', quantidade: 1 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-end"
                >
                  <div className="flex-1 w-full">
                    <FormField
                      control={form.control}
                      name={`items.${index}.item_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.nome} (Saldo: {item.quantidade_atual})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-full sm:w-[150px]">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantidade`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/estoque')}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              Confirmar Saída
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
