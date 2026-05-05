/*
  Warnings:

  - You are about to drop the column `source` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `ReferenceTable` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `ReferenceTable` table. All the data in the column will be lost.
  - The `type` column on the `ReferenceTable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Price` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code,referenceTableId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,state,reference]` on the table `ReferenceTable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `basePrice` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Item` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `reference` to the `ReferenceTable` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `source` on the `ReferenceTable` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Source" AS ENUM ('SINAPI', 'SEINFRA');

-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('DESONERADA', 'ONERADA');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- DropForeignKey
ALTER TABLE "Price" DROP CONSTRAINT "Price_itemId_fkey";

-- DropIndex
DROP INDEX "Item_code_source_referenceTableId_key";

-- DropIndex
DROP INDEX "ReferenceTable_source_state_month_year_type_key";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "source",
ADD COLUMN     "basePrice" DECIMAL(12,4) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "ItemType" NOT NULL;

-- AlterTable
ALTER TABLE "ReferenceTable" DROP COLUMN "month",
DROP COLUMN "year",
ADD COLUMN     "reference" TEXT NOT NULL,
DROP COLUMN "source",
ADD COLUMN     "source" "Source" NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "TableType";

-- DropTable
DROP TABLE "Price";

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "itemsCount" INTEGER,
    "logs" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_referenceTableId_key" ON "Item"("code", "referenceTableId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceTable_source_state_reference_key" ON "ReferenceTable"("source", "state", "reference");
