import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";
import { cursorFindManyArgs, parseCursorPageParams, toCursorPage } from "@/lib/pagination/cursor";

const messageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
});

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["buyer", "admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { orderId } = await context.params;
  const { limit, cursor } = parseCursorPageParams(request, { defaultLimit: 100, maxLimit: 500 });

  // Verify access: Admin/Ops see everything, Buyer only sees their own order messages
  const order = await prisma.order.findFirst({
    where: { id: orderId, organizationId },
    select: { buyerId: true },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (auth.user.roles.includes("buyer") && 
      !auth.user.roles.includes("admin") && 
      !auth.user.roles.includes("ops") && 
      order.buyerId !== auth.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const messagesWithExtra = await prisma.orderMessage.findMany({
    where: { orderId, organizationId },
    include: {
      sender: {
        select: { fullName: true, id: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...cursorFindManyArgs({ limit, cursor }),
  });

  const { page, pageInfo } = toCursorPage(messagesWithExtra, limit);
  return NextResponse.json({ messages: page.reverse(), pageInfo });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["buyer", "admin", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { orderId } = await context.params;

  try {
    const body = await request.json();
    const validated = messageSchema.parse(body);

    // Verify access
    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId },
      select: { buyerId: true, organizationId: true },
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
        organizationId: order.organizationId,
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
