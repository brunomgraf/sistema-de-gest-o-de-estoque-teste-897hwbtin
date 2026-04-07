import { Badge } from '@/components/ui/badge'
import { Item } from '@/lib/types'

export function ItemStatusBadge({ item }: { item: Item }) {
  const isCritical = item.currentQuantity < item.minQuantity
  const isWarning =
    item.currentQuantity >= item.minQuantity && item.currentQuantity <= item.minQuantity * 1.2

  if (isCritical) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
        🔴 Crítico
      </Badge>
    )
  }
  if (isWarning) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
      >
        ⚠️ Atenção
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
    >
      ✅ OK
    </Badge>
  )
}
