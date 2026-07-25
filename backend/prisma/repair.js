const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function exec(label, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    console.error(`[repair] falha em ${label}: ${error.message}`);
    throw error;
  }
}

async function createEnum(name, values) {
  const quotedValues = values.map((value) => `'${value}'`).join(', ');
  await exec(
    `enum ${name}`,
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE "${name}" AS ENUM (${quotedValues});
      END IF;
    END $$;`,
  );
}

async function addColumn(table, column, definition) {
  await exec(`${table}.${column}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition};`);
}

async function main() {
  console.log('[repair] conferindo compatibilidade do schema...');

  await createEnum('AppRole', ['super_admin', 'admin', 'gestor', 'colaborador', 'correspondente', 'franqueado']);
  await createEnum('UserStatus', ['active', 'inactive', 'pending']);
  await createEnum('Confidentiality', ['public', 'internal', 'confidential', 'restricted']);
  await createEnum('SharePriority', ['normal', 'important', 'urgent']);
  await createEnum('ShareScope', ['user', 'department', 'role', 'all']);
  await createEnum('ShareStatus', ['delivered', 'viewed', 'opened', 'acknowledged']);
  await createEnum('PublicLinkStatus', ['active', 'expired', 'revoked', 'blocked']);
  await createEnum('PolicyStatus', ['draft', 'active', 'inactive', 'archived']);
  await createEnum('PolicyInheritance', ['full', 'partial', 'exception', 'override', 'locked']);
  await createEnum('PolicyExceptionStatus', ['pending', 'approved', 'rejected', 'expired']);

  await addColumn('Folder', 'description', 'TEXT');
  await addColumn('Folder', 'tags', 'TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]');
  await addColumn('Folder', 'isOfficial', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('Folder', 'departmentId', 'TEXT');
  await addColumn('Folder', 'createdBy', 'TEXT');
  await addColumn('Folder', 'isDeleted', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('Folder', 'deletedAt', 'TIMESTAMP(3)');
  await addColumn('Folder', 'updatedAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await addColumn('Folder', 'policyId', 'TEXT');
  await addColumn('Folder', 'policyInheritance', '"PolicyInheritance" NOT NULL DEFAULT \'full\'');

  await addColumn('Document', 'allowDownload', 'BOOLEAN NOT NULL DEFAULT true');
  await addColumn('Document', 'allowShare', 'BOOLEAN NOT NULL DEFAULT true');
  await addColumn('Document', 'confidentiality', '"Confidentiality" NOT NULL DEFAULT \'internal\'');
  await addColumn('Document', 'tags', 'TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]');
  await addColumn('Document', 'viewCount', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('Document', 'version', 'INTEGER NOT NULL DEFAULT 1');
  await addColumn('Document', 'responsibleId', 'TEXT');
  await addColumn('Document', 'publishedAt', 'TIMESTAMP(3)');
  await addColumn('Document', 'validUntil', 'TIMESTAMP(3)');
  await addColumn('Document', 'isDeleted', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('Document', 'deletedAt', 'TIMESTAMP(3)');
  await addColumn('Document', 'policyId', 'TEXT');
  await addColumn('Document', 'policyInheritance', '"PolicyInheritance" NOT NULL DEFAULT \'full\'');
  await addColumn('Document', 'policyLocked', 'BOOLEAN NOT NULL DEFAULT false');

  await addColumn('DocumentVersion', 'fileSize', 'INTEGER');
  await addColumn('DocumentVersion', 'mimeType', 'TEXT');
  await addColumn('DocumentVersion', 'fileType', 'TEXT');
  await addColumn('DocumentVersion', 'isCurrent', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentVersion', 'changeReason', 'TEXT');
  await exec(
    'DocumentVersion unique',
    'CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");',
  );
  await exec(
    'DocumentVersion backfill',
    `INSERT INTO "DocumentVersion" ("id", "documentId", "version", "filePath", "fileSize", "mimeType", "fileType", "isCurrent", "createdBy", "createdAt")
     SELECT gen_random_uuid()::text, d."id", 1, d."filePath", d."fileSize", d."mimeType", d."fileType", true, d."createdBy", d."createdAt"
     FROM "Document" d
     WHERE NOT EXISTS (SELECT 1 FROM "DocumentVersion" v WHERE v."documentId" = d."id");`,
  );

  await addColumn('AuditLog', 'ip', 'TEXT');
  await addColumn('AuditLog', 'userAgent', 'TEXT');

  await exec(
    'DocumentShare table',
    `CREATE TABLE IF NOT EXISTS "DocumentShare" (
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
      CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
    );`,
  );
  await addColumn('DocumentShare', 'scope', '"ShareScope" NOT NULL DEFAULT \'user\'');
  await addColumn('DocumentShare', 'targetUserId', 'TEXT');
  await addColumn('DocumentShare', 'targetDepartmentId', 'TEXT');
  await addColumn('DocumentShare', 'targetRole', '"AppRole"');
  await addColumn('DocumentShare', 'message', 'TEXT');
  await addColumn('DocumentShare', 'priority', '"SharePriority" NOT NULL DEFAULT \'normal\'');
  await addColumn('DocumentShare', 'requireAck', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentShare', 'allowDownload', 'BOOLEAN NOT NULL DEFAULT true');
  await addColumn('DocumentShare', 'allowReshare', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentShare', 'dueAt', 'TIMESTAMP(3)');
  await addColumn('DocumentShare', 'status', '"ShareStatus" NOT NULL DEFAULT \'delivered\'');
  await addColumn('DocumentShare', 'versionAtShare', 'INTEGER');
  await addColumn('DocumentShare', 'deliveredAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await addColumn('DocumentShare', 'viewedAt', 'TIMESTAMP(3)');
  await addColumn('DocumentShare', 'openedAt', 'TIMESTAMP(3)');
  await addColumn('DocumentShare', 'acknowledgedAt', 'TIMESTAMP(3)');
  await addColumn('DocumentShare', 'createdBy', 'TEXT');
  await exec(
    'DocumentShare legacy target',
    `DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'DocumentShare' AND column_name = 'userId') THEN
        UPDATE "DocumentShare" SET "targetUserId" = "userId" WHERE "targetUserId" IS NULL;
        ALTER TABLE "DocumentShare" ALTER COLUMN "userId" DROP NOT NULL;
      END IF;
    END $$;`,
  );
  await exec(
    'DocumentShare creator backfill',
    `UPDATE "DocumentShare" s
     SET "createdBy" = COALESCE(s."createdBy", d."createdBy", (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1))
     FROM "Document" d
     WHERE s."documentId" = d."id" AND s."createdBy" IS NULL;`,
  );
  await exec('DocumentShare document index', 'CREATE INDEX IF NOT EXISTS "DocumentShare_documentId_idx" ON "DocumentShare"("documentId");');
  await exec('DocumentShare target index', 'CREATE INDEX IF NOT EXISTS "DocumentShare_targetUserId_idx" ON "DocumentShare"("targetUserId");');

  await exec(
    'DocumentPublicLink table',
    `CREATE TABLE IF NOT EXISTS "DocumentPublicLink" (
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
      CONSTRAINT "DocumentPublicLink_pkey" PRIMARY KEY ("id")
    );`,
  );
  await addColumn('DocumentPublicLink', 'passwordHash', 'TEXT');
  await addColumn('DocumentPublicLink', 'recipientName', 'TEXT');
  await addColumn('DocumentPublicLink', 'recipientEmail', 'TEXT');
  await addColumn('DocumentPublicLink', 'recipientPhone', 'TEXT');
  await addColumn('DocumentPublicLink', 'recipientCompany', 'TEXT');
  await addColumn('DocumentPublicLink', 'allowDownload', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentPublicLink', 'requireAck', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentPublicLink', 'requireIdentify', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentPublicLink', 'blockPrint', 'BOOLEAN NOT NULL DEFAULT false');
  await addColumn('DocumentPublicLink', 'maxAccesses', 'INTEGER');
  await addColumn('DocumentPublicLink', 'accessCount', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('DocumentPublicLink', 'failedAttempts', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('DocumentPublicLink', 'status', '"PublicLinkStatus" NOT NULL DEFAULT \'active\'');
  await addColumn('DocumentPublicLink', 'revokedAt', 'TIMESTAMP(3)');
  await addColumn('DocumentPublicLink', 'notes', 'TEXT');
  await exec('DocumentPublicLink token', 'CREATE UNIQUE INDEX IF NOT EXISTS "DocumentPublicLink_token_key" ON "DocumentPublicLink"("token");');

  await exec(
    'PublicLinkAccess table',
    `CREATE TABLE IF NOT EXISTS "PublicLinkAccess" (
      "id" TEXT NOT NULL,
      "linkId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "ip" TEXT,
      "userAgent" TEXT,
      "actorName" TEXT,
      "actorEmail" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PublicLinkAccess_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('PublicLinkAccess index', 'CREATE INDEX IF NOT EXISTS "PublicLinkAccess_linkId_idx" ON "PublicLinkAccess"("linkId");');

  await addColumn('DocumentAcknowledgement', 'version', 'INTEGER NOT NULL DEFAULT 1');
  await addColumn('DocumentAcknowledgement', 'ip', 'TEXT');
  await addColumn('DocumentAcknowledgement', 'userAgent', 'TEXT');
  await exec(
    'DocumentAcknowledgement unique version',
    'CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAcknowledgement_documentId_userId_version_key" ON "DocumentAcknowledgement"("documentId", "userId", "version");',
  );

  await exec(
    'DocumentEvent table',
    `CREATE TABLE IF NOT EXISTS "DocumentEvent" (
      "id" TEXT NOT NULL,
      "documentId" TEXT NOT NULL,
      "versionId" TEXT,
      "userId" TEXT,
      "actorType" TEXT NOT NULL DEFAULT 'user',
      "actorLabel" TEXT,
      "action" TEXT NOT NULL,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DocumentEvent_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('DocumentEvent index', 'CREATE INDEX IF NOT EXISTS "DocumentEvent_documentId_createdAt_idx" ON "DocumentEvent"("documentId", "createdAt");');

  await exec(
    'Notification table',
    `CREATE TABLE IF NOT EXISTS "Notification" (
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
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('Notification index', 'CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");');

  await exec(
    'AccessTemplate table',
    `CREATE TABLE IF NOT EXISTS "AccessTemplate" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "moduleKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccessTemplate_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('AccessTemplate name', 'CREATE UNIQUE INDEX IF NOT EXISTS "AccessTemplate_name_key" ON "AccessTemplate"("name");');
  await exec(
    'RoleAccessTemplate table',
    `CREATE TABLE IF NOT EXISTS "RoleAccessTemplate" (
      "role" "AppRole" NOT NULL,
      "templateId" TEXT NOT NULL,
      CONSTRAINT "RoleAccessTemplate_pkey" PRIMARY KEY ("role")
    );`,
  );
  await exec(
    'UserAccessOverride table',
    `CREATE TABLE IF NOT EXISTS "UserAccessOverride" (
      "userId" TEXT NOT NULL,
      "templateId" TEXT,
      "moduleKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserAccessOverride_pkey" PRIMARY KEY ("userId")
    );`,
  );

  await exec(
    'DocumentPolicy table',
    `CREATE TABLE IF NOT EXISTS "DocumentPolicy" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT,
      "status" "PolicyStatus" NOT NULL DEFAULT 'draft',
      "priority" INTEGER NOT NULL DEFAULT 100,
      "responsibleId" TEXT,
      "effectiveFrom" TIMESTAMP(3),
      "effectiveUntil" TIMESTAMP(3),
      "conditions" JSONB NOT NULL DEFAULT '{}',
      "permissions" JSONB NOT NULL DEFAULT '{}',
      "sharingRules" JSONB NOT NULL DEFAULT '{}',
      "securityRules" JSONB NOT NULL DEFAULT '{}',
      "readingRules" JSONB NOT NULL DEFAULT '{}',
      "versioningRules" JSONB NOT NULL DEFAULT '{}',
      "retentionRules" JSONB NOT NULL DEFAULT '{}',
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DocumentPolicy_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('DocumentPolicy name', 'CREATE UNIQUE INDEX IF NOT EXISTS "DocumentPolicy_name_key" ON "DocumentPolicy"("name");');

  await exec(
    'SharePreset table',
    `CREATE TABLE IF NOT EXISTS "SharePreset" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "config" JSONB NOT NULL DEFAULT '{}',
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SharePreset_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec('SharePreset key', 'CREATE UNIQUE INDEX IF NOT EXISTS "SharePreset_key_key" ON "SharePreset"("key");');

  await exec(
    'PolicyException table',
    `CREATE TABLE IF NOT EXISTS "PolicyException" (
      "id" TEXT NOT NULL,
      "policyId" TEXT NOT NULL,
      "documentId" TEXT,
      "requestedBy" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "requestedAction" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3),
      "status" "PolicyExceptionStatus" NOT NULL DEFAULT 'pending',
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "reviewNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PolicyException_pkey" PRIMARY KEY ("id")
    );`,
  );
  await exec(
    'PolicyAudit table',
    `CREATE TABLE IF NOT EXISTS "PolicyAudit" (
      "id" TEXT NOT NULL,
      "policyId" TEXT,
      "action" TEXT NOT NULL,
      "userId" TEXT,
      "before" JSONB,
      "after" JSONB,
      "metadata" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PolicyAudit_pkey" PRIMARY KEY ("id")
    );`,
  );

  console.log('[repair] schema conferido ✓');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });