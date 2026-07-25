-- Enums
CREATE TYPE "PolicyStatus" AS ENUM ('draft','active','inactive','archived');
CREATE TYPE "PolicyInheritance" AS ENUM ('full','partial','exception','override','locked');
CREATE TYPE "PolicyExceptionStatus" AS ENUM ('pending','approved','rejected','expired');

-- Document Policy
CREATE TABLE "DocumentPolicy" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentPolicy_name_key" ON "DocumentPolicy"("name");
CREATE INDEX "DocumentPolicy_status_idx" ON "DocumentPolicy"("status");

-- Share Preset
CREATE TABLE "SharePreset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "config" JSONB NOT NULL DEFAULT '{}',
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SharePreset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SharePreset_key_key" ON "SharePreset"("key");

-- Policy Exception
CREATE TABLE "PolicyException" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PolicyException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PolicyException_policy_fk" FOREIGN KEY ("policyId") REFERENCES "DocumentPolicy"("id") ON DELETE CASCADE
);
CREATE INDEX "PolicyException_status_idx" ON "PolicyException"("status");

-- Policy Audit
CREATE TABLE "PolicyAudit" (
  "id" TEXT NOT NULL,
  "policyId" TEXT,
  "action" TEXT NOT NULL,
  "userId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PolicyAudit_policy_fk" FOREIGN KEY ("policyId") REFERENCES "DocumentPolicy"("id") ON DELETE SET NULL
);
CREATE INDEX "PolicyAudit_createdAt_idx" ON "PolicyAudit"("createdAt");

-- Attach policy on Folder and Document
ALTER TABLE "Folder" ADD COLUMN "policyId" TEXT;
ALTER TABLE "Folder" ADD COLUMN "policyInheritance" "PolicyInheritance" NOT NULL DEFAULT 'full';
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_policy_fk" FOREIGN KEY ("policyId") REFERENCES "DocumentPolicy"("id") ON DELETE SET NULL;

ALTER TABLE "Document" ADD COLUMN "policyId" TEXT;
ALTER TABLE "Document" ADD COLUMN "policyInheritance" "PolicyInheritance" NOT NULL DEFAULT 'full';
ALTER TABLE "Document" ADD COLUMN "policyLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD CONSTRAINT "Document_policy_fk" FOREIGN KEY ("policyId") REFERENCES "DocumentPolicy"("id") ON DELETE SET NULL;

-- Seed system share presets
INSERT INTO "SharePreset" ("id","key","name","description","config","isSystem","updatedAt") VALUES
  (gen_random_uuid()::text,'internal_simple','Compartilhamento Interno Simples','Acesso apenas para usuários cadastrados, com notificação automática.','{"scope":"internal","notify":true,"allowDownload":"role","expiresIn":null}',true,now()),
  (gen_random_uuid()::text,'external_protected','Compartilhamento Externo Protegido','Token exclusivo, senha obrigatória, validade de 7 dias.','{"scope":"external","password":true,"expiresInDays":7,"allowDownload":false,"track":true,"requireAck":true}',true,now()),
  (gen_random_uuid()::text,'confidential','Documento Confidencial','Destinatário identificado, senha obrigatória, download bloqueado.','{"scope":"external","password":true,"limitAccess":3,"allowDownload":false,"allowPrint":false,"alert":true,"expiresInDays":3}',true,now()),
  (gen_random_uuid()::text,'marketing_public','Material Público de Marketing','Token público, sem senha, download permitido.','{"scope":"external","password":false,"allowDownload":true,"track":"basic"}',true,now()),
  (gen_random_uuid()::text,'acknowledgement','Ciência Obrigatória','Acesso individual com prazo e protocolo de ciência.','{"scope":"internal","requireAck":true,"deadlineDays":7,"notifyManager":true}',true,now());

-- Seed system policies
INSERT INTO "DocumentPolicy" ("id","name","description","category","status","priority","conditions","permissions","sharingRules","securityRules","readingRules","versioningRules","retentionRules","isSystem","updatedAt") VALUES
  (gen_random_uuid()::text,'Documentos Jurídicos','Aplica-se automaticamente a documentos da pasta ou categoria Jurídico.','juridico','active',10,'{"folders":[],"categories":["Jurídico"],"confidentiality":["confidential","restricted"]}','{"view":["juridico","gestor","super_admin","admin"],"share":["juridico","gestor","super_admin"]}','{"externalRequirePassword":true,"externalExpires":true,"blockExternalDownload":true,"revocable":true}','{"auditAllAccess":true}','{"requireAcknowledgement":true,"newVersionRequiresAck":true}','{"enforceVersioning":true,"singleActive":true}','{"blockHardDelete":true}',true,now()),
  (gen_random_uuid()::text,'Documentos Confidenciais','Aplica-se a arquivos classificados como confidenciais.','confidencial','active',20,'{"confidentiality":["confidential","restricted"]}','{"share":["super_admin","admin"],"blockReadersShare":true}','{"blockPublicLinks":true,"requireAuth":true,"limitAccesses":5}','{"blockDownload":true,"trackDevice":true,"alertOnSuspicious":true}','{"requireAcknowledgement":false}','{"enforceVersioning":true}','{"blockHardDelete":true}',true,now()),
  (gen_random_uuid()::text,'Contratos e Procurações','Aplica-se a contratos e procurações.','contratos','active',30,'{"categories":["Contratos","Procurações"]}','{"share":["juridico","gestor","super_admin","admin"]}','{"externalRequireIdentity":true,"expiresAllowed":true,"protocol":true}','{}','{"requireAcknowledgement":true}','{"enforceVersioning":true,"singleActive":true,"archivePrevious":true}','{"blockHardDelete":true}',true,now()),
  (gen_random_uuid()::text,'Materiais de Marketing','Aplica-se a pastas de campanhas, artes e materiais comerciais.','marketing','active',50,'{"categories":["Marketing","Campanhas"]}','{"view":["all"],"share":["marketing","gestor","correspondente","franqueado","super_admin","admin"]}','{"allowExternal":true,"passwordOptional":true,"allowDownload":true}','{}','{"requireAcknowledgement":false}','{"trackVersions":true,"highlightLatest":true}','{"archiveExpired":true}',true,now()),
  (gen_random_uuid()::text,'Documentos Oficiais','Aplica-se a documentos oficiais Premiatto.','oficial','active',15,'{"isOfficial":true}','{"publish":["super_admin","admin"]}','{"notifyAudience":true}','{}','{"requireAcknowledgement":true}','{"singleActive":true,"trackVersions":true,"archivePrevious":true}','{"blockHardDelete":true}',true,now()),
  (gen_random_uuid()::text,'Documentos Internos de Leitura','Aplica-se a comunicados internos com leitura obrigatória.','leitura','active',40,'{"categories":["Comunicados","Leitura Interna"]}','{"view":["all"]}','{"blockShare":true}','{"blockDownload":true,"blockPrint":true}','{"requireAcknowledgement":true,"deadlineDays":7,"notifyManager":true,"reportPending":true}','{}','{}',true,now());
