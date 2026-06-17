import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, publicOptions, publicRateLimited, withPublicCors } from "@/lib/public/http";

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { success, remaining, reset } = rateLimit(`pub-mkt-${ip}`, 30, 60000);

  if (!success) {
    return publicRateLimited(request, { limit: 30, remaining, reset });
  }

  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("org");

    if (!orgSlug) {
      return withPublicCors(request, NextResponse.json({ listings: [] }));
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return withPublicCors(request, NextResponse.json({ listings: [] }));
    }

    const listings = await prisma.marketplaceListing.findMany({
      where: {
        status: "ACTIVE",
        organizationId: organization.id,
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
            productionRecord: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return withPublicCors(
      request,
      NextResponse.json({
        listings: listings.map(l => ({
          id: l.id,
          title: l.title,
          category: l.category,
          price: Number(l.price),
          currency: l.currency,
          unit: l.unit,
          description: l.description,
          images: l.images,
          tags: l.tags,
          isFeatured: l.isFeatured,
          minOrderQuantity: l.minOrderQuantity ? Number(l.minOrderQuantity) : null,
          batch: {
            batchId: l.batch.batchId,
            crop: l.batch.crop,
            quantity: Number(l.batch.quantity),
            harvestDate: l.batch.harvestDate,
          },
          origin: {
            community: l.batch.farmer.community?.name,
            district: l.batch.farmer.community?.district.name,
            region: l.batch.farmer.community?.district.region.name,
            cooperativeName: l.batch.farmer.cooperativeName,
          }
        }))
      })
    );
  } catch (error: any) {
    console.error("Error fetching marketplace listings:", error);
    return withPublicCors(request, NextResponse.json({ message: "Internal server error" }, { status: 500 }));
  }
}
