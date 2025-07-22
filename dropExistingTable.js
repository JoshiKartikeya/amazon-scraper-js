import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function dropTable() {
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS amazon_fashion_data;`);
    console.log('✅ Table dropped.');
  } catch (err) {
    console.error('❌ Error dropping table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

dropTable();
