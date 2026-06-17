import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PublicTraceSettings } from "@/components/admin/public-trace-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await requireRole(["admin", "agronomist", "ops", "buyer", "farmer"]);
  const isAdmin = user.roles.includes("admin");
  if (!user.organizationId) {
    redirect("/forbidden");
  }
  const orgId = user.organizationId;

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicTraceEnabled: true,
      publicTracePolicy: true,
    },
  });

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500 font-medium">Organization not found.</p>
      </div>
    );
  }

  const defaultPolicy = {
    showFarmer: false,
    anonymizeFarmer: true,
    showCooperativeName: false,
    showCommunityName: false,
    showCertifications: false,
    showQuality: false,
    qualityPrecision: "SUMMARY",
    showLogistics: false,
    logisticsPrecision: "COARSE",
    showMedia: false,
    datePrecision: "MONTH",
    showLocation: true,
    locationPrecision: "REGION",
  };

  const currentPolicy = {
    ...defaultPolicy,
    ...(organization.publicTracePolicy as any || {}),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and organization preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">Account Information</CardTitle>
            <CardDescription>View your personal details and account role within {organization.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</p>
                <p className="text-lg font-bold text-slate-700">{user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                <p className="text-lg font-bold text-slate-700">{user.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Organization</p>
                <p className="text-lg font-bold text-slate-700">{organization.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">System Roles</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.roles.map(role => (
                    <span key={role} className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-tight">
                      {role.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 whitespace-nowrap">Organization Control</h2>
              <Separator className="flex-1" />
            </div>
            <PublicTraceSettings 
              initialEnabled={organization.publicTraceEnabled} 
              initialPolicy={currentPolicy} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
