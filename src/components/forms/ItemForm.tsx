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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<FormValues>
  onSubmit: (data: FormValues) => void
  onCancel: () => void
}) {
  const [fornecedores, setFornecedores] = useState<any[]>([])

  useEffect(() => {
    pb.collection('fornecedores').getFullList({ sort: 'nome' }).then(setFornecedores)
  }, [])

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
          <FormField
            control={form.control}
            name="fornecedor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor (Opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
