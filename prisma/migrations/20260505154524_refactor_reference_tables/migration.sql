/*
  Warnings:

  - You are about to drop the column `reference` on the `ImportJob` table. All the data in the column will be lost.
  - Added the required column `month` to the `ImportJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `ImportJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ImportJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportJob" DROP COLUMN "reference",
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "type" "TableType",
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "basePrice" DROP NOT NULL;
