-- Central Inteligente de Arquivos — schema expansion for folders, versioning,
-- internal sharing with WhatsApp-like status, public links with tokens,
-- timeline events, and notifications.

-- New enums
CREATE TYPE "Confidentiality" AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE "SharePriority" AS ENUM ('normal', 'important', 'urgent');
CREATE TYPE "ShareScope" AS ENUM ('user', 'department', 'role', 'all');
CREATE TYPE "ShareStatus" AS ENUM ('delivered', 'viewed', 'opened', 'acknowledged');
CREATE TYPE "PublicLinkStatus" AS ENUM ('active', 'expired', 'revoked', 'blocked');

-- Folder expansion
ALTER TABLE "Folder"
  ADD COLUMN     "description" TEXT,
  ADD COLUMN     "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "departmentId" TEXT,
  ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "deletedAt" TIMESTAMP(3),
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "createdBy" SET NOT NULL;

ALTER TABLE "Folder"
  ADD CONSTRAINT "Folder_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Document expansion
ALTER TABLE "Document"
  ADD COLUMN     "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "allowShare" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "confidentiality" "Confidentiality" NOT NULL DEFAULT 'internal',
  ADD COLUMN     "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "responsibleId" TEXT,
  ADD COLUMN     "publishedAt" TIMESTAMP(3),
  ADD COLUMN     "validUntil" TIMESTAMP(3),
  ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- Document versions: add fileSize/mimeType/fileType/isCurrent/changeReason
ALTER TABLE "DocumentVersion"
  ADD COLUMN     "fileSize" INTEGER,
  ADD COLUMN     "mimeType" TEXT,
  ADD COLUMN     "fileType" TEXT,
  ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "changeReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_version_key"
  ON "DocumentVersion"("documentId", "version");

-- Backfill: create v1 for existing docs and mark as current
INSERT INTO "DocumentVersion" ("id","documentId","version","filePath","fileSize","mimeType","fileType","isCurrent","createdBy","createdAt")
SELECT gen_random_uuid()::text, d.id, 1, d."filePath", d."fileSize", d."mimeType", d."fileType", true, d."createdBy", d."createdAt"
FROM "Document" d
WHERE NOT EXISTS (SELECT 1 FROM "DocumentVersion" v WHERE v."documentId" = d.id);

-- DocumentShare rebuild (drop old, create new with rich schema)
DROP TABLE IF EXISTS "DocumentShare" CASCADE;
CREATE TABLE "DocumentShare" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "scope" "ShareScope" NOT NULL DEFAULT 'user',
  "targetUserId" TEXT,
  "targetDepartmentId" TEXT,
  "targetRole" "AppRole",
  "message" TEXT,
  "priority" "SharePriority" NOT NULL DEFAULT 'normal',
  "requireAck" BOOLEAN NOT NULL DEFAULT false,
  "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  "allowReshare" BOOLEAN NOT NULL DEFAULT false,
  "dueAt" TIMESTAMP(3),
  "status" "ShareStatus" NOT NULL DEFAULT 'delivered',
  "versionAtShare" INTEGER,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewedAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentShare_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DocumentShare_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DocumentShare_targetUserId_idx" ON "DocumentShare"("targetUserId");
CREATE INDEX "DocumentShare_documentId_idx" ON "DocumentShare"("documentId");

-- DocumentPublicLink rebuild
DROP TABLE IF EXISTS "DocumentPublicLink" CASCADE;
CREATE TABLE "DocumentPublicLink" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "passwordHash" TEXT,
  "recipientName" TEXT,
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "recipientCompany" TEXT,
  "allowDownload" BOOLEAN NOT NULL DEFAULT false,
  "requireAck" BOOLEAN NOT NULL DEFAULT false,
  "requireIdentify" BOOLEAN NOT NULL DEFAULT false,
  "blockPrint" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "maxAccesses" INTEGER,
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "status" "PublicLinkStatus" NOT NULL DEFAULT 'active',
  "revokedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentPublicLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentPublicLink_token_key" UNIQUE ("token"),
  CONSTRAINT "DocumentPublicLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentPublicLink_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PublicLinkAccess" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "actorName" TEXT,
  "actorEmail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicLinkAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicLinkAccess_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DocumentPublicLink"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PublicLinkAccess_linkId_idx" ON "PublicLinkAccess"("linkId");

-- DocumentAcknowledgement: add version + ip + userAgent, replace unique
ALTER TABLE "DocumentAcknowledgement"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "userAgent" TEXT;
ALTER TABLE "DocumentAcknowledgement" DROP CONSTRAINT IF EXISTS "DocumentAcknowledgement_documentId_userId_key";
CREATE UNIQUE INDEX "DocumentAcknowledgement_documentId_userId_version_key"
  ON "DocumentAcknowledgement"("documentId", "userId", "version");

-- DocumentEvent (timeline)
CREATE TABLE "DocumentEvent" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionId" TEXT,
  "userId" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'user',
  "actorLabel" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "DocumentEvent_documentId_createdAt_idx" ON "DocumentEvent"("documentId", "createdAt");

-- Notification
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "url" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- AuditLog: rename ip_address→ip if present (Prisma uses `ip`), user_agent→userAgent
-- (initial migration used camelCase already; nothing to do)
