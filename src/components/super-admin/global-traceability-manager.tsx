"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Search, Package, Building2, User, Calendar, ExternalLink, QrCode, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { buildOrgTraceUrl } from "@/lib/trace/urls";

interface Batch {
  id: string;
  batchId: string;
  cropType: string;
  grade: string;
  quantityKg: number;
  status: string;
  createdAt: string;
  publicTraceVisibility: string;
  organization: { name: string; slug: string };
  farmer: { fullName: string };
}

interface GlobalTraceabilityManagerProps {
  organizations: Array<{ id: string, name: string }>;
}

export function GlobalTraceabilityManager({ organizations }: GlobalTraceabilityManagerProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, rejected: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      let url = "/api/super-admin/batches";
      const params = new URLSearchParams();
      if (orgFilter !== "all") params.append("orgId", orgFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (res.ok) {
        setBatches(data.batches);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch batches", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [orgFilter, statusFilter]);

  const filteredBatches = batches.filter(batch => 
    batch.batchId.toLowerCase().includes(search.toLowerCase()) ||
    batch.cropType.toLowerCase().includes(search.toLowerCase()) ||
    batch.farmer.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">Total Batches</p>
            <h3 className="text-2xl font-black text-blue-900">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Active</p>
            <h3 className="text-2xl font-black text-emerald-900">{stats.active}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600/60">Completed</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.completed}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-rose-50/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600/60">Rejected</p>
            <h3 className="text-2xl font-black text-rose-900">{stats.rejected}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by Batch ID, Crop, or Farmer..." 
            className="pl-10 rounded-xl border-slate-200 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-[200px] rounded-xl border-slate-200 h-11 font-bold text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <SelectValue placeholder="All Organizations" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-bold text-xs">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="font-bold text-xs">{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] rounded-xl border-slate-200 h-11 font-bold text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-bold text-xs">All Status</SelectItem>
              <SelectItem value="ACTIVE" className="font-bold text-xs">Active</SelectItem>
              <SelectItem value="COMPLETED" className="font-bold text-xs">Completed</SelectItem>
              <SelectItem value="REJECTED" className="font-bold text-xs">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Global Batch Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Batch Details</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Farmer</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Traceability</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 font-mono tracking-tighter">{batch.batchId}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{batch.cropType}</span>
                          <span className="text-[10px] font-black text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-slate-500">GRADE {batch.grade}</span>
                          <span className="text-[10px] font-black text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-slate-500">{batch.quantityKg} KG</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{batch.organization.name}</span>
                        <code className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {batch.organization.slug}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        {batch.farmer.fullName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          batch.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[9px]" :
                          batch.status === "COMPLETED" ? "border-blue-200 text-blue-700 bg-blue-50/30 rounded-lg font-black text-[9px]" :
                          "border-rose-200 text-rose-700 bg-rose-50/30 rounded-lg font-black text-[9px]"
                        }
                      >
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-black bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          {batch.publicTraceVisibility}
                        </Badge>
                        <Link 
                          href={buildOrgTraceUrl({
                            orgSlug: batch.organization.slug,
                            batchId: batch.batchId,
                            configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
                            nodeEnv: process.env.NODE_ENV,
                            windowOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
                          })} 
                          target="_blank"
                          className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(batch.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-slate-400 italic font-medium">
                      No batches found matching the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
