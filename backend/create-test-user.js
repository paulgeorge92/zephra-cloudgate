const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

async function main() {
  const dbPath = path.resolve(__dirname, 'data.db');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash('password', 10);
    const user = await prisma.user.upsert({
      where: { email: 'test@admin.com' },
      update: { password: hashedPassword },
      create: {
        email: 'test@admin.com',
        name: 'Test Admin',
        role: 'ADMIN',
        password: hashedPassword,
      },
    });
    console.log('Test admin created/updated:', user.email);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
