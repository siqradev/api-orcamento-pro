-- CreateEnum
CREATE TYPE "Source" AS ENUM ('SINAPI', 'SEINFRA');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('INSUMO', 'COMPOSICAO');

-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('DESONERADA', 'ONERADA');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ReferenceTable" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "description" TEXT,
    "reference" TEXT,
    "source" "Source" NOT NULL,
    "type" "TableType",
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "ReferenceTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "searchText" TEXT,
    "unit" TEXT NOT NULL,
    "referenceTableId" TEXT NOT NULL,
    "basePrice" DECIMAL(12,4),
    "type" "ItemType" NOT NULL,
    "category" TEXT,
    "coefficient" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Composition" (
    "id" TEXT NOT NULL,
    "parentItemId" TEXT NOT NULL,
    "childItemId" TEXT NOT NULL,
    "coefficient" DECIMAL(12,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "status" "JobStatus" NOT NULL,
    "itemsCount" INTEGER,
    "logs" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "month" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "type" "TableType",
    "year" INTEGER NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceTable_state_idx" ON "ReferenceTable"("state");

-- CreateIndex
CREATE INDEX "ReferenceTable_source_idx" ON "ReferenceTable"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceTable_source_state_month_year_type_key" ON "ReferenceTable"("source", "state", "month", "year", "type");

-- CreateIndex
CREATE INDEX "Item_code_idx" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_referenceTableId_idx" ON "Item"("referenceTableId");

-- CreateIndex
CREATE INDEX "Item_description_idx" ON "Item"("description");

-- CreateIndex
CREATE INDEX "Item_searchText_idx" ON "Item"("searchText");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_referenceTableId_key" ON "Item"("code", "referenceTableId");

-- CreateIndex
CREATE INDEX "Composition_parentItemId_idx" ON "Composition"("parentItemId");

-- CreateIndex
CREATE INDEX "Composition_childItemId_idx" ON "Composition"("childItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Composition_parentItemId_childItemId_key" ON "Composition"("parentItemId", "childItemId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_source_idx" ON "ImportJob"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_referenceTableId_fkey" FOREIGN KEY ("referenceTableId") REFERENCES "ReferenceTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_childItemId_fkey" FOREIGN KEY ("childItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
