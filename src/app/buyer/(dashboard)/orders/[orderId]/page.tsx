import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ArrowLeft,
  Package,
  MapPin,
  CalendarDays,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Handshake,
  ArrowRight,
  User,
  FileText,
} from "lucide-react";
import { buildOrgTraceUrl } from "@/lib/trace/urls";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; dotClass: string }> = {
  PENDING: { label: "Pending", icon: Clock, className: "text-amber-700", dotClass: "bg-amber-500" },
  NEGOTIATING: { label: "Negotiating", icon: Handshake, className: "text-blue-700", dotClass: "bg-blue-500" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, className: "text-emerald-700", dotClass: "bg-emerald-500" },
  DISPATCHED: { label: "Dispatched", icon: Truck, className: "text-purple-700", dotClass: "bg-purple-500" },
  DELIVERED: { label: "Delivered", icon: Package, className: "text-teal-700", dotClass: "bg-teal-500" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, className: "text-slate-700", dotClass: "bg-slate-500" },
  CANCELLED: { label: "Cancelled", icon: XCircle, className: "text-red-700", dotClass: "bg-red-500" },
};

const STATUS_ORDER = ["PENDING", "NEGOTIATING", "CONFIRMED", "DISPATCHED", "DELIVERED", "COMPLETED"];

function OrderStatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-bold text-red-700">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {STATUS_ORDER.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = config.icon;

        return (
          <div key={status} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              isDone
                ? `${config.className} bg-opacity-10`
                : "text-slate-300 bg-slate-50"
            }`}>
              <div
                className={`w-2 h-2 rounded-full ${
                  isDone ? config.dotClass : "bg-slate-200"
                } ${isCurrent ? "ring-2 ring-primary ring-offset-1" : ""}`}
              />
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </div>
            {index < STATUS_ORDER.length - 1 && (
              <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${isDone ? "text-slate-400" : "text-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await requireRole(["buyer"]);
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: user.id },
    include: {
      organization: true,
      buyer: { select: { fullName: true, email: true } },
      items: {
        include: {
          batch: {
            include: {
              farmer: true,
              organization: {
                select: { slug: true },
              },
              productionRecord: true,
            },
          },
        },
      },
      movements: { orderBy: { dispatchDate: "asc" } },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/buyer/orders">Orders</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage className="font-medium">{order.orderNumber}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{order.orderNumber}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-sm font-medium text-slate-500">
              {order.organization.name}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {order.totalAmount != null && Number(order.totalAmount) > 0 && (
            <div className="text-right">
              <p className="text-3xl font-black text-slate-900">
                {order.currency} {Number(order.totalAmount).toLocaleString()}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <Card className="rounded-3xl border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest">
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline currentStatus={order.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-black text-slate-900">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <Card key={item.id} className="rounded-2xl border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {item.batch?.crop ?? "Product"}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          {item.batch?.batchId ?? ""}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {item.batch?.farmer && (
                            <Badge variant="outline" className="rounded-full font-bold text-[10px] px-2 py-0.5">
                              <User className="w-2.5 h-2.5 mr-1" />
                              {item.batch.farmer.fullName}
                            </Badge>
                          )}
                          {item.batch?.batchId && (
                            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold rounded-full text-primary">
                              <Link
                                href={buildOrgTraceUrl({
                                  orgSlug: item.batch.organization?.slug || order.organization.slug,
                                  batchId: item.batch.batchId,
                                  configuredUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL,
                                  nodeEnv: process.env.NODE_ENV,
                                })}
                                target="_blank"
                              >
                                View Trace
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black text-slate-900">
                        {Number(item.quantity)} {item.unit}
                      </p>
                      {Number(item.pricePerUnit) > 0 && (
                        <p className="text-xs font-bold text-slate-400">
                          {order.currency} {Number(item.pricePerUnit).toString()} / {item.unit}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Shipping */}
          {order.shippingAddress && (
            <Card className="rounded-3xl border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-700">{order.shippingAddress}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="rounded-3xl border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Movements */}
          {order.movements.length > 0 && (
            <Card className="rounded-3xl border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.movements.map((movement) => (
                  <div key={movement.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Truck className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900">
                        {movement.fromLocation} → {movement.toLocation}
                      </p>
                      {movement.dispatchDate && (
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                          Dispatched: {new Date(movement.dispatchDate).toLocaleDateString()}
                        </p>
                      )}
                      {movement.arrivalDate && (
                        <p className="text-[10px] font-medium text-slate-400">
                          Arrived: {new Date(movement.arrivalDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Back */}
      <Button asChild variant="outline" className="rounded-2xl font-bold border-slate-200 h-12">
        <Link href="/buyer/orders">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Link>
      </Button>
    </div>
  );
}
