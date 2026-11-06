-- AlterTable CatalogProduct: price source for own listini + future supplier APIs
ALTER TABLE "CatalogProduct" ADD COLUMN "priceSource" TEXT NOT NULL DEFAULT 'OWN_LIST';
ALTER TABLE "CatalogProduct" ADD COLUMN "supplierCode" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "supplierRef" TEXT;

-- AlterTable Quote: CRM lead + pipeline + workable totals
ALTER TABLE "Quote" ADD COLUMN "leadId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "pipelineStage" TEXT NOT NULL DEFAULT 'QUOTING';
ALTER TABLE "Quote" ADD COLUMN "paxCount" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Quote" ADD COLUMN "departureDate" DATETIME;
ALTER TABLE "Quote" ADD COLUMN "returnDate" DATETIME;
ALTER TABLE "Quote" ADD COLUMN "totalCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "marginPct" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "hypothesisNote" TEXT;

-- AlterTable QuoteLine: cost + price source (listino / API / manuale)
ALTER TABLE "QuoteLine" ADD COLUMN "netCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "QuoteLine" ADD COLUMN "priceSource" TEXT NOT NULL DEFAULT 'OWN_LIST';
ALTER TABLE "QuoteLine" ADD COLUMN "supplierCode" TEXT;
ALTER TABLE "QuoteLine" ADD COLUMN "supplierRef" TEXT;
ALTER TABLE "QuoteLine" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable Lead
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT,
    "customerId" TEXT,
    "partnerId" TEXT,
    "assigneeUserId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceDetail" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'NEW',
    "interest" TEXT,
    "paxCount" INTEGER NOT NULL DEFAULT 2,
    "budgetHint" REAL,
    "notes" TEXT,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "AgencyPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Lead_organizationId_pipelineStage_idx" ON "Lead"("organizationId", "pipelineStage");
CREATE INDEX "Lead_organizationId_source_idx" ON "Lead"("organizationId", "source");
CREATE INDEX "Quote_organizationId_pipelineStage_idx" ON "Quote"("organizationId", "pipelineStage");
