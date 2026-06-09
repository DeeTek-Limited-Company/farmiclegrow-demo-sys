import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { MarketplaceClient } from "@/components/buyer/marketplace-client";

export default async function BuyerMarketplacePage() {
  await requireRole(["buyer"]);

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      organization: true,
      batch: {
        include: {
          farmer: {
            include: {
              community: {
                include: {
                  district: true,
                },
              },
            },
          },
        },
      },
    },
    take: 10,
  });

  const serializedListings = listings.map((listing) => ({
    id: listing.id,
    batchId: listing.batchId,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    currency: listing.currency,
    status: listing.status,
    images: listing.images,
    category: listing.category,
    tags: listing.tags,
    isFeatured: listing.isFeatured,
    minOrderQuantity: listing.minOrderQuantity ? Number(listing.minOrderQuantity) : null,
    unit: listing.unit,
    organizationId: listing.organizationId,
    organization: {
      id: listing.organization.id,
      name: listing.organization.name,
      slug: listing.organization.slug,
    },
    batch: {
      id: listing.batch.id,
      batchId: listing.batch.batchId,
      crop: listing.batch.crop,
      quantity: Number(listing.batch.quantity),
      farmer: listing.batch.farmer
        ? {
            fullName: listing.batch.farmer.fullName,
            community: listing.batch.farmer.community
              ? {
                  name: listing.batch.farmer.community.name,
                  district: listing.batch.farmer.community.district
                    ? {
                        name: listing.batch.farmer.community.district.name,
                      }
                    : null,
                }
              : null,
          }
        : null,
    },
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Marketplace</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Browse verified agricultural products from across the FarmicleGrow network.
          </p>
        </div>
      </div>

      <MarketplaceClient initialListings={serializedListings} />
    </div>
  );
}
