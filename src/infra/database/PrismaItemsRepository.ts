// src/infra/database/PrismaItemsRepository.ts
// Implementação concreta do IItemsRepository usando Prisma
// Essa é a ÚNICA classe que conhece o Prisma — controllers e use-cases nunca importam prisma diretamente

import { PrismaClient } from '@prisma/client'
import {
  IItemsRepository,
  ItemResult,
  PaginatedResult,
  SearchFilters,
} from '../../domain/repositories/ItemsRepository'
import { CreateItemDTO } from '../../domain/dtos/CreateItemDTO'
import { normalizeText } from '../../shared/utils/normalizeText'

// Tamanho dos lotes para bulk insert — 500 é seguro para o Postgres
const CHUNK_SIZE = 500

export class PrismaItemsRepository implements IItemsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Inserção em lote ──────────────────────────────────────────────────────

  async bulkInsert(items: CreateItemDTO[]): Promise<void> {
    if (items.length === 0) return

    // Pré-processa searchText antes de inserir
    const prepared = items.map((item) => ({
      code: item.code,
      description: item.description,
      searchText: normalizeText(item.description),
      unit: item.unit,
      type: item.type,
      category: item.category ?? null,
      coefficient: item.coefficient ?? null,
      basePrice: item.basePrice ?? null,
      referenceTableId: item.referenceTableId,
    }))

    // Divide em chunks para não estourar o limite de parâmetros do Postgres
    for (let i = 0; i < prepared.length; i += CHUNK_SIZE) {
      const chunk = prepared.slice(i, i + CHUNK_SIZE)

      try {
        await this.prisma.item.createMany({
          data: chunk,
          skipDuplicates: true, // respeita o UNIQUE [code, referenceTableId]
        })

        console.log(
          `[BulkInsert] Lote ${i + chunk.length}/${prepared.length} inserido`
        )
      } catch (error) {
        console.error(`[BulkInsert] Erro no lote iniciado em ${i}:`, error)
        throw error
      }
    }
  }

  // ─── Busca por código ──────────────────────────────────────────────────────

  async findByCode(
    code: string,
    referenceTableId: string
  ): Promise<ItemResult | null> {
    const item = await this.prisma.item.findUnique({
      where: {
        code_referenceTableId: { code, referenceTableId },
      },
      include: {
        referenceTable: true,
      },
    })

    return item as ItemResult | null
  }

  // ─── Busca textual ─────────────────────────────────────────────────────────

  async search(
    query: string,
    filters: SearchFilters = {}
  ): Promise<ItemResult[]> {
    const normalized = normalizeText(query)

    const items = await this.prisma.item.findMany({
      where: {
        searchText: {
          contains: normalized,
          mode: 'insensitive',
        },
        ...(filters.type && { type: filters.type }),
        ...(filters.referenceTableId && {
          referenceTableId: filters.referenceTableId,
        }),
        // Filtros por metadados da tabela de referência
        ...(filters.source || filters.tableType || filters.state || filters.year
          ? {
              referenceTable: {
                ...(filters.source && { source: filters.source }),
                ...(filters.tableType && { type: filters.tableType }),
                ...(filters.state && { state: filters.state }),
                ...(filters.year && { year: filters.year }),
              },
            }
          : {}),
        deletedAt: null, // soft delete
      },
      take: 50,
      include: {
        referenceTable: true,
      },
      orderBy: { description: 'asc' },
    })

    return items as ItemResult[]
  }

  // ─── Listagem paginada ─────────────────────────────────────────────────────

  async paginate(
    page: number,
    limit: number,
    filters: SearchFilters = {}
  ): Promise<PaginatedResult> {
    const skip = (page - 1) * limit

    const where = {
      ...(filters.type && { type: filters.type }),
      ...(filters.referenceTableId && {
        referenceTableId: filters.referenceTableId,
      }),
      ...(filters.source || filters.tableType || filters.state || filters.year
        ? {
            referenceTable: {
              ...(filters.source && { source: filters.source }),
              ...(filters.tableType && { type: filters.tableType }),
              ...(filters.state && { state: filters.state }),
              ...(filters.year && { year: filters.year }),
            },
          }
        : {}),
      deletedAt: null,
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { description: 'asc' },
        include: { referenceTable: true },
      }),
      this.prisma.item.count({ where }),
    ])

    return {
      items: items as ItemResult[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
}
