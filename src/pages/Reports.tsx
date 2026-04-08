import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, X, Printer, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const osQuery = searchParams.get('os') || ''

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
    let match = true

    if (filter === 'mes_atual') {
      const now = new Date()
      const moveDate = new Date(m.data_movimento)
      if (moveDate.getMonth() !== now.getMonth() || moveDate.getFullYear() !== now.getFullYear()) {
        match = false
      }
    }

    if (osQuery) {
      if (!m.ordem_servico || !m.ordem_servico.toLowerCase().includes(osQuery.toLowerCase())) {
        match = false
      }
    }

    return match
  })

  const handleOsFilterChange = (val: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('os', val)
    } else {
      newParams.delete('os')
    }
    setSearchParams(newParams)
  }

  const clearFilter = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('filter')
    setSearchParams(newParams)
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const reportTotal = filteredMovements.reduce((acc, m) => {
    const unitPrice = m.expand?.item_id?.valor_unitario || 0
    const isSaida = m.tipo_movimento === 'saida'
    return acc + m.quantidade * unitPrice * (isSaida ? 1 : -1)
  }, 0)

  const solicitantePrincipal =
    filteredMovements.find((m) => m.solicitante)?.solicitante || 'Não especificado'

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
            <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por OS..."
                  value={osQuery}
                  onChange={(e) => handleOsFilterChange(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              {osQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOsFilterChange('')}
                  title="Limpar filtro OS"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

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
          <div className="flex items-center gap-2 w-full xl:w-auto">
            {osQuery && filteredMovements.length > 0 && (
              <Button variant="default" onClick={() => window.print()} className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" /> Imprimir Relatório
              </Button>
            )}
            <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações</CardTitle>
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
                      <TableCell className="font-medium text-slate-700">
                        {m.motivo || '-'}
                      </TableCell>
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

      {/* Printable Area - Only visible when printing */}
      <div
        id="printable-area"
        className="hidden print:block bg-white text-black p-8 print:p-0 text-sm max-w-4xl mx-auto print:max-w-none print:w-full"
      >
        <style media="print">
          {`
            @page { size: A4 portrait; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          `}
        </style>
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-900">
              Relatório de OS
            </h1>
            <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
              <p className="text-slate-600 font-medium">Ordem de Serviço:</p>
              <p className="font-bold text-slate-900">{osQuery || 'N/A'}</p>
              <p className="text-slate-600 font-medium">Solicitante:</p>
              <p className="font-bold text-slate-900">{solicitantePrincipal}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-600">
              Data de Emissão:{' '}
              <span className="font-semibold text-slate-900">
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </p>
            <p className="text-slate-600">
              Total de Itens:{' '}
              <span className="font-semibold text-slate-900">{filteredMovements.length}</span>
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-y-2 border-slate-800 bg-slate-50 text-slate-900">
              <th className="py-3 px-2 font-bold">Item</th>
              <th className="py-3 px-2 font-bold">Solicitante</th>
              <th className="py-3 px-2 font-bold text-right">Quantidade</th>
              <th className="py-3 px-2 font-bold text-right">Valor Unit.</th>
              <th className="py-3 px-2 font-bold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map((m, i) => {
              const unitPrice = m.expand?.item_id?.valor_unitario || 0
              const isSaida = m.tipo_movimento === 'saida'
              const qty = m.quantidade
              const total = unitPrice * qty * (isSaida ? 1 : -1)

              return (
                <tr key={m.id || i} className="border-b border-slate-200">
                  <td className="py-3 px-2">
                    <span className="font-medium">{m.expand?.item_id?.nome || '-'}</span>
                    {!isSaida && (
                      <span className="ml-2 text-xs bg-slate-200 px-1 py-0.5 rounded text-slate-800">
                        Devolução
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-slate-600">{m.solicitante || '-'}</td>
                  <td className="py-3 px-2 text-right font-medium">{qty}</td>
                  <td className="py-3 px-2 text-right text-slate-600">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium">{formatCurrency(total)}</td>
                </tr>
              )
            })}
            {filteredMovements.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                  Nenhum item registrado para esta Ordem de Serviço.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50">
              <td
                colSpan={4}
                className="py-4 px-2 text-right font-bold text-lg text-slate-900 uppercase tracking-tight"
              >
                Valor Total da OS:
              </td>
              <td className="py-4 px-2 text-right font-bold text-lg text-slate-900">
                {formatCurrency(reportTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-32 flex justify-between px-12">
          <div className="text-center w-64">
            <div className="border-t border-slate-800 mb-2"></div>
            <p className="font-semibold text-slate-900">Assinatura do Solicitante</p>
            <p className="text-slate-500 text-sm mt-1">{solicitantePrincipal}</p>
          </div>
          <div className="text-center w-64">
            <div className="border-t border-slate-800 mb-2"></div>
            <p className="font-semibold text-slate-900">Assinatura do Responsável</p>
            <p className="text-slate-500 text-sm mt-1">Departamento Financeiro / Estoque</p>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t-2 border-slate-800 flex flex-col items-center justify-center text-slate-600 text-sm gap-2">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-medium">
            <span>
              <strong>Endereço:</strong> Rua Otilio Dalçoquio n°679
            </span>
            <span>
              <strong>Telefone:</strong> (47) 3341-1290
            </span>
            <span>
              <strong>E-mail:</strong> financeiro@oficinagraf.com.br
            </span>
          </div>
          <div className="text-slate-400 text-xs mt-2">
            Documento gerado automaticamente pelo Sistema de Gestão de Estoque
          </div>
        </div>
      </div>
    </>
  )
}
