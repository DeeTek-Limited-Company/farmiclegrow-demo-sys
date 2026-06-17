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
import { Loader2, ShieldAlert, Activity, Lock, Eye, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface SecurityLog {
  id: string;
  action: string;
  status: string;
  createdAt: string;
  ip: string | null;
  organization: { name: string; slug: string } | null;
  user?: { fullName: string; email: string } | null;
  details: any;
}

export function GlobalSecurityManager() {
  const [data, setData] = useState<{ 
    failedLogins: SecurityLog[], 
    activeSessions: number, 
    highRiskLogs: SecurityLog[] 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/super-admin/security");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch security data", error);
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
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed Logins (7d)</p>
                <h3 className="text-3xl font-black text-slate-900">{data.failedLogins.length}</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Requires monitoring</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Sessions</p>
                <h3 className="text-3xl font-black text-slate-900">{data.activeSessions}</h3>
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
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Status</p>
                <h3 className="text-3xl font-black text-slate-900">Secure</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* High Risk Events */}
        <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Critical Security Events
            </CardTitle>
            <CardDescription className="font-medium text-xs">Sensitive platform actions that require auditing.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Event</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">User / Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Source IP</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.highRiskLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <code className="text-[11px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded w-fit uppercase tracking-tight mb-1">
                          {log.action}
                        </code>
                        <span className="text-[10px] text-slate-400 font-medium">{log.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{log.user?.fullName || "System"}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{log.organization?.name || "Platform"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] font-bold text-slate-500">{log.ip || "Unknown"}</code>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(log.createdAt), "MMM d, HH:mm")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {data.highRiskLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-slate-400 italic font-medium">
                      No high-risk events recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Failed Login Attempts */}
        <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Failed Login Trends
            </CardTitle>
            <CardDescription className="font-medium text-xs">Monitoring authentication failures across all organizations.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">Source IP</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Target Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.failedLogins.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <code className="text-[11px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded tracking-tighter">
                        {log.ip || "Hidden"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{log.organization?.name || "Unknown"}</span>
                        <code className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{log.organization?.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {data.failedLogins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-20 text-center text-slate-400 italic font-medium">
                      No failed login attempts detected in the last 7 days.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
