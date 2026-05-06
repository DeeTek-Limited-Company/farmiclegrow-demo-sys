import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export default async function BuyerNotificationsPage() {
  const user = await requireRole(["buyer"]);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</div>
              </div>
              {n.body ? <div className="text-sm text-muted-foreground mt-1">{n.body}</div> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

