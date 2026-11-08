-- Contabilità AR (clienti) + AP (fornitori)

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "regime" TEXT NOT NULL DEFAULT 'STANDARD',
    "number" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "practiceId" TEXT,
    "quoteId" TEXT,
    "customerId" TEXT,
    "partnerId" TEXT,
    "counterpartyName" TEXT NOT NULL,
    "counterpartyVat" TEXT,
    "counterpartyEmail" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 22,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "marginBase" REAL NOT NULL DEFAULT 0,
    "costBase" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "linesJson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "AgencyPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Invoice_organizationId_number_key" ON "Invoice"("organizationId", "number");
CREATE INDEX "Invoice_organizationId_direction_status_idx" ON "Invoice"("organizationId", "direction", "status");
CREATE INDEX "Invoice_practiceId_idx" ON "Invoice"("practiceId");
CREATE INDEX "Invoice_quoteId_idx" ON "Invoice"("quoteId");
