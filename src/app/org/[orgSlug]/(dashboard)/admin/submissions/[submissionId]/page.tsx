import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { SubmissionDecisionPanel } from "@/components/admin/submission-decision-panel";
import { requireOrgScope } from "@/lib/tenant/scope";
import {
  ArrowLeft,
  User,
  MapPin,
  Sprout,
  FileText,
  TrendingUp,
  ExternalLink,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgSlug: string; submissionId: string }>;
};

export default async function AdminSubmissionDetailPage({ params }: PageProps) {
  const user = await requireRole(["admin"]);
  const { orgSlug, submissionId } = await params;
  const organizationId = requireOrgScope(user);
  const orgBase = `/org/${orgSlug}`;

  const submission = await prisma.farmerSubmission.findFirst({
    where: { id: submissionId, organizationId },
    include: {
      farmer: {
        include: {
          farmProfiles: { include: { locations: true }, orderBy: { createdAt: "desc" }, take: 1 },
          documents: { orderBy: { createdAt: "desc" } },
          certifications: { orderBy: { createdAt: "desc" } },
          productionRecords: { orderBy: { createdAt: "desc" }, take: 20 },
          batches: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      submittedBy: true,
      approvalActions: { include: { actor: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!submission) {
    notFound();
  }

  const farmer = submission.farmer;
  const profile = farmer.farmProfiles[0] || null;
  const location = profile?.locations?.[0] || null;

  const hasGps = Boolean(location && location.latitude != null && location.longitude != null);
  const mapUrl = hasGps ? `https://www.google.com/maps?q=${Number(location!.latitude)},${Number(location!.longitude)}` : null;
  const dq = submission.dataQualityScore ?? 0;
  const dqLabel = dq >= 80 ? "Verified" : dq >= 50 ? "Needs Review" : "Invalid";
  const dqTone = dq >= 80 ? "bg-emerald-50 border-emerald-100 text-emerald-700" : dq >= 50 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-red-50 border-red-100 text-red-700";

  const missing: string[] = [];
  if (!farmer.phone) missing.push("Phone");
  if (!farmer.ghanaCardNumber) missing.push("Ghana Card");
  if (!profile?.farmName) missing.push("Farm Name");
  if (!farmer.primaryCrop) missing.push("Primary Crop");
  if (!hasGps) missing.push("GPS Location");
  if (location && !location.isValidated) missing.push("GPS Validation");

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold text-muted-foreground hover:text-primary">
          <Link href={`${orgBase}/admin`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Submission Review
          </h1>
          <p className="text-slate-500 font-medium">
            Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")} by {submission.submittedBy.fullName}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
              Farmer Quality: {farmer.qualityScore}/100
            </Badge>
            <Badge variant="outline" className={`rounded-full font-black text-[10px] ${dqTone}`}>
              Submission Quality: {dq}% · {dqLabel}
            </Badge>
            {farmer.ghanaCardNumber ? (
              <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3 h-3 mr-1" />
                ID Provided
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full font-black text-[10px] bg-amber-50 border-amber-100 text-amber-700">
                Missing ID
              </Badge>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden w-full lg:max-w-md">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black tracking-tight">Approve / Reject</CardTitle>
            <CardDescription className="font-medium">
              Review details before making a decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <SubmissionDecisionPanel
              submissionId={submission.id}
              status={submission.status}
              defaultRejectReason={submission.rejectionReason}
              approvalBlockers={missing}
              backHref={`${orgBase}/admin`}
            />
          </CardContent>
        </Card>
      </div>

      {missing.length > 0 && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-amber-50/50 border-b border-amber-100 p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-700">
              Missing / Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-wrap gap-2">
            {missing.map((m) => (
              <Badge key={m} variant="outline" className="rounded-full font-black text-[10px] bg-white border-amber-200 text-amber-700">
                {m}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Farmer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="Full Name" value={farmer.fullName} />
                <DataField label="Phone" value={farmer.phone ?? "Not provided"} />
                <DataField label="Ghana Card" value={farmer.ghanaCardNumber ?? "Not provided"} />
                <DataField label="Created" value={format(new Date(farmer.createdAt), "MMM d, yyyy")} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sprout className="w-5 h-5 text-primary" />
                Farm Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="Farm Name" value={profile?.farmName ?? "Not provided"} />
                <DataField label="Primary Crop" value={farmer.primaryCrop ?? "Not provided"} />
                <DataField label="Area (Hectares)" value={profile?.totalAreaHectare?.toString() ?? "Not provided"} />
                <DataField label="Farm Size" value={profile?.farmSize != null ? `${profile.farmSize.toString()} ${profile.farmSizeUnit ?? ""}`.trim() : "Not provided"} />
                <DataField label="Irrigation Type" value={profile?.irrigationType ?? "Not provided"} />
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Location & GPS
                </Label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {location?.community || "Community unknown"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {(location?.district || "District unknown")}, {(location?.region || "Region unknown")}
                      </p>
                      <p className="text-[10px] font-mono font-bold text-slate-400 mt-1">
                        LAT: {location?.latitude?.toString() ?? "N/A"} · LNG: {location?.longitude?.toString() ?? "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {location ? (
                      <Badge
                        variant="outline"
                        className={`rounded-full font-black text-[10px] ${
                          location.isValidated
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "bg-amber-50 border-amber-100 text-amber-700"
                        }`}
                      >
                        {location.isValidated ? "VALIDATED" : "UNVALIDATED"}
                      </Badge>
                    ) : null}

                    {mapUrl ? (
                      <Button asChild variant="outline" className="rounded-2xl font-black h-10 border-slate-200">
                        <Link href={mapUrl} target="_blank">
                          Open Map
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Production
              </CardTitle>
              <CardDescription className="font-medium">
                Last {Math.min(20, farmer.productionRecords.length)} cycle(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {farmer.productionRecords.length === 0 ? (
                <div className="p-8 text-slate-500 font-medium">No production records yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {farmer.productionRecords.map((r) => (
                    <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                            {r.status}
                          </Badge>
                          <span className="font-black text-slate-900">{r.cropType}</span>
                          <span className="text-sm text-slate-500 font-bold">{r.season}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-slate-400" />
                          Created {format(new Date(r.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900">
                          {r.quantityTon ? `${r.quantityTon.toString()}T harvested` : "—"}
                        </div>
                        <div className="text-xs font-bold text-slate-400">
                          {r.actualYieldTon ? `${r.actualYieldTon.toString()}T actual` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documents & Certifications
              </CardTitle>
              <CardDescription className="font-medium">
                Documents: {farmer.documents.length} · Certifications: {farmer.certifications.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Documents
                </div>
                {farmer.documents.length === 0 ? (
                  <div className="text-sm text-slate-500 font-medium">No documents uploaded.</div>
                ) : (
                  <div className="space-y-2">
                    {farmer.documents.slice(0, 8).map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{d.name}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d.type}</div>
                        </div>
                        <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                          {d.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Certifications
                </div>
                {farmer.certifications.length === 0 ? (
                  <div className="text-sm text-slate-500 font-medium">No certifications recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {farmer.certifications.slice(0, 8).map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-sm font-black text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500 font-bold">{c.issuer ?? "Issuer N/A"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-black tracking-tight">Review History</CardTitle>
              <CardDescription className="font-medium">
                {submission.approvalActions.length} action(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {submission.approvalActions.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 font-medium">No actions yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {submission.approvalActions.map((a) => (
                    <div key={a.id} className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-slate-900">{a.actor.fullName}</div>
                        <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                          {a.action}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                      {a.reason ? (
                        <div className="text-xs text-slate-600 font-medium mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          {a.reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">
        {label}
      </span>
      <p className="font-bold text-slate-800">{value}</p>
    </div>
  );
}
