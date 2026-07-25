-- Runtime schema repair for self-hosted deployments that already applied older
-- migrations before the file center schema was fully aligned with Prisma.

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "DocumentAcknowledgement" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DocumentAcknowledgement" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "DocumentAcknowledgement" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DocumentShare' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "DocumentShare" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_version_key"
  ON "DocumentVersion"("documentId", "version");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAcknowledgement_documentId_userId_version_key"
  ON "DocumentAcknowledgement"("documentId", "userId", "version");