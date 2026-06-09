"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Search, Users, Building2, ShieldCheck, Mail, Calendar, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  organizationId: string | null;
  organization: { name: string; slug: string } | null;
  userRoles: Array<{ role: { name: string, key: string } }>;
}

interface GlobalUserManagerProps {
  organizations: Array<{ id: string, name: string }>;
}

export function GlobalUserManager({ organizations }: GlobalUserManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = "/api/super-admin/users";
      const params = new URLSearchParams();
      if (orgFilter !== "all") params.append("orgId", orgFilter);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [orgFilter, roleFilter]);

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search users by name or email..." 
            className="pl-10 rounded-xl border-slate-200 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-[200px] rounded-xl border-slate-200 h-11 font-bold text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <SelectValue placeholder="All Organizations" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-bold text-xs">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="font-bold text-xs">{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 h-11 font-bold text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <SelectValue placeholder="All Roles" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-bold text-xs">All Roles</SelectItem>
              <SelectItem value="admin" className="font-bold text-xs">Admins</SelectItem>
              <SelectItem value="agronomist" className="font-bold text-xs">Agronomists</SelectItem>
              <SelectItem value="ops" className="font-bold text-xs">Operations</SelectItem>
              <SelectItem value="buyer" className="font-bold text-xs">Buyers</SelectItem>
              <SelectItem value="farmer" className="font-bold text-xs">Farmers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-primary/5 shadow-sm rounded-[1.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Global User Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-6">User</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Organization</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Roles</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                          {user.fullName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{user.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.organization ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{user.organization.name}</span>
                          <code className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            {user.organization.slug}
                          </code>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black bg-slate-100 text-slate-500 border-slate-200">PLATFORM</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles.map(ur => (
                          <Badge key={ur.role.key} variant="outline" className="text-[9px] font-black bg-primary/5 text-primary border-primary/10 uppercase tracking-tighter">
                            {ur.role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={user.isActive 
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/30 rounded-lg font-black text-[9px]" 
                          : "border-rose-200 text-rose-700 bg-rose-50/30 rounded-lg font-black text-[9px]"}
                      >
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">
                      No users found matching the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
