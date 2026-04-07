import { useEffect, useState } from 'react'
import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const formSchema = z.object({
  data_movimento: z.date(),
  ordem_servico: z.string().min(1, 'Ordem de Serviço é obrigatória'),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1, 'Selecione um item'),
        quantidade: z.coerce.number().min(1, 'A quantidade deve ser maior que zero'),
      }),
    )
    .min(1, 'Adicione pelo menos um item'),
})

type FormValues = z.infer<typeof formSchema>

function ItemRow({
  form,
  index,
  items,
  onRemove,
}: {
  form: UseFormReturn<FormValues>
  index: number
  items: any[]
  onRemove: () => void
}) {
  const selectedItemId = form.watch(`items.${index}.item_id`)
  const selectedItem = items.find((i) => i.id === selectedItemId)
  const availableQty = selectedItem?.quantidade_atual ?? '-'

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-4 items-start border p-4 rounded-md bg-muted/10 relative">
      <FormField
        control={form.control}
        name={`items.${index}.item_id`}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Item</FormLabel>
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
                  >
                    {field.value
                      ? items.find((item) => item.id === field.value)?.nome
                      : 'Selecione um item'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] md:w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar item..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                    <CommandGroup>
                      {items.map((item) => (
                        <CommandItem
                          value={`${item.sku} ${item.nome}`}
                          key={item.id}
                          onSelect={() => {
                            form.setValue(`items.${index}.item_id`, item.id)
                            form.clearErrors(`items.${index}.quantidade`)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              item.id === field.value ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {item.sku} - {item.nome}
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

      <div className="flex flex-col space-y-2">
        <FormLabel>Disponível</FormLabel>
        <Input
          value={availableQty}
          disabled
          className="bg-muted text-muted-foreground font-medium"
        />
      </div>

      <FormField
        control={form.control}
        name={`items.${index}.quantidade`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Remover Qtd</FormLabel>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-8 flex justify-end md:justify-start">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function StockOutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_movimento: new Date(),
      ordem_servico: '',
      items: [{ item_id: '', quantidade: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const loadItems = async () => {
    try {
      const res = await pb.collection('itens').getFullList({ sort: 'nome' })
      setItems(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  useRealtime('itens', () => {
    loadItems()
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      let hasValidationErrors = false

      // Validate quantities before saving
      values.items.forEach((item, index) => {
        const dbItem = items.find((i) => i.id === item.item_id)
        if (!dbItem) {
          form.setError(`items.${index}.item_id`, { message: 'Item inválido' })
          hasValidationErrors = true
        } else if (item.quantidade > dbItem.quantidade_atual) {
          form.setError(`items.${index}.quantidade`, {
            message: `Máximo disponível é ${dbItem.quantidade_atual}`,
          })
          hasValidationErrors = true
        }
      })

      if (hasValidationErrors) {
        setLoading(false)
        return
      }

      // Process sequentially to avoid conflicting updates if the same item was added twice
      for (const item of values.items) {
        // Re-fetch current quantity in case of duplicate lines or recent changes
        const currentDbItem = await pb.collection('itens').getOne(item.item_id)

        if (item.quantidade > currentDbItem.quantidade_atual) {
          throw new Error(`Quantidade insuficiente para o item: ${currentDbItem.nome}`)
        }

        const novaQuantidade = currentDbItem.quantidade_atual - item.quantidade
        const statusCritico = novaQuantidade <= currentDbItem.quantidade_minima

        await pb.collection('movimentacoes').create({
          item_id: item.item_id,
          tipo_movimento: 'saida',
          quantidade: item.quantidade,
          data_movimento: values.data_movimento.toISOString(),
          ordem_servico: values.ordem_servico,
          usuario_id: user?.id,
        })

        await pb.collection('itens').update(item.item_id, {
          quantidade_atual: novaQuantidade,
          status_critico: statusCritico,
        })
      }

      toast.success('Saída de estoque registrada com sucesso!')
      navigate('/estoque')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar saída de estoque')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 w-full px-4 sm:px-0 pb-20">
      <h2 className="text-3xl font-bold tracking-tight">Saída em Lote (Ordem de Serviço)</h2>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nova Saída</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 border rounded-lg">
                <FormField
                  control={form.control}
                  name="data_movimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel className="mb-1">Data de Saída</FormLabel>
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
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
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

                <FormField
                  control={form.control}
                  name="ordem_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Serviço (OS)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: OS-2023-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">Itens da Movimentação</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ item_id: '', quantidade: 1 })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Item
                  </Button>
                </div>

                {fields.length === 0 && (
                  <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                    Nenhum item adicionado. Clique no botão acima para começar.
                  </div>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <ItemRow
                      key={field.id}
                      form={form}
                      index={index}
                      items={items}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>
              </div>

              {form.formState.errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={loading || fields.length === 0}>
                  {loading ? 'Processando...' : 'Confirmar Baixa em Lote'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
