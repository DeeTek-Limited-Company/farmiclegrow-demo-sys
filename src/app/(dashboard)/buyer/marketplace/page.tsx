import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { MarketplaceClient } from "@/components/buyer/marketplace-client";
import { redirect } from "next/navigation";

export default async function BuyerMarketplacePage() {
  const user = await requireRole(["buyer"]);

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    redirect("/buyer?error=profile_required");
  }

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      batch: {
        include: {
          farmer: {
            include: {
              community: {
                include: {
                  district: {
                    include: {
                      region: true
                    }
                  }
                }
              }
            }
          },
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
        <p className="text-muted-foreground mt-2">Explore verified supply and secure high-quality produce.</p>
      </div>

      <MarketplaceClient 
        initialListings={JSON.parse(JSON.stringify(listings))} 
        buyerProfile={JSON.parse(JSON.stringify(profile))}
      />
    </div>
  );
}
