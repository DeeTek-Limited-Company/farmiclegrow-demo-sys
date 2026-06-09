"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Save } from "lucide-react";

interface PublicTracePolicy {
  showFarmer?: boolean;
  anonymizeFarmer?: boolean;
  showCooperativeName?: boolean;
  showCommunityName?: boolean;
  showCertifications?: boolean;
  showQuality?: boolean;
  qualityPrecision?: "SUMMARY" | "FULL";
  showLogistics?: boolean;
  logisticsPrecision?: "COARSE" | "EXACT";
  showMedia?: boolean;
  datePrecision?: "MONTH" | "EXACT";
  showLocation?: boolean;
  locationPrecision?: "REGION" | "DISTRICT" | "COMMUNITY";
}

export function PublicTraceSettings({ 
  initialEnabled, 
  initialPolicy 
}: { 
  initialEnabled: boolean; 
  initialPolicy: PublicTracePolicy 
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [policy, setPolicy] = useState<PublicTracePolicy>(initialPolicy);
  const [isSaving, setIsSaving] = useState(false);

  const updatePolicy = (key: keyof PublicTracePolicy, value: any) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/org/settings/trace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicTraceEnabled: enabled,
          publicTracePolicy: policy,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black">Public Trace Visibility</CardTitle>
            <CardDescription>Control what data is shown on the public QR verification page.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="trace-enabled" className="font-bold">Public Trace Enabled</Label>
            <Switch 
              id="trace-enabled" 
              checked={enabled} 
              onCheckedChange={setEnabled} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Farmer Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Farmer Information</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="showFarmer">Show Farmer Name</Label>
              <Switch 
                id="showFarmer" 
                checked={policy.showFarmer} 
                onCheckedChange={(v) => updatePolicy("showFarmer", v)} 
              />
            </div>
            {policy.showFarmer && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-slate-100">
                <Label htmlFor="anonymizeFarmer">Anonymize Farmer (Show Initials)</Label>
                <Switch 
                  id="anonymizeFarmer" 
                  checked={policy.anonymizeFarmer} 
                  onCheckedChange={(v) => updatePolicy("anonymizeFarmer", v)} 
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="showCooperativeName">Show Cooperative Name</Label>
              <Switch 
                id="showCooperativeName" 
                checked={policy.showCooperativeName} 
                onCheckedChange={(v) => updatePolicy("showCooperativeName", v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showCertifications">Show Certifications</Label>
              <Switch 
                id="showCertifications" 
                checked={policy.showCertifications} 
                onCheckedChange={(v) => updatePolicy("showCertifications", v)} 
              />
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Location & Precision</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="showLocation">Show Farm Location</Label>
              <Switch 
                id="showLocation" 
                checked={policy.showLocation} 
                onCheckedChange={(v) => updatePolicy("showLocation", v)} 
              />
            </div>
            {policy.showLocation && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                <Label>Location Precision</Label>
                <Select 
                  value={policy.locationPrecision} 
                  onValueChange={(v) => updatePolicy("locationPrecision", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGION">Region Level</SelectItem>
                    <SelectItem value="DISTRICT">District Level</SelectItem>
                    <SelectItem value="COMMUNITY">Community Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date Precision (Harvest/Processing)</Label>
              <Select 
                value={policy.datePrecision} 
                onValueChange={(v) => updatePolicy("datePrecision", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTH">Month/Year Only</SelectItem>
                  <SelectItem value="EXACT">Exact Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logistics & Quality */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Supply Chain Details</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="showLogistics">Show Logistics Timeline</Label>
              <Switch 
                id="showLogistics" 
                checked={policy.showLogistics} 
                onCheckedChange={(v) => updatePolicy("showLogistics", v)} 
              />
            </div>
            {policy.showLogistics && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                <Label>Logistics Precision</Label>
                <Select 
                  value={policy.logisticsPrecision} 
                  onValueChange={(v) => updatePolicy("logisticsPrecision", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COARSE">High-level Events</SelectItem>
                    <SelectItem value="EXACT">Detailed Stops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="showQuality">Show Quality Metrics</Label>
              <Switch 
                id="showQuality" 
                checked={policy.showQuality} 
                onCheckedChange={(v) => updatePolicy("showQuality", v)} 
              />
            </div>
            {policy.showQuality && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                <Label>Quality Precision</Label>
                <Select 
                  value={policy.qualityPrecision} 
                  onValueChange={(v) => updatePolicy("qualityPrecision", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUMMARY">Grade Only</SelectItem>
                    <SelectItem value="FULL">Raw Metrics (Moisture, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Media */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Media & Visuals</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="showMedia">Show Farm/Batch Photos</Label>
              <Switch 
                id="showMedia" 
                checked={policy.showMedia} 
                onCheckedChange={(v) => updatePolicy("showMedia", v)} 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            className="rounded-xl font-bold bg-primary hover:bg-primary/90 min-w-[140px]" 
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
