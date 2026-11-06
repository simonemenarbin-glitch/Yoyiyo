-- CreateTable
CREATE TABLE "ContractPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "ratePlanId" TEXT,
    "name" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "netCost" REAL NOT NULL,
    "sellPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "minStay" INTEGER NOT NULL DEFAULT 1,
    "bookableUntil" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractPeriod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractPeriod_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateSupplement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "periodId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isPercent" BOOLEAN NOT NULL DEFAULT false,
    "perNight" BOOLEAN NOT NULL DEFAULT true,
    "perPerson" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RateSupplement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RateSupplement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ContractPeriod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllotmentBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "periodId" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ROOM',
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "releasedUnits" INTEGER NOT NULL DEFAULT 0,
    "bookedUnits" INTEGER NOT NULL DEFAULT 0,
    "releaseDays" INTEGER NOT NULL DEFAULT 21,
    "freeSale" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllotmentBucket_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllotmentBucket_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ContractPeriod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'CANCELLATION',
    "name" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "daysBefore" INTEGER,
    "penaltyPct" REAL,
    "depositPct" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractPolicy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractPeriod_productId_validFrom_validTo_idx" ON "ContractPeriod"("productId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "RateSupplement_productId_kind_idx" ON "RateSupplement"("productId", "kind");

-- CreateIndex
CREATE INDEX "AllotmentBucket_productId_idx" ON "AllotmentBucket"("productId");

-- CreateIndex
CREATE INDEX "ContractPolicy_organizationId_kind_idx" ON "ContractPolicy"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "ContractPolicy_productId_idx" ON "ContractPolicy"("productId");
