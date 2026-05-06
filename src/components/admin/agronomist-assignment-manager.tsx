"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AgronomistRow = {
  id: string;
  fullName: string;
  email: string;
};

type DistrictRow = {
  id: string;
  name: string;
  region: { name: string };
};

export function AgronomistAssignmentManager({
  agronomists,
  districts,
}: {
  agronomists: AgronomistRow[];
  districts: DistrictRow[];
}) {
  const router = useRouter();

  const districtOptions = useMemo(() => {
    return [...districts].sort((a, b) => {
      const r = a.region.name.localeCompare(b.region.name);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
  }, [districts]);

  const [openAgronomist, setOpenAgronomist] = useState<AgronomistRow | null>(null);
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = async (agronomist: AgronomistRow) => {
    setOpenAgronomist(agronomist);
    setLoadingAssignments(true);
    try {
      const res = await apiFetch(`/api/users/${agronomist.id}/districts`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load assignments");
      setDistrictIds(json.districtIds || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load assignments");
      setDistrictIds([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const close = () => {
    setOpenAgronomist(null);
    setDistrictIds([]);
    setLoadingAssignments(false);
    setSaving(false);
  };

  const toggleDistrict = (id: string, checked: boolean) => {
    setDistrictIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const save = async () => {
    if (!openAgronomist) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${openAgronomist.id}/districts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to save assignments");
      toast.success("District assignments updated");
      close();
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agronomists.map((a) => (
          <Card key={a.id} className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">{a.fullName}</CardTitle>
              <p className="text-xs text-muted-foreground font-bold">{a.email}</p>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                District assignment
              </div>
              <Button className="rounded-xl font-bold" onClick={() => void open(a)}>
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!openAgronomist} onOpenChange={(v) => !v && close()}>
        <DialogContent className="sm:max-w-[560px] rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Assign Districts</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              {openAgronomist ? `${openAgronomist.fullName} can only onboard and view farmers within these districts.` : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingAssignments ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading assignments...
            </div>
          ) : (
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {districtOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground font-medium">No districts created yet.</p>
              ) : null}
              {districtOptions.map((d) => {
                const checked = districtIds.includes(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2 bg-white border border-slate-100">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleDistrict(d.id, v === true)} />
                    <span className="text-sm font-bold text-slate-800">
                      {d.region.name} · {d.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="h-11 rounded-xl font-bold border-slate-200"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
              disabled={saving || loadingAssignments}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

