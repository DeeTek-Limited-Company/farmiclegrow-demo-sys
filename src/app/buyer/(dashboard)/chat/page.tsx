import { requireRole } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default async function BuyerChatPage() {
  await requireRole(["buyer"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chat Hub</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Communicate directly with farmers and cooperative administrators.
        </p>
      </div>

      <Card className="border-dashed border-2 py-20 text-center">
        <CardContent className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Secure Messaging coming soon</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            The direct communication channel is being established. You will be able to negotiate prices and request quality reports here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
