import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  try {
    const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables found:", (result as any[]).map(r => r.table_name));
  } catch (e: any) {
    console.error("Connection failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
