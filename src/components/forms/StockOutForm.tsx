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
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

const schema = z.object({
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero'),
  observation: z.string().optional(),
  solicitante: z.string().min(1, 'Nome do solicitante é obrigatório'),
  ordem_servico: z.string().min(1, 'Ordem de Serviço é obrigatória'),
})

type StockOutFormProps = {
  maxQuantity: number
  onSubmit: (data: z.infer<typeof schema>) => void
  onCancel: () => void
}

export function StockOutForm({ maxQuantity, onSubmit, onCancel }: StockOutFormProps) {
  const [solicitantes, setSolicitantes] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchSolicitantes = async () => {
      try {
        const filterStr = searchQuery
          ? `solicitante ~ "${searchQuery.replace(/"/g, '')}"`
          : `solicitante != ""`
        const res = await pb.collection('movimentacoes').getList(1, 50, {
          fields: 'solicitante',
          filter: filterStr,
          sort: '-created',
        })
        const unique = Array.from(new Set(res.items.map((r) => r.solicitante).filter(Boolean)))
        setSolicitantes(unique)
      } catch (e) {
        console.error(e)
      }
    }
    const timeoutId = setTimeout(fetchSolicitantes, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, observation: '', solicitante: '', ordem_servico: '' },
  })

  const handleSubmit = (data: z.infer<typeof schema>) => {
    if (data.quantity > maxQuantity) {
      form.setError('quantity', { message: 'Quantidade excede o saldo atual' })
      return
    }
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quantity"
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
          name="solicitante"
          render={({ field }) => {
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Solicitante</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          placeholder="Nome do solicitante"
                          autoComplete="off"
                          onChange={(e) => {
                            field.onChange(e)
                            setSearchQuery(e.target.value)
                            setOpen(true)
                          }}
                          onClick={() => {
                            setSearchQuery(field.value || '')
                            setOpen(true)
                          }}
                        />
                        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <Command shouldFilter={false}>
                      <CommandList>
                        {solicitantes.length === 0 && searchQuery ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum resultado encontrado.
                          </div>
                        ) : (
                          <CommandGroup>
                            {solicitantes.map((s) => (
                              <CommandItem
                                key={s}
                                value={s}
                                onSelect={() => {
                                  form.setValue('solicitante', s)
                                  setSearchQuery(s)
                                  setOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    s === field.value ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {s}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <FormField
          control={form.control}
          name="ordem_servico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de Serviço (OS)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: OS-2023-001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observation"
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
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive">
            Confirmar Saída
          </Button>
        </div>
      </form>
    </Form>
  )
}
