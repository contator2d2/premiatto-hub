import { PrismaClient, AppRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@premiatto.com.br';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.SUPER_ADMIN_NAME || 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName: name, status: 'active' },
    });
    await prisma.userRole.createMany({
      data: [
        { userId: user.id, role: AppRole.super_admin },
        { userId: user.id, role: AppRole.admin },
      ],
      skipDuplicates: true,
    });
    console.log(`[seed] super_admin criado: ${email}`);
  } else {
    console.log(`[seed] super_admin já existe: ${email}`);
  }

  await prisma.branding.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      appName: 'Premiatto Connect',
      primaryColor: '#0B3D91',
      accentColor: '#1E88E5',
      tagline: 'O ecossistema digital da Premiatto',
    },
  });
  console.log('[seed] branding singleton pronto');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
