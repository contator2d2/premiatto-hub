import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Universo de módulos conhecidos — deve espelhar frontend/src/lib/modules.ts.
export const ALL_MODULE_KEYS = [
  'dashboard',
  'documents',
  'university',
  'knowledge',
  'marketing',
  'communication',
  'requests',
  'calendar',
  'correspondent',
  'franchise',
  'crm',
  'bi',
  'ai',
] as const;
export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

export function sanitizeModuleKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const allowed = new Set<string>(ALL_MODULE_KEYS);
  const out = new Set<string>();
  for (const k of keys) {
    if (typeof k === 'string' && allowed.has(k)) out.add(k);
  }
  // Dashboard sempre disponível para quem entra na plataforma.
  out.add('dashboard');
  return Array.from(out);
}

/**
 * Calcula os módulos efetivamente visíveis por um usuário.
 * Regras:
 *  - super_admin: acesso total (todos os módulos).
 *  - Override individual com moduleKeys preenchido → usa moduleKeys.
 *  - Override individual com templateId → usa moduleKeys do template.
 *  - Caso contrário: união dos templates padrão dos roles do usuário.
 *  - Se nada estiver configurado: acesso total (compatibilidade).
 */
export async function computeAllowedModules(
  prisma: PrismaService,
  userId: string,
  roles: AppRole[],
): Promise<string[]> {
  if (roles.includes(AppRole.super_admin)) {
    return [...ALL_MODULE_KEYS];
  }

  const override = await prisma.userAccessOverride.findUnique({
    where: { userId },
    include: { template: true },
  });

  if (override) {
    if (override.moduleKeys && override.moduleKeys.length > 0) {
      return sanitizeModuleKeys(override.moduleKeys);
    }
    if (override.template) {
      return sanitizeModuleKeys(override.template.moduleKeys);
    }
  }

  if (roles.length > 0) {
    const roleDefaults = await prisma.roleAccessTemplate.findMany({
      where: { role: { in: roles } },
      include: { template: true },
    });
    if (roleDefaults.length > 0) {
      const set = new Set<string>();
      for (const rd of roleDefaults) {
        for (const k of rd.template.moduleKeys) set.add(k);
      }
      return sanitizeModuleKeys(Array.from(set));
    }
  }

  // Nada configurado — libera tudo por padrão.
  return [...ALL_MODULE_KEYS];
}
