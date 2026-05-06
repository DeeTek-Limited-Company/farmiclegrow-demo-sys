import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BuyerDashboardPage() {
  const user = await requireRole(["buyer"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome, <span className="font-semibold text-foreground">{user.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Marketplace</CardTitle>
            <CardDescription>Browse available produce and request quotes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/buyer/marketplace">Open Marketplace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Track your orders and delivery status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/buyer/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Message farmers or operations for inquiries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/buyer/chat">Open Chat</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traceability</CardTitle>
            <CardDescription>Verify batches using QR/batch codes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/trace">Trace Lookup</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

