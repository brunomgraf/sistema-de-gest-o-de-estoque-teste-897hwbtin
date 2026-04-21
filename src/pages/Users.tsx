import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UserForm } from '@/components/forms/UserForm'

export default function UsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Acesso Negado: Apenas administradores podem acessar esta página.')
      navigate('/')
    }
  }, [user, navigate])

  const loadUsers = async () => {
    try {
      const records = await pb.collection('users').getFullList({ sort: 'name' })
      setUsersList(records)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
    }
  }, [user])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await pb.collection('users').delete(id)
      toast.success('Usuário excluído com sucesso')
      loadUsers()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao excluir usuário')
    }
  }

  if (user?.role !== 'admin') return null

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h2>
        <Button
          onClick={() => {
            setEditingUser(null)
            setOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="border rounded-md bg-card mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : usersList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              usersList.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '-'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'admin'
                          ? 'default'
                          : u.role === 'gestor'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {u.role === 'admin'
                        ? 'Administrador'
                        : u.role === 'gestor'
                          ? 'Gestor'
                          : 'Operador'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(u)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === user?.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <UserForm
            defaultValues={editingUser}
            onSuccess={() => {
              setOpen(false)
              loadUsers()
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
