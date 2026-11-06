-- CreateTable
CREATE TABLE "SupplierConnector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'MOCK_DMC',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "baseUrl" TEXT,
    "configJson" TEXT,
    "lastError" TEXT,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierConnector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierConnector_organizationId_code_key" ON "SupplierConnector"("organizationId", "code");

-- CreateIndex
CREATE INDEX "SupplierConnector_organizationId_enabled_idx" ON "SupplierConnector"("organizationId", "enabled");
