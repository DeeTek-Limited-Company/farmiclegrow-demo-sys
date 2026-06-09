"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type DocStatus = "UPLOADED" | "MISSING" | "NEEDS_REVIEW" | "VERIFIED";

type DocumentRow = {
  id: string;
  farmerId: string;
  type: string;
  name: string;
  url: string;
  status: DocStatus;
  createdAt: string;
  farmer: { id: string; fullName: string; phone: string | null };
};

function statusBadge(status: DocStatus) {
  switch (status) {
    case "VERIFIED":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">VERIFIED</Badge>;
    case "NEEDS_REVIEW":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">NEEDS REVIEW</Badge>;
    case "MISSING":
      return <Badge variant="destructive">MISSING</Badge>;
    case "UPLOADED":
    default:
      return <Badge variant="outline">UPLOADED</Badge>;
  }
}

export function DocumentReviewTable({ initialDocuments }: { initialDocuments: DocumentRow[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const orgBase = user?.organizationSlug ? `/org/${user.organizationSlug}` : "";
  const withOrg = (href: string) => (orgBase ? `${orgBase}${href}` : href);
  const [rows, setRows] = useState<DocumentRow[]>(initialDocuments);
  const [statusFilter, setStatusFilter] = useState<"ALL" | DocStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const docTypes = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.type))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...unique];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${r.farmer.fullName} ${r.type} ${r.name}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, statusFilter, typeFilter, query]);

  const updateStatus = async (documentId: string, status: DocStatus) => {
    setSavingId(documentId);
    try {
      const res = await apiFetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to update status");
      setRows((prev) => prev.map((r) => (r.id === documentId ? { ...r, status } : r)));
      toast.success("Document status updated");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="border-primary/5 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Document Review Queue</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search farmer / doc..."
                className="pl-9 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="UPLOADED">Uploaded</SelectItem>
                <SelectItem value="NEEDS_REVIEW">Needs review</SelectItem>
                <SelectItem value="MISSING">Missing</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "ALL" ? "All types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No documents match the current filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-black truncate">{r.farmer.fullName}</div>
                    {statusBadge(r.status)}
                    <Badge variant="outline">{r.type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-1 truncate">{r.name}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
                      <Link href={withOrg(`/admin/farmers/${r.farmerId}`)}>
                        Open farmer
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-xl font-bold" disabled={!r.url}>
                      <Link href={r.url} target="_blank">
                        View file
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="w-full md:w-56">
                  <Select
                    value={r.status}
                    onValueChange={(v) => updateStatus(r.id, v as DocStatus)}
                    disabled={savingId === r.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPLOADED">UPLOADED</SelectItem>
                      <SelectItem value="NEEDS_REVIEW">NEEDS_REVIEW</SelectItem>
                      <SelectItem value="MISSING">MISSING</SelectItem>
                      <SelectItem value="VERIFIED">VERIFIED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
