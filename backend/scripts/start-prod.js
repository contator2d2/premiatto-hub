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

  if (!/^postgres(ql)?:\/\/.+/.test(process.env.DATABASE_URL || '')) {
    console.error(`
[env] DATABASE_URL inválida.

O Prisma exige que DATABASE_URL comece com postgresql:// ou postgres://.
No Easypanel, cadastre SOMENTE o valor da URL, sem aspas e sem o prefixo DATABASE_URL=.

Exemplo:
postgresql://premiatto:SENHA@premiatto-db:5432/premiatto?schema=public

Valor recebido: ${process.env.DATABASE_URL ? '[preenchido, mas em formato inválido]' : '[vazio]'}
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
run('node', ['prisma/seed.js']);
run('node', ['dist/main.js']);