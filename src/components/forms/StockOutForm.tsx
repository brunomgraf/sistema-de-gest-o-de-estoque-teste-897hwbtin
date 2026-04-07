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
import { Button } from '@/components/ui/button'

const schema = z.object({
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero'),
  observation: z.string().optional(),
  requestedBy: z.string().min(1, 'Nome do solicitante é obrigatório'),
  productionOrder: z.string().min(1, 'Ordem de Produção é obrigatória'),
})

type StockOutFormProps = {
  maxQuantity: number
  onSubmit: (data: z.infer<typeof schema>) => void
  onCancel: () => void
}

export function StockOutForm({ maxQuantity, onSubmit, onCancel }: StockOutFormProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, observation: '', requestedBy: '', productionOrder: '' },
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
          name="requestedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Solicitado por</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome do solicitante" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="productionOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de Produção (OP)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: OP-2023-001" />
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
            Confirmar Baixa
          </Button>
        </div>
      </form>
    </Form>
  )
}
