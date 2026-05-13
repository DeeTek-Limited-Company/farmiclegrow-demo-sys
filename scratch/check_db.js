const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function test() {
  try {
    const counts = await prisma.batchMilestone.count();
    console.log("BatchMilestone table exists. Count:", counts);
  } catch (err) {
    console.error("BatchMilestone table does not exist or error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
