"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, ClipboardList, Send } from "lucide-react";

interface MilestoneFormProps {
  batchId: string;
}

const MILESTONE_TYPES = [
  { value: "CLEANING", label: "Cleaning" },
  { value: "GRADING", label: "Grading" },
  { value: "PACKAGING", label: "Packaging" },
];

export function MilestoneForm({ batchId }: MilestoneFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [quantityBefore, setQuantityBefore] = useState("");
  const [quantityRejected, setQuantityRejected] = useState("");
  const [cleaningMethod, setCleaningMethod] = useState("");

  const [qualityGrade, setQualityGrade] = useState("");
  const [defectPercentage, setDefectPercentage] = useState("");
  const [moistureContent, setMoistureContent] = useState("");

  const [packagingType, setPackagingType] = useState("");
  const [unitsProduced, setUnitsProduced] = useState("");
  const [finalNetWeight, setFinalNetWeight] = useState("");

  const resetDynamicFields = () => {
    setQuantityBefore("");
    setQuantityRejected("");
    setCleaningMethod("");
    setQualityGrade("");
    setDefectPercentage("");
    setMoistureContent("");
    setPackagingType("");
    setUnitsProduced("");
    setFinalNetWeight("");
  };

  const formatStructuredNotes = () => {
    const lines: string[] = [];

    const pushLine = (label: string, value: string, suffix?: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      lines.push(`[${label}: ${trimmed}${suffix ?? ""}]`);
    };

    if (type === "CLEANING") {
      pushLine("Quantity Before", quantityBefore, " kg");
      pushLine("Quantity Rejected", quantityRejected, " kg");
      pushLine("Cleaning Method", cleaningMethod);
    }

    if (type === "GRADING") {
      pushLine("Quality Grade", qualityGrade);
      pushLine("Defect Percentage", defectPercentage, "%");
      pushLine("Moisture Content", moistureContent, "%");
    }

    if (type === "PACKAGING") {
      pushLine("Packaging Type", packagingType);
      pushLine("Units Produced", unitsProduced);
      pushLine("Final Net Weight", finalNetWeight, " kg");
    }

    const baseNotes = notes.trim();
    if (!lines.length) return baseNotes;
    if (!baseNotes) return lines.join("\n");
    return `${lines.join("\n")}\nAdditional Notes: ${baseNotes}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      toast.error("Select a milestone type.");
      return;
    }

    setIsLoading(true);
    try {
      const formattedNotes = formatStructuredNotes();

      const res = await apiFetch(`/api/batches/${batchId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          location,
          notes: formattedNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to log milestone.");
      }

      toast.success("Milestone logged successfully.");
      router.refresh();
      setOpen(false);
      setType("");
      setLocation("");
      setNotes("");
      resetDynamicFields();
    } catch (err: any) {
      toast.error(err?.message || "Failed to log milestone.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl font-bold hover:bg-primary hover:text-white transition-all gap-2 h-10"
        >
          <ClipboardList className="w-4 h-4" />
          Log Processing Step
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-2rem)] rounded-3xl sm:rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl flex flex-col">
        <div className="bg-gradient-to-br from-primary to-[#0B2713] px-5 py-6 sm:p-8 text-white relative shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner shrink-0">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-black">Log Processing Step</DialogTitle>
              <p className="text-white/70 text-sm font-medium">
                Record a post-harvest processing step for this batch
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        </div>

        <form onSubmit={submit} className="px-5 py-6 sm:p-8 space-y-6 bg-white overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
              Processing Step *
            </Label>
            <Select
              value={type}
              onValueChange={(nextType) => {
                setType(nextType);
                resetDynamicFields();
              }}
              required
            >
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                <SelectValue placeholder="Select processing step..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                {MILESTONE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="rounded-xl my-1">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
              Location
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Warehouse A, Tema Port..."
                className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold pl-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
              Additional Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide more details about this stage..."
              className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-200 font-medium p-4"
            />
          </div>

          {type === "CLEANING" && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Cleaning Metrics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Qty Before (kg)</Label>
                  <Input type="number" value={quantityBefore} onChange={e => setQuantityBefore(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Qty Rejected (kg)</Label>
                  <Input type="number" value={quantityRejected} onChange={e => setQuantityRejected(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Cleaning Method</Label>
                <Select value={cleaningMethod} onValueChange={setCleaningMethod}>
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Select method..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    <SelectItem value="Manual" className="rounded-xl">Manual</SelectItem>
                    <SelectItem value="Mechanical" className="rounded-xl">Mechanical</SelectItem>
                    <SelectItem value="Water Washing" className="rounded-xl">Water Washing</SelectItem>
                    <SelectItem value="Dry Sifting" className="rounded-xl">Dry Sifting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "GRADING" && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Grading Metrics</h4>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Quality Grade</Label>
                <Select value={qualityGrade} onValueChange={setQualityGrade}>
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Select grade..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    <SelectItem value="Grade A Premium" className="rounded-xl">Grade A Premium</SelectItem>
                    <SelectItem value="Grade B Standard" className="rounded-xl">Grade B Standard</SelectItem>
                    <SelectItem value="Processing Grade" className="rounded-xl">Processing Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Defect Percentage (%)</Label>
                  <Input type="number" step="0.1" value={defectPercentage} onChange={e => setDefectPercentage(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Moisture Content (%)</Label>
                  <Input type="number" step="0.1" value={moistureContent} onChange={e => setMoistureContent(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
              </div>
            </div>
          )}

          {type === "PACKAGING" && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Packaging Metrics</h4>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Packaging Type</Label>
                <Select value={packagingType} onValueChange={setPackagingType}>
                  <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Select packaging..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl">
                    <SelectItem value="50kg Jute Bags" className="rounded-xl">50kg Jute Bags</SelectItem>
                    <SelectItem value="25kg Vacuum Sealed Cartons" className="rounded-xl">25kg Vacuum Sealed Cartons</SelectItem>
                    <SelectItem value="10kg Sacks" className="rounded-xl">10kg Sacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Units Produced</Label>
                  <Input type="number" value={unitsProduced} onChange={e => setUnitsProduced(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Final Net Weight (kg)</Label>
                  <Input type="number" step="0.1" value={finalNetWeight} onChange={e => setFinalNetWeight(e.target.value)} className="rounded-xl border-slate-200" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl font-black h-14 bg-primary text-white shadow-xl shadow-primary/30 border-0 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Processing Step"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
