-- AlterTable Brand
ALTER TABLE "Brand" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Brand" ADD COLUMN "tagline" TEXT;
ALTER TABLE "Brand" ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#B33A2B';
ALTER TABLE "Brand" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Brand" ADD COLUMN "domain" TEXT;
ALTER TABLE "Brand" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Brand" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Brand" ADD COLUMN "socialJson" TEXT;
ALTER TABLE "Brand" ADD COLUMN "notes" TEXT;

-- AlterTable Lead
ALTER TABLE "Lead" ADD COLUMN "campaignId" TEXT;

-- CreateTable Campaign
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'LANDING',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "goal" TEXT,
    "utmCampaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "spend" REAL NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "revenueAttributed" REAL NOT NULL DEFAULT 0,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BrandSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'LANDING',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT DEFAULT 'Richiedi preventivo',
    "ctaHref" TEXT,
    "heroImageUrl" TEXT,
    "blocksJson" TEXT,
    "customCss" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "formSubmits" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandSite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandSite_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandSite_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Campaign_organizationId_brandId_idx" ON "Campaign"("organizationId", "brandId");
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE UNIQUE INDEX "BrandSite_brandId_slug_key" ON "BrandSite"("brandId", "slug");
CREATE INDEX "BrandSite_organizationId_brandId_idx" ON "BrandSite"("organizationId", "brandId");
CREATE INDEX "BrandSite_organizationId_status_idx" ON "BrandSite"("organizationId", "status");
CREATE INDEX "Lead_organizationId_campaignId_idx" ON "Lead"("organizationId", "campaignId");
