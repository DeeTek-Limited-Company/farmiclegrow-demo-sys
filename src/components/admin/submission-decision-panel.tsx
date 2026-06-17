"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function SubmissionDecisionPanel({
  submissionId,
  status,
  defaultRejectReason,
  approvalBlockers = [],
  backHref = "/admin",
}: {
  submissionId: string;
  status: string;
  defaultRejectReason?: string | null;
  approvalBlockers?: string[];
  backHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(defaultRejectReason ?? "");

  const isPending = status === "PENDING_REVIEW";
  const hasBlockers = approvalBlockers.length > 0;
  const badge = useMemo(() => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">APPROVED</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">REJECTED</Badge>;
      case "PENDING_REVIEW":
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            PENDING REVIEW
          </Badge>
        );
    }
  }, [status]);

  const decide = async (action: "APPROVED" | "REJECTED") => {
    if (!isPending) return;
    if (action === "REJECTED" && !reason.trim()) {
      toast.error("Rejection reason required");
      return;
    }
    if (action === "APPROVED" && hasBlockers) {
      toast.error("Resolve onboarding blockers before approval");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch(`/api/submissions/${submissionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: reason.trim() ? reason.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Decision failed");
      }

      toast.success(action === "APPROVED" ? "Submission approved" : "Submission rejected");
      router.push(backHref);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
          Decision
        </div>
        {badge}
      </div>

      {hasBlockers && isPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-amber-700">
            Approval Blockers
          </div>
          <div className="flex flex-wrap gap-2">
            {approvalBlockers.map((b) => (
              <Badge
                key={b}
                variant="outline"
                className="rounded-full font-black text-[10px] bg-white border-amber-200 text-amber-700"
              >
                {b}
              </Badge>
            ))}
          </div>
          <div className="text-xs font-bold text-amber-800">
            Resolve these blockers before approving the submission.
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
          Notes
        </Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide feedback if rejecting..."
          className="min-h-[90px] rounded-2xl bg-slate-50 border-slate-200 font-bold"
          disabled={!isPending || busy}
        />
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1 rounded-2xl font-black h-12 bg-emerald-600 hover:bg-emerald-700"
          disabled={!isPending || busy || hasBlockers}
          onClick={() => decide("APPROVED")}
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Approve
        </Button>
        <Button
          variant="destructive"
          className="flex-1 rounded-2xl font-black h-12"
          disabled={!isPending || busy}
          onClick={() => decide("REJECTED")}
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
          Reject
        </Button>
      </div>
    </div>
  );
}
