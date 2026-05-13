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
  { value: "PORT_ARRIVAL", label: "Port Arrival" },
  { value: "PORT_DEPARTURE", label: "Port Departure" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
];

export function MilestoneForm({ batchId }: MilestoneFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      toast.error("Select a milestone type.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/batches/${batchId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          location,
          notes,
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
          Update Journey
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">Log Milestone</DialogTitle>
              <p className="text-slate-400 text-sm font-medium">Update the traceability journey for this batch</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 space-y-6 bg-white">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
              Event Type *
            </Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                <SelectValue placeholder="Select milestone type..." />
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
                "Log Milestone"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
