import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { requireOrgScope } from "@/lib/tenant/scope";
import { cursorFindManyArgs, parseCursorPageParams, toCursorPage } from "@/lib/pagination/cursor";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const organizationId = requireOrgScope(user);

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const isReadParam = url.searchParams.get("isRead");

  const isRead =
    isReadParam === null ? undefined : isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;
  const { limit, cursor } = parseCursorPageParams(request, { defaultLimit: 20, maxLimit: 200 });

  const notificationsWithExtra = await prisma.notification.findMany({
    where: {
      userId: user.id,
      organizationId,
      ...(type ? { type: type as any } : {}),
      ...(isRead === undefined ? {} : { isRead }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...cursorFindManyArgs({ limit, cursor }),
  });

  const { page: notifications, pageInfo } = toCursorPage(notificationsWithExtra, limit);
  return NextResponse.json({ notifications, pageInfo });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const organizationId = requireOrgScope(user);

  const payload = await request.json().catch(() => null);
  const { notificationId, markAll } = payload || {};

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, organizationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } else if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id, organizationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ message: "Success" });
}
