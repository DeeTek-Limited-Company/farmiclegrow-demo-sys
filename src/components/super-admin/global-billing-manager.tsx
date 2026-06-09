"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, DollarSign, TrendingUp, Wallet, MoreHorizontal, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BillingPlan = {
  key: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  usersLimit: number;
  farmersLimit: number;
  batchesLimit: number;
  isActive: boolean;
};

interface BillingEntry {
  id: string;
  name: string;
  slug: string;
  orgStatus: string;
  plan: string;
  status: string;
  createdAt: string;
  price: { amountCents: number; currency: string } | null;
  interval: string | null;
  usage: {
    users: { current: number, limit: number };
    farmers: { current: number, limit: number };
    batches: { current: number, limit: number };
  };
}

type PageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
};

type BillingResponse = {
  plans: BillingPlan[];
  billing: { edges: BillingEntry[]; pageInfo: PageInfo };
  metrics: {
    projectedMRR: { amountCents: number; currency: string };
    projectedRevenue: { amountCents: number; currency: string };
    activePayingOrgs: number;
  };
};

function formatMoney(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function GlobalBillingManager() {
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [data, setData] = useState<BillingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasMore: false, nextCursor: null });
  const [metrics, setMetrics] = useState<BillingResponse["metrics"] | null>(null);

  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editingOrg, setEditingOrg] = useState<BillingEntry | null>(null);
  const [editPlan, setEditPlan] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);

  const fetchData = async ({ cursor, append }: { cursor?: string | null; append: boolean }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "25");
      if (cursor) params.set("cursor", cursor);
      if (q.trim()) params.set("q", q.trim());
      if (planFilter !== "all") params.set("plan", planFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await apiFetch(`/api/super-admin/billing?${params.toString()}`);
      const json = (await res.json().catch(() => null)) as BillingResponse | null;
      if (!res.ok || !json) {
        toast.error(json && "message" in json ? (json as any).message : "Failed to load billing.");
        return;
      }

      setPlans(json.plans);
      setMetrics(json.metrics);
      setPageInfo(json.billing.pageInfo);
      setData((prev) => (append ? [...prev, ...json.billing.edges] : json.billing.edges));
    } catch {
      toast.error("Failed to load billing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ append: false });
  }, [q, planFilter, statusFilter]);

  const attention = useMemo(() => {
    const overLimit = data.filter((d) => {
      const usersOver = d.usage.users.limit > 0 && d.usage.users.current > d.usage.users.limit;
      const farmersOver = d.usage.farmers.limit > 0 && d.usage.farmers.current > d.usage.farmers.limit;
      const batchesOver = d.usage.batches.limit > 0 && d.usage.batches.current > d.usage.batches.limit;
      return usersOver || farmersOver || batchesOver;
    }).length;

    const paymentIssues = data.filter((d) => ["PAST_DUE", "CANCELED"].includes(d.status)).length;
    return { overLimit, paymentIssues };
  }, [data]);

  const getUsageColor = (current: number, limit: number) => {
    if (limit <= 0) return "bg-slate-300";
    const ratio = current / limit;
    if (ratio > 0.9) return "bg-rose-500";
    if (ratio > 0.7) return "bg-amber-500";
    return "bg-emerald-500";
  };

  async function saveOrgChanges() {
    if (!editingOrg) return;
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${editingOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionPlan: editPlan,
          subscriptionStatus: editStatus,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.message ?? "Failed to update subscription.");
        return;
      }

      toast.success("Subscription updated.");
      setEditingOrg(null);
      router.refresh();
      fetchData({ append: false });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Subscription Intelligence
          </CardTitle>
          <CardDescription className="font-medium text-xs">
            Plans, subscription status, and usage pressure across tenant organizations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projected Revenue</p>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {metrics ? formatMoney(metrics.projectedRevenue.amountCents, metrics.projectedRevenue.currency) : "—"}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Current cycle</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projected MRR</p>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {metrics ? formatMoney(metrics.projectedMRR.amountCents, metrics.projectedMRR.currency) : "—"}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Monthly</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Paying Orgs</p>
              <div className="text-2xl font-black text-slate-900 mt-2">{metrics ? metrics.activePayingOrgs : "—"}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Subscription ACTIVE</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requires Attention</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-black text-slate-900">{attention.overLimit}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">over limit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-black text-slate-900">{attention.paymentIssues}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">past due/canceled</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-right w-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
                <h3 className="text-3xl font-black text-slate-900">
                  {metrics ? formatMoney(metrics.projectedRevenue.amountCents, metrics.projectedRevenue.currency) : "—"}
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Current Billing Cycle</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Plans</p>
                <h3 className="text-3xl font-black text-slate-900">{activePlans.length}</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-xs font-bold uppercase tracking-tight">Across all organizations</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform MRR</p>
                <h3 className="text-3xl font-black text-slate-900">
                  {metrics ? formatMoney(metrics.projectedMRR.amountCents, metrics.projectedMRR.currency) : "—"}
                </h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-tight">Projected this month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Subscription & Usage Monitoring
          </CardTitle>
          <CardDescription className="font-medium text-xs">Real-time tracking of organization plans and resource consumption.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by org name or slug" />
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {activePlans.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="TRIAL">TRIAL</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="PAST_DUE">PAST_DUE</SelectItem>
                <SelectItem value="CANCELED">CANCELED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Plan</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Resource Usage</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{entry.name}</span>
                        <code className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{entry.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-[9px] font-black bg-slate-100 text-slate-600 border-slate-200">
                          {entry.plan}
                        </Badge>
                        {entry.price && entry.interval ? (
                          <span className="text-[10px] font-bold text-slate-400">
                            {formatMoney(entry.price.amountCents, entry.price.currency)}/{entry.interval}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={entry.status === "ACTIVE" || entry.status === "TRIAL"
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[9px]" 
                          : "border-rose-200 text-rose-700 bg-rose-50/30 rounded-lg font-black text-[9px]"}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-3 w-[300px]">
                        {/* Users Usage */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500 uppercase">Users</span>
                            <span className="text-slate-900">{entry.usage.users.current} / {entry.usage.users.limit}</span>
                          </div>
                          <Progress 
                            value={entry.usage.users.limit > 0 ? (entry.usage.users.current / entry.usage.users.limit) * 100 : 0} 
                            className={`h-1 rounded-full ${getUsageColor(entry.usage.users.current, entry.usage.users.limit)}`} 
                          />
                        </div>
                        {/* Farmers Usage */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500 uppercase">Farmers</span>
                            <span className="text-slate-900">{entry.usage.farmers.current} / {entry.usage.farmers.limit}</span>
                          </div>
                          <Progress 
                            value={entry.usage.farmers.limit > 0 ? (entry.usage.farmers.current / entry.usage.farmers.limit) * 100 : 0} 
                            className={`h-1 rounded-full ${getUsageColor(entry.usage.farmers.current, entry.usage.farmers.limit)}`} 
                          />
                        </div>
                        {/* Batches Usage */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500 uppercase">Batches</span>
                            <span className="text-slate-900">{entry.usage.batches.current} / {entry.usage.batches.limit}</span>
                          </div>
                          <Progress 
                            value={entry.usage.batches.limit > 0 ? (entry.usage.batches.current / entry.usage.batches.limit) * 100 : 0} 
                            className={`h-1 rounded-full ${getUsageColor(entry.usage.batches.current, entry.usage.batches.limit)}`} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/super-admin/billing/${entry.id}`)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View billing
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingOrg(entry);
                              setEditPlan(entry.plan);
                              setEditStatus(entry.status);
                            }}
                          >
                            Edit subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">
                      No billing data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardContent className="p-6 pt-4 flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500">
            Showing {data.length} organizations
          </div>
          <Button
            variant="outline"
            className="rounded-xl font-bold"
            disabled={isLoading || !pageInfo.hasMore}
            onClick={() => fetchData({ cursor: pageInfo.nextCursor, append: true })}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load more"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit subscription</DialogTitle>
            <DialogDescription>
              Update the billing plan and subscription status for {editingOrg?.name ?? "this organization"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Plan</div>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">Subscription status</div>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">TRIAL</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="PAST_DUE">PAST_DUE</SelectItem>
                  <SelectItem value="CANCELED">CANCELED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrg(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={saveOrgChanges} disabled={isSaving} className="rounded-xl font-black">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
