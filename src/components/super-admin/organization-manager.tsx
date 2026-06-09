"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCcw, Building2, Users, Wheat, Package, History, ShieldCheck, Mail, Calendar, Eye, Trash2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformAuditLogs } from "./platform-audit-logs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export type SuperAdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL" | "EXPIRED";
  subscriptionPlan: string;
  publicTraceEnabled: boolean;
  createdAt: string;
  _count: {
    users: number;
    farmers: number;
    batches: number;
  };
};

export interface PlatformStats {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
  };
  users: {
    total: number;
    agronomists: number;
    farmers: number;
  };
  production: {
    totalRecords: number;
    totalHarvest: number;
  };
  traceability: {
    totalBatches: number;
    qrScans: number;
  };
  security: {
    failedLogins: number;
  };
}

interface TenantAdmin {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export function OrganizationManager({ 
  initialOrganizations, 
  platformStats 
}: { 
  initialOrganizations: SuperAdminOrganizationRow[];
  platformStats: PlatformStats;
}) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<SuperAdminOrganizationRow[]>(initialOrganizations);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgCountry, setOrgCountry] = useState("");
  const [orgPlan, setOrgPlan] = useState("STARTER");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Tenant Admin Management
  const [isViewAdminsOpen, setIsViewAdminsOpen] = useState(false);
  const [viewingOrgAdmins, setViewingOrgAdmins] = useState<TenantAdmin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [activeViewOrg, setActiveViewOrg] = useState<SuperAdminOrganizationRow | null>(null);

  // Deletion Management
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<SuperAdminOrganizationRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewAdmins = async (org: SuperAdminOrganizationRow) => {
    setActiveViewOrg(org);
    setIsViewAdminsOpen(true);
    setIsLoadingAdmins(true);
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${org.id}/admins`);
      const data = await res.json();
      if (res.ok) {
        setViewingOrgAdmins(data.admins);
      }
    } catch (e) {
      toast.error("Failed to fetch admins");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const confirmDelete = (org: SuperAdminOrganizationRow) => {
    setOrgToDelete(org);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${orgToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete organization.");
      
      toast.success("Organization deleted.");
      setIsDeleteDialogOpen(false);
      setOrgToDelete(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch("/api/super-admin/organizations");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to refresh organizations.");
      setOrganizations(data.organizations ?? []);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh organizations.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingOrg(true);
    try {
      const res = await apiFetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: orgName, 
          slug: orgSlug,
          email: orgEmail,
          phone: orgPhone,
          country: orgCountry,
          subscriptionPlan: orgPlan,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to create organization.");
      toast.success("Organization created.");
      setOrgName("");
      setOrgSlug("");
      setOrgEmail("");
      setOrgPhone("");
      setOrgCountry("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create organization.");
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const toggleStatus = async (orgId: string, nextStatus: "ACTIVE" | "SUSPENDED") => {
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update organization.");
      toast.success("Organization updated.");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update organization.");
    }
  };

  const changePlan = async (orgId: string, plan: string) => {
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan: plan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update plan.");
      toast.success("Subscription plan updated.");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan.");
    }
  };

  const createTenantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      toast.error("Select an organization.");
      return;
    }
    setIsCreatingAdmin(true);
    try {
      const res = await apiFetch(`/api/super-admin/organizations/${selectedOrgId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: adminName,
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMsg = data?.message || "Failed to create admin user.";
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      toast.success(`Admin created! Log in at: /org/${selectedOrg?.slug}`, {
        duration: 10000,
      });
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create admin user.");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Platform Control</h1>
          <p className="text-slate-500 mt-1 font-medium">Global management for FarmicleGrow Enterprise.</p>
        </div>
        <Button onClick={refresh} variant="outline" className="rounded-xl font-bold h-12 shadow-sm bg-white" disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          Refresh Global State
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-blue-50">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizations</p>
                <h3 className="text-2xl font-black text-slate-900">{platformStats.organizations.total}</h3>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-100 text-emerald-600 bg-emerald-50/50">{platformStats.organizations.active} Active</Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-100 text-amber-600 bg-amber-50/50">{platformStats.organizations.suspended} Suspended</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-emerald-50">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Users</p>
                <h3 className="text-2xl font-black text-slate-900">{platformStats.users.total}</h3>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-bold text-slate-500">{platformStats.users.agronomists} Agros</span>
              <span className="text-[10px] font-bold text-slate-500">{platformStats.users.farmers} Farmers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-amber-50">
                <Wheat className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Production</p>
                <h3 className="text-2xl font-black text-slate-900">{platformStats.production.totalHarvest.toFixed(1)}T</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{platformStats.production.totalRecords} Cycles tracked</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-purple-50">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Traceability</p>
                <h3 className="text-2xl font-black text-slate-900">{platformStats.traceability.totalBatches}</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{platformStats.traceability.qrScans} QR Scans</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-rose-50">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security</p>
                <h3 className="text-2xl font-black text-slate-900">{platformStats.security.failedLogins}</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">Failed login attempts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          <TabsTrigger value="organizations" className="rounded-xl font-bold px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="w-4 h-4 mr-2" />
            Platform Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Create Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form className="space-y-4" onSubmit={createOrg}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Organization Name</Label>
                      <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Farms" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Slug</Label>
                      <Input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="acme-farms" className="rounded-xl font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Country</Label>
                      <Input value={orgCountry} onChange={(e) => setOrgCountry(e.target.value)} placeholder="Ghana" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Email</Label>
                      <Input value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="contact@acme.com" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Phone</Label>
                      <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+233..." className="rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Subscription Plan</Label>
                      <Select value={orgPlan} onValueChange={setOrgPlan}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="STARTER">Starter (Trial)</SelectItem>
                          <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                          <SelectItem value="GOVERNMENT">Government</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={isCreatingOrg}>
                    {isCreatingOrg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Organization
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Provision Tenant Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form className="space-y-4" onSubmit={createTenantAdmin}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Organization</Label>
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select target organization" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id} className="font-medium">
                              {org.name} ({org.slug})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Full Name</Label>
                      <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Email</Label>
                      <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@acme.com" className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Temporary Password</Label>
                    <Input
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      className="rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={isCreatingAdmin}>
                    {isCreatingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Admin User
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xl font-black">Registered Organizations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Name</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Slug</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Plan</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Stats</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{org.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Joined {format(new Date(org.createdAt), "MMM yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-tighter">
                          {org.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Select value={org.subscriptionPlan} onValueChange={(val) => changePlan(org.id, val)}>
                          <SelectTrigger className="h-7 w-[120px] text-[10px] font-black rounded-lg border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="STARTER" className="text-[10px] font-bold">STARTER</SelectItem>
                            <SelectItem value="PROFESSIONAL" className="text-[10px] font-bold">PROFESSIONAL</SelectItem>
                            <SelectItem value="ENTERPRISE" className="text-[10px] font-bold">ENTERPRISE</SelectItem>
                            <SelectItem value="GOVERNMENT" className="text-[10px] font-bold">GOVERNMENT</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={org.status === "ACTIVE" 
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[10px]" 
                            : "border-amber-200 text-amber-700 bg-amber-50/30 rounded-lg font-black text-[10px]"}
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1" title="Users"><Users className="w-3 h-3" /> {org._count.users}</span>
                          <span className="flex items-center gap-1" title="Farmers"><Wheat className="w-3 h-3" /> {org._count.farmers}</span>
                          <span className="flex items-center gap-1" title="Batches"><Package className="w-3 h-3" /> {org._count.batches}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 text-primary"
                          onClick={() => handleViewAdmins(org)}
                          title="View Admins"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </Button>
                        
                        {org.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-amber-50 text-amber-600"
                            onClick={() => toggleStatus(org.id, "SUSPENDED")}
                            title="Suspend Organization"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            onClick={() => toggleStatus(org.id, "ACTIVE")}
                            title="Activate Organization"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 text-rose-600"
                          onClick={() => confirmDelete(org)}
                          title="Delete Organization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">
                        No organizations found in the system.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PlatformAuditLogs />
        </TabsContent>
      </Tabs>

      {/* View Admins Dialog */}
      <Dialog open={isViewAdminsOpen} onOpenChange={setIsViewAdminsOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Tenant Admins: {activeViewOrg?.name}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Managing users with the 'admin' role for this organization.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {isLoadingAdmins ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {viewingOrgAdmins.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold italic">No admins provisioned for this tenant.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {viewingOrgAdmins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                            {admin.fullName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{admin.fullName}</span>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {admin.email}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(admin.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={admin.isActive 
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[10px]" 
                            : "border-rose-200 text-rose-700 bg-rose-50/30 rounded-lg font-black text-[10px]"}
                        >
                          {admin.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 text-rose-600">
              <Trash2 className="w-6 h-6" />
              Archive Organization?
            </DialogTitle>
            <DialogDescription className="font-medium pt-2">
              You are about to delete <span className="font-bold text-slate-900">{orgToDelete?.name}</span>. 
              This action is only possible if the organization has no farmers or production batches.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold leading-relaxed">
              Archiving will permanently remove the organization and all its users. 
              If the organization has active field data, deletion will be blocked by the server.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl font-black shadow-lg shadow-rose-200"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
