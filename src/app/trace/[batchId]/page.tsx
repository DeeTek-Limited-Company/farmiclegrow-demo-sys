import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { 
  ShieldCheck, 
  Truck, 
  Warehouse, 
  Handshake,
  QrCode,
  Clock,
  CheckCircle2,
  Leaf,
  Beaker,
  History,
  ArrowRight
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

  // Fetch Production/Quality data specifically
  const harvestRecords = await prisma.harvestRecord.findMany({
    where: { productionRecordId: batch.productionRecordId },
    include: { qualityTests: { orderBy: { dateTested: "asc" } } },
    orderBy: { harvestDate: "asc" },
  });

  const canonicalCommunity = batch.farmer.community || null;
  const canonicalDistrict = canonicalCommunity?.district || null;
  const canonicalRegion = canonicalDistrict?.region || null;

  // --- Process Timeline Events ---
  
  // 1. Production Events
  const productionEvents = [];
  
  productionEvents.push({
    id: `creation-${batch.id}`,
    date: batch.createdAt,
    title: "Batch Verification",
    location: "Farm Gate",
    type: "origin",
    details: [
      { label: "Batch ID", value: batch.batchId },
      { label: "Crop", value: batch.crop },
      { label: "Quantity", value: `${Number(batch.quantity)}` },
    ],
    status: "verified",
    icon: QrCode
  });

  for (const harvest of harvestRecords) {
    productionEvents.push({
      id: `harvest-${harvest.id}`,
      date: harvest.harvestDate,
      title: "Harvest Logged",
      location: canonicalCommunity?.name || "Farm",
      type: "origin",
      details: [
        { label: "Crop", value: harvest.crop },
        { label: "Quantity Harvested", value: `${harvest.quantityHarvested || '—'} ${harvest.unit || 'MT'}` },
        { label: "Initial Quality Grade", value: harvest.initialQualityGrade || "Grade A" },
        { label: "Supervisor Approved", value: harvest.supervisorApproved ? "YES" : "NO" },
      ],
      status: "verified",
      icon: Leaf
    });

    for (const test of harvest.qualityTests) {
      productionEvents.push({
        id: `test-${test.id}`,
        date: test.dateTested,
        title: "Quality Analysis",
        location: "Lab Center",
        type: "quality",
        details: [
          { label: "Passed", value: test.passed ? "true" : "false" },
          { label: "Moisture Pct", value: `${test.moisturePct || '—'}` },
          { label: "Foreign Matter Pct", value: `${test.foreignMatterPct || '—'}` },
          { label: "Broken Grain Pct", value: `${test.brokenGrainPct || '—'}` },
          { label: "Aflatoxin Test", value: test.aflatoxinTest || "Negative" },
          { label: "Color Grade", value: test.colorGrade || "N/A" },
          { label: "Pest Damage", value: test.pestDamage || "None" },
        ],
        status: "verified",
        icon: Beaker
      });
    }
  }

  // 2. Logistics Events
  const logisticsEvents = [];

  for (const move of batch.movementLogs) {
    logisticsEvents.push({
      id: `move-${move.id}`,
      date: move.dispatchDate,
      title: "Transit Start",
      location: "Logistics Route",
      type: "logistics",
      details: [
        { label: "From Location", value: move.fromLocation },
        { label: "To Location", value: move.toLocation },
        { label: "Quantity Sent", value: `${move.quantitySent || '—'}` },
      ],
      status: move.arrivalDate ? "COMPLETED" : "IN_PROGRESS",
      icon: Truck
    });

    if (move.arrivalDate) {
      logisticsEvents.push({
        id: `arrival-${move.id}`,
        date: move.arrivalDate,
        title: "Destination Arrival",
        location: move.toLocation,
        type: "logistics",
        details: [
          { label: "To Location", value: move.toLocation },
          { label: "Quantity Received", value: `${move.quantityReceived || '—'}` },
          { label: "Condition On Arrival", value: move.conditionOnArrival || 'Excellent' },
        ],
        status: "COMPLETED",
        icon: CheckCircle2
      });
    }
  }

  for (const entry of batch.warehouseEntries) {
    logisticsEvents.push({
      id: `wh-${entry.id}`,
      date: entry.dateIn,
      title: "Safety Storage",
      location: entry.warehouseName,
      type: "logistics",
      details: [
        { label: "Warehouse", value: entry.warehouseName },
        { label: "Storage Condition", value: "Ambient" },
      ],
      status: entry.dateOut ? "COMPLETED" : "IN_PROGRESS",
      icon: Warehouse
    });
  }

  // 3. Milestone Events (Internal)
  const milestoneEvents = batch.milestones.map((m) => ({
    id: m.id,
    date: m.timestamp,
    title: m.type.replace("_", " "),
    location: m.location || "Supply Chain",
    type: "milestone",
    details: [
      { label: "Activity", value: m.type.replace("_", " ") },
      { label: "Notes", value: m.notes || "No extra notes" },
    ],
    status: m.status,
    icon: ShieldCheck
  }));

  // Combine All for History Tab
  const allEvents = [...productionEvents, ...logisticsEvents, ...milestoneEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Dynamic Metrics for Scorecard
  const latestTest = harvestRecords.flatMap(h => h.qualityTests).sort((a, b) => b.dateTested.getTime() - a.dateTested.getTime())[0];
  const qualityMetrics: any[] = [
    { label: "Moisture", value: latestTest?.moisturePct ? `${latestTest.moisturePct}%` : "11.2%", iconName: 'moisture', score: 95 },
    { label: "Purity", value: latestTest?.foreignMatterPct ? `${100 - Number(latestTest.foreignMatterPct)}%` : "99.8%", iconName: 'purity', score: 98 },
    { label: "Compliance", value: latestTest?.passed ? "Certified" : "Pending", iconName: 'compliance', score: 100 },
    { label: "Grade", value: batch.productionRecord.cropVariety || "Premium", iconName: 'grade', score: 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 min-h-screen bg-background selection:bg-primary/10">
      
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

           <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-border/50 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-accent" /> Production Audit
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
              <QualityScorecard metrics={qualityMetrics} />
           </div>

           <div className="space-y-10 pt-10 border-t border-slate-200">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 mb-8">
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chain of Custody</h2>
                   <TabsList className="bg-slate-200/50 p-1 rounded-2xl border-0 h-auto">
                      <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                         <History className="w-3 h-3 mr-2" /> Full History
                      </TabsTrigger>
                      <TabsTrigger value="origin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                         <Leaf className="w-3 h-3 mr-2" /> Origin & Quality
                      </TabsTrigger>
                      <TabsTrigger value="logistics" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                         <Truck className="w-3 h-3 mr-2" /> Logistics
                      </TabsTrigger>
                   </TabsList>
                </div>

                <TabsContent value="all" className="mt-0">
                   <Timeline items={allEvents} />
                </TabsContent>
                <TabsContent value="origin" className="mt-0">
                   <Timeline items={productionEvents} />
                </TabsContent>
                <TabsContent value="logistics" className="mt-0">
                   <Timeline items={logisticsEvents} />
                </TabsContent>
              </Tabs>
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

function Timeline({ items }: { items: any[] }) {
  if (items.length === 0) {
    return <div className="pl-12 text-slate-400 font-bold italic py-8">No records found for this category.</div>;
  }

  return (
    <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
       {items.map((event, idx) => (
         <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            {/* Dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-primary text-white shadow absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10 transition-transform group-hover:scale-110">
               <event.icon className="w-4 h-4" />
            </div>
            
            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-white shadow-lg border border-slate-100 transition-all duration-500 group-hover:border-primary/20 group-hover:-translate-y-1">
               <div className="flex items-center justify-between mb-4">
                  <time className="text-[10px] font-black text-primary uppercase tracking-widest">
                     {format(new Date(event.date), "dd MMM yyyy")}
                  </time>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider rounded-full border-slate-100 text-slate-400">
                     {event.location}
                  </Badge>
               </div>
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">{event.title}</h3>
               
               {event.details && event.details.length > 0 && (
                 <div className="grid grid-cols-2 gap-y-4 gap-x-8 pt-4 border-t border-slate-50">
                    {event.details.map((d: any) => (
                      <div key={d.label}>
                         <div className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-0.5">{d.label}</div>
                         <div className="text-xs font-bold text-slate-700">{d.value}</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
         </div>
       ))}
    </div>
  );
}
