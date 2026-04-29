import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getCollaborators } from '@/services/collaborators'
import type { Collaborator } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus, Users, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { CollaboratorFormDialog } from '@/components/collaborators/collaborator-form-dialog'
import { CollaboratorDeleteDialog } from '@/components/collaborators/collaborator-delete-dialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export default function CollaboratorsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Collaborator | null>(null)
  const [deleteItem, setDeleteItem] = useState<Collaborator | null>(null)

  const loadData = async () => {
    try {
      setError(false)
      const data = await getCollaborators()
      setCollaborators(data)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('colaboradores', () => {
    loadData()
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Não foi possível carregar os colaboradores</p>
        <Button onClick={loadData}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Colaboradores</h2>
          <p className="text-muted-foreground">
            Gerencie os colaboradores da equipe e seus acessos.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo colaborador
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : collaborators.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] border rounded-lg bg-muted/10 border-dashed">
          <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Nenhum colaborador encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione um novo colaborador para começar
          </p>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo colaborador
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome completo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators.map((colab) => (
                  <TableRow key={colab.id}>
                    <TableCell className="font-medium">{colab.nome_completo}</TableCell>
                    <TableCell>{colab.cargo}</TableCell>
                    <TableCell>{colab.setor}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditItem(colab)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(colab)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-4">
            {collaborators.map((colab) => (
              <Card key={colab.id}>
                <CardContent className="p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{colab.nome_completo}</h4>
                    <p className="text-sm text-muted-foreground">
                      {colab.cargo} • {colab.setor}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem(colab)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteItem(colab)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <CollaboratorFormDialog
        open={isCreateOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditItem(null)
          }
        }}
        collaborator={editItem}
        onSuccess={loadData}
      />

      <CollaboratorDeleteDialog
        collaborator={deleteItem}
        onClose={() => setDeleteItem(null)}
        onSuccess={() => {
          setDeleteItem(null)
          loadData()
        }}
      />
    </div>
  )
}
