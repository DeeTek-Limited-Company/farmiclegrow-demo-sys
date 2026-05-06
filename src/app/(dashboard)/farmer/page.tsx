import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, MapPin, Calendar, CheckCircle, Clock, XCircle, AlertCircle, TrendingUp, History, BellRing } from "lucide-react";
import { ProductionRecordForm } from "@/components/farmer/production-record-form";

function formatDate(value: Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 flex gap-1 items-center"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" className="flex gap-1 items-center"><XCircle className="w-3 h-3" /> Rejected</Badge>;
    case "PENDING_REVIEW":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex gap-1 items-center"><Clock className="w-3 h-3" /> Pending Review</Badge>;
    default:
      return <Badge variant="secondary">No Status</Badge>;
  }
}

export default async function FarmerDashboardPage() {
  const user = await requireRole(["farmer"]);

  const farmer = await prisma.farmer.findFirst({
    where: {
      OR: [{ externalRef: user.id }, { externalRef: user.email }, { fullName: user.name }],
    },
    include: {
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "desc" },
      },
      productionRecords: {
        orderBy: { createdAt: "desc" },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latestSubmission = farmer?.submissions[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farmer Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back, <span className="text-foreground font-semibold">{user.name}</span></p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <span className="text-xs font-bold uppercase text-primary/70">Onboarding Status:</span>
          {getStatusBadge(latestSubmission?.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats and Records */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProductionRecordForm
              farmerId={farmer?.id ?? ""}
              defaultCrop={farmer?.primaryCrop ?? ""}
            />

            <Card className="border-primary/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Quick Summary
                </CardTitle>
                <CardDescription>Overview of your farm activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Total Farms</span>
                  <span className="text-xl font-bold">{farmer?.farmProfiles.length ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Historical Records</span>
                  <span className="text-xl font-bold">{farmer?.productionRecords.length ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/5 shadow-md">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                My Farm Profiles
              </CardTitle>
              <CardDescription>Verified farm locations and crop data.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {farmer && farmer.farmProfiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {farmer.farmProfiles.map((farmProfile) => (
                    <div key={farmProfile.id} className="p-5 rounded-xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{farmProfile.farmName}</h3>
                        <Badge variant="secondary" className="text-[10px] uppercase">{farmer.primaryCrop ?? "No Crop"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Area</span>
                          <span className="font-medium">{farmProfile.totalAreaHectare?.toString() ?? "N/A"} ha</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Irrigation Type</span>
                          <span className="font-medium">{farmProfile.irrigationType ?? "N/A"}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-dashed">
                          <MapPin className="w-3 h-3" />
                          <span>{farmProfile.locations.length} Geolocation point(s)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-xl">
                  No farm records verified yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/5 shadow-md">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Production History
              </CardTitle>
              <CardDescription>Past yield submissions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {farmer && farmer.productionRecords.length > 0 ? (
                <div className="space-y-3">
                  {farmer.productionRecords.map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-4 rounded-lg bg-muted/50 border hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Leaf className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm">{record.cropType}</span>
                          <span className="text-xs text-muted-foreground block font-medium">{record.season}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-primary">{(record.quantityTon || 0).toString()} ton</span>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-tight">{formatDate(record.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No production records recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Notifications and Status Details */}
        <div className="space-y-8">
          <Card className="border-primary/5 shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-primary">
                <BellRing className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length > 0 ? (
                <div className="divide-y divide-muted-foreground/10">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 hover:bg-muted/50 transition-colors ${!notification.isRead ? "bg-primary/[0.02]" : ""}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="font-bold text-sm">{notification.title}</h4>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{notification.body ?? "No details provided."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground italic">
                  No notifications yet.
                </div>
              )}
            </CardContent>
          </Card>

          {latestSubmission?.rejectionReason && (
            <Card className="border-red-200 bg-red-50/30 overflow-hidden">
              <CardHeader className="bg-red-50 border-b border-red-100">
                <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-red-800 leading-relaxed">
                  Your recent onboarding application was returned with the following feedback:
                </p>
                <div className="mt-2 p-3 bg-white rounded border border-red-100 text-sm font-medium italic text-red-700">
                  &quot;{latestSubmission.rejectionReason}&quot;
                </div>
                <p className="mt-3 text-xs text-red-600 font-semibold">
                  Please contact your agronomist to provide the missing information.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/5 shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Quick Contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Your ID</p>
                <p className="font-mono bg-muted p-1.5 rounded text-primary">{farmer?.id ?? "N/A"}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                For core profile updates or farm record corrections, please contact your regional agronomist.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
