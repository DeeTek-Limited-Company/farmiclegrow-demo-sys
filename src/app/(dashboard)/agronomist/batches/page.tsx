import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, ArrowUpRight, Leaf, CalendarDays, Scale } from "lucide-react";
import { BatchCreateForm, type BatchEligibleProductionRecord } from "@/components/agronomist/batch-create-form";

export default async function AgronomistBatchesPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const ownershipWhere: any = {};
  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    ownershipWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [batches, eligibleRecords] = await Promise.all([
    prisma.batch.findMany({
      where: ownershipWhere,
      include: {
        farmer: true,
        productionRecord: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.productionRecord.findMany({
      where: {
        ...ownershipWhere,
        status: { in: ["HARVESTED", "COMPLETED"] },
      },
      include: {
        farmer: true,
        batches: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const eligibleSerialized: BatchEligibleProductionRecord[] = eligibleRecords.map((r) => {
    const alreadyBatchedTon = r.batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    return {
      id: r.id,
      farmerName: r.farmer.fullName,
      cropType: r.cropType,
      season: r.season,
      status: r.status as "HARVESTED" | "COMPLETED",
      actualHarvestDate: r.actualHarvestDate ? r.actualHarvestDate.toISOString() : null,
      quantityTon: r.quantityTon ? Number(r.quantityTon) : null,
      alreadyBatchedTon,
    };
  });

  const totalBatches = batches.length;
  const totalQuantity = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Batches
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Each batch is tied to a completed production cycle — the production record is the source of truth; batches and
            QR trace pages read from that harvest data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BatchCreateForm productionRecords={eligibleSerialized} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-emerald-50">
                <Leaf className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Total Batches
                </p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{totalBatches}</h3>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed italic border-t border-slate-50 pt-3 mt-1">
              Unique batch IDs generated for traceability
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-amber-50">
                <Scale className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Total Quantity
                </p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {totalQuantity.toFixed(2)}T
                </h3>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed italic border-t border-slate-50 pt-3 mt-1">
              Sum of batch weights created so far
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Batch Registry
          </CardTitle>
          <CardDescription className="font-medium">
            Each batch has a trace URL that can be encoded into a QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-slate-50/30">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">
                No batches yet
              </p>
              <p className="text-slate-400 font-medium italic text-sm">
                Create a batch from a HARVESTED or COMPLETED production cycle.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {batches.map((b) => (
                <div key={b.id} className="p-6 hover:bg-slate-50/30 transition-all group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-700 font-black text-xs tracking-widest shadow-sm border border-slate-200/50 px-2 text-center">
                        {b.batchId}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-800 text-xl">{b.crop}</h3>
                          <Badge
                            variant="outline"
                            className="rounded-full font-black text-[10px] px-3 py-0.5 bg-white border-slate-200 text-slate-600"
                          >
                            {b.farmer.fullName}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-blue-500" />
                            Harvest {format(new Date(b.harvestDate), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Scale className="w-4 h-4 text-amber-500" />
                            {Number(b.quantity).toFixed(2)} Tons
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link href={`/trace/${b.batchId}`} target="_blank">
                        <Button
                          variant="outline"
                          className="rounded-2xl border-slate-200 font-black h-12"
                        >
                          Open Trace
                          <ArrowUpRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"
                        asChild
                      >
                        <Link href={`/api/batches/${b.batchId}`}>
                          <ArrowUpRight className="w-6 h-6" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
