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
import useMainStore from '@/stores/main'
import { formatDate } from '@/lib/format'

export default function Reports() {
  const { movements, items, MOCK_USERS } = useMainStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter')

  const filteredMovements = movements.filter((m) => {
    if (filter === 'mes_atual') {
      const now = new Date()
      const moveDate = new Date(m.date)
      return moveDate.getMonth() === now.getMonth() && moveDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  const clearFilter = () => {
    searchParams.delete('filter')
    setSearchParams(searchParams)
  }

  const handleExport = () => {
    // Mock export functionality
    const csvContent =
      'data:text/csv;charset=utf-8,Data,Item,Tipo,Quantidade,OP,Observação\n' +
      filteredMovements
        .map((m) => {
          const item = items.find((i) => i.id === m.itemId)
          return `${formatDate(m.date)},${item?.name || m.itemId},${m.type},${m.quantity},${m.productionOrder || ''},${m.observation || ''}`
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
                <TableHead>OP</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((m) => {
                const item = items.find((i) => i.id === m.itemId)
                // Use a fallback to mock users array or standard display
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(m.date)}</TableCell>
                    <TableCell className="font-medium">{item?.name || 'Desconhecido'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.type === 'in' ? 'default' : 'destructive'}
                        className={
                          m.type === 'in' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''
                        }
                      >
                        {m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Saída' : 'Ajuste'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {m.productionOrder || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">ID: {m.userId}</TableCell>
                    <TableCell className="text-muted-foreground">{m.observation || '-'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
