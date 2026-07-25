const { spawnSync } = require('node:child_process');

function normalizeDatabaseUrl(value) {
  if (!value) return value;

  let normalized = value.trim();

  if (normalized.startsWith('DATABASE_URL=')) {
    normalized = normalized.slice('DATABASE_URL='.length).trim();
  }

  const quotePairs = [
    ['"', '"'],
    ["'", "'"],
    ['`', '`'],
  ];

  for (const [open, close] of quotePairs) {
    if (normalized.startsWith(open) && normalized.endsWith(close)) {
      normalized = normalized.slice(1, -1).trim();
      break;
    }
  }

  return normalized;
}

function assertEnv() {
  process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const errors = [];

  if (!/^postgres(ql)?:\/\/.+/.test(process.env.DATABASE_URL || '')) {
    errors.push(`DATABASE_URL inválida. Ela deve começar com postgresql:// ou postgres://.`);
  }

  if (!process.env.CORS_ORIGIN || !process.env.CORS_ORIGIN.trim()) {
    errors.push('CORS_ORIGIN ausente. Exemplo: https://app.premiatto.com.br');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET ausente ou com menos de 32 caracteres. Gere com: openssl rand -hex 48');
  }

  const weakPasswords = new Set(['ChangeMe123!', 'changeme', 'change-me']);
  if (!process.env.SUPER_ADMIN_PASSWORD || weakPasswords.has(process.env.SUPER_ADMIN_PASSWORD)) {
    errors.push('SUPER_ADMIN_PASSWORD ausente ou usando valor de exemplo. Configure uma senha forte.');
  }

  if (errors.length) {
    console.error(`
[env] variáveis inválidas antes de iniciar o backend:

${errors.map((error) => `  ✗ ${error}`).join('\n')}

No Easypanel, cadastre cada variável separadamente. Em DATABASE_URL, cole somente a URL, sem aspas e sem o prefixo DATABASE_URL=.

Exemplo de DATABASE_URL:
postgresql://premiatto:SENHA@premiatto-db:5432/premiatto?schema=public

Valor recebido em DATABASE_URL: ${process.env.DATABASE_URL ? '[preenchido]' : '[vazio]'}
`);
    process.exit(1);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`[startup] falha ao executar ${command}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

assertEnv();
run('npx', ['prisma', 'migrate', 'deploy']);
run('node', ['prisma/repair.js']);
run('node', ['prisma/seed.js']);
run('node', ['dist/main.js']);