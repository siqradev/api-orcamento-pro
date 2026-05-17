// src/infra/database/PrismaCompositionsRepository.ts
// Implementa ICompositionsRepository usando Prisma
// Estratégia de bulkInsert: resolve códigos → IDs antes de inserir relações

import { PrismaClient } from '@prisma/client'
import {
  ICompositionsRepository,
  CompositionRow,
} from '../../domain/repositories/CompositionsRepository'
import { CompositionChildDTO } from '../../domain/dtos/CompositionDTO'

const CHUNK_SIZE = 300

export class PrismaCompositionsRepository implements ICompositionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Bulk insert de relações pai → filho ───────────────────────────────────

  async bulkInsert(
    compositions: CompositionChildDTO[],
    referenceTableId: string
  ): Promise<void> {
    if (compositions.length === 0) return

    // 1. Coleta todos os códigos únicos envolvidos
    const allCodes = [
      ...new Set([
        ...compositions.map((c) => c.parentCode),
        ...compositions.map((c) => c.childCode),
      ]),
    ]

    // 2. Busca IDs de todos os itens de uma vez (uma query só)
    const items = await this.prisma.item.findMany({
      where: {
        code: { in: allCodes },
        referenceTableId,
      },
      select: { id: true, code: true },
    })

    // 3. Monta mapa código → id para lookup O(1)
    const codeToId = new Map<string, string>(
      items.map((item) => [item.code, item.id])
    )

    // 4. Converte DTOs para registros do banco, descartando relações com código não encontrado
    const records: { parentItemId: string; childItemId: string; coefficient: number }[] = []
    const skipped: string[] = []

    for (const comp of compositions) {
      const parentId = codeToId.get(comp.parentCode)
      const childId  = codeToId.get(comp.childCode)

      if (!parentId) {
        skipped.push(`parentCode não encontrado: ${comp.parentCode}`)
        continue
      }
      if (!childId) {
        skipped.push(`childCode não encontrado: ${comp.childCode}`)
        continue
      }

      records.push({
        parentItemId: parentId,
        childItemId:  childId,
        coefficient:  comp.coefficient,
      })
    }

    if (skipped.length > 0) {
      console.warn(
        `[CompositionsRepo] ${skipped.length} relações ignoradas por código não resolvido.`
      )
    }

    if (records.length === 0) {
      console.warn('[CompositionsRepo] Nenhum registro para inserir após resolução de IDs.')
      return
    }

    // 5. Deduplicação em memória antes de ir ao banco
    const deduped = Array.from(
      new Map(
        records.map((r) => [`${r.parentItemId}:${r.childItemId}`, r])
      ).values()
    )

    // 6. Insere em chunks
    for (let i = 0; i < deduped.length; i += CHUNK_SIZE) {
      const chunk = deduped.slice(i, i + CHUNK_SIZE)
      await this.prisma.composition.createMany({
        data: chunk,
        skipDuplicates: true,
      })
      console.log(
        `[CompositionsRepo] Lote ${i + chunk.length}/${deduped.length} inserido`
      )
    }

    console.log(
      `[CompositionsRepo] Total inserido: ${deduped.length} relações`
    )
  }

  // ─── Filhos diretos ────────────────────────────────────────────────────────

  async findChildren(
    parentCode: string,
    referenceTableId: string
  ): Promise<CompositionRow[]> {
    const parent = await this.prisma.item.findUnique({
      where: { code_referenceTableId: { code: parentCode, referenceTableId } },
      select: { id: true },
    })

    if (!parent) return []

    return this.prisma.composition.findMany({
      where: { parentItemId: parent.id },
      include: {
        parentItem: {
          select: { id: true, code: true, description: true, unit: true, type: true, basePrice: true },
        },
        childItem: {
          select: { id: true, code: true, description: true, unit: true, type: true, basePrice: true },
        },
      },
    }) as unknown as CompositionRow[]
  }

  // ─── Pais diretos ──────────────────────────────────────────────────────────

  async findParents(
    childCode: string,
    referenceTableId: string
  ): Promise<CompositionRow[]> {
    const child = await this.prisma.item.findUnique({
      where: { code_referenceTableId: { code: childCode, referenceTableId } },
      select: { id: true },
    })

    if (!child) return []

    return this.prisma.composition.findMany({
      where: { childItemId: child.id },
      include: {
        parentItem: {
          select: { id: true, code: true, description: true, unit: true, type: true, basePrice: true },
        },
        childItem: {
          select: { id: true, code: true, description: true, unit: true, type: true, basePrice: true },
        },
      },
    }) as unknown as CompositionRow[]
  }
}
