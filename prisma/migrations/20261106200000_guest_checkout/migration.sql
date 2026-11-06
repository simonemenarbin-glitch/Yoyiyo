-- CreateTable
CREATE TABLE "PublicQuoteRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT,
    "siteId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "paxCount" INTEGER NOT NULL DEFAULT 2,
    "departureHint" TEXT,
    "destinations" TEXT,
    "message" TEXT,
    "budgetHint" REAL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "leadId" TEXT,
    "quoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublicQuoteRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicQuoteRequest_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuestCheckout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT,
    "quoteId" TEXT,
    "practiceId" TEXT,
    "publicRequestId" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "guestEmail" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "paxCount" INTEGER NOT NULL DEFAULT 2,
    "totalSell" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentRef" TEXT,
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuestCheckout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuestCheckout_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuestCheckout_publicRequestId_fkey" FOREIGN KEY ("publicRequestId") REFERENCES "PublicQuoteRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PublicQuoteRequest_organizationId_status_idx" ON "PublicQuoteRequest"("organizationId", "status");
CREATE INDEX "PublicQuoteRequest_brandId_idx" ON "PublicQuoteRequest"("brandId");
CREATE UNIQUE INDEX "GuestCheckout_token_key" ON "GuestCheckout"("token");
CREATE INDEX "GuestCheckout_organizationId_status_idx" ON "GuestCheckout"("organizationId", "status");
CREATE INDEX "GuestCheckout_quoteId_idx" ON "GuestCheckout"("quoteId");
