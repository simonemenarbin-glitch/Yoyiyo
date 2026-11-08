-- Social scheduler: Meta / TikTok / LinkedIn posts + stories (sandbox)

CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'POST',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaCaption" TEXT,
    "linkUrl" TEXT,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "providerPostId" TEXT,
    "lastError" TEXT,
    "extrasJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SocialPost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SocialPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SocialPost_organizationId_scheduledAt_idx" ON "SocialPost"("organizationId", "scheduledAt");
CREATE INDEX "SocialPost_organizationId_status_platform_idx" ON "SocialPost"("organizationId", "status", "platform");
CREATE INDEX "SocialPost_organizationId_brandId_idx" ON "SocialPost"("organizationId", "brandId");
