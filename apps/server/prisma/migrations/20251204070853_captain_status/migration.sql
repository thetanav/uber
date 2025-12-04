/*
  Warnings:

  - You are about to drop the column `isActive` on the `Captain` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Captain" DROP COLUMN "isActive",
ADD COLUMN     "inDrive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false;
