import { useState } from 'react'
import { toast } from 'sonner'
import { deleteCollaborator } from '@/services/collaborators'
import type { Collaborator } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  collaborator: Collaborator | null
  onClose: () => void
  onSuccess: () => void
}

export function CollaboratorDeleteDialog({ collaborator, onClose, onSuccess }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!collaborator) return
    setIsDeleting(true)
    try {
      await deleteCollaborator(collaborator.id)
      toast.success('Colaborador removido com sucesso!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover colaborador')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!collaborator} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso removerá permanentemente o colaborador{' '}
            <strong className="text-foreground">{collaborator?.nome_completo}</strong> do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
