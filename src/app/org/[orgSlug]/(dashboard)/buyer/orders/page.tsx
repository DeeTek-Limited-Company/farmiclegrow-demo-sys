import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { BuyerOrdersClient } from "@/components/buyer/buyer-orders-client";
import { redirect } from "next/navigation";

export default async function BuyerOrdersPage() {
  const user = await requireRole(["buyer"]);

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    redirect("/buyer?error=profile_required");
  }

  const orders = await prisma.order.findMany({
    where: {
      buyerId: user.id,
    },
    include: {
      organization: {
        select: { slug: true, name: true },
      },
      items: {
        include: {
          batch: {
            include: {
              organization: {
                select: { slug: true },
              },
            },
          },
        },
      },
      movements: {
        orderBy: { dispatchDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Orders</h1>
        <p className="text-muted-foreground mt-2">Track your produce from farm to delivery and manage your quotes.</p>
      </div>

      <BuyerOrdersClient 
        initialOrders={JSON.parse(JSON.stringify(orders))} 
        currentUserId={user.id}
      />
    </div>
  );
}

