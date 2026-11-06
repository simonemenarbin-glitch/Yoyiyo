-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "practiceId" TEXT,
    "customerId" TEXT,
    "partnerId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'FATTURA_74TER',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "number" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "customerVat" TEXT,
    "customerFiscalCode" TEXT,
    "customerAddress" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalSell" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "marginBase" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 22,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "linesJson" TEXT,
    "sdiStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "sdiMessageId" TEXT,
    "sdiSentAt" DATETIME,
    "sdiResponseJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FiscalDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FiscalDocument_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_organizationId_number_key" ON "FiscalDocument"("organizationId", "number");
CREATE INDEX "FiscalDocument_organizationId_status_idx" ON "FiscalDocument"("organizationId", "status");
CREATE INDEX "FiscalDocument_practiceId_idx" ON "FiscalDocument"("practiceId");
