import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

const updateSchema = z.object({
  status: z.enum(["PENDING", "NEGOTIATING", "CONFIRMED", "DISPATCHED", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
  totalAmount: z.number().optional(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  milestoneType: z.enum(["CLEANING", "GRADING", "PACKAGING", "PORT_ARRIVAL", "PORT_DEPARTURE", "IN_TRANSIT", "DELIVERED"]).optional(),
  movement: z.object({
    fromLocation: z.string(),
    toLocation: z.string(),
    driverName: z.string().optional(),
    vehicleNumber: z.string().optional(),
    dispatchDate: z.string(),
    quantitySent: z.number().optional(),
  }).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { orderId } = await params;
  const data = parsed.data;

  try {
    // 1. Update order basic details
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.shippingAddress) updateData.shippingAddress = data.shippingAddress;
    if (data.notes) updateData.notes = data.notes;

    const existing = await prisma.order.findFirst({
      where: { id: orderId, organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { 
        items: {
          include: { batch: true }
        }
      },
    });

    // 2. Handle Milestones (Cleaning, Packaging, etc.)
    if (data.milestoneType && order.items.length > 0) {
      // Create milestones for all batches in the order
      const milestonePromises = order.items.map(item => {
        return prisma.batchMilestone.create({
          data: {
            organizationId: order.organizationId,
            batchId: item.batchId,
            type: data.milestoneType as any,
            status: "COMPLETED",
            notes: `Auto-generated from order ${order.orderNumber} management dashboard.`,
            location: data.shippingAddress || item.batch?.farmerId || "Supply Chain",
            updatedAt: new Date(),
          }
        });
      });
      await Promise.all(milestonePromises);
    }

    // 3. If movement is provided, create a MovementLog and link it to the order
    if (data.movement && order.items.length > 0) {
      const batchId = order.items[0].batchId; // For now, handle single batch orders
      await prisma.movementLog.create({
        data: {
          organizationId: order.organizationId,
          batchId,
          orderId,
          fromLocation: data.movement.fromLocation,
          toLocation: data.movement.toLocation,
          driverName: data.movement.driverName,
          vehicleNumber: data.movement.vehicleNumber,
          dispatchDate: new Date(data.movement.dispatchDate),
          quantitySent: data.movement.quantitySent,
        }
      });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Order update error:", error);
    return NextResponse.json({ message: "Failed to update order" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireApiRole(["admin", "ops", "buyer"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const organizationId = requireOrgScope(auth.user);

  const { orderId } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        buyer: { select: { fullName: true, email: true } },
        items: { include: { batch: true } },
        movements: true,
      }
    });

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    // Privacy check for buyers
    if (auth.user.roles.includes("buyer") && order.buyerId !== auth.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch order" }, { status: 500 });
  }
}
