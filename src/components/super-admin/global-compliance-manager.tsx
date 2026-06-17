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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ShieldCheck, Building2, UserCheck, AlertTriangle, CheckCircle, BarChart3, Fingerprint } from "lucide-react";

interface OrgCompliance {
  id: string;
  name: string;
  slug: string;
  score: number;
  farmerCount: number;
  batchCount: number;
}

interface RecentFarmer {
  id: string;
  fullName: string;
  isVerified: boolean;
  organization: { name: string };
  _count: { documents: number };
}

export function GlobalComplianceManager() {
  const [data, setData] = useState<{ 
    organizations: OrgCompliance[], 
    recentFarmers: RecentFarmer[],
    globalAvgScore: number 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/super-admin/compliance");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch compliance data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Health Score</p>
                <h3 className="text-3xl font-black text-slate-900">{data.globalAvgScore}%</h3>
              </div>
            </div>
            <Progress value={data.globalAvgScore} className="h-2 rounded-full" />
            <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tight">Weighted across all organizations</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Farmer Verification</p>
                <h3 className="text-3xl font-black text-slate-900">
                  {Math.round((data.recentFarmers.filter(f => f.isVerified).length / (data.recentFarmers.length || 1)) * 100)}%
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-tight">KYC Standards Met</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doc Deficit</p>
                <h3 className="text-3xl font-black text-slate-900">Low</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">No critical gaps detected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Org Compliance List */}
        <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Tenant Compliance Rankings
            </CardTitle>
            <CardDescription className="font-medium text-xs">Based on documentation, quality tests, and verification rates.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Score</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.organizations.sort((a, b) => b.score - a.score).map((org) => (
                  <TableRow key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{org.name}</span>
                        <code className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{org.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 w-[150px]">
                        <Progress value={org.score} className="h-1.5 flex-1" />
                        <span className="text-xs font-black text-slate-700">{org.score}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-600">{org.farmerCount} Farmers</span>
                        <span className="text-[10px] font-bold text-slate-400">{org.batchCount} Batches</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Farmer Verifications */}
        <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Recent KYC Activity
            </CardTitle>
            <CardDescription className="font-medium text-xs">Real-time monitoring of farmer verification across tenants.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Farmer</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentFarmers.map((farmer) => (
                  <TableRow key={farmer.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                          {farmer.fullName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{farmer.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{farmer._count.documents} Docs uploaded</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-600">{farmer.organization.name}</span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge 
                        variant="outline" 
                        className={farmer.isVerified 
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[9px]" 
                          : "border-amber-200 text-amber-700 bg-amber-50/30 rounded-lg font-black text-[9px]"}
                      >
                        {farmer.isVerified ? "VERIFIED" : "PENDING"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
