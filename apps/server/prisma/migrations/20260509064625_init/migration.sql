-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'ON_TRIP', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "originLat" DECIMAL(10,8),
    "originLng" DECIMAL(10,8),
    "destination" TEXT NOT NULL,
    "destLat" DECIMAL(10,8),
    "destLng" DECIMAL(10,8),
    "capacity" INTEGER NOT NULL,
    "captainId" TEXT,
    "userId" TEXT NOT NULL,
    "pricing" DECIMAL(10,2) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'REQUESTED',
    "otp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Captain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "vehicle" TEXT,
    "capacity" INTEGER NOT NULL,
    "currentLat" DECIMAL(10,8),
    "currentLng" DECIMAL(10,8),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "inDrive" BOOLEAN NOT NULL DEFAULT false,
    "isPooling" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Captain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trip_captainId_idx" ON "Trip"("captainId");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Captain_email_key" ON "Captain"("email");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
