"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle, User, MapPin, Sprout, ClipboardCheck, History } from "lucide-react";
import Link from "next/link";

type PendingSubmission = {
  id: string;
  status: string;
  submittedAt: string;
  dataQualityScore: number;
  farmer: {
    id: string;
    fullName: string;
    phone: string | null;
    primaryCrop: string | null;
    farmProfiles: Array<{
      id: string;
      farmName: string;
      totalAreaHectare: string | null;
      locations: Array<{
        id: string;
        latitude: string | null;
        longitude: string | null;
        address: string | null;
      }>;
    }>;
  };
  submittedBy: {
    id: string;
    fullName: string;
    email: string;
  };
};

type ReviewQueueProps = {
  initialQueue: PendingSubmission[];
};

function getQualityPill(score: number) {
  if (score >= 80) return { label: "Verified", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  if (score >= 50) return { label: "Needs Review", className: "bg-amber-50 text-amber-700 border-amber-100" };
  return { label: "Invalid", className: "bg-red-50 text-red-700 border-red-100" };
}

export function ReviewQueue({ initialQueue }: ReviewQueueProps) {
  const [queue, setQueue] = useState<PendingSubmission[]>(initialQueue);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  async function loadQueue() {
    try {
      const response = await apiFetch("/api/submissions/pending");
      if (!response.ok) {
        toast.error("Unable to refresh review queue.");
        return;
      }
      const data = await response.json();
      setQueue(data.submissions);
    } catch (error) {
      console.error("Failed to load queue", error);
      toast.error("Unable to refresh review queue.");
    }
  }

  async function decide(submissionId: string, action: "APPROVED" | "REJECTED") {
    if (action === "REJECTED" && !reasonById[submissionId]?.trim()) {
      toast.error("Rejection reason required", {
        description: "Please explain why this submission is being rejected."
      });
      return;
    }

    setBusyById((prev) => ({ ...prev, [submissionId]: true }));
    const response = await apiFetch(`/api/submissions/${submissionId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: reasonById[submissionId] || undefined,
      }),
    });

    setBusyById((prev) => ({ ...prev, [submissionId]: false }));

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.message ?? "Decision failed.");
      return;
    }

    toast.success(action === "APPROVED" ? "Submission Approved" : "Submission Rejected");
    setReasonById((prev) => ({ ...prev, [submissionId]: "" }));
    await loadQueue();
  }

  return (
    <div className="space-y-6">
      {queue.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <div className="flex flex-col items-center gap-2">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30" />
            <p>Your review queue is clear! No pending applications.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {queue.map((submission) => {
            const profile = submission.farmer.farmProfiles[0];
            const location = profile?.locations[0];
            const busy = Boolean(busyById[submission.id]);
            const quality = getQualityPill(submission.dataQualityScore ?? 0);

            return (
              <Card key={submission.id} className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {submission.farmer.fullName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{submission.farmer.fullName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <User className="w-3 h-3" /> Submitted by {submission.submittedBy.fullName}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase tracking-wider text-[10px]">
                        Pending Review
                      </Badge>
                      <Badge variant="outline" className={`uppercase tracking-wider text-[10px] ${quality.className}`}>
                        {submission.dataQualityScore ?? 0}% · {quality.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Submitted {new Date(submission.submittedAt).toLocaleString()}
                    </div>
                    <Button asChild variant="outline" className="rounded-xl font-bold">
                      <Link href={`/admin/submissions/${submission.id}`}>
                        View details
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Farm Name</span>
                          <p className="font-medium flex items-center gap-1">
                            <Sprout className="w-4 h-4 text-primary" /> {profile?.farmName ?? "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Primary Crop</span>
                          <p className="font-medium">{submission.farmer.primaryCrop ?? "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Area (ha)</span>
                          <p className="font-medium">{profile?.totalAreaHectare ?? "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-xs text-muted-foreground block">Location</span>
                            <span className="text-xs font-mono">
                              {location ? `${location.latitude ?? "N/A"}, ${location.longitude ?? "N/A"}` : "N/A"}
                            </span>
                            {location?.address && <p className="mt-1 text-muted-foreground italic">&quot;{location.address}&quot;</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-muted-foreground/10">
                      <div className="space-y-2">
                        <Label htmlFor={`reason-${submission.id}`} className="text-xs font-bold uppercase text-muted-foreground">Rejection Reason</Label>
                        <Textarea
                          id={`reason-${submission.id}`}
                          placeholder="Provide feedback if rejecting..."
                          className="bg-background min-h-[80px]"
                          value={reasonById[submission.id] ?? ""}
                          onChange={(e) => setReasonById((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={busy}
                          onClick={() => decide(submission.id, "APPROVED")}
                        >
                          {busy ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={busy}
                          onClick={() => decide(submission.id, "REJECTED")}
                        >
                          {busy ? <Spinner className="w-4 h-4" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
