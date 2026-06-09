"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  Building2,
  Phone,
  MessageSquare,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { OrderChat } from "@/components/orders/order-chat";
import Link from "next/link";
import { buildOrgTracePath } from "@/lib/trace/urls";

export function AdminOrderManagementClient({ 
  initialOrders,
  currentUserId 
}: { 
  initialOrders: any[],
  currentUserId: string
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  // Form states for logistics
  const [logisticsForm, setLogisticsForm] = useState({
    fromLocation: "Central Warehouse",
    toLocation: "",
    driverName: "",
    vehicleNumber: "",
    dispatchDate: new Date().toISOString().split("T")[0],
  });

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
    o.buyer.fullName.toLowerCase().includes(query.toLowerCase()) ||
    o.items.some((i: any) => i.batch.crop.toLowerCase().includes(query.toLowerCase()))
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING": return { color: "bg-slate-100 text-slate-600 border-slate-200", label: "New Quote Request" };
      case "NEGOTIATING": return { color: "bg-blue-50 text-blue-600 border-blue-200", label: "Negotiating" };
      case "CONFIRMED": return { color: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Confirmed" };
      case "DISPATCHED": return { color: "bg-amber-50 text-amber-600 border-amber-200", label: "In Transit" };
      case "DELIVERED": return { color: "bg-emerald-500 text-white", label: "Delivered" };
      case "COMPLETED": return { color: "bg-slate-900 text-white", label: "Completed" };
      case "CANCELLED": return { color: "bg-red-50 text-red-600 border-red-200", label: "Cancelled" };
      default: return { color: "bg-slate-100 text-slate-600", label: status };
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, additionalData?: any) => {
    setUpdatingId(orderId);
    try {
      const response = await apiFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          ...(additionalData?.milestoneType ? { milestoneType: additionalData.milestoneType } : {}),
          ...(additionalData?.driverName ? { movement: additionalData } : {})
        })
      });

      if (!response.ok) throw new Error("Failed to update order status");

      toast.success(`Order status updated to ${newStatus}`);
      router.refresh();
      // Update local state
      const updatedOrder = await response.json();
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, movements: updatedOrder.movements || o.movements } : o));
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search order, buyer, or crop..."
            className="w-full pl-11 pr-4 h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order) => {
          const config = getStatusConfig(order.status);
          const isExpanded = expandedOrderId === order.id;

          return (
            <Card key={order.id} className={cn(
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
                        <Badge variant="outline" className={cn("rounded-full font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm", config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {order.buyer.fullName}
                        </span>
                        {order.buyer.buyerProfile?.companyName && (
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {order.buyer.buyerProfile.companyName}
                          </span>
                        )}
                        <span className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {order.items?.[0]?.batch?.crop || "Unknown"} · {Number(order.items?.[0]?.quantity || 0).toLocaleString()} {order.items?.[0]?.unit || "MT"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-8 border-t lg:border-t-0 pt-6 lg:pt-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Value</p>
                      <p className="text-2xl font-black text-slate-900">${Number(order.totalAmount).toLocaleString()}</p>
                    </div>
                    <ChevronDown className={cn("w-6 h-6 text-slate-300 transition-all duration-500", isExpanded && "rotate-180 text-primary")} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-8 pt-0 grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-500 border-t border-slate-50 mt-4 pt-8">
                    {/* Left Side: Order Details & Controls */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Manage Pipeline</h4>
                        <div className="flex flex-wrap gap-2">
                          {order.status === "PENDING" && (
                            <Button 
                              onClick={() => handleUpdateStatus(order.id, "NEGOTIATING")}
                              disabled={updatingId === order.id}
                              className="rounded-xl font-bold h-10 px-4 bg-blue-600 hover:bg-blue-700"
                            >
                              Start Negotiating
                            </Button>
                          )}
                          {(order.status === "PENDING" || order.status === "NEGOTIATING") && (
                            <Button 
                              onClick={() => handleUpdateStatus(order.id, "CONFIRMED")}
                              disabled={updatingId === order.id}
                              className="rounded-xl font-bold h-10 px-4 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Confirm Order
                            </Button>
                          )}
                          {order.status === "CONFIRMED" && (
                            <>
                              <Button 
                                onClick={() => handleUpdateStatus(order.id, "CONFIRMED", { milestoneType: "CLEANING" })}
                                disabled={updatingId === order.id}
                                className="rounded-xl font-bold h-10 px-4 bg-amber-500 hover:bg-amber-600"
                              >
                                Mark as Cleaned
                              </Button>
                              <Button 
                                onClick={() => handleUpdateStatus(order.id, "CONFIRMED", { milestoneType: "PACKAGING" })}
                                disabled={updatingId === order.id}
                                className="rounded-xl font-bold h-10 px-4 bg-purple-500 hover:bg-purple-600"
                              >
                                Mark as Packaged
                              </Button>
                            </>
                          )}
                          {order.status === "DISPATCHED" && (
                            <Button 
                              onClick={() => handleUpdateStatus(order.id, "DELIVERED", { milestoneType: "DELIVERED" })}
                              disabled={updatingId === order.id}
                              className="rounded-xl font-bold h-10 px-4 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Mark as Delivered
                            </Button>
                          )}
                          {order.status === "DELIVERED" && (
                            <Button 
                              onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                              disabled={updatingId === order.id}
                              className="rounded-xl font-bold h-10 px-4 bg-slate-900 text-white hover:bg-slate-800"
                            >
                              Complete Order
                            </Button>
                          )}
                          {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                            <Button 
                              variant="outline"
                              onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
                              disabled={updatingId === order.id}
                              className="rounded-xl font-bold h-10 px-4 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Chat for Negotiation */}
                      <OrderChat orderId={order.id} currentUserId={currentUserId} />

                      {/* Logistics Form - Only if confirmed or already dispatched */}
                      {(order.status === "CONFIRMED" || order.status === "DISPATCHED") && (
                        <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                             <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Assign Logistics</h4>
                             <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Driver Name</Label>
                                <Input 
                                  placeholder="Full Name" 
                                  className="rounded-xl border-slate-200" 
                                  value={logisticsForm.driverName}
                                  onChange={(e) => setLogisticsForm({...logisticsForm, driverName: e.target.value})}
                                />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Vehicle Number</Label>
                                <Input 
                                  placeholder="e.g. GV 123-24" 
                                  className="rounded-xl border-slate-200" 
                                  value={logisticsForm.vehicleNumber}
                                  onChange={(e) => setLogisticsForm({...logisticsForm, vehicleNumber: e.target.value})}
                                />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">To Location</Label>
                                <Input 
                                  placeholder="Destination" 
                                  className="rounded-xl border-slate-200" 
                                  value={logisticsForm.toLocation || order.shippingAddress || ""}
                                  onChange={(e) => setLogisticsForm({...logisticsForm, toLocation: e.target.value})}
                                />
                             </div>
                             <div className="space-y-1.5 flex items-end">
                                <Button 
                                  className="w-full rounded-xl font-black uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-primary/20"
                                  onClick={() => handleUpdateStatus(order.id, "DISPATCHED", logisticsForm)}
                                  disabled={updatingId === order.id}
                                >
                                  {updatingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch Truck"}
                                </Button>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side: Order Info & Stats */}
                    <div className="space-y-6">
                       <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm space-y-4">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Buyer & Shipping Information</h4>
                          <div className="space-y-4">
                             {/* Buyer Profile Info */}
                             {order.buyer.buyerProfile && (
                               <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                 <div className="flex items-start gap-3">
                                   <Building2 className="w-4 h-4 text-primary mt-0.5" />
                                   <div className="flex flex-col">
                                     <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Company</span>
                                     <span className="text-sm font-bold text-slate-900">{order.buyer.buyerProfile.companyName}</span>
                                   </div>
                                 </div>
                                 {order.buyer.buyerProfile.phoneNumber && (
                                   <div className="flex items-start gap-3">
                                     <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                     <div className="flex flex-col">
                                       <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Contact</span>
                                       <span className="text-sm font-bold text-slate-900">{order.buyer.buyerProfile.phoneNumber}</span>
                                     </div>
                                   </div>
                                 )}
                                 {order.buyer.buyerProfile.businessAddress && (
                                   <div className="flex items-start gap-3">
                                     <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                     <div className="flex flex-col">
                                       <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Business Address</span>
                                       <span className="text-sm font-bold text-slate-900">
                                         {order.buyer.buyerProfile.businessAddress}, {order.buyer.buyerProfile.country}
                                       </span>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             )}

                             <div className="space-y-3 px-1">
                                <div className="flex items-center gap-3">
                                   <MapPin className="w-4 h-4 text-primary" />
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shipping Destination</span>
                                      <span className="text-sm font-bold text-slate-900">{order.shippingAddress || "No address provided"}</span>
                                   </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 text-xs font-medium text-slate-600 leading-relaxed italic border border-slate-100">
                                   "{order.notes || "No special instructions."}"
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Order Items */}
                       <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm space-y-4">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Order Items</h4>
                          <div className="space-y-3">
                             {order.items?.map((item: any) => (
                               <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="flex items-center gap-3">
                                     <Package className="w-4 h-4 text-primary" />
                                     <div>
                                  <p className="font-bold text-slate-900">Batch #{item.batchId.slice(-6)}</p>
                                  <p className="text-xs text-slate-500">{item.quantity} {item.unit} @ ${item.pricePerUnit}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button asChild variant="outline" size="sm" className="rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-[10px] uppercase tracking-widest h-8">
                                  <Link
                                    href={buildOrgTracePath(
                                      item.batch?.organization?.slug || order.organization?.slug || "",
                                      item.batchId || item.batch?.batchId,
                                    )}
                                    target="_blank"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                    Quality Passport
                                  </Link>
                                </Button>
                                <p className="font-bold text-slate-900">${item.totalPrice}</p>
                              </div>
                            </div>
                             ))}
                          </div>
                       </div>

                       {/* History / Movements */}
                       {order.movements?.length > 0 && (
                         <div className="space-y-4">
                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs px-2">Movement History</h4>
                            <div className="space-y-3">
                               {order.movements.map((move: any) => (
                                 <div key={move.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                          <Truck className="w-5 h-5" />
                                       </div>
                                       <div>
                                          <p className="text-xs font-black text-slate-900">{move.fromLocation} ➔ {move.toLocation}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(move.dispatchDate), "MMM d, yyyy")}</p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-xs font-black text-slate-900">{move.driverName}</p>
                                       <p className="text-[10px] font-bold text-slate-400">{move.vehicleNumber}</p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
