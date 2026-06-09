import { requireRole } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BuyerRFQsPage() {
  await requireRole(["buyer"]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">RFQs & Bids</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Request quotes for bulk products and manage bids from sellers.
          </p>
        </div>
        <Button className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      <Card className="border-dashed border-2 py-20 text-center">
        <CardContent className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No active requests</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            Create a request for quote (RFQ) to notify all verified sellers about your procurement needs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
