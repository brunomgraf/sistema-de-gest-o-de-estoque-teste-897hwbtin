import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useMainStore from '@/stores/main'

const schema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  currentQuantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  pdfUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  shelfLocation: z.string().optional().or(z.literal('')),
  suppliers: z
    .array(
      z.object({
        supplierId: z.string().min(1, 'Selecione um fornecedor'),
        preference: z.enum(['primary', 'secondary', 'tertiary']),
      }),
    )
    .min(1, 'Adicione pelo menos um fornecedor'),
})

type FormValues = z.infer<typeof schema>

export function ItemForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<FormValues>
  onSubmit: (data: FormValues) => void
  onCancel: () => void
}) {
  const { suppliers } = useMainStore()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      code: '',
      name: '',
      currentQuantity: 0,
      minQuantity: 0,
      costPrice: 0,
      pdfUrl: '',
      shelfLocation: '',
      suppliers: [{ supplierId: '', preference: 'primary' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'suppliers',
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
                  <Input type="number" {...field} />
                </FormControl>
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
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-semibold">Fornecedores Vinculados</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ supplierId: '', preference: 'primary' })}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Fornecedor
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <FormField
                control={form.control}
                name={`suppliers.${index}.supplierId`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                name={`suppliers.${index}.preference`}
                render={({ field }) => (
                  <FormItem className="w-[180px]">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Preferência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="primary">Preferencial</SelectItem>
                        <SelectItem value="secondary">Secundário</SelectItem>
                        <SelectItem value="tertiary">Terciário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="mt-0.5"
                disabled={fields.length === 1}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          {form.formState.errors.suppliers?.root && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.suppliers.root.message}
            </p>
          )}
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
