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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { 
  Loader2, 
  Search, 
  Users, 
  Building2, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw,
  AlertTriangle
} from "lucide-react";

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

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function GlobalUserManager({ organizations }: GlobalUserManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Reset Password Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleOpenResetModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword(generateRandomPassword(12));
    setMustChangePassword(true);
    setResetError(null);
    setResetSuccess(false);
    setCopied(false);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      const res = await apiFetch(`/api/super-admin/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          mustChangePassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || "Failed to reset password.");
      } else {
        setResetSuccess(true);
      }
    } catch (error) {
      setResetError("An unexpected error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Created</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pr-6 text-right">Actions</TableHead>
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
                    <TableCell>
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 font-bold text-xs gap-1.5 transition-colors"
                        onClick={() => handleOpenResetModal(user)}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-slate-400 italic font-medium">
                      No users found matching the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Administrative password reset for <strong className="text-slate-800">{selectedUser?.fullName}</strong> ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4 py-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Password Successfully Reset!
                </div>
                <p className="text-xs text-emerald-700">
                  All active sessions for this user have been revoked. The user must use this new temporary password to log in.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">New Password</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={newPassword}
                    className="font-mono text-sm font-bold border-slate-200 bg-slate-50 rounded-xl"
                  />
                  <Button
                    onClick={handleCopyPassword}
                    className="rounded-xl font-bold gap-1.5 min-w-[100px]"
                    variant={copied ? "accent" : "default"}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {resetError}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">New Password</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword(12))}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="font-mono text-sm font-bold border-slate-200 rounded-xl h-11"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mustChangePassword"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="mustChangePassword" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Require user to change password on next login
                </label>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 font-medium">
                <strong>Security note:</strong> Performing this reset will invalidate all current active sessions for this account.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {resetSuccess ? (
              <Button
                onClick={() => setSelectedUser(null)}
                className="w-full sm:w-auto rounded-xl font-bold"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  disabled={isResetting}
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={isResetting || !newPassword}
                  className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2"
                >
                  {isResetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Password Reset
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
