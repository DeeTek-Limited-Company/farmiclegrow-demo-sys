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
import { Loader2, Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AuditLog {
  id: string;
  action: string;
  status: string;
  createdAt: string;
  userId: string | null;
  organizationId: string | null;
  organization: { name: string; slug: string } | null;
  user: { fullName: string; email: string } | null;
  details: any;
}

export function PlatformAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/super-admin/audit-logs");
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.organization?.name.toLowerCase().includes(search.toLowerCase()) ||
    log.organization?.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search logs by action or organization..." 
            className="pl-10 rounded-xl border-slate-200 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-primary/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Platform Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="whitespace-nowrap text-xs font-medium text-slate-500">
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{log.organization?.name || "Platform"}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{log.organization?.slug || "GLOBAL"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">{log.user?.fullName || "System"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{log.user?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-tighter">
                        {log.action.replace(/_/g, ' ')}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={log.status === "SUCCESS" 
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/30" 
                          : "border-rose-200 text-rose-700 bg-rose-50/30"}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[300px] truncate">
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">
                      No matching audit logs found.
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
