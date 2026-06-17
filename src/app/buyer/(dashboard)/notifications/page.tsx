import { requireRole } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default async function BuyerNotificationsPage() {
  await requireRole(["buyer"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Stay updated on your orders and market opportunities.
        </p>
      </div>

      <Card className="border-dashed border-2 py-20 text-center">
        <CardContent className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            You don't have any new notifications at the moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
