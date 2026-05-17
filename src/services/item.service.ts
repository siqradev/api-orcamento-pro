import { prisma } from "../lib/prisma";
import { normalizeText } from "../utils/normalize-text";

interface GetItemsParams {
  page?: number;
  limit?: number;
  q?: string;
  tableId?: string;
}

export class ItemService {
  async getItems({
    page = 1,
    limit = 20,
    q,
    tableId,
  }: GetItemsParams) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    // Busca textual
    if (q) {
      where.searchText = {
        contains: normalizeText(q),
        mode: "insensitive",
      };
    }

    // Filtro por tabela
    if (tableId) {
      where.referenceTableId = tableId;
    }

    // Total
    const total = await prisma.item.count({
      where,
    });

    // Dados
    const items = await prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        description: "asc",
      },

      include: {
        referenceTable: true,
      },
    });

    return {
      data: items,

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}