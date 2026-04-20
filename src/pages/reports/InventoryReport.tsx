import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, Search, Package, AlertCircle, Printer } from 'lucide-react'

export default function InventoryReport() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        pb.collection('itens').getFullList({ expand: 'fornecedor_id', sort: 'nome' }),
        pb.collection('fornecedores').getFullList({ sort: 'nome' }),
      ])
      setItems(itemsRes)
      setSuppliers(suppliersRes)
    } catch (error) {
      console.error('Error fetching inventory data', error)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'gestor') {
    return <Navigate to="/" replace />
  }

  const filteredItems = items.filter((item) => {
    const term = search.toLowerCase()
    const matchesSearch =
      (item.nome || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term)

    const matchesSupplier = supplierFilter === 'all' || item.fornecedor_id === supplierFilter

    let matchesStock = true
    if (stockFilter === 'in_stock') matchesStock = (item.quantidade_atual || 0) > 0
    if (stockFilter === 'out_of_stock') matchesStock = (item.quantidade_atual || 0) === 0

    return matchesSearch && matchesSupplier && matchesStock
  })

  const totalItems = items.length
  const outOfStockItems = items.filter((i) => (i.quantidade_atual || 0) === 0).length

  const exportCSV = () => {
    const headers = [
      'Código',
      'Nome',
      'Quantidade em estoque',
      'Posição no estoque',
      'Fornecedor Principal',
    ]
    const rows = filteredItems.map((item) => [
      item.sku,
      item.nome,
      item.quantidade_atual || 0,
      item.posicao_estoque || '',
      item.expand?.fornecedor_id?.nome || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'relatorio_inventario.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPDF = () => {
    window.print()
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <style>{`
        @media print {
          @page { size: auto; margin: 20mm; }
          body > *:not(#print-section) { display: none !important; }
          body { background: white !important; }
          #print-section { display: block !important; position: static !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatório de Inventário</h2>
          <p className="text-muted-foreground">
            Visão completa do estoque, posições e fornecedores.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir PDF
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Sem Estoque (Zerados)</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockItems}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código (SKU)..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[250px]">
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Fornecedores</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Inventário</SelectItem>
                  <SelectItem value="in_stock">Com Estoque</SelectItem>
                  <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Fornecedor Principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando inventário...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell className="text-right">{item.quantidade_atual || 0}</TableCell>
                    <TableCell>{item.posicao_estoque || '-'}</TableCell>
                    <TableCell>{item.expand?.fornecedor_id?.nome || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {createPortal(
        <div id="print-section" className="hidden print:block bg-white text-black p-8 w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-black">Oficina Graf</h1>
            <h2 className="text-lg text-black">Relatório Geral de Inventário</h2>
            <p className="text-sm text-gray-500">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left text-black font-semibold">
                  Código
                </th>
                <th className="border border-gray-300 p-2 text-left text-black font-semibold">
                  Nome
                </th>
                <th className="border border-gray-300 p-2 text-right text-black font-semibold">
                  Quantidade
                </th>
                <th className="border border-gray-300 p-2 text-left text-black font-semibold">
                  Posição
                </th>
                <th className="border border-gray-300 p-2 text-left text-black font-semibold">
                  Fornecedor
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2 text-black">{item.sku}</td>
                  <td className="border border-gray-300 p-2 text-black">{item.nome}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">
                    {item.quantidade_atual || 0}
                  </td>
                  <td className="border border-gray-300 p-2 text-black">
                    {item.posicao_estoque || '-'}
                  </td>
                  <td className="border border-gray-300 p-2 text-black">
                    {item.expand?.fornecedor_id?.nome || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 text-right text-black font-bold">Total de Itens: {items.length}</div>
        </div>,
        document.body,
      )}
    </div>
  )
}
