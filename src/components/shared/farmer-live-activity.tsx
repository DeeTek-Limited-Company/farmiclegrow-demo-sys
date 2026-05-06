"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LiveFarmer = {
  id: string;
  fullName: string;
  productionRecords?: Array<{ id: string; status: string; season: string; cropType: string; createdAt: string }>;
  plantingActivities?: Array<{ id: string; plantingDate: string; cropType: string; productionRecordId?: string | null }>;
  fieldActivities?: Array<{ id: string; activityDate: string; activityType: string; productionRecordId?: string | null }>;
  inputTraceabilities?: Array<{ id: string; inputCategory: string; productName: string; applicationDate: string | null; createdAt: string }>;
  harvestRecords?: Array<{ id: string; harvestDate: string; crop: string; productionRecordId?: string | null }>;
};

export function FarmerLiveActivity({ farmerId }: { farmerId: string }) {
  const [farmer, setFarmer] = useState<LiveFarmer | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setStatus((prev) => (prev === "idle" ? "loading" : prev));
      try {
        const res = await apiFetch(`/api/farmers/${encodeURIComponent(farmerId)}?includeTimeline=1`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.message || "Failed to load activity.");
        }
        if (cancelled) return;
        setFarmer(json.farmer || null);
        setLastSyncedAt(Date.now());
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void refresh();
    const interval = setInterval(() => void refresh(), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [farmerId]);

  const recent = useMemo(() => {
    if (!farmer) return [];
    const items: Array<{ id: string; at: string; label: string }> = [];

    for (const pr of farmer.productionRecords || []) {
      items.push({ id: `pr:${pr.id}`, at: pr.createdAt, label: `Cycle · ${pr.cropType} · ${pr.season} · ${pr.status}` });
    }
    for (const a of farmer.plantingActivities || []) {
      items.push({ id: `pl:${a.id}`, at: a.plantingDate, label: `Planting · ${a.cropType}` });
    }
    for (const a of farmer.fieldActivities || []) {
      items.push({ id: `fa:${a.id}`, at: a.activityDate, label: `Field · ${a.activityType}` });
    }
    for (const i of farmer.inputTraceabilities || []) {
      items.push({ id: `in:${i.id}`, at: i.applicationDate || i.createdAt, label: `Input · ${i.inputCategory} · ${i.productName}` });
    }
    for (const h of farmer.harvestRecords || []) {
      items.push({ id: `ha:${h.id}`, at: h.harvestDate, label: `Harvest · ${h.crop}` });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 12);
  }, [farmer]);

  const primaryStatus = farmer?.productionRecords?.[0]?.status || null;

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black tracking-tight">Live activity</CardTitle>
            <CardDescription className="font-medium">
              Auto-refreshes every 10s
              {lastSyncedAt ? ` · last synced ${format(new Date(lastSyncedAt), "HH:mm:ss")}` : ""}
            </CardDescription>
          </div>
          {primaryStatus ? (
            <Badge variant="outline" className="rounded-full font-black text-[10px] px-3 py-1 border-slate-200 text-slate-700">
              {primaryStatus}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {status === "error" ? (
          <div className="text-sm font-medium text-slate-500">Unable to load live activity.</div>
        ) : recent.length === 0 ? (
          <div className="text-sm font-medium text-slate-500">No recent activity yet.</div>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                <div className="text-sm font-bold text-slate-800">{item.label}</div>
                <div className="text-xs font-bold text-slate-500">{format(new Date(item.at), "MMM d, HH:mm")}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

