import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function TenantAdminsPage() {
  await requireRole(["super_admin"]);

  const admins = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            key: "admin"
          }
        }
      }
    },
    include: {
      organization: true,
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Tenant Administrators</h1>
        <p className="text-slate-500 mt-1 font-medium">Global list of organization-level administrators and their status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => (
          <Card key={admin.id} className="rounded-[2.5rem] border-primary/5 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <Badge variant="outline" className={admin.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[10px]" : "border-slate-200 text-slate-500 rounded-lg font-black text-[10px]"}>
                  {admin.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 leading-tight">{admin.fullName}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Mail className="w-3 h-3" />
                  {admin.email}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {admin.organization?.name || "No Organization"}
                </div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-1">
                  Org Slug: {admin.organization?.slug || "N/A"}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
