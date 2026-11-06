-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT 'B2C';
ALTER TABLE "Customer" ADD COLUMN "preferredBrandId" TEXT;

ALTER TABLE "Lead" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT 'B2C';
ALTER TABLE "Lead" ADD COLUMN "pipelineName" TEXT;

CREATE INDEX "Customer_organizationId_clientType_idx" ON "Customer"("organizationId", "clientType");
CREATE INDEX "Lead_organizationId_clientType_idx" ON "Lead"("organizationId", "clientType");
CREATE INDEX "Lead_organizationId_brandId_idx" ON "Lead"("organizationId", "brandId");
CREATE INDEX "Lead_organizationId_customerId_idx" ON "Lead"("organizationId", "customerId");
