import { requireRole } from "@/lib/auth/server";
import { NotificationsInbox } from "@/components/shared/notifications-inbox";

export default async function AgronomistNotificationsPage() {
  await requireRole(["agronomist", "admin", "ops"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">Updates related to your farmer records and system changes.</p>
      </div>

      <NotificationsInbox userRole="agronomist" />
    </div>
  );
}

