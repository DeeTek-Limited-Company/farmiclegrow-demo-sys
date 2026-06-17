"use client";

import { useEffect, useMemo, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";

export function AddUserModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    roleKey: "agronomist",
  });

  const [districts, setDistricts] = useState<{ id: string; name: string; region: { name: string } }[]>([]);
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const districtOptions = useMemo(() => {
    return [...districts].sort((a, b) => {
      const r = a.region.name.localeCompare(b.region.name);
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
  }, [districts]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setDistrictsLoading(true);
      try {
        const res = await apiFetch("/api/districts");
        const json = await res.json().catch(() => ({}));
        setDistricts(json.districts || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };
    void load();
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
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
    setIsLoading(true);
    setErrors({});

    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
          toast.error("Please check the highlighted fields.");
          return;
        }
        throw new Error(data.message || "Failed to create user");
      }

      if (formData.roleKey === "agronomist" && data.userId) {
        const aRes = await apiFetch(`/api/users/${data.userId}/districts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ districtIds }),
        });
        const aData = await aRes.json().catch(() => ({}));
        if (!aRes.ok) {
          throw new Error(aData?.message || "Failed to assign districts");
        }
      }

      toast.success("User successfully created!");
      setOpen(false);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        roleKey: "agronomist",
      });
      setDistrictIds([]);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all duration-300">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">Add New User</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            Create a new account and set an initial password. The user must reset it on first login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              className={`h-11 rounded-xl bg-slate-50 border-slate-200 ${errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.fullName?.map((err, i) => (
              <p key={i} className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-tight">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
              className={`h-11 rounded-xl bg-slate-50 border-slate-200 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.email?.map((err, i) => (
              <p key={i} className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-tight">
                {err}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Initial Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 8 characters"
              required
              className={`h-11 rounded-xl bg-slate-50 border-slate-200 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.password ? (
              <div className="space-y-1">
                {errors.password.map((err, i) => (
                  <p key={i} className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-tight">
                    • {err}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground ml-1 uppercase font-bold tracking-tight">
                Min 8 chars, uppercase, lowercase, number, & symbol
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                Assign Districts
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
            </div>
          ) : null}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
