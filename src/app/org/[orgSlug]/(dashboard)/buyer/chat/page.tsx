import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BuyerChatPage() {
  await requireRole(["buyer"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
        <CardDescription>Buyer messaging will appear here.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">No conversations yet.</CardContent>
    </Card>
  );
}

