"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Save, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProductionRecordForm({ farmerId, defaultCrop }: { farmerId: string; defaultCrop?: string }) {
  const [loading, setLoading] = useState(false);
  const [season, setSeason] = useState<string>("2024 Main");
  const [cropType, setCropType] = useState<string>(defaultCrop ?? "");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<"ton" | "kg">("ton");
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    let qty = Number(quantity);
    if (!season.trim()) {
      toast.error("Please select a season.");
      setLoading(false);
      return;
    }
    if (!cropType.trim()) {
      toast.error("Please enter a crop type.");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(`Please enter a valid quantity (${unit === "ton" ? "tons" : "kg"}).`);
      setLoading(false);
      return;
    }
    if (unit === "kg") {
      qty = qty / 1000;
    }

    const payload = {
      farmerId,
      season: season.trim(),
      cropType: cropType.trim(),
      quantityTon: qty,
      status: "HARVESTED",
      actualHarvestDate: new Date().toISOString(),
    };

    const response = await apiFetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data?.message || "Failed to save record.");
      setLoading(false);
      return;
    }

    toast.success("Production record saved!");
    setSeason("2024 Main");
    setCropType(defaultCrop ?? "");
    setQuantity("");
    setUnit("ton");
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Save className="w-5 h-5 text-primary" />
          Record Production
        </CardTitle>
        <CardDescription>Submit your latest harvest yield data.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger id="season">
                  <SelectValue placeholder="Select Season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024 Main">2024 Main</SelectItem>
                  <SelectItem value="2024 Off">2024 Off</SelectItem>
                  <SelectItem value="2025 Pre">2025 Pre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropType">Crop Type</Label>
              <Input
                id="cropType"
                name="cropType"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                required
                placeholder="e.g. Rice"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="0.0"
                className="flex-1"
              />
              <Select value={unit} onValueChange={(v: "ton" | "kg") => setUnit(v)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ton">Tons (T)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : <Plus className="mr-2 w-4 h-4" />}
            Submit Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
