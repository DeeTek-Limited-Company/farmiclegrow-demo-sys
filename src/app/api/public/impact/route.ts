import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, publicOptions, publicRateLimited, withPublicCors } from "@/lib/public/http";

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { success, remaining, reset } = rateLimit(`pub-impact-${ip}`, 30, 60000);

  if (!success) {
    return publicRateLimited(request, { limit: 30, remaining, reset });
  }

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

  return withPublicCors(
    request,
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
    }),
  );
}

