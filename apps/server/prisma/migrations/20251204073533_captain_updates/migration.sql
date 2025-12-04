-- AlterTable
ALTER TABLE "Captain" ADD COLUMN     "isPooling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
