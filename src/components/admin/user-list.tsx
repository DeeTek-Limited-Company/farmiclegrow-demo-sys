"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, User, Mail, Calendar, Power, MoreHorizontal, Pencil, MapPin, Building2, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { EditUserModal } from "./edit-user-modal";
import { DistrictAssignmentModal } from "./district-assignment-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserWithRoles = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  userRoles: Array<{
    role: {
      name: string;
      key: string;
    }
  }>;
  agronomistDistricts: Array<{
    district: {
      id: string;
      name: string;
    }
  }>;
  buyerProfile?: {
    companyName: string;
    phoneNumber: string | null;
    businessAddress: string | null;
    country: string | null;
  } | null;
};

export function UserList({ initialUsers, allDistricts }: { 
  initialUsers: UserWithRoles[], 
  allDistricts: Array<{ id: string, name: string }> 
}) {
  const [users, setUsers] = useState(initialUsers);
  const router = useRouter();
  
  const [editingUser, setEditingUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    roleKey: string;
  } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [distAssignUser, setDistAssignUser] = useState<{ id: string; fullName: string } | null>(null);
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);

  async function toggleStatus(userId: string, currentStatus: boolean) {
    const response = await apiFetch(`/api/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.message ?? "Failed to update status.");
      return;
    }

    toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[250px]">User</TableHead>
            <TableHead>Districts</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Business Details</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialUsers.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.fullName}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[150px]">
                  {user.userRoles.some(ur => ur.role.key === "agronomist") ? (
                    user.agronomistDistricts.length > 0 ? (
                      user.agronomistDistricts.map(ad => (
                        <Badge key={ad.district.id} variant="outline" className="text-[10px] font-bold bg-slate-50">
                          {ad.district.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[10px] text-amber-600 font-bold italic">No districts assigned</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Not applicable</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.userRoles.map((ur) => (
                    <Badge key={ur.role.key} variant="secondary" className="text-[10px] uppercase font-bold">
                      {ur.role.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {user.buyerProfile ? (
                  <div className="flex flex-col gap-1 max-w-[200px]">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {user.buyerProfile.companyName}
                    </span>
                    {user.buyerProfile.phoneNumber && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" /> {user.buyerProfile.phoneNumber}
                      </span>
                    )}
                    {user.buyerProfile.businessAddress && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 italic truncate">
                        <MapPin className="w-2.5 h-2.5" /> {user.buyerProfile.businessAddress}, {user.buyerProfile.country}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Switch 
                  checked={user.isActive} 
                  onCheckedChange={() => toggleStatus(user.id, user.isActive)}
                />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-slate-200">
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => {
                        setEditingUser({
                          id: user.id,
                          fullName: user.fullName,
                          email: user.email,
                          roleKey: user.userRoles[0]?.role.key || "agronomist"
                        });
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit User</span>
                    </DropdownMenuItem>
                    {user.userRoles.some(ur => ur.role.key === "agronomist") && (
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                          setDistAssignUser({ id: user.id, fullName: user.fullName });
                          setIsDistModalOpen(true);
                        }}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>Manage Districts</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <EditUserModal 
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <DistrictAssignmentModal 
        user={distAssignUser}
        isOpen={isDistModalOpen}
        onClose={() => setIsDistModalOpen(false)}
        allDistricts={allDistricts}
        assignedDistrictIds={
          users.find(u => u.id === distAssignUser?.id)?.agronomistDistricts.map(ad => ad.district.id) || []
        }
      />
    </div>
  );
}
