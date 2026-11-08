-- Ads hub extras + AI/CRM audience lists

ALTER TABLE "Campaign" ADD COLUMN "extrasJson" TEXT;

CREATE TABLE "AudienceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CRM_FILTER',
    "description" TEXT,
    "criteriaJson" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "membersJson" TEXT,
    "lastBuiltAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AudienceList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AudienceList_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AudienceList_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AudienceList_organizationId_kind_idx" ON "AudienceList"("organizationId", "kind");
CREATE INDEX "AudienceList_organizationId_brandId_idx" ON "AudienceList"("organizationId", "brandId");
