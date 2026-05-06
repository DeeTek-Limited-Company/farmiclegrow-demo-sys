import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BuyerMarketplacePage() {
  await requireRole(["buyer"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace</CardTitle>
        <CardDescription>Product listings will appear here.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Marketplace is not wired yet. Next: connect to app inventory/batches for buyer browsing.
      </CardContent>
    </Card>
  );
}

