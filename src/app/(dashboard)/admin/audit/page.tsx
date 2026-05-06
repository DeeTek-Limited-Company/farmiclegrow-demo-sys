import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Shield } from "lucide-react";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default async function AuditLogPage() {
  await requireRole(["admin"]);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Security Audit Logs
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Chronological record of system activities and security events.
        </p>
      </div>

      <AuditLogTable initialLogs={JSON.parse(JSON.stringify(logs))} />
    </div>
  );
}
