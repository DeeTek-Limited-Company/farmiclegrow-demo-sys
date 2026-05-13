import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  try {
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
            productionRecord: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return withCors(
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
    return withCors(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
