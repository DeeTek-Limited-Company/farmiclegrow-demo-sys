import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BuyerOrdersPage() {
  await requireRole(["buyer"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>Your order history will appear here.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">No orders yet.</CardContent>
    </Card>
  );
}

