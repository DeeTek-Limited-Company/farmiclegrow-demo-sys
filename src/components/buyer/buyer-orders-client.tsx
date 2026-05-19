"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  MessageSquare,
  Building2,
  ShieldCheck,
  QrCode
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LogisticsTimeline } from "./logistics-timeline";
import { OrderChat } from "@/components/orders/order-chat";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TraceQrModal } from "@/components/trace/trace-qr-modal";

export function BuyerOrdersClient({ 
  initialOrders,
  currentUserId 
}: { 
  initialOrders: any[],
  currentUserId: string
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; batchId: string; cropName: string; orderId?: string }>({
    isOpen: false,
    batchId: "",
    cropName: "",
    orderId: ""
  });
  const [query, setQuery] = useState("");

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
    o.items.some((i: any) => i.batch.crop.toLowerCase().includes(query.toLowerCase()))
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING": return { color: "bg-slate-100 text-slate-600 border-slate-200", icon: <Clock className="w-3 h-3" />, label: "Quote Requested" };
      case "NEGOTIATING": return { color: "bg-blue-50 text-blue-600 border-blue-200", icon: <FileText className="w-3 h-3" />, label: "Negotiating" };
      case "CONFIRMED": return { color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" />, label: "Confirmed" };
      case "DISPATCHED": return { color: "bg-amber-50 text-amber-600 border-amber-200", icon: <Truck className="w-3 h-3" />, label: "In Transit" };
      case "DELIVERED": return { color: "bg-emerald-500 text-white border-0", icon: <CheckCircle2 className="w-3 h-3" />, label: "Delivered" };
      case "COMPLETED": return { color: "bg-slate-900 text-white border-0", icon: <CheckCircle2 className="w-3 h-3" />, label: "Completed" };
      case "CANCELLED": return { color: "bg-red-50 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3" />, label: "Cancelled" };
      default: return { color: "bg-slate-100 text-slate-600", icon: <Clock className="w-3 h-3" />, label: status };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search order number or crop..."
            className="w-full pl-11 pr-4 h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-slate-200 gap-2">
          <Filter className="w-4 h-4" />
          Filter Status
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <Card className="rounded-[2.5rem] border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardContent className="py-20 text-center space-y-4">
              <Package className="w-16 h-16 text-slate-200 mx-auto" />
              <p className="text-slate-400 font-black text-xl uppercase tracking-widest">No orders found</p>
              <p className="text-slate-400 font-medium italic">Explore the marketplace to find high-quality produce.</p>
              <Button asChild className="rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest">
                <Link href="/buyer/marketplace">Go to Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const config = getStatusConfig(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className="group transition-all duration-500">
                <Card className={cn(
                  "overflow-hidden rounded-[2.5rem] transition-all duration-500 border-primary/5",
                  isExpanded ? "ring-2 ring-primary/20 shadow-2xl" : "hover:shadow-xl"
                )}>
                  <CardContent className="p-0">
                    <div 
                      className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl transition-all duration-500",
                          isExpanded ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          {order.items[0]?.batch.crop.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <h3 className="font-black text-slate-900 text-lg md:text-xl tracking-tight">{order.orderNumber}</h3>
                            <Badge variant="outline" className={cn("rounded-full font-black text-[10px] px-3 py-1 flex items-center gap-1.5 uppercase tracking-widest shadow-sm", config.color)}>
                              {config.icon}
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-primary" />
                              {order.items?.[0]?.batch?.crop || "Unknown"} · {Number(order.items?.[0]?.quantity || 0).toLocaleString()} {order.items?.[0]?.unit || "MT"}
                            </span>
                            <span className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(order.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-8 border-t lg:border-t-0 pt-6 lg:pt-0 border-slate-100">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                          <p className="text-2xl font-black text-slate-900">${Number(order.totalAmount).toLocaleString()}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 transition-all duration-500",
                            isExpanded ? "rotate-180 bg-primary/10 text-primary" : "group-hover:bg-slate-100"
                          )}
                        >
                          <ChevronDown className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Left Side: Items & Logistics */}
                          <div className="space-y-8">
                            {/* Items Table */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                <Package className="w-3 h-3" />
                                Order Items
                              </h4>
                              <div className="space-y-4">
                                {order.items?.map((item: any) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-50">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-900">Batch #{item.batchId?.slice(-6) || item.batch?.batchId?.slice(-6)}</p>
                                        <p className="text-xs text-slate-500">{item.quantity} {item.unit} @ ${item.pricePerUnit}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Button asChild variant="outline" size="sm" className="rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-[10px] uppercase tracking-widest h-8">
                                  <Link href={`/trace/${item.batchId || item.batch?.batchId}?orderId=${order.id}`} target="_blank">
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                    Quality Passport
                                  </Link>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-xl border-slate-200"
                                  onClick={() => setQrModal({
                                    isOpen: true,
                                    batchId: item.batchId || item.batch?.batchId,
                                    cropName: item.batch?.crop || "Produce",
                                    orderId: order.id
                                  })}
                                >
                                  <QrCode className="w-4 h-4 text-slate-500" />
                                </Button>
                                <p className="font-black text-slate-900">${item.totalPrice || (Number(item.quantity) * Number(item.pricePerUnit))}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                                <Truck className="w-3 h-3" />
                                 Delivery Progress
                               </h4>
                               <LogisticsTimeline order={order} />
                             </div>
                          </div>

                          {/* Right Side: Chat & Info */}
                          <div className="space-y-8">
                            {/* Chat */}
                            <OrderChat orderId={order.id} currentUserId={currentUserId} />

                            {/* Shipping Info */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                Shipping Details
                              </h4>
                              <div className="space-y-3">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {order.shippingAddress || "No shipping address provided"}
                                </p>
                                {order.notes && (
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Notes</p>
                                    <p className="text-sm text-slate-600 italic">"{order.notes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      <TraceQrModal 
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        batchId={qrModal.batchId}
        cropName={qrModal.cropName}
        orderId={qrModal.orderId}
      />
    </div>
  );
}
