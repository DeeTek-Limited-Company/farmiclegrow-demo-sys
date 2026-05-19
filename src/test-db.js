const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  try {
    const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables found:", result.map(r => r.table_name));
  } catch (e) {
    console.error("Connection failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
