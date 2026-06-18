import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables first
if (existsSync('.env.local')) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const args = new Set(process.argv.slice(2));
const deleteAll = args.has('--all');
const confirmDeleteAll = args.has('--confirm-delete-all');

import('../lib/prisma.js').then(async ({ prisma }) => {
  console.log("⚠️ Starting database data cleanup...");
  console.log(`Target database: ${new URL(process.env.DATABASE_URL || process.env.DATABASE_URL_MIGRATE || '').host}`);

  try {
    // Safety check for --all flag
    if (deleteAll && !confirmDeleteAll) {
      console.error("\n❌ ERROR: To delete everything (including users, roles, organizations), you must use BOTH --all AND --confirm-delete-all flags");
      console.error("Example: npx tsx src/scripts/clear-data.ts --all --confirm-delete-all");
      process.exit(1);
    }

    // Delete in order to respect foreign key constraints
    console.log("\n🧹 Cleaning up Logistics & Orders...");
    await prisma.movementLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    console.log("🧹 Cleaning up Market & Sales...");
    await prisma.marketplaceListing.deleteMany();
    await prisma.salesRecord.deleteMany();
    await prisma.warehouseEntry.deleteMany();

    console.log("🧹 Cleaning up Production & Quality...");
    await prisma.qualityTest.deleteMany();
    await prisma.batchMilestone.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.harvestRecord.deleteMany();
    await prisma.fieldActivity.deleteMany();
    await prisma.inputTraceability.deleteMany();
    await prisma.plantingActivity.deleteMany();
    await prisma.farmPlot.deleteMany();

    console.log("🧹 Cleaning up Farmers & Locations...");
    await prisma.farmer.deleteMany();
    await prisma.community.deleteMany();
    await prisma.district.deleteMany();
    await prisma.region.deleteMany();

    console.log("🧹 Cleaning up Profiles & Documents...");
    await prisma.document.deleteMany();
    await prisma.certification.deleteMany();
    await prisma.farmProfile.deleteMany();
    await prisma.farmLocation.deleteMany();
    await prisma.buyerProfile.deleteMany();

    console.log("🧹 Cleaning up Approvals & Submissions...");
    await prisma.approvalAction.deleteMany();
    await prisma.farmerSubmission.deleteMany();

    console.log("🧹 Cleaning up System Data...");
    await prisma.notification.deleteMany();
    await prisma.orderMessage.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();

    // Only delete these if --all --confirm-delete-all are used
    if (deleteAll && confirmDeleteAll) {
      console.log("\n🗑️ Deleting ALL data (users, roles, organizations)...");
      await prisma.userRole.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany();
      await prisma.organizationTraceTheme.deleteMany();
      await prisma.organization.deleteMany();
      await prisma.productionRecord.deleteMany();
      await prisma.billingPlan.deleteMany();
      console.log("✅ All data cleared!");
    } else {
      console.log("\nℹ️ Keeping users, roles, and organizations (use --all --confirm-delete-all to delete everything)");
    }

    console.log("\n✅ Database data cleared successfully! (Tables were preserved)");
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
});