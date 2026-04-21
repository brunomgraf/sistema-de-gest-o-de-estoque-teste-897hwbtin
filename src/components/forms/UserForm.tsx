import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'gestor', 'operador']),
  password: z.string().optional(),
})

export function UserForm({ defaultValues, onSuccess, onCancel }: any) {
  const isEditing = !!defaultValues

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || '',
      email: defaultValues?.email || '',
      role: defaultValues?.role || 'operador',
      password: '',
    },
  })

  const onSubmit = async (data: any) => {
    if (!isEditing && !data.password) {
      form.setError('password', { message: 'Senha é obrigatória para novos usuários' })
      return
    }

    try {
      if (isEditing) {
        const payload: any = {
          name: data.name,
          email: data.email,
          role: data.role,
        }
        if (data.password) {
          payload.password = data.password
          payload.passwordConfirm = data.password
        }
        await pb.collection('users').update(defaultValues.id, payload)
        toast.success('Usuário atualizado com sucesso!')
      } else {
        await pb.collection('users').create({
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
          passwordConfirm: data.password,
        })
        toast.success('Usuário criado com sucesso!')
      }
      onSuccess()
    } catch (e: any) {
      console.error(e)
      const errors = extractFieldErrors(e)
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg })
        })
      } else {
        toast.error(isEditing ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função (Role)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha {isEditing && '(Deixe em branco para manter)'}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
