import { prisma } from "../lib/prisma";

export class ItemRepository {
  async createMany(items: any[]) {
    return prisma.$transaction(async (tx) => {
      await tx.item.createMany({
        data: items,
        skipDuplicates: true,
      });
    });
  }
}