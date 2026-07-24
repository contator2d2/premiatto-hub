/**
 * Validação de variáveis de ambiente do backend.
 * Executada no bootstrap (main.ts) — aborta o processo se algo estiver inválido.
 */

type EnvSpec = {
  name: string;
  required?: boolean;
  default?: string;
  pattern?: RegExp;
  hint?: string;
  secret?: boolean;
};

const SPECS: EnvSpec[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    pattern: /^postgres(ql)?:\/\/.+/,
    hint: 'postgresql://user:pass@host:5432/db?schema=public',
    secret: true,
  },
  { name: 'PORT', required: false, default: '3000', pattern: /^\d+$/ },
  { name: 'NODE_ENV', required: false, default: 'development' },
  {
    name: 'CORS_ORIGIN',
    required: true,
    hint: 'lista separada por vírgula. ex: https://app.exemplo.com,http://localhost:5173',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    hint: 'string aleatória com >= 32 caracteres',
    secret: true,
  },
  {
    name: 'JWT_ACCESS_TTL',
    required: false,
    default: '15m',
    pattern: /^\d+[smhd]$/,
    hint: 'formato: 15m, 1h, 7d',
  },
  {
    name: 'JWT_REFRESH_TTL',
    required: false,
    default: '7d',
    pattern: /^\d+[smhd]$/,
    hint: 'formato: 15m, 1h, 7d',
  },
  {
    name: 'UPLOADS_DIR',
    required: false,
    default: '/data/uploads',
    hint: 'caminho absoluto de volume persistente',
  },
  { name: 'SUPER_ADMIN_EMAIL', required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
  { name: 'SUPER_ADMIN_PASSWORD', required: true, secret: true, hint: 'mínimo 8 caracteres' },
  { name: 'SUPER_ADMIN_NAME', required: false, default: 'Administrador' },
];

const WEAK_SECRETS = new Set([
  'dev-secret',
  'changeme',
  'change-me',
  'troque-este-segredo-em-producao',
  'troque-este-refresh-em-producao',
  'ChangeMe123!',
]);

function normalizeDatabaseUrl(value: string) {
  let normalized = value.trim();

  if (normalized.startsWith('DATABASE_URL=')) {
    normalized = normalized.slice('DATABASE_URL='.length).trim();
  }

  const quotePairs: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ['`', '`'],
  ];

  for (const [open, close] of quotePairs) {
    if (normalized.startsWith(open) && normalized.endsWith(close)) {
      return normalized.slice(1, -1).trim();
    }
  }

  return normalized;
}

export function validateEnv() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  for (const spec of SPECS) {
    let value = process.env[spec.name];

    if (spec.name === 'DATABASE_URL' && value) {
      value = normalizeDatabaseUrl(value);
      process.env.DATABASE_URL = value;
    }

    if ((value === undefined || value === '') && spec.default !== undefined) {
      process.env[spec.name] = spec.default;
      value = spec.default;
    }

    if (spec.required && (!value || value.trim() === '')) {
      errors.push(`  ✗ ${spec.name} ausente${spec.hint ? ` (${spec.hint})` : ''}`);
      continue;
    }
    if (!value) continue;

    if (spec.pattern && !spec.pattern.test(value)) {
      errors.push(
        `  ✗ ${spec.name} formato inválido${spec.hint ? ` — esperado: ${spec.hint}` : ''}`,
      );
      if (spec.name === 'DATABASE_URL') {
        errors.push('    Dica: no Easypanel cole apenas a URL, sem aspas e sem DATABASE_URL=');
      }
    }

    if (spec.name === 'JWT_SECRET' && value.length < 32) {
      const msg = `${spec.name} tem menos de 32 caracteres (comprimento atual: ${value.length})`;
      isProd ? errors.push(`  ✗ ${msg}`) : warnings.push(`  ! ${msg}`);
    }

    if (spec.name === 'SUPER_ADMIN_PASSWORD' && value.length < 8) {
      const msg = `${spec.name} tem menos de 8 caracteres`;
      isProd ? errors.push(`  ✗ ${msg}`) : warnings.push(`  ! ${msg}`);
    }

    if (spec.secret && WEAK_SECRETS.has(value)) {
      const msg = `${spec.name} está usando o valor padrão de exemplo — troque antes de ir para produção`;
      isProd ? errors.push(`  ✗ ${msg}`) : warnings.push(`  ! ${msg}`);
    }
  }

  // Sanidade de CORS_ORIGIN
  const cors = process.env.CORS_ORIGIN;
  if (cors) {
    const bad = cors
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o && !/^https?:\/\//.test(o));
    if (bad.length) {
      errors.push(`  ✗ CORS_ORIGIN contém entradas sem esquema http(s): ${bad.join(', ')}`);
    }
  }

  if (warnings.length) {
    console.warn('[env] avisos:\n' + warnings.join('\n'));
  }

  if (errors.length) {
    console.error(
      '[env] variáveis de ambiente inválidas:\n' +
        errors.join('\n') +
        '\n\nCorrija o arquivo .env (ou as variáveis do Easypanel) e reinicie.',
    );
    process.exit(1);
  }

  console.log(
    `[env] validado ✓ (NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, uploads=${process.env.UPLOADS_DIR})`,
  );
}
