import { useState } from 'react'
import { Search, Download, FileText, Loader2, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Movement } from '@/lib/types'

export default function ProductionConsumption() {
  const [opSearch, setOpSearch] = useState('')
  const [currentOp, setCurrentOp] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = opSearch.trim()
    if (!query) {
      setCurrentOp('')
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const movements = await pb.collection('movimentacoes').getFullList<Movement>({
        filter: `ordem_producao = "${query}" && (tipo_movimento = 'producao_saida' || tipo_movimento = 'producao_retorno')`,
        expand: 'item_id',
      })

      const grouped = new Map<string, any>()

      movements.forEach((m) => {
        if (!m.item_id || !m.expand?.item_id) return
        const item = m.expand.item_id
        const qty = m.quantidade || 0
        const isSaida = m.tipo_movimento === 'producao_saida'

        const effectiveQty = isSaida ? qty : -qty

        if (grouped.has(item.id)) {
          const existing = grouped.get(item.id)
          existing.quantity += effectiveQty
        } else {
          grouped.set(item.id, {
            id: item.id,
            name: item.nome,
            unitPrice: item.valor_unitario || 0,
            quantity: effectiveQty,
          })
        }
      })

      const finalResults = Array.from(grouped.values()).filter((r) => r.quantity > 0)
      setResults(finalResults)
      setCurrentOp(query)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao buscar dados da Ordem de Produção')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const headers = ['Item', 'Quantidade', 'Valor Unitário', 'Subtotal']
    const rows = results.map((r) => [
      r.name,
      r.quantity,
      r.unitPrice.toFixed(2),
      (r.quantity * r.unitPrice).toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `consumo_op_${currentOp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const grandTotal = results.reduce((acc, r) => acc + r.quantity * r.unitPrice, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Consumo por Ordem de Produção</h2>
          <p className="text-muted-foreground mt-1">
            Visualize os custos de materiais consumidos em uma OP específica.
          </p>
        </div>
        {results.length > 0 && (
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Ordem de Produção</CardTitle>
          <CardDescription>
            Digite o número da OP para calcular o custo dos itens consumidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
            <Input
              placeholder="Ex: OP-2023-001"
              value={opSearch}
              onChange={(e) => setOpSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !opSearch.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Buscar</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="h-10 w-10 mb-4 text-muted-foreground/50" />
            <p>Busque por uma Ordem de Produção para ver os detalhes de consumo.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Calculando consumo...</p>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <PackageX className="h-10 w-10 mb-4 text-muted-foreground/50" />
            <p>Nenhum registro encontrado para esta Ordem de Produção.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Consumo Consolidado - OP: <span className="text-primary">{currentOp}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantidade Total</TableHead>
                  <TableHead className="text-right">Valor Unitário</TableHead>
                  <TableHead className="text-right font-bold">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.quantity * r.unitPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold text-lg">
                    Custo Total da OP:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
