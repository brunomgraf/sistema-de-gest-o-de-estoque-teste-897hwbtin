import { Item, Movement, Supplier, User } from './types'

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Silva', email: 'admin@estoque.com', role: 'admin' },
  { id: 'u2', name: 'Gerente Costa', email: 'gerente@estoque.com', role: 'gerente' },
  { id: 'u3', name: 'Operador Santos', email: 'operador@estoque.com', role: 'operador' },
]

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    name: 'Tech Peças SA',
    contact: 'João',
    email: 'vendas@techpecas.com',
    phone: '11999999999',
    leadTime: 5,
  },
  {
    id: 's2',
    name: 'Cabo e Fio Ltda',
    contact: 'Maria',
    email: 'contato@caboefio.com',
    phone: '11888888888',
    leadTime: 3,
  },
  {
    id: 's3',
    name: 'Global Suprimentos',
    contact: 'Carlos',
    email: 'pedidos@global.com',
    phone: '11777777777',
    leadTime: 10,
  },
]

export const MOCK_ITEMS: Item[] = [
  {
    id: 'i1',
    code: 'PR-001',
    name: 'Processador Intel Core i7',
    currentQuantity: 45,
    minQuantity: 20,
    suppliers: [
      { supplierId: 's1', preference: 'primary' },
      { supplierId: 's2', preference: 'secondary' },
    ],
    costPrice: 1200,
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
  {
    id: 'i2',
    code: 'MM-002',
    name: 'Memória RAM 16GB DDR4',
    currentQuantity: 12,
    minQuantity: 30,
    suppliers: [{ supplierId: 's1', preference: 'primary' }],
    costPrice: 250,
  },
  {
    id: 'i3',
    code: 'CB-003',
    name: 'Cabo de Rede CAT6 2m',
    currentQuantity: 150,
    minQuantity: 50,
    suppliers: [
      { supplierId: 's2', preference: 'primary' },
      { supplierId: 's3', preference: 'tertiary' },
    ],
    costPrice: 15,
  },
  {
    id: 'i4',
    code: 'HD-004',
    name: 'SSD NVMe 1TB',
    currentQuantity: 5,
    minQuantity: 15,
    suppliers: [{ supplierId: 's3', preference: 'primary' }],
    costPrice: 350,
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
  {
    id: 'i5',
    code: 'FT-005',
    name: 'Fonte ATX 600W',
    currentQuantity: 22,
    minQuantity: 20,
    suppliers: [{ supplierId: 's3', preference: 'primary' }],
    costPrice: 180,
  },
  {
    id: 'i6',
    code: 'PL-006',
    name: 'Placa Mãe B550',
    currentQuantity: 8,
    minQuantity: 20,
    suppliers: [{ supplierId: 's1', preference: 'primary' }],
    costPrice: 650,
  },
]

const now = new Date()
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

export const MOCK_MOVEMENTS: Movement[] = [
  {
    id: 'm1',
    itemId: 'i1',
    type: 'in',
    quantity: 50,
    date: tenDaysAgo.toISOString(),
    userId: 'u1',
    observation: 'Compra inicial',
  },
  {
    id: 'm2',
    itemId: 'i1',
    type: 'out',
    quantity: 5,
    date: fiveDaysAgo.toISOString(),
    userId: 'u3',
    observation: 'Projeto Alpha',
    requestedBy: 'Carlos Silva',
  },
  {
    id: 'm3',
    itemId: 'i2',
    type: 'out',
    quantity: 18,
    date: now.toISOString(),
    userId: 'u3',
    observation: 'Reposição TI',
    requestedBy: 'Ana Costa',
  },
  {
    id: 'm4',
    itemId: 'i4',
    type: 'out',
    quantity: 10,
    date: tenDaysAgo.toISOString(),
    userId: 'u2',
    observation: 'Urgência',
    requestedBy: 'João Pedro',
  },
]
