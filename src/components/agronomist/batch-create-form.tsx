"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackagePlus, Leaf, CalendarDays, Scale } from "lucide-react";

export type BatchEligibleProductionRecord = {
  id: string;
  farmerName: string;
  cropType: string;
  season: string;
  status: "HARVESTED" | "COMPLETED";
  actualHarvestDate?: string | null;
  quantityTon?: number | null;
  alreadyBatchedTon: number;
};

export function BatchCreateForm({
  productionRecords,
}: {
  productionRecords: BatchEligibleProductionRecord[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [productionRecordId, setProductionRecordId] = useState<string>("");
  const [quantityTon, setQuantityTon] = useState<string>("");
  const [harvestDate, setHarvestDate] = useState<string>("");

  const record = useMemo(
    () => productionRecords.find((r) => r.id === productionRecordId),
    [productionRecords, productionRecordId]
  );

  const remainingTon = useMemo(() => {
    if (!record?.quantityTon && record?.quantityTon !== 0) return null;
    return Math.max(0, record.quantityTon - record.alreadyBatchedTon);
  }, [record]);

  const reset = () => {
    setProductionRecordId("");
    setQuantityTon("");
    setHarvestDate("");
  };

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionRecordId) {
      toast.error("Select a production record.");
      return;
    }

    const qty = Number(quantityTon);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid batch quantity (tons).");
      return;
    }

    const resolvedHarvestDate =
      harvestDate || (record?.actualHarvestDate ? record.actualHarvestDate.slice(0, 10) : "");
    if (!resolvedHarvestDate) {
      toast.error("Harvest date is required.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionRecordId,
          quantityTon: qty,
          harvestDate: new Date(resolvedHarvestDate).toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create batch.");
      }

      toast.success(`Batch created: ${data.batch?.batchId || "OK"}`);
      router.refresh();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create batch.");
    } finally {
      setIsLoading(false);
    }
  };

  const autofillFromRecord = (id: string) => {
    setProductionRecordId(id);
    const selected = productionRecords.find((r) => r.id === id);
    const d = selected?.actualHarvestDate ? selected.actualHarvestDate.slice(0, 10) : "";
    setHarvestDate(d);
    if (selected?.quantityTon !== null && selected?.quantityTon !== undefined) {
      const rem = Math.max(0, (selected.quantityTon ?? 0) - selected.alreadyBatchedTon);
      setQuantityTon(rem ? rem.toFixed(2) : "");
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-emerald-500/20"
      >
        <PackagePlus className="w-4 h-4 mr-2" />
        Create Batch
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                <PackagePlus className="w-8 h-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight">
                  Create Batch
                </DialogTitle>
                <p className="text-slate-200 font-medium opacity-90 mt-1">
                  Generate a traceable batch ID from a harvested cycle
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="p-8 space-y-7 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                Production Record *
              </Label>
              <Select
                value={productionRecordId}
                onValueChange={autofillFromRecord}
                required
              >
                <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                  <SelectValue placeholder="Select a harvested cycle..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {productionRecords.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      className="rounded-xl my-1"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold">
                          {r.cropType} · {r.farmerName}
                        </span>
                        <span className="text-xs font-black text-slate-400">
                          {r.season}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {record && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge
                    variant="outline"
                    className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
                  >
                    <Leaf className="w-3 h-3 mr-1" />
                    {record.status}
                  </Badge>
                  {record.actualHarvestDate && (
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700"
                    >
                      <CalendarDays className="w-3 h-3 mr-1" />
                      {record.actualHarvestDate.slice(0, 10)}
                    </Badge>
                  )}
                  {record.quantityTon !== null && record.quantityTon !== undefined && (
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                    >
                      <Scale className="w-3 h-3 mr-1" />
                      {remainingTon !== null ? `${remainingTon.toFixed(2)}T remaining` : "—"}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Harvest Date *
                </Label>
                <Input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Quantity (Tons) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantityTon}
                  onChange={(e) => setQuantityTon(e.target.value)}
                  placeholder="0.00"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>
            </div>

            <DialogFooter className="pt-8 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl font-black h-14 px-10 border-slate-200 hover:bg-slate-50 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-2xl font-black h-14 px-10 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl shadow-emerald-500/30 border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate Batch ID"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
