import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const isReadParam = url.searchParams.get("isRead");
  const takeParam = url.searchParams.get("take");

  const isRead =
    isReadParam === null ? undefined : isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;
  const take = Math.min(Math.max(Number(takeParam ?? "20") || 20, 1), 200);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(type ? { type: type as any } : {}),
      ...(isRead === undefined ? {} : { isRead }),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { notificationId, markAll } = payload || {};

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } else if (notificationId) {
    await prisma.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ message: "Success" });
}
