import { requireRole } from "@/lib/auth/server";
import { NotificationsInbox } from "@/components/shared/notifications-inbox";

export default async function FarmerNotificationsPage() {
  await requireRole(["farmer"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground mt-2">Status updates and messages from the platform.</p>
      </div>

      <NotificationsInbox userRole="farmer" />
    </div>
  );
}

