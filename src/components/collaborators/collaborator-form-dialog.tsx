import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createCollaborator, updateCollaborator } from '@/services/collaborators'
import type { Collaborator } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const formSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  setor: z.string().min(1, 'Setor é obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  collaborator: Collaborator | null
  onSuccess: () => void
}

export function CollaboratorFormDialog({ open, onOpenChange, collaborator, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: '',
      cargo: '',
      setor: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (collaborator) {
        form.reset({
          nome_completo: collaborator.nome_completo,
          cargo: collaborator.cargo,
          setor: collaborator.setor,
        })
      } else {
        form.reset({ nome_completo: '', cargo: '', setor: '' })
      }
    }
  }, [open, collaborator, form])

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      if (collaborator) {
        await updateCollaborator(collaborator.id, values)
        toast.success('Colaborador atualizado com sucesso!')
      } else {
        await createCollaborator(values)
        toast.success('Colaborador criado com sucesso!')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg as string })
        })
      } else {
        toast.error(error.message || 'Erro ao salvar colaborador')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{collaborator ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Operador de Máquina" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="setor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Produção" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
