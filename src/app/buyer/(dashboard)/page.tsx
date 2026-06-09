import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function GlobalBuyerDashboardPage() {
  const user = await requireRole(["buyer"]);

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
  });

  const hasProfile = !!profile;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, <span className="font-semibold text-foreground">{user.name}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/buyer/profile">Edit Profile</Link>
        </Button>
      </div>

      {!hasProfile && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Setup Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Please complete your business profile before placing any orders.</span>
            <Button asChild variant="destructive" size="sm">
              <Link href="/buyer/profile">Setup Profile</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={!hasProfile ? "opacity-60 grayscale pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle>Global Marketplace</CardTitle>
            <CardDescription>Browse available produce from all verified organizations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild disabled={!hasProfile}>
              {/* Point to the website's marketplace for now, or a global app marketplace if it exists */}
              <Link href="/buyer/marketplace">Open Marketplace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={!hasProfile ? "opacity-60 grayscale pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>Track your orders and delivery status across all sellers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" disabled={!hasProfile}>
              <Link href="/buyer/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={!hasProfile ? "opacity-60 grayscale pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle>Global Chat</CardTitle>
            <CardDescription>Message farmers or operations for inquiries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" disabled={!hasProfile}>
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
