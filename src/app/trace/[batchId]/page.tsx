import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Leaf, 
  MapPin, 
  CalendarDays, 
  Scale, 
  ShieldCheck, 
  Package, 
  Truck, 
  Warehouse, 
  Handshake,
  QrCode,
  Info,
  Clock,
  CheckCircle2
} from "lucide-react";
import { TraceHero } from "@/components/trace/trace-hero";
import { FarmerProfileCard } from "@/components/trace/farmer-profile-card";
import { QualityScorecard } from "@/components/trace/quality-scorecard";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function TraceBatchPage({ params }: PageProps) {
  const { batchId } = await params;

  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: {
      farmer: {
        include: {
          community: { include: { district: { include: { region: true } } } },
          farmProfiles: {
            include: { locations: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      productionRecord: true,
      movementLogs: { orderBy: { dispatchDate: "asc" } },
      warehouseEntries: { orderBy: { dateIn: "asc" } },
      salesRecords: { orderBy: { dateSold: "asc" } },
      milestones: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!batch) {
    notFound();
  }

  const profile = batch.farmer.farmProfiles[0] || null;
  const canonicalCommunity = batch.farmer.community || null;
  const canonicalDistrict = canonicalCommunity?.district || null;
  const canonicalRegion = canonicalDistrict?.region || null;

  // Timeline Events
  const milestoneEvents = batch.milestones.map((m) => ({
    id: m.id,
    date: m.timestamp,
    title: m.type.replace("_", " "),
    location: m.location || "Supply Chain",
    type: "milestone" as const,
    status: m.status,
  }));

  const movementEvents = batch.movementLogs.map((m) => ({
    id: m.id,
    date: m.dispatchDate,
    title: "Transit Start",
    location: "Logistics Route",
    type: "movement" as const,
    detail: `${m.fromLocation} → ${m.toLocation}`,
    status: m.arrivalDate ? "COMPLETED" : "IN_PROGRESS",
  }));

  const warehouseEvents = batch.warehouseEntries.map((w) => ({
    id: w.id,
    date: w.dateIn,
    title: "Safety Storage",
    location: "Central Hub",
    type: "warehouse" as const,
    detail: w.warehouseName,
    status: w.dateOut ? "COMPLETED" : "IN_PROGRESS",
  }));

  const salesEvents = batch.salesRecords.map((s) => ({
    id: s.id,
    date: s.dateSold,
    title: "Final Ownership",
    location: "Trade Hub",
    type: "sale" as const,
    detail: s.buyerName,
    status: "COMPLETED",
  }));

  const timeline = [...milestoneEvents, ...warehouseEvents, ...movementEvents, ...salesEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      
      <TraceHero 
        code={batch.batchId} 
        crop={batch.crop} 
        quantity={`${Number(batch.quantity).toFixed(2)} MT`} 
        date={format(new Date(batch.harvestDate), "MMMM d, yyyy")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <FarmerProfileCard 
              name={batch.farmer.fullName}
              community={canonicalCommunity?.name || "Verified Community"}
              location={`${canonicalDistrict?.name || ''}, ${canonicalRegion?.name || 'Ghana'}`}
           />

           <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-primary" /> Production Audit
              </h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Season</span>
                    <span className="font-bold text-slate-900">{batch.productionRecord.season}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Method</span>
                    <Badge variant="outline" className="border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full">
                       {batch.productionRecord.farmingMethod || "Organic"}
                    </Badge>
                 </div>
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Planting</span>
                    <span className="font-bold text-slate-900">
                       {batch.productionRecord.plantingDate ? format(new Date(batch.productionRecord.plantingDate), "MMM yyyy") : "—"}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
           
           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quality Passport</h2>
                 <Badge className="bg-primary/10 text-primary border-0 rounded-full text-[9px] font-black uppercase px-3 py-1">Verified Integrity</Badge>
              </div>
              <QualityScorecard />
           </div>

           <div className="space-y-10 pt-10 border-t border-slate-200">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chain of Custody</h2>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock className="w-4 h-4" /> Live Events
                 </div>
              </div>

              <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
                 {timeline.length === 0 ? (
                    <div className="pl-12 text-slate-400 font-bold italic">Waiting for logistics milestones...</div>
                 ) : (
                   timeline.map((event) => {
                     const Icon = 
                       event.type === "movement" ? Truck :
                       event.type === "warehouse" ? Warehouse :
                       event.type === "sale" ? Handshake :
                       CheckCircle2;

                     return (
                       <div key={event.id} className="relative flex items-center group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-primary text-white shadow absolute left-0 z-10 transition-transform group-hover:scale-110">
                             <Icon className="w-4 h-4" />
                          </div>
                          <div className="ml-16 w-full p-6 rounded-3xl bg-white shadow-lg border border-slate-100 transition-all duration-500 group-hover:border-primary/20 group-hover:-translate-y-1">
                             <div className="flex items-center justify-between mb-4">
                                <time className="text-[10px] font-black text-primary uppercase tracking-widest">
                                   {format(new Date(event.date), "MMM d, yyyy")}
                                </time>
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider rounded-full border-slate-100 text-slate-400">
                                   {event.location}
                                </Badge>
                             </div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{event.title}</h3>
                             {(event as any).detail && (
                               <div className="mt-3 text-xs font-bold text-slate-500 flex items-center gap-2">
                                  <ArrowRight className="w-3 h-3 text-primary" />
                                  {(event as any).detail}
                               </div>
                             )}
                          </div>
                       </div>
                     );
                   })
                 )}
              </div>
           </div>

           {/* Final Verified Card */}
           <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white flex items-center gap-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                 <QrCode className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black mb-1">Authenticity Guaranteed</h3>
                 <p className="text-xs text-slate-400 font-medium">This record is protected by FarmicleGrow secure ledger. Any tampering will be flagged by our agronomist network.</p>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
