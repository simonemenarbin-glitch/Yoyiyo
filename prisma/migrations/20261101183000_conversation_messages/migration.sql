-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "connectionId" TEXT,
    "userId" TEXT,
    "direction" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "channelKind" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LOGGED',
    "toAddress" TEXT,
    "fromAddress" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "providerId" TEXT,
    "errorText" TEXT,
    "ingestedId" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConversationMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ChannelConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ConversationMessage_leadId_createdAt_idx" ON "ConversationMessage"("leadId", "createdAt");
CREATE INDEX "ConversationMessage_organizationId_direction_idx" ON "ConversationMessage"("organizationId", "direction");
