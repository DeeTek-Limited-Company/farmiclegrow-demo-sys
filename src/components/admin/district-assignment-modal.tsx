"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface District {
  id: string;
  name: string;
}

interface DistrictAssignmentModalProps {
  user: { id: string; fullName: string } | null;
  assignedDistrictIds: string[];
  allDistricts: District[];
  isOpen: boolean;
  onClose: () => void;
}

export function DistrictAssignmentModal({ 
  user, 
  assignedDistrictIds, 
  allDistricts, 
  isOpen, 
  onClose 
}: DistrictAssignmentModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedDistrictIds);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSelectedIds(assignedDistrictIds);
  }, [assignedDistrictIds]);

  const toggleDistrict = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}/districts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtIds: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed to save assignments");
      toast.success("District assignments updated");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error("Error saving assignments");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">District Assignments</DialogTitle>
          <DialogDescription className="font-medium">
            Select districts that <span className="text-slate-900 font-bold">{user?.fullName}</span> can manage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[400px] overflow-y-auto space-y-3 px-1">
          {allDistricts.length === 0 ? (
            <p className="text-center py-8 text-slate-400 font-medium italic">No districts configured for your organization.</p>
          ) : (
            allDistricts.map((d) => (
              <div 
                key={d.id} 
                className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => toggleDistrict(d.id)}
              >
                <Checkbox 
                  id={`dist-${d.id}`} 
                  checked={selectedIds.includes(d.id)}
                  onCheckedChange={() => toggleDistrict(d.id)}
                />
                <Label 
                  htmlFor={`dist-${d.id}`} 
                  className="flex-1 font-bold text-slate-700 cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-primary/60" />
                  {d.name}
                </Label>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="rounded-xl font-bold min-w-[120px]" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
