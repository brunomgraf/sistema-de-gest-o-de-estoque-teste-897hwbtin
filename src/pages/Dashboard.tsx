import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  AlertTriangle,
  DollarSign,
  Activity,
  Search,
  Download,
  Printer,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useMainStore from '@/stores/main'
import { formatCurrency } from '@/lib/format'

export default function Dashboard() {
  const navigate = useNavigate()
  const { items, movements } = useMainStore()

  const [searchOP, setSearchOP] = useState('')
  const [activeOP, setActiveOP] = useState('')

  const stats = useMemo(() => {
    const totalItems = items.length
    const criticalItems = items.filter((i) => i.currentQuantity < i.minQuantity).length
    const totalValue = items.reduce((acc, i) => acc + i.currentQuantity * i.costPrice, 0)

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const movesThisMonth = movements.filter((m) => {
      const d = new Date(m.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    return { totalItems, criticalItems, totalValue, movesThisMonth }
  }, [items, movements])

  const chartData = useMemo(() => {
    const outs = movements.filter((m) => m.type === 'out')
    const grouped = outs.reduce(
      (acc, m) => {
        const item = items.find((i) => i.id === m.itemId)
        if (!item) return acc
        acc[item.name] = (acc[item.name] || 0) + m.quantity
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, saídas: value }))
      .sort((a, b) => b.saídas - a.saídas)
      .slice(0, 5)
  }, [items, movements])

  const filteredOPMovements = useMemo(() => {
    if (!activeOP) return []
    return movements.filter((m) => m.type === 'out' && m.productionOrder === activeOP)
  }, [movements, activeOP])

  const opTotalValue = useMemo(() => {
    return filteredOPMovements.reduce((acc, m) => acc + m.quantity * (m.unitPrice || 0), 0)
  }, [filteredOPMovements])

  const handleExportCSV = () => {
    const headers = ['Item', 'Quantidade', 'Valor Unitário', 'Valor Total']
    const rows = filteredOPMovements.map((m) => {
      const item = items.find((i) => i.id === m.itemId)
      return [
        `"${item?.name || m.itemId}"`,
        m.quantity,
        (m.unitPrice || 0).toFixed(2).replace('.', ','),
        (m.quantity * (m.unitPrice || 0)).toFixed(2).replace('.', ','),
      ]
    })
    rows.push(['"Total Geral"', '', '', opTotalValue.toFixed(2).replace('.', ',')])

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_op_${activeOP}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-6 relative">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pesquisar por OP..."
              className="pl-8"
              value={searchOP}
              onChange={(e) => setSearchOP(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveOP(searchOP)}
            />
          </div>
          <Button onClick={() => setActiveOP(searchOP)}>Buscar</Button>
          {activeOP && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchOP('')
                setActiveOP('')
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {activeOP ? (
        <>
          <Card className="print:hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Relatório de Alocação - OP: {activeOP}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintPDF}>
                  <Printer className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOPMovements.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Nenhum resultado encontrado para esta OP.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unitário</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOPMovements.map((m) => {
                      const item = items.find((i) => i.id === m.itemId)
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{item?.name || m.itemId}</TableCell>
                          <TableCell className="text-right">{m.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(m.unitPrice || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(m.quantity * (m.unitPrice || 0))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={3} className="text-right">
                        Total Geral
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(opTotalValue)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Printable Area for OP Report */}
          <div
            id="printable-area"
            className="hidden print:flex flex-col absolute inset-0 bg-white text-black p-8 w-[297mm] h-[210mm] box-border overflow-hidden"
          >
            <div className="border-b-2 border-black pb-4 mb-6 shrink-0">
              <h1 className="text-3xl font-bold uppercase tracking-tight">
                Relatório de Consumo de Ordem de Produção
              </h1>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-sm font-bold uppercase text-gray-500">Código da OP</p>
                  <p className="text-2xl font-mono font-bold">{activeOP}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold uppercase text-gray-500">Data de Emissão</p>
                  <p className="text-lg">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden border border-black flex flex-col mb-4">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-black bg-gray-100 print:bg-transparent">
                    <th className="p-2 border-r border-black font-bold">Item Movimentado</th>
                    <th className="p-2 text-right border-r border-black font-bold w-24">Qtd</th>
                    <th className="p-2 text-right border-r border-black font-bold w-32">
                      Custo Unit.
                    </th>
                    <th className="p-2 text-right font-bold w-32">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOPMovements.map((m) => {
                    const item = items.find((i) => i.id === m.itemId)
                    return (
                      <tr key={m.id} className="border-b border-gray-300 last:border-0">
                        <td className="p-2 border-r border-black">{item?.name || m.itemId}</td>
                        <td className="p-2 text-right border-r border-black">{m.quantity}</td>
                        <td className="p-2 text-right border-r border-black">
                          {formatCurrency(m.unitPrice || 0)}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(m.quantity * (m.unitPrice || 0))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end shrink-0">
              <div className="border-2 border-black p-4 min-w-[300px] text-right">
                <p className="text-sm font-bold uppercase text-gray-600">Custo Total da OP</p>
                <p className="text-3xl font-bold">{formatCurrency(opTotalValue)}</p>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500 pt-2 shrink-0">
              Documento gerado automaticamente pelo Sistema de Gestão de Estoque.
            </div>
          </div>
        </>
      ) : (
        <div className="print:hidden">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard
              title="Total de Itens"
              value={stats.totalItems}
              icon={Package}
              onClick={() => navigate('/estoque')}
              className="cursor-pointer hover:ring-2 ring-primary/50 transition-all"
            />
            <MetricCard
              title="Itens em Crítico"
              value={stats.criticalItems}
              icon={AlertTriangle}
              variant="destructive"
              onClick={() => navigate('/estoque?filter=critico')}
              className="cursor-pointer hover:ring-2 ring-red-500/50 transition-all"
            />
            <MetricCard
              title="Valor em Estoque"
              value={formatCurrency(stats.totalValue)}
              icon={DollarSign}
              onClick={() => navigate('/estoque')}
              className="cursor-pointer hover:ring-2 ring-primary/50 transition-all"
            />
            <MetricCard
              title="Movimentações do Mês"
              value={stats.movesThisMonth}
              icon={Activity}
              onClick={() => navigate('/relatorios?filter=mes_atual')}
              className="cursor-pointer hover:ring-2 ring-primary/50 transition-all"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Itens Mais Movimentados (Saídas)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer
                  config={{ saídas: { label: 'Saídas', color: 'hsl(var(--chart-1))' } }}
                  className="h-[300px] w-full"
                >
                  <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="saídas" fill="var(--color-saídas)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  onClick,
  className = '',
}: any) {
  return (
    <Card onClick={onClick} className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={`h-4 w-4 ${variant === 'destructive' ? 'text-red-500' : 'text-muted-foreground'}`}
        />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === 'destructive' ? 'text-red-600' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
