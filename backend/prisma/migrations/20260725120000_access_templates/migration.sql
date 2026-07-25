-- Access templates: named module permission sets, assignable by role or per user.

CREATE TABLE "AccessTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "moduleKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessTemplate_name_key" ON "AccessTemplate"("name");

CREATE TABLE "RoleAccessTemplate" (
  "role" "AppRole" NOT NULL,
  "templateId" TEXT NOT NULL,
  CONSTRAINT "RoleAccessTemplate_pkey" PRIMARY KEY ("role"),
  CONSTRAINT "RoleAccessTemplate_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AccessTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserAccessOverride" (
  "userId" TEXT NOT NULL,
  "templateId" TEXT,
  "moduleKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAccessOverride_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserAccessOverride_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserAccessOverride_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AccessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
