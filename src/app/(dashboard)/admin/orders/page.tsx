import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { AdminOrderManagementClient } from "@/components/admin/order-management-client";

export default async function AdminOrdersPage() {
  const user = await requireRole(["admin", "ops"]);

  const orders = await prisma.order.findMany({
    include: {
      buyer: {
        select: { 
          fullName: true, 
          email: true,
          buyerProfile: true
        },
      },
      items: {
        include: {
          batch: true,
        },
      },
      movements: {
        orderBy: { dispatchDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Order Management</h1>
        <p className="text-muted-foreground mt-2">Oversee procurement pipeline, verify quotes, and coordinate logistics.</p>
      </div>

      <AdminOrderManagementClient 
        initialOrders={JSON.parse(JSON.stringify(orders))} 
        currentUserId={user.id}
      />
    </div>
  );
}
