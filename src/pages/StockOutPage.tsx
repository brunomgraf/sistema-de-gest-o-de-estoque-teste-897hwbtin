import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const formSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item'),
  quantidade: z.coerce.number().min(1, 'A quantidade deve ser maior que zero'),
  data_movimento: z.date(),
  motivo: z.string().min(1, 'Informe o motivo da saída'),
})

export default function StockOutPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_id: '',
      quantidade: 1,
      data_movimento: new Date(),
      motivo: '',
    },
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      const selectedItem = items.find((i) => i.id === values.item_id)
      if (!selectedItem) throw new Error('Item não encontrado')

      if (values.quantidade > selectedItem.quantidade_atual) {
        form.setError('quantidade', {
          message: `A quantidade máxima disponível é ${selectedItem.quantidade_atual}`,
        })
        setLoading(false)
        return
      }

      const novaQuantidade = selectedItem.quantidade_atual - values.quantidade
      const statusCritico = novaQuantidade <= selectedItem.quantidade_minima

      await pb.collection('movimentacoes').create({
        item_id: values.item_id,
        tipo_movimento: 'saida',
        quantidade: values.quantidade,
        data_movimento: values.data_movimento.toISOString(),
        motivo: values.motivo,
        usuario_id: user?.id,
      })

      await pb.collection('itens').update(values.item_id, {
        quantidade_atual: novaQuantidade,
        status_critico: statusCritico,
      })

      toast.success('Saída de estoque registrada com sucesso!')
      form.reset({
        item_id: '',
        quantidade: 1,
        data_movimento: new Date(),
        motivo: '',
      })
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar saída de estoque')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8 w-full px-4 sm:px-0">
      <h2 className="text-3xl font-bold tracking-tight">Saída de Estoque</h2>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nova Saída</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="item_id"
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
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar item..." />
                          <CommandList>
                            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                            <CommandGroup>
                              {items.map((item) => (
                                <CommandItem
                                  value={item.nome}
                                  key={item.id}
                                  onSelect={() => {
                                    form.setValue('item_id', item.id)
                                    form.clearErrors('quantidade')
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      item.id === field.value ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {item.sku} - {item.nome} (Saldo: {item.quantidade_atual})
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_movimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel className="mb-1">Data</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Saída</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Consumo interno, perda, dano..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrar Saída'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
