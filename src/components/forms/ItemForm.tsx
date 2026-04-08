import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const schema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  currentQuantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  pdfUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  shelfLocation: z.string().optional().or(z.literal('')),
  fornecedor_id: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function ItemForm({
  defaultValues,
  isEditing = false,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<FormValues>
  isEditing?: boolean
  onSubmit: (data: FormValues) => void
  onCancel: () => void
}) {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [searchFornecedor, setSearchFornecedor] = useState('')

  useEffect(() => {
    const fetchFornecedores = async () => {
      try {
        const filterStr = searchFornecedor ? `nome ~ "${searchFornecedor.replace(/"/g, '')}"` : ''
        const res = await pb.collection('fornecedores').getList(1, 50, {
          filter: filterStr,
          sort: 'nome',
        })
        setFornecedores(res.items)
      } catch (e) {
        console.error(e)
      }
    }
    const timeoutId = setTimeout(fetchFornecedores, 300)
    return () => clearTimeout(timeoutId)
  }, [searchFornecedor])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: defaultValues?.code || '',
      name: defaultValues?.name || '',
      currentQuantity: defaultValues?.currentQuantity || 0,
      minQuantity: defaultValues?.minQuantity || 0,
      costPrice: defaultValues?.costPrice || 0,
      pdfUrl: defaultValues?.pdfUrl || '',
      shelfLocation: defaultValues?.shelfLocation || '',
      fornecedor_id: defaultValues?.fornecedor_id || '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Item</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade Atual</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    readOnly={isEditing}
                    className={isEditing ? 'bg-muted' : ''}
                    {...field}
                  />
                </FormControl>
                {isEditing && (
                  <p className="text-[0.8rem] text-muted-foreground mt-1">
                    Para registrar saídas, utilize o menu Saída de Estoque.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade Mínima</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shelfLocation"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Localização na Prateleira</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Corredor A, Prateleira 3" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 border p-4 rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="fornecedor_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fornecedor (Opcional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-full justify-between font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value
                          ? fornecedores.find((f) => f.id === field.value)?.nome ||
                            'Fornecedor selecionado'
                          : 'Selecione um fornecedor'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    align="start"
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar fornecedor..."
                        value={searchFornecedor}
                        onValueChange={setSearchFornecedor}
                      />
                      <CommandList>
                        {fornecedores.length === 0 && searchFornecedor ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum resultado encontrado.
                          </div>
                        ) : null}
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              form.setValue('fornecedor_id', '')
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                !field.value ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            Nenhum
                          </CommandItem>
                          {fornecedores.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={f.nome}
                              onSelect={() => {
                                form.setValue('fornecedor_id', f.id)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  f.id === field.value ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {f.nome}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor de Custo (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pdfUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documentação Técnica (URL)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
