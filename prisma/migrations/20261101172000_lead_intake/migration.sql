-- AlterTable Lead: intake from mail/message + AI draft reply
ALTER TABLE "Lead" ADD COLUMN "intakeStatus" TEXT NOT NULL DEFAULT 'RAW';
ALTER TABLE "Lead" ADD COLUMN "departureHint" TEXT;
ALTER TABLE "Lead" ADD COLUMN "durationDays" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "destinationsJson" TEXT;
ALTER TABLE "Lead" ADD COLUMN "rawSourceText" TEXT;
ALTER TABLE "Lead" ADD COLUMN "missingFieldsJson" TEXT;
ALTER TABLE "Lead" ADD COLUMN "draftReply" TEXT;
ALTER TABLE "Lead" ADD COLUMN "parsedJson" TEXT;

CREATE INDEX "Lead_organizationId_intakeStatus_idx" ON "Lead"("organizationId", "intakeStatus");
