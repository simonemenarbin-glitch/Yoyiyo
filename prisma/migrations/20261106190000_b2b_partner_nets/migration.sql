-- CreateTable
CREATE TABLE "PartnerNet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STANDARD',
    "defaultMarkupPct" REAL NOT NULL DEFAULT 10,
    "defaultCommissionPct" REAL NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerNet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "AgencyPartner" ADD COLUMN "netId" TEXT;
ALTER TABLE "AgencyPartner" ADD COLUMN "contactName" TEXT;
ALTER TABLE "AgencyPartner" ADD COLUMN "city" TEXT;
ALTER TABLE "AgencyPartner" ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "AgencyPartner" ADD COLUMN "portalToken" TEXT;
ALTER TABLE "AgencyPartner" ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PartnerPriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "netId" TEXT,
    "partnerId" TEXT,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerPriceList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerPriceList_netId_fkey" FOREIGN KEY ("netId") REFERENCES "PartnerNet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PartnerPriceList_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "AgencyPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerPriceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceType" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "netCost" REAL NOT NULL DEFAULT 0,
    "agencyNet" REAL NOT NULL DEFAULT 0,
    "suggestedSell" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerPriceLine_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PartnerPriceList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerPriceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerNet_organizationId_code_key" ON "PartnerNet"("organizationId", "code");
CREATE INDEX "PartnerNet_organizationId_active_idx" ON "PartnerNet"("organizationId", "active");
CREATE UNIQUE INDEX "AgencyPartner_portalToken_key" ON "AgencyPartner"("portalToken");
CREATE INDEX "AgencyPartner_organizationId_idx" ON "AgencyPartner"("organizationId");
CREATE INDEX "AgencyPartner_netId_idx" ON "AgencyPartner"("netId");
CREATE INDEX "PartnerPriceList_organizationId_active_idx" ON "PartnerPriceList"("organizationId", "active");
CREATE INDEX "PartnerPriceList_netId_idx" ON "PartnerPriceList"("netId");
CREATE INDEX "PartnerPriceList_partnerId_idx" ON "PartnerPriceList"("partnerId");
CREATE INDEX "PartnerPriceLine_priceListId_idx" ON "PartnerPriceLine"("priceListId");
