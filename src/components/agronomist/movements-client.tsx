"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Truck, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BatchOption = {
  id: string;
  batchId: string;
  crop: string;
  quantity: string | number;
  harvestDate: string;
  farmer: { id: string; fullName: string; phone: string | null };
};

type MovementRow = {
  id: string;
  batchId: string;
  fromLocation: string;
  toLocation: string;
  driverName: string | null;
  vehicleNumber: string | null;
  dispatchDate: string;
  arrivalDate: string | null;
  quantitySent: string | number | null;
  quantityReceived: string | number | null;
  conditionOnArrival: string | null;
  batch: BatchOption;
};

type FormState = {
  batchId: string;
  fromLocation: string;
  toLocation: string;
  driverName: string;
  vehicleNumber: string;
  dispatchDate: string;
  arrivalDate: string;
  quantitySent: string;
  quantityReceived: string;
  conditionOnArrival: string;
};

function batchLabel(b: BatchOption) {
  const date = b.harvestDate ? format(new Date(b.harvestDate), "MMM d, yyyy") : "Date?";
  return `${b.batchId} · ${b.crop} · ${Number(b.quantity).toFixed(2)} · Harvest ${date} · ${b.farmer.fullName}`;
}

export function MovementsClient({
  initialBatches,
  initialMovements,
}: {
  initialBatches: BatchOption[];
  initialMovements: MovementRow[];
}) {
  const router = useRouter();
  const [movements, setMovements] = useState<MovementRow[]>(initialMovements);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<MovementRow | null>(null);

  const [form, setForm] = useState<FormState>({
    batchId: "",
    fromLocation: "",
    toLocation: "",
    driverName: "",
    vehicleNumber: "",
    dispatchDate: "",
    arrivalDate: "",
    quantitySent: "",
    quantityReceived: "",
    conditionOnArrival: "",
  });

  const batchOptions = useMemo(() => {
    return [...initialBatches].sort((a, b) => b.batchId.localeCompare(a.batchId));
  }, [initialBatches]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return movements;
    return movements.filter((m) => {
      const id = m.batch.batchId.toLowerCase();
      const farmer = m.batch.farmer.fullName.toLowerCase();
      const from = m.fromLocation.toLowerCase();
      const to = m.toLocation.toLowerCase();
      const vehicle = (m.vehicleNumber || "").toLowerCase();
      return id.includes(s) || farmer.includes(s) || from.includes(s) || to.includes(s) || vehicle.includes(s);
    });
  }, [movements, q]);

  const resetForm = () => {
    setForm({
      batchId: "",
      fromLocation: "",
      toLocation: "",
      driverName: "",
      vehicleNumber: "",
      dispatchDate: "",
      arrivalDate: "",
      quantitySent: "",
      quantityReceived: "",
      conditionOnArrival: "",
    });
    setEdit(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (m: MovementRow) => {
    setEdit(m);
    setForm({
      batchId: m.batchId,
      fromLocation: m.fromLocation,
      toLocation: m.toLocation,
      driverName: m.driverName || "",
      vehicleNumber: m.vehicleNumber || "",
      dispatchDate: m.dispatchDate ? m.dispatchDate.slice(0, 10) : "",
      arrivalDate: m.arrivalDate ? m.arrivalDate.slice(0, 10) : "",
      quantitySent: m.quantitySent !== null && m.quantitySent !== undefined ? String(m.quantitySent) : "",
      quantityReceived: m.quantityReceived !== null && m.quantityReceived !== undefined ? String(m.quantityReceived) : "",
      conditionOnArrival: m.conditionOnArrival || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const submit = async () => {
    if (!form.batchId) return toast.error("Select a batch.");
    if (!form.fromLocation.trim()) return toast.error("Enter from location.");
    if (!form.toLocation.trim()) return toast.error("Enter to location.");
    if (!form.dispatchDate) return toast.error("Select dispatch date.");

    setSaving(true);
    try {
      const payload: any = {
        batchId: form.batchId,
        fromLocation: form.fromLocation.trim(),
        toLocation: form.toLocation.trim(),
        driverName: form.driverName.trim() || null,
        vehicleNumber: form.vehicleNumber.trim() || null,
        dispatchDate: new Date(form.dispatchDate).toISOString(),
        arrivalDate: form.arrivalDate ? new Date(form.arrivalDate).toISOString() : null,
        quantitySent: form.quantitySent ? Number(form.quantitySent) : null,
        quantityReceived: form.quantityReceived ? Number(form.quantityReceived) : null,
        conditionOnArrival: form.conditionOnArrival.trim() || null,
      };

      if (edit) delete payload.batchId;

      const res = await apiFetch(edit ? `/api/movements/${edit.id}` : "/api/movements", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save movement.");

      toast.success(edit ? "Movement updated" : "Movement recorded");
      close();
      router.refresh();

      const reload = await apiFetch("/api/movements");
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setMovements(reloadJson.movements || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save movement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: MovementRow) => {
    const ok = confirm("Delete this movement log? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/movements/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setMovements((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Movement Log
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Track dispatch and arrival milestones for each batch (farm → warehouse → port → buyer).
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          New movement
        </Button>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
          <CardDescription className="font-medium">Search by batch ID, farmer, route, or vehicle.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search movement logs..."
              className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((m) => (
          <Card key={m.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    <Link href={`/trace/${m.batch.batchId}`} className="hover:underline">
                      {m.batch.batchId}
                    </Link>
                    <span className="text-slate-400"> · {m.batch.crop}</span>
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">{m.batch.farmer.fullName}</p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    {m.fromLocation} → {m.toLocation} · Dispatched {format(new Date(m.dispatchDate), "MMM d, yyyy")}
                    {m.arrivalDate ? ` · Arrived ${format(new Date(m.arrivalDate), "MMM d, yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => openEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => void remove(m)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {m.vehicleNumber ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-white border-slate-200">
                    Vehicle: {m.vehicleNumber}
                  </Badge>
                ) : null}
                {m.driverName ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    Driver: {m.driverName}
                  </Badge>
                ) : null}
                {m.quantitySent !== null && m.quantitySent !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Sent: {Number(m.quantitySent).toFixed(2)}
                  </Badge>
                ) : null}
                {m.quantityReceived !== null && m.quantityReceived !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    Received: {Number(m.quantityReceived).toFixed(2)}
                  </Badge>
                ) : null}
              </div>
              {m.conditionOnArrival ? (
                <div className="text-xs text-slate-500 font-bold">Condition: {m.conditionOnArrival}</div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[920px] rounded-[2rem] p-0 border-0 shadow-2xl">
          <div className="flex max-h-[85vh] flex-col">
            <div className="p-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">{edit ? "Edit Movement" : "Create Movement"}</DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  Record a logistics movement milestone for a batch.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm((prev) => ({ ...prev, batchId: v }))} disabled={!!edit}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select a batch..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {batchOptions.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="rounded-xl font-medium">
                          {batchLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From *</Label>
                  <Input value={form.fromLocation} onChange={(e) => setForm((p) => ({ ...p, fromLocation: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">To *</Label>
                  <Input value={form.toLocation} onChange={(e) => setForm((p) => ({ ...p, toLocation: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Driver</Label>
                  <Input value={form.driverName} onChange={(e) => setForm((p) => ({ ...p, driverName: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle number</Label>
                  <Input value={form.vehicleNumber} onChange={(e) => setForm((p) => ({ ...p, vehicleNumber: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch date *</Label>
                  <Input type="date" value={form.dispatchDate} onChange={(e) => setForm((p) => ({ ...p, dispatchDate: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Arrival date</Label>
                  <Input type="date" value={form.arrivalDate} onChange={(e) => setForm((p) => ({ ...p, arrivalDate: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity sent</Label>
                  <Input type="number" step="0.01" value={form.quantitySent} onChange={(e) => setForm((p) => ({ ...p, quantitySent: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity received</Label>
                  <Input type="number" step="0.01" value={form.quantityReceived} onChange={(e) => setForm((p) => ({ ...p, quantityReceived: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition on arrival</Label>
                  <Input value={form.conditionOnArrival} onChange={(e) => setForm((p) => ({ ...p, conditionOnArrival: e.target.value }))} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                </div>
              </div>
            </div>

            <div className="p-6 pt-4">
              <DialogFooter>
                <Button variant="outline" onClick={close} className="h-11 rounded-xl font-bold border-slate-200" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void submit()} className="h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : edit ? (
                    "Save changes"
                  ) : (
                    "Create movement"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

