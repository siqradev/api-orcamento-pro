// src/domain/repositories/ItemsRepository.ts
// Contrato puro de domínio — sem dependência de Prisma ou qualquer infra

import { CreateItemDTO } from '../dtos/CreateItemDTO'

export interface IItemsRepository {
  bulkInsert(items: CreateItemDTO[]): Promise<void>

  findByCode(
    code: string,
    referenceTableId: string
  ): Promise<ItemResult | null>

  search(
    query: string,
    filters?: SearchFilters
  ): Promise<ItemResult[]>

  paginate(
    page: number,
    limit: number,
    filters?: SearchFilters
  ): Promise<PaginatedResult>
}

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface ItemResult {
  id: string
  code: string
  description: string
  unit: string
  type: 'INSUMO' | 'COMPOSICAO'
  category: string | null
  basePrice: number | null
  referenceTableId: string
  createdAt: Date
  updatedAt: Date
}

export interface SearchFilters {
  type?: 'INSUMO' | 'COMPOSICAO'
  source?: 'SINAPI' | 'SEINFRA'
  tableType?: 'ONERADA' | 'DESONERADA'
  state?: string
  year?: number
  referenceTableId?: string
}

export interface PaginatedResult {
  items: ItemResult[]
  total: number
  page: number
  limit: number
  totalPages: number
}
