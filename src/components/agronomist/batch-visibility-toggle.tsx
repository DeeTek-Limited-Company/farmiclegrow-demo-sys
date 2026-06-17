"use client";

import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Eye, EyeOff, Lock, Globe } from "lucide-react";

type Visibility = "INHERIT" | "PUBLIC" | "PRIVATE" | "LIMITED";

export function BatchVisibilityToggle({ 
  batchId, 
  initialVisibility 
}: { 
  batchId: string; 
  initialVisibility: Visibility 
}) {
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (value: Visibility) => {
    setIsUpdating(true);
    try {
      const res = await apiFetch(`/api/batches/${batchId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: value }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      setVisibility(value);
      toast.success("Batch visibility updated");
    } catch (e) {
      toast.error("Error updating visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  const getIcon = (v: Visibility) => {
    switch (v) {
      case "PUBLIC": return <Globe className="w-4 h-4 text-emerald-500" />;
      case "PRIVATE": return <Lock className="w-4 h-4 text-rose-500" />;
      case "LIMITED": return <EyeOff className="w-4 h-4 text-amber-500" />;
      default: return <Eye className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={visibility} 
        onValueChange={(v) => handleUpdate(v as Visibility)}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200 bg-white font-bold text-xs">
          <div className="flex items-center gap-2">
            {getIcon(visibility)}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200">
          <SelectItem value="INHERIT" className="font-bold text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              Inherit Policy
            </div>
          </SelectItem>
          <SelectItem value="PUBLIC" className="font-bold text-xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              Force Public
            </div>
          </SelectItem>
          <SelectItem value="PRIVATE" className="font-bold text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              Force Private
            </div>
          </SelectItem>
          <SelectItem value="LIMITED" className="font-bold text-xs">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-500" />
              Limited Only
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
