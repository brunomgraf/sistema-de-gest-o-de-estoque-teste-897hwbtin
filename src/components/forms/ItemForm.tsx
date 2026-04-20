import { useForm, useFieldArray } from 'react-hook-form'
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
import { Check, ChevronsUpDown, Plus, Trash2, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const schema = z
  .object({
    code: z.string().min(1, 'Código é obrigatório'),
    name: z.string().min(1, 'Nome é obrigatório'),
    currentQuantity: z.coerce.number().min(0),
    minQuantity: z.coerce.number().min(0),
    costPrice: z.coerce.number().min(0),
    pdfUrl: z.string().url('URL inválida').optional().or(z.literal('')),
    posicao_estoque: z.string().optional().or(z.literal('')),
    fornecedor_id: z.string().optional().or(z.literal('')),
    foto: z.any().optional(),
    fornecedores: z
      .array(
        z.object({
          fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
          observacao: z.string().optional(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fornecedores && data.fornecedores.length > 0) {
      const ids = data.fornecedores.map((f) => f.fornecedor_id)
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Não é possível adicionar o mesmo fornecedor mais de uma vez.',
          path: ['fornecedores'],
        })
      }
    }
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
  onSubmit: (data: FormValues) => any
  onCancel: () => void
}) {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [isLoadingRels, setIsLoadingRels] = useState(isEditing)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: defaultValues?.code || '',
      name: defaultValues?.name || '',
      currentQuantity: defaultValues?.currentQuantity || 0,
      minQuantity: defaultValues?.minQuantity || 0,
      costPrice: defaultValues?.costPrice || 0,
      pdfUrl: defaultValues?.pdfUrl || '',
      posicao_estoque: defaultValues?.posicao_estoque || defaultValues?.shelfLocation || '',
      fornecedor_id: defaultValues?.fornecedor_id || '',
      fornecedores: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fornecedores',
  })

  useEffect(() => {
    const fetchAllFornecedores = async () => {
      try {
        const res = await pb.collection('fornecedores').getFullList({ sort: 'nome' })
        setFornecedores(res)
      } catch (e) {
        console.error(e)
      }
    }
    fetchAllFornecedores()
  }, [])

  useEffect(() => {
    const loadRelations = async () => {
      if (isEditing && defaultValues?.code) {
        try {
          const item = await pb
            .collection('itens')
            .getFirstListItem(`sku = "${defaultValues.code}"`)
          if (item) {
            if (item.foto) {
              setPreviewUrl(pb.files.getUrl(item, item.foto, { thumb: '100x100' }))
            }
            const rels = await pb.collection('item_fornecedores').getFullList({
              filter: `item_id = "${item.id}"`,
            })
            if (rels.length > 0) {
              form.setValue(
                'fornecedores',
                rels.map((r) => ({
                  fornecedor_id: r.fornecedor_id,
                  observacao: r.observacao,
                })),
              )
            }
          }
        } catch (e) {
          console.error('Relations not found or error', e)
        }
      }
      setIsLoadingRels(false)
    }
    loadRelations()
  }, [isEditing, defaultValues?.code, form])

  const handleFormSubmit = async (data: FormValues) => {
    // Keep legacy field gracefully in sync with first item
    data.fornecedor_id =
      data.fornecedores && data.fornecedores.length > 0 ? data.fornecedores[0].fornecedor_id : ''

    try {
      await onSubmit(data)

      let item = null
      for (let i = 0; i < 3; i++) {
        try {
          item = await pb.collection('itens').getFirstListItem(`sku = "${data.code}"`)
          if (item) break
        } catch (e) {
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      if (item) {
        const currentFornecedores = data.fornecedores || []
        const existing = await pb.collection('item_fornecedores').getFullList({
          filter: `item_id = "${item.id}"`,
        })

        const currentIds = currentFornecedores.map((f) => f.fornecedor_id)
        for (const rel of existing) {
          if (!currentIds.includes(rel.fornecedor_id)) {
            await pb.collection('item_fornecedores').delete(rel.id)
          }
        }

        for (const f of currentFornecedores) {
          const rel = existing.find((e) => e.fornecedor_id === f.fornecedor_id)
          if (rel) {
            if (rel.observacao !== f.observacao) {
              await pb.collection('item_fornecedores').update(rel.id, {
                observacao: f.observacao || '',
              })
            }
          } else {
            await pb.collection('item_fornecedores').create({
              item_id: item.id,
              fornecedor_id: f.fornecedor_id,
              observacao: f.observacao || '',
            })
          }
        }
      }
    } catch (err) {
      console.error('Error saving item relations:', err)
    }
  }

  const isSubmitting = form.formState.isSubmitting

  if (isLoadingRels) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Carregando dados...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Item (SKU)</FormLabel>
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
            name="foto"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem className="col-span-2">
                <FormLabel>Imagem do Produto</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    {previewUrl ? (
                      <div className="relative w-16 h-16 rounded-md overflow-hidden border shrink-0">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 rounded-bl-md hover:bg-destructive/90 transition-colors"
                          onClick={() => {
                            setPreviewUrl(undefined)
                            onChange('')
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onChange(file)
                          setPreviewUrl(URL.createObjectURL(file))
                        }
                      }}
                      {...field}
                      value={undefined}
                      className="flex-1 cursor-pointer file:cursor-pointer"
                    />
                  </div>
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
            name="posicao_estoque"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Posição no Estoque</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Corredor A, Prateleira 3" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border p-4 rounded-md bg-muted/10">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-semibold">Fornecedores do Item</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ fornecedor_id: '', observacao: '' })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fornecedor
            </Button>
          </div>

          {(form.formState.errors.fornecedores?.root?.message ||
            form.formState.errors.fornecedores?.message) && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.fornecedores.root?.message ||
                form.formState.errors.fornecedores.message}
            </p>
          )}

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum fornecedor vinculado a este item.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start">
                  <FormField
                    control={form.control}
                    name={`fornecedores.${index}.fornecedor_id`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Fornecedor</FormLabel>}
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  'w-full justify-between font-normal',
                                  !f.value && 'text-muted-foreground',
                                )}
                              >
                                {f.value
                                  ? fornecedores.find((forn) => forn.id === f.value)?.nome ||
                                    'Fornecedor selecionado'
                                  : 'Selecione um fornecedor'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[300px]" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar fornecedor..." />
                              <CommandList>
                                <CommandEmpty>Nenhum resultado.</CommandEmpty>
                                <CommandGroup>
                                  {fornecedores.map((forn) => (
                                    <CommandItem
                                      key={forn.id}
                                      value={forn.nome}
                                      onSelect={() => f.onChange(forn.id)}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          forn.id === f.value ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {forn.nome}
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
                    name={`fornecedores.${index}.observacao`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Observação (Opcional)</FormLabel>}
                        <FormControl>
                          <Input placeholder="Ex: mais barato, entrega rápida" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('text-destructive shrink-0', index === 0 ? 'mt-8' : 'mt-2')}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor de Custo Unitário (R$)</FormLabel>
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
