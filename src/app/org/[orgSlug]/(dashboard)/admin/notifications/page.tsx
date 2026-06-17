import { requireRole } from "@/lib/auth/server";
import { NotificationsInbox } from "@/components/shared/notifications-inbox";

export default async function AdminNotificationsPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">Track reviews, system changes, and operational alerts.</p>
      </div>

      <NotificationsInbox userRole="admin" />
    </div>
  );
}

