"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PlusCircle, Pencil, Archive } from "lucide-react";

type BillingPlan = {
  id: string;
  key: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: "month" | "year" | string;
  usersLimit: number;
  farmersLimit: number;
  batchesLimit: number;
  isActive: boolean;
  createdAt: string;
};

function formatMoney(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toInt(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export function BillingPlanManager() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<BillingPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [usersLimit, setUsersLimit] = useState("0");
  const [farmersLimit, setFarmersLimit] = useState("0");
  const [batchesLimit, setBatchesLimit] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);

  function resetForm() {
    setKey("");
    setName("");
    setPrice("0");
    setCurrency("USD");
    setInterval("month");
    setUsersLimit("0");
    setFarmersLimit("0");
    setBatchesLimit("0");
    setIsActive(true);
  }

  function fillForm(plan: BillingPlan) {
    setKey(plan.key);
    setName(plan.name);
    setPrice(String(plan.priceCents / 100));
    setCurrency(plan.currency);
    setInterval(plan.interval === "year" ? "year" : "month");
    setUsersLimit(String(plan.usersLimit));
    setFarmersLimit(String(plan.farmersLimit));
    setBatchesLimit(String(plan.batchesLimit));
    setIsActive(plan.isActive);
  }

  async function loadPlans() {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/super-admin/billing/plans");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to load plans.");
        return;
      }
      setPlans(body?.plans ?? []);
    } catch {
      toast.error("Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function createPlan() {
    setIsSaving(true);
    try {
      const priceCents = Math.max(0, Math.trunc(Number(price) * 100));
      const res = await apiFetch("/api/super-admin/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          name: name.trim(),
          priceCents,
          currency: currency.trim().toUpperCase(),
          interval,
          usersLimit: toInt(usersLimit),
          farmersLimit: toInt(farmersLimit),
          batchesLimit: toInt(batchesLimit),
          isActive,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to create plan.");
        return;
      }

      toast.success("Plan created.");
      setIsCreateOpen(false);
      resetForm();
      await loadPlans();
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePlan() {
    if (!editing) return;
    setIsSaving(true);
    try {
      const priceCents = Math.max(0, Math.trunc(Number(price) * 100));
      const res = await apiFetch(`/api/super-admin/billing/plans/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          priceCents,
          currency: currency.trim().toUpperCase(),
          interval,
          usersLimit: toInt(usersLimit),
          farmersLimit: toInt(farmersLimit),
          batchesLimit: toInt(batchesLimit),
          isActive,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to update plan.");
        return;
      }

      toast.success("Plan updated.");
      setIsEditOpen(false);
      setEditing(null);
      resetForm();
      await loadPlans();
    } finally {
      setIsSaving(false);
    }
  }

  async function archivePlan(plan: BillingPlan) {
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/super-admin/billing/plans/${plan.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to archive plan.");
        return;
      }
      toast.success("Plan archived.");
      await loadPlans();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 mt-1 font-medium">Define and manage the pricing tiers for tenant organizations.</p>
        </div>
        <Button
          className="rounded-2xl font-black gap-2"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
        >
          <PlusCircle className="w-4 h-4" />
          Create New Plan
        </Button>
      </div>

      {isLoading ? (
        <Card className="rounded-[2.5rem] border-primary/5 shadow-sm overflow-hidden">
          <CardContent className="p-10 text-sm font-medium text-slate-500">Loading plans…</CardContent>
        </Card>
      ) : activePlans.length === 0 ? (
        <Card className="rounded-[2.5rem] border-primary/5 shadow-sm overflow-hidden">
          <CardContent className="p-10 space-y-3">
            <div className="text-lg font-black text-slate-900">No plans found</div>
            <div className="text-sm font-medium text-slate-500">
              Create your first plan to enable limit enforcement and subscription tracking.
            </div>
            <div>
              <Button
                className="rounded-xl font-black gap-2"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
              >
                <PlusCircle className="w-4 h-4" />
                Create plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activePlans.map((plan) => (
            <Card key={plan.id} className="rounded-[2.5rem] border-primary/5 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="bg-slate-50/50 pb-8">
                <CardTitle className="text-xl font-black text-slate-900">{plan.name}</CardTitle>
                <CardDescription className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                  {plan.key}
                </CardDescription>
                <div className="text-3xl font-black text-primary mt-2">
                  {plan.priceCents === 0 ? "Custom" : `${formatMoney(plan.priceCents, plan.currency)}/${plan.interval}`}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-8 space-y-4">
                <ul className="space-y-3">
                  {[
                    `Users: ${plan.usersLimit}`,
                    `Farmers: ${plan.farmersLimit}`,
                    `Batches: ${plan.batchesLimit}`,
                  ].map((f) => (
                    <li key={f} className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0 flex gap-2">
                <Button
                  variant="outline"
                  className="w-full rounded-xl font-bold gap-2"
                  onClick={() => {
                    setEditing(plan);
                    fillForm(plan);
                    setIsEditOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl font-bold px-3"
                  disabled={isSaving}
                  onClick={() => archivePlan(plan)}
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create plan</DialogTitle>
            <DialogDescription>Plans define limits and pricing shown in the billing dashboard.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Key</div>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="PROFESSIONAL" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Professional" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Price</div>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Currency</div>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Interval</div>
              <Select value={interval} onValueChange={(v) => setInterval(v as "month" | "year")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Active</div>
              <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
                <SelectTrigger>
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Users limit</div>
              <Input value={usersLimit} onChange={(e) => setUsersLimit(e.target.value)} placeholder="20" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Farmers limit</div>
              <Input value={farmersLimit} onChange={(e) => setFarmersLimit(e.target.value)} placeholder="1000" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Batches limit</div>
              <Input value={batchesLimit} onChange={(e) => setBatchesLimit(e.target.value)} placeholder="500" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl font-black" disabled={isSaving} onClick={createPlan}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
            <DialogDescription>{editing ? `Editing ${editing.key}` : "Update plan settings."}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-bold text-slate-900">Key</div>
              <Input value={key} disabled />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Price</div>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Currency</div>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Interval</div>
              <Select value={interval} onValueChange={(v) => setInterval(v as "month" | "year")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Active</div>
              <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
                <SelectTrigger>
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Users limit</div>
              <Input value={usersLimit} onChange={(e) => setUsersLimit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Farmers limit</div>
              <Input value={farmersLimit} onChange={(e) => setFarmersLimit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Batches limit</div>
              <Input value={batchesLimit} onChange={(e) => setBatchesLimit(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl font-black" disabled={isSaving} onClick={updatePlan}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

