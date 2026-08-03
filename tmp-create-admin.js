const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@bohosaaz.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name = process.env.ADMIN_NAME || 'Admin';
  const hash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { name, password: hash, role: 'ADMIN' } });
    console.log('updated', email);
  } else {
    await prisma.user.create({ data: { email, password: hash, name, role: 'ADMIN' } });
    console.log('created', email);
  }
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
