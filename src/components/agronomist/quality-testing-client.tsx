"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldCheck, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

type HarvestOption = {
  id: string;
  harvestDate: string;
  crop: string;
  variety: string | null;
  farmer: { id: string; fullName: string; phone: string | null };
  plot: { id: string; plotName: string | null };
};

type TestRow = {
  id: string;
  harvestId: string;
  dateTested: string;
  moisturePct: string | number | null;
  foreignMatterPct: string | number | null;
  brokenGrainPct: string | number | null;
  colorGrade: string | null;
  pestDamage: string | null;
  aflatoxinTest: string | null;
  passed: boolean;
  testedBy: string | null;
  notes: string | null;
  harvest: HarvestOption;
};

type FormState = {
  harvestId: string;
  dateTested: string;
  moisturePct: string;
  foreignMatterPct: string;
  brokenGrainPct: string;
  colorGrade: string;
  pestDamage: string;
  aflatoxinTest: string;
  passed: boolean;
  testedBy: string;
  notes: string;
};

function harvestLabel(h: HarvestOption) {
  const date = h.harvestDate ? format(new Date(h.harvestDate), "MMM d, yyyy") : "Date?";
  const plot = h.plot?.plotName || "Unnamed plot";
  const variety = h.variety ? ` · ${h.variety}` : "";
  return `${h.farmer.fullName} · ${plot} · ${h.crop}${variety} · Harvest ${date}`;
}

export function QualityTestingClient({
  initialHarvests,
  initialTests,
}: {
  initialHarvests: HarvestOption[];
  initialTests: TestRow[];
}) {
  const router = useRouter();
  const [tests, setTests] = useState<TestRow[]>(initialTests);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<TestRow | null>(null);

  const [form, setForm] = useState<FormState>({
    harvestId: "",
    dateTested: "",
    moisturePct: "",
    foreignMatterPct: "",
    brokenGrainPct: "",
    colorGrade: "",
    pestDamage: "",
    aflatoxinTest: "",
    passed: true,
    testedBy: "",
    notes: "",
  });

  const harvestOptions = useMemo(() => {
    return [...initialHarvests].sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());
  }, [initialHarvests]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tests;
    return tests.filter((t) => {
      const farmer = t.harvest.farmer.fullName.toLowerCase();
      const crop = t.harvest.crop.toLowerCase();
      const plot = (t.harvest.plot?.plotName || "").toLowerCase();
      const status = t.passed ? "passed" : "failed";
      return farmer.includes(s) || crop.includes(s) || plot.includes(s) || status.includes(s);
    });
  }, [tests, q]);

  const resetForm = () => {
    setForm({
      harvestId: "",
      dateTested: "",
      moisturePct: "",
      foreignMatterPct: "",
      brokenGrainPct: "",
      colorGrade: "",
      pestDamage: "",
      aflatoxinTest: "",
      passed: true,
      testedBy: "",
      notes: "",
    });
    setEdit(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: TestRow) => {
    setEdit(t);
    setForm({
      harvestId: t.harvestId,
      dateTested: t.dateTested ? t.dateTested.slice(0, 10) : "",
      moisturePct: t.moisturePct !== null && t.moisturePct !== undefined ? String(t.moisturePct) : "",
      foreignMatterPct: t.foreignMatterPct !== null && t.foreignMatterPct !== undefined ? String(t.foreignMatterPct) : "",
      brokenGrainPct: t.brokenGrainPct !== null && t.brokenGrainPct !== undefined ? String(t.brokenGrainPct) : "",
      colorGrade: t.colorGrade || "",
      pestDamage: t.pestDamage || "",
      aflatoxinTest: t.aflatoxinTest || "",
      passed: t.passed,
      testedBy: t.testedBy || "",
      notes: t.notes || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const submit = async () => {
    if (!form.harvestId) return toast.error("Select a harvest record.");
    if (!form.dateTested) return toast.error("Select test date.");

    setSaving(true);
    try {
      const payload: any = {
        harvestId: form.harvestId,
        dateTested: new Date(form.dateTested).toISOString(),
        moisturePct: form.moisturePct ? Number(form.moisturePct) : null,
        foreignMatterPct: form.foreignMatterPct ? Number(form.foreignMatterPct) : null,
        brokenGrainPct: form.brokenGrainPct ? Number(form.brokenGrainPct) : null,
        colorGrade: form.colorGrade.trim() || null,
        pestDamage: form.pestDamage.trim() || null,
        aflatoxinTest: form.aflatoxinTest.trim() || null,
        passed: form.passed,
        testedBy: form.testedBy.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (edit) delete payload.harvestId;

      const res = await apiFetch(edit ? `/api/quality-tests/${edit.id}` : "/api/quality-tests", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save quality test.");

      toast.success(edit ? "Quality test updated" : "Quality test recorded");
      close();
      router.refresh();

      const reload = await apiFetch("/api/quality-tests");
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setTests(reloadJson.tests || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save quality test.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: TestRow) => {
    const ok = confirm("Delete this quality test? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/quality-tests/${t.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setTests((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Quality Testing
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Record quality checks per harvest (moisture, foreign matter, broken grain, aflatoxin, pass/fail).
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          New test
        </Button>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
          <CardDescription className="font-medium">Search by farmer, crop, plot, or status.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search quality tests..."
              className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((t) => (
          <Card key={t.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    {t.passed ? <span className="text-emerald-600">Passed</span> : <span className="text-rose-600">Failed</span>}
                    <span className="text-slate-400"> · {format(new Date(t.dateTested), "MMM d, yyyy")}</span>
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">
                    <Link href={`/agronomist/farmers/${t.harvest.farmer.id}`} className="hover:underline">
                      {t.harvest.farmer.fullName}
                    </Link>
                    {t.harvest.farmer.phone ? ` (${t.harvest.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Harvest: {t.harvest.crop}{t.harvest.variety ? ` (${t.harvest.variety})` : ""} · Plot:{" "}
                    {t.harvest.plot?.plotName || "Unnamed"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => void remove(t)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {t.moisturePct !== null && t.moisturePct !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    Moisture: {Number(t.moisturePct).toFixed(1)}%
                  </Badge>
                ) : null}
                {t.foreignMatterPct !== null && t.foreignMatterPct !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    FM: {Number(t.foreignMatterPct).toFixed(1)}%
                  </Badge>
                ) : null}
                {t.brokenGrainPct !== null && t.brokenGrainPct !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    Broken: {Number(t.brokenGrainPct).toFixed(1)}%
                  </Badge>
                ) : null}
                {t.aflatoxinTest ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-amber-50 border-amber-100 text-amber-700">
                    Aflatoxin: {t.aflatoxinTest}
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-slate-500 font-bold space-y-1">
                {t.colorGrade ? <div>Color grade: {t.colorGrade}</div> : null}
                {t.pestDamage ? <div>Pest damage: {t.pestDamage}</div> : null}
                {t.testedBy ? <div>Tested by: {t.testedBy}</div> : null}
                {t.notes ? <div>Notes: {t.notes}</div> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[980px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 sm:p-8 sm:pb-6 bg-slate-50/50 border-b border-slate-100">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {edit ? "Edit Quality Test" : "Create Quality Test"}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                Attach a quality test to a specific harvest record.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Harvest *</Label>
                  <Select value={form.harvestId} onValueChange={(v) => setForm((prev) => ({ ...prev, harvestId: v }))} disabled={!!edit}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select a harvest record..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {harvestOptions.map((h) => (
                        <SelectItem key={h.id} value={h.id} className="rounded-xl font-medium">
                          {harvestLabel(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Date tested *</Label>
                  <Input
                    type="date"
                    value={form.dateTested}
                    onChange={(e) => setForm((prev) => ({ ...prev, dateTested: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Passed</Label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 h-12">
                    <Checkbox checked={form.passed} onCheckedChange={(v) => setForm((prev) => ({ ...prev, passed: v === true }))} />
                    <span className="text-sm font-bold text-slate-800">{form.passed ? "Passed" : "Failed"}</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Moisture (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.moisturePct}
                    onChange={(e) => setForm((prev) => ({ ...prev, moisturePct: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Foreign matter (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.foreignMatterPct}
                    onChange={(e) => setForm((prev) => ({ ...prev, foreignMatterPct: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Broken grain (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.brokenGrainPct}
                    onChange={(e) => setForm((prev) => ({ ...prev, brokenGrainPct: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Color grade</Label>
                  <Input
                    value={form.colorGrade}
                    onChange={(e) => setForm((prev) => ({ ...prev, colorGrade: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Pest damage</Label>
                  <Input
                    value={form.pestDamage}
                    onChange={(e) => setForm((prev) => ({ ...prev, pestDamage: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Aflatoxin test</Label>
                  <Input
                    value={form.aflatoxinTest}
                    onChange={(e) => setForm((prev) => ({ ...prev, aflatoxinTest: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="e.g., Negative / 12 ppb"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Tested by</Label>
                  <Input
                    value={form.testedBy}
                    onChange={(e) => setForm((prev) => ({ ...prev, testedBy: e.target.value }))}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="rounded-2xl bg-slate-50 border-slate-200 font-bold p-4 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={close} 
                className="h-12 rounded-2xl font-black border-slate-200 w-full sm:w-auto order-2 sm:order-1" 
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void submit()}
                className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 w-full sm:w-auto order-1 sm:order-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : edit ? (
                  "Save Changes"
                ) : (
                  "Create Test"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

