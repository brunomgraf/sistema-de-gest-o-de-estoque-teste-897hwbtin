import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter')

  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const res = await pb.collection('movimentacoes').getFullList({
        sort: '-data_movimento',
        expand: 'item_id,usuario_id',
      })
      setMovements(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('movimentacoes', () => {
    loadData()
  })

  const filteredMovements = movements.filter((m) => {
    if (filter === 'mes_atual') {
      const now = new Date()
      const moveDate = new Date(m.data_movimento)
      return moveDate.getMonth() === now.getMonth() && moveDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  const clearFilter = () => {
    searchParams.delete('filter')
    setSearchParams(searchParams)
  }

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Data,Item,Tipo,Quantidade,Motivo,Usuário,Solicitante,OS\n' +
      filteredMovements
        .map((m) => {
          const itemName = m.expand?.item_id?.nome || '-'
          const userName = m.expand?.usuario_id?.name || '-'
          return `${formatDate(m.data_movimento)},${itemName},${m.tipo_movimento},${m.quantidade},${m.motivo || ''},${userName},${m.solicitante || ''},${m.ordem_servico || ''}`
        })
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'relatorio_movimentacoes.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">Relatórios de Movimentação</h2>
          {filter === 'mes_atual' && (
            <Badge variant="secondary" className="text-sm flex items-center gap-1">
              Mês Atual
              <button
                onClick={clearFilter}
                className="ml-1 hover:text-foreground transition-colors rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label="Limpar filtro"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Exportar para CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>OS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24">
                    <Skeleton className="h-20 w-full" />
                  </TableCell>
                </TableRow>
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhuma movimentação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(m.data_movimento)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.expand?.item_id?.nome || 'Desconhecido'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.tipo_movimento === 'entrada' ? 'default' : 'destructive'}
                        className={
                          m.tipo_movimento === 'entrada'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : ''
                        }
                      >
                        {m.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.quantidade}</TableCell>
                    <TableCell className="font-medium text-slate-700">{m.motivo || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.expand?.usuario_id?.name || '-'}
                    </TableCell>
                    <TableCell>{m.solicitante || '-'}</TableCell>
                    <TableCell>{m.ordem_servico || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
