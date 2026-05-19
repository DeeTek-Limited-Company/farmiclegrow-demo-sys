import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const farmer = await prisma.farmer.findFirst({
    include: {
      community: true,
      farmProfiles: true,
      submissions: true,
      harvestRecords: true
    }
  });

  console.log(JSON.stringify(farmer, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
