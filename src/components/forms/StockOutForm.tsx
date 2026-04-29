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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

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
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loadingCollabs, setLoadingCollabs] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchCollabs = async () => {
      try {
        const records = await pb.collection('colaboradores').getFullList({ sort: 'nome_completo' })
        setCollaborators(records)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingCollabs(false)
      }
    }
    fetchCollabs()
  }, [])

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
          render={({ field }) => (
            <FormItem className="flex flex-col pt-1">
              <FormLabel className="mb-1">Solicitante</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
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
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                c.nome_completo === field.value ? 'opacity-100' : 'opacity-0',
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
