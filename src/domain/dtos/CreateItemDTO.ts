export interface CreateItemDTO {
  code: string
  description: string
  unit: string
  type: 'INSUMO' | 'COMPOSICAO'

  category?: string
  coefficient?: number
  basePrice?: number

  referenceTableId: string
}