/*
  Warnings:

  - You are about to drop the column `key` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ApiKey` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ApiKey_key_key";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "key",
DROP COLUMN "updatedAt";
