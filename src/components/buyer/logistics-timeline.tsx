"use client";

import { CheckCircle2, Circle, Truck, Package, Home, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "PENDING" | "NEGOTIATING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "COMPLETED" | "CANCELLED";

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "complete" | "current" | "upcoming" | "error";
  date?: string;
}

export function LogisticsTimeline({ order }: { order: any }) {
  const steps: TimelineStep[] = [
    {
      id: "PENDING",
      title: "Order Placed",
      description: "Quote request sent to Admin",
      icon: Package,
      status: getStepStatus("PENDING", order.status),
      date: order.createdAt,
    },
    {
      id: "CONFIRMED",
      title: "Confirmed",
      description: "Batch verified & order confirmed",
      icon: CheckCircle2,
      status: getStepStatus("CONFIRMED", order.status),
    },
    {
      id: "DISPATCHED",
      title: "In Transit",
      description: "Goods are on the road",
      icon: Truck,
      status: getStepStatus("DISPATCHED", order.status),
    },
    {
      id: "DELIVERED",
      title: "Delivered",
      description: "Arrived at destination",
      icon: Home,
      status: getStepStatus("DELIVERED", order.status),
    },
  ];

  function getStepStatus(stepId: string, currentStatus: OrderStatus): "complete" | "current" | "upcoming" | "error" {
    const statusOrder: OrderStatus[] = ["PENDING", "NEGOTIATING", "CONFIRMED", "DISPATCHED", "DELIVERED", "COMPLETED"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf((stepId === "PENDING" ? "PENDING" : stepId) as OrderStatus);

    if (currentStatus === "CANCELLED") return "error";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "current";
    
    // Special cases for mapped statuses
    if (stepId === "CONFIRMED" && currentStatus === "NEGOTIATING") return "current";
    if (stepId === "DELIVERED" && currentStatus === "COMPLETED") return "complete";

    return "upcoming";
  }

  return (
    <div className="space-y-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Live Journey</h3>
        <Badge variant="outline" className="rounded-full font-bold text-[10px] uppercase px-3">
          {order.status}
        </Badge>
      </div>

      <div className="relative">
        {/* Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />

        <div className="space-y-10 relative">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex gap-6 items-start">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-all duration-500",
                step.status === "complete" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                step.status === "current" ? "bg-primary text-white shadow-lg shadow-primary/20 animate-pulse" :
                "bg-slate-50 text-slate-300 border border-slate-100"
              )}>
                <step.icon className="w-5 h-5" />
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "font-black text-sm uppercase tracking-tight",
                    step.status === "upcoming" ? "text-slate-400" : "text-slate-900"
                  )}>
                    {step.title}
                  </h4>
                  {step.date && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {format(new Date(step.date), "MMM d, HH:mm")}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs font-medium mt-1 leading-relaxed",
                  step.status === "upcoming" ? "text-slate-300" : "text-slate-500"
                )}>
                  {step.description}
                </p>

                {/* Logistics Details if in transit */}
                {step.id === "DISPATCHED" && step.status === "complete" && order.movements && order.movements.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    {order.movements.map((move: any) => (
                      <div key={move.id} className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Dispatch Details</span>
                          <Truck className="w-3 h-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Driver</p>
                            <p className="text-xs font-black text-slate-800">{move.driverName || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Vehicle</p>
                            <p className="text-xs font-black text-slate-800">{move.vehicleNumber || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                           <span className="text-[10px] font-bold text-slate-600">{move.fromLocation}</span>
                           <ChevronRight className="w-3 h-3 text-slate-300" />
                           <span className="text-[10px] font-bold text-primary">{move.toLocation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
