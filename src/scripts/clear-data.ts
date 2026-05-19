import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️ Starting database data cleanup...");

  try {
    // Delete in order to respect foreign key constraints
    // We use deleteMany() which is safe and won't drop the tables
    
    console.log("Cleaning up Logistics & Orders...");
    await prisma.movementLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    console.log("Cleaning up Market & Sales...");
    await prisma.marketplaceListing.deleteMany();
    await prisma.salesRecord.deleteMany();
    await prisma.warehouseEntry.deleteMany();

    console.log("Cleaning up Production & Quality...");
    await prisma.qualityTest.deleteMany();
    await prisma.batchMilestone.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.harvestRecord.deleteMany();
    await prisma.fieldActivity.deleteMany();
    await prisma.inputTraceability.deleteMany();
    await prisma.plantingActivity.deleteMany();
    await prisma.farmPlot.deleteMany();

    console.log("Cleaning up Farmers & Locations...");
    await prisma.farmer.deleteMany();
    await prisma.community.deleteMany();
    await prisma.district.deleteMany();
    await prisma.region.deleteMany();

    console.log("Cleaning up System Data...");
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    // We usually keep Users and Sessions to avoid locking ourselves out, 
    // but if you want to clear them too, uncomment below:
    // await prisma.session.deleteMany();
    // await prisma.user.deleteMany();

    console.log("✅ Database data cleared successfully! (Tables were preserved)");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
