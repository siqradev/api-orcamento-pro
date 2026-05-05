/*
  Warnings:

  - You are about to alter the column `coefficient` on the `Composition` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,6)`.
  - You are about to alter the column `value` on the `Price` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,4)`.
  - A unique constraint covering the columns `[parentItemId,childItemId]` on the table `Composition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,source,referenceTableId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `source` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('INSUMO', 'COMPOSICAO');

-- DropForeignKey
ALTER TABLE "Composition" DROP CONSTRAINT "Composition_parentItemId_fkey";

-- DropForeignKey
ALTER TABLE "Price" DROP CONSTRAINT "Price_itemId_fkey";

-- DropIndex
DROP INDEX "Item_code_referenceTableId_key";

-- AlterTable
ALTER TABLE "Composition" ALTER COLUMN "coefficient" SET DATA TYPE DECIMAL(12,6);

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INSUMO';

-- AlterTable
ALTER TABLE "Price" ALTER COLUMN "value" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "ReferenceTable" ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Composition_parentItemId_childItemId_key" ON "Composition"("parentItemId", "childItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_source_referenceTableId_key" ON "Item"("code", "source", "referenceTableId");

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
