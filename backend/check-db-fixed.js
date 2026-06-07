const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const fs = require('fs');

async function main() {
  const dbPath = path.resolve(__dirname, 'data.db');
  console.log(`Using database at: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database file not found!');
    return;
  }

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    console.log('--- Users ---');
    console.log(JSON.stringify(users, null, 2));

    const apps = await prisma.application.findMany();
    console.log('\n--- Applications ---');
    console.log(JSON.stringify(apps, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
