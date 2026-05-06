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
  const [farmers, batches, regions, communities, salesCount, salesAgg, latestBatch] = await Promise.all([
    prisma.farmer.count(),
    prisma.batch.count(),
    prisma.region.count(),
    prisma.community.count(),
    prisma.salesRecord.count(),
    prisma.salesRecord.aggregate({
      _sum: { quantitySold: true, totalValue: true },
    }),
    prisma.batch.findFirst({
      select: { batchId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const quantitySold = salesAgg._sum.quantitySold ? Number(salesAgg._sum.quantitySold) : 0;
  const totalValue = salesAgg._sum.totalValue ? Number(salesAgg._sum.totalValue) : 0;

  return withCors(
    NextResponse.json({
      kpis: {
        farmers,
        batches,
        regions,
        communities,
        salesCount,
        quantitySold,
        totalValue,
      },
      sampleTraceCode: latestBatch?.batchId ?? null,
    })
  );
}

