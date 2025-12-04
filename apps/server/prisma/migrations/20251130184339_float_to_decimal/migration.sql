/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `Captain` table. All the data in the column will be lost.
  - You are about to alter the column `currentLat` on the `Captain` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `currentLng` on the `Captain` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `originLat` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `originLng` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `destLat` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `destLng` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,8)`.
  - You are about to alter the column `pricing` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - Added the required column `password` to the `Captain` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Captain` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Captain" DROP COLUMN "passwordHash",
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "currentLat" SET DATA TYPE DECIMAL(10,8),
ALTER COLUMN "currentLng" SET DATA TYPE DECIMAL(10,8);

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "originLat" SET DATA TYPE DECIMAL(10,8),
ALTER COLUMN "originLng" SET DATA TYPE DECIMAL(10,8),
ALTER COLUMN "destLat" SET DATA TYPE DECIMAL(10,8),
ALTER COLUMN "destLng" SET DATA TYPE DECIMAL(10,8),
ALTER COLUMN "pricing" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "Trip_captainId_idx" ON "Trip"("captainId");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");
