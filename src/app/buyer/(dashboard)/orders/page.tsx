import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Handshake,
  CalendarDays,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary", className: "bg-amber-50 text-amber-700 border-amber-200" },
  NEGOTIATING: { label: "Negotiating", icon: Handshake, variant: "secondary", className: "bg-blue-50 text-blue-700 border-blue-200" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, variant: "default", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DISPATCHED: { label: "Dispatched", icon: Truck, variant: "default", className: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED: { label: "Delivered", icon: Package, variant: "default", className: "bg-teal-50 text-teal-700 border-teal-200" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, variant: "default", className: "bg-slate-900 text-white" },
  CANCELLED: { label: "Cancelled", icon: XCircle, variant: "destructive", className: "bg-red-50 text-red-700 border-red-200" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, icon: Clock, variant: "outline" as const, className: "" };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`rounded-full font-bold text-[10px] px-3 py-1 gap-1 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export default async function BuyerOrdersPage() {
  const user = await requireRole(["buyer"]);

  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    include: {
      organization: true,
      items: {
        include: { batch: { include: { farmer: true } } },
      },
      movements: { orderBy: { dispatchDate: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">My Orders</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Track and manage your agricultural procurement orders.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed border-2 py-20 text-center rounded-3xl">
          <CardContent className="flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No orders yet</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
              Start by browsing the marketplace and placing your first order.
            </p>
            <Button asChild className="mt-6 rounded-2xl font-black uppercase text-xs tracking-widest h-12 px-8 bg-primary hover:bg-primary/90">
              <Link href="/buyer/marketplace">Browse Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const firstItem = order.items[0];
            return (
              <Card key={order.id} className="rounded-3xl border-slate-200 hover:border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-base font-black text-slate-900">
                            {order.orderNumber}
                          </h3>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm font-bold text-slate-600 truncate">
                          {firstItem?.batch?.crop ?? "Product"} {firstItem?.quantity ? `· ${firstItem.quantity} ${firstItem.unit ?? ""}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-medium">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                          <span>·</span>
                          <span className="font-bold text-slate-500">{order.organization.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:flex-shrink-0">
                      {order.totalAmount != null && Number(order.totalAmount) > 0 && (
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900">
                            {order.currency} {Number(order.totalAmount).toLocaleString()}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                        </div>
                      )}
                      <Button asChild variant="outline" className="rounded-2xl font-bold border-slate-200 h-11 px-5 gap-2">
                        <Link href={`/buyer/orders/${order.id}`}>
                          View Details
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Order items preview */}
                  {order.items.length > 1 && (
                    <div className="px-6 pb-4">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                        + {order.items.length - 1} more item{order.items.length - 1 !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
