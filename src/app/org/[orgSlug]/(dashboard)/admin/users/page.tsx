import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { UserList } from "@/components/admin/user-list";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgScope } from "@/lib/tenant/scope";

export default async function AdminUsersPage() {
  const user = await requireRole(["admin"]);
  const organizationId = requireOrgScope(user);

  const users = await prisma.user.findMany({
    where: { 
      organizationId,
      userRoles: {
        none: {
          role: {
            key: "super_admin"
          }
        }
      }
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      buyerProfile: true,
      agronomistDistricts: {
        include: {
          district: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const districts = await prisma.district.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage platform access, roles, and account status.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddUserModal />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-primary/[0.01]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{users.filter(u => u.isActive).length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-muted-foreground/30">0</div>
          </CardContent>
        </Card>
      </div>

      <UserList 
        initialUsers={JSON.parse(JSON.stringify(users))} 
        allDistricts={JSON.parse(JSON.stringify(districts))} 
      />
    </div>
  );
}
