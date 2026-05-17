/*
  Warnings:

  - Added the required column `hash` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "hash" TEXT NOT NULL;
