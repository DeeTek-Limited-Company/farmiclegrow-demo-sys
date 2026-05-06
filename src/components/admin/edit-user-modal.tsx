"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type UserToEdit = {
  id: string;
  fullName: string;
  email: string;
  roleKey: string;
} | null;

interface EditUserModalProps {
  user: UserToEdit;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, isOpen, onClose }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    roleKey: "agronomist",
  });

  const [districts, setDistricts] = useState<{ id: string; name: string; region: { name: string } }[]>([]);
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        roleKey: user.roleKey,
      });
    }
  }, [user]);

  const districtOptions = useMemo(() => {
    return [...districts].sort((a, b) => {
      const r = a.region.name.localeCompare(b.region.name);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
  }, [districts]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const load = async () => {
      setDistrictsLoading(true);
      try {
        const [dRes, aRes] = await Promise.all([
          apiFetch("/api/districts"),
          apiFetch(`/api/users/${user.id}/districts`),
        ]);
        const dJson = await dRes.json().catch(() => ({}));
        const aJson = await aRes.json().catch(() => ({}));
        setDistricts(dJson.districts || []);
        setDistrictIds(aJson.districtIds || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };

    void load();
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, roleKey: value }));
  };

  const toggleDistrict = (id: string, checked: boolean) => {
    setDistrictIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);

    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update user");
      }

      if (formData.roleKey === "agronomist") {
        const aRes = await apiFetch(`/api/users/${user.id}/districts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ districtIds }),
        });
        const aData = await aRes.json().catch(() => ({}));
        if (!aRes.ok) {
          throw new Error(aData?.message || "Failed to update district assignments");
        }
      } else {
        await apiFetch(`/api/users/${user.id}/districts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ districtIds: [] }),
        });
      }

      toast.success("User successfully updated!");
      onClose();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">Edit User</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            Update user details and access level.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="edit-fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              className="h-11 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
              className="h-11 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              System Role
            </Label>
            <Select value={formData.roleKey} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                <SelectItem value="agronomist" className="font-semibold">Agronomist</SelectItem>
                <SelectItem value="admin" className="font-semibold">Administrator</SelectItem>
                <SelectItem value="farmer" className="font-semibold">Farmer</SelectItem>
                <SelectItem value="ops" className="font-semibold">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.roleKey === "agronomist" ? (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Districts
              </Label>
              {districtsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading districts...
                </div>
              ) : (
                <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  {districtOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium">No districts created yet.</p>
                  ) : null}
                  {districtOptions.map((d) => {
                    const checked = districtIds.includes(d.id);
                    return (
                      <label key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2 bg-white border border-slate-100">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleDistrict(d.id, v === true)} />
                        <span className="text-sm font-bold text-slate-800">
                          {d.region.name} · {d.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground ml-1 uppercase font-bold tracking-tight">
                Agronomists can only onboard and view farmers within assigned districts.
              </p>
            </div>
          ) : null}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl font-bold border-slate-200"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
