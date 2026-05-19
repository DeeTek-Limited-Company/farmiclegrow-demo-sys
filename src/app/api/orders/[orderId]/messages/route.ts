import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

const messageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
});

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["buyer", "admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orderId } = await context.params;

  // Verify access: Admin/Ops see everything, Buyer only sees their own order messages
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { buyerId: true },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (auth.user.roles.includes("buyer") && 
      !auth.user.roles.includes("admin") && 
      !auth.user.roles.includes("ops") && 
      order.buyerId !== auth.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.orderMessage.findMany({
    where: { orderId },
    include: {
      sender: {
        select: { fullName: true, id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["buyer", "admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orderId } = await context.params;

  try {
    const body = await request.json();
    const validated = messageSchema.parse(body);

    // Verify access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { buyerId: true },
    });

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (auth.user.roles.includes("buyer") && 
        !auth.user.roles.includes("admin") && 
        !auth.user.roles.includes("ops") && 
        order.buyerId !== auth.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const message = await prisma.orderMessage.create({
      data: {
        orderId,
        senderId: auth.user.id,
        content: validated.content,
      },
      include: {
        sender: {
          select: { fullName: true, id: true },
        },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid data", errors: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
