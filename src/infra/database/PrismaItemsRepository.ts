import { PrismaClient } from '@prisma/client'
import { ItemsRepository } from '../../domain/repositories/ItemsRepository'
import { CreateItemDTO } from '../../domain/dtos/CreateItemDTO'

export class PrismaItemsRepository implements ItemsRepository {
  constructor(private prisma: PrismaClient) {}

  async bulkInsert(
    items: CreateItemDTO[]
  ): Promise<void> {
    const CHUNK_SIZE = 500

    for (
      let i = 0;
      i < items.length;
      i += CHUNK_SIZE
    ) {
      const chunk = items.slice(
        i,
        i + CHUNK_SIZE
      )

      try {
        await this.prisma.item.createMany({
          data: chunk.map((item) => ({
            code: item.code,
            description: item.description,
            unit: item.unit,
            type: item.type,

            category:
              item.category ?? null,

            coefficient:
              item.coefficient ?? null,

            basePrice:
              item.basePrice ?? null,

            referenceTableId:
              item.referenceTableId
          })),
          skipDuplicates: true
        })

        console.log(
          `[Import] Lote processado: ${i + chunk.length}/${items.length}`
        )
      } catch (error) {
        console.error(
          `[Error] Falha no lote começando em ${i}:`,
          error
        )

        throw error
      }
    }
  }

  async findByCode(
    code: string,
    referenceTableId: string
  ) {
    return this.prisma.item.findUnique({
      where: {
        code_referenceTableId: {
          code,
          referenceTableId
        }
      }
    })
  }
}