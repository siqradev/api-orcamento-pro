/*
  Warnings:

  - A unique constraint covering the columns `[source,state,month,year,type]` on the table `ReferenceTable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `month` to the `ReferenceTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ReferenceTable` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ReferenceTable_source_state_reference_key";

-- AlterTable
ALTER TABLE "ReferenceTable" ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL,
ALTER COLUMN "reference" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceTable_source_state_month_year_type_key" ON "ReferenceTable"("source", "state", "month", "year", "type");
