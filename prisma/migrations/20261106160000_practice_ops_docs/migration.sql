-- AlterTable
ALTER TABLE "Practice" ADD COLUMN "groupageOver20" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Practice" ADD COLUMN "depositPct" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Practice" ADD COLUMN "depositAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Practice" ADD COLUMN "releaseDays" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "Practice" ADD COLUMN "confirmedAt" DATETIME;

-- CreateTable
CREATE TABLE "PracticeChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "paxAffected" INTEGER,
    "sellBase" REAL NOT NULL DEFAULT 0,
    "sellDelta" REAL NOT NULL DEFAULT 0,
    "costDelta" REAL NOT NULL DEFAULT 0,
    "penaltyPct" REAL,
    "penaltyAmount" REAL,
    "daysToDeparture" INTEGER,
    "lineId" TEXT,
    "createdByUserId" TEXT,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeChange_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedByUserId" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeDocument_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PracticeChange_practiceId_createdAt_idx" ON "PracticeChange"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeDocument_practiceId_type_idx" ON "PracticeDocument"("practiceId", "type");
