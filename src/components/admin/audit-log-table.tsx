"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, Clock, Globe, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditRow = {
  id: string;
  action: string;
  userId: string | null;
  details: any | null;
  ip: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
};

export function AuditLogTable({ initialLogs }: { initialLogs: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "SUCCESS" | "FAILURE">("ALL");
  const [action, setAction] = useState<string>("ALL");

  const actions = useMemo(() => {
    const unique = Array.from(new Set(initialLogs.map((l) => l.action))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...unique];
  }, [initialLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialLogs.filter((l) => {
      if (status !== "ALL" && l.status !== status) return false;
      if (action !== "ALL" && l.action !== action) return false;
      if (!q) return true;
      const hay = `${l.action} ${l.userId ?? ""} ${l.ip ?? ""} ${JSON.stringify(l.details ?? {})}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initialLogs, query, status, action]);

  return (
    <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
            <Badge variant="outline" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search action/user/ip/details..."
                className="pl-9 w-full sm:w-72"
              />
            </div>

            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILURE">Failure</SelectItem>
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "ALL" ? "All actions" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold uppercase text-[10px] tracking-widest p-4">Timestamp</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest">Action</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest">User ID</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest hidden sm:table-cell">Origin</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest p-4 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                  No audit logs match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg font-bold bg-white border-slate-200 text-slate-700 shadow-sm px-2 py-1">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[120px]" title={log.userId || "System"}>
                        {log.userId ? log.userId.substring(0, 8) + "..." : "System"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-lg font-black text-[10px] px-2 py-0.5 ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Globe className="w-3.5 h-3.5 text-slate-300" />
                      {log.ip || "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <pre className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg inline-block max-w-[200px] truncate group-hover:max-w-none group-hover:whitespace-pre-wrap transition-all">
                      {JSON.stringify(log.details)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

