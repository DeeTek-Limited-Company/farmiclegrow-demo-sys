import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

const createSchema = z.object({
  batchId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  pricePerUnit: z.number().nonnegative().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["buyer", "admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Verify batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: data.batchId },
  });
  if (!batch) return NextResponse.json({ message: "Batch not found." }, { status: 404 });

  // Generate order number: ORD-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count();
  const orderNumber = `ORD-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

  const totalPrice = Number(data.quantity) * Number(data.pricePerUnit || 0);

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        buyerId: auth.user.id,
        status: "PENDING",
        totalAmount: totalPrice,
        shippingAddress: data.shippingAddress,
        notes: data.notes,
        items: {
          create: {
            batchId: data.batchId,
            quantity: data.quantity,
            unit: data.unit,
            pricePerUnit: data.pricePerUnit || 0,
            totalPrice,
          },
        },
      },
      include: {
        items: {
          include: {
            batch: true,
          }
        }
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ message: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["buyer", "admin", "ops", "agronomist"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const url = new URL(request.url);
  const buyerId = url.searchParams.get("buyerId");
  const status = url.searchParams.get("status");

  const whereClause: any = {};
  
  // If buyer, only show their own orders
  if (auth.user.roles.includes("buyer") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    whereClause.buyerId = auth.user.id;
  } else if (buyerId) {
    whereClause.buyerId = buyerId;
  }

  if (status) {
    whereClause.status = status;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      buyer: {
        select: { fullName: true, email: true },
      },
      items: {
        include: {
          batch: {
            include: {
              farmer: true,
              productionRecord: true,
            }
          },
        },
      },
      movements: {
        orderBy: { dispatchDate: "asc" }
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ orders });
}
