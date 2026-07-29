"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit3, CheckCircle2, Loader2, MapPin, User, Sprout, ShieldCheck } from "lucide-react";

export type SubmissionFarmerData = {
  id: string;
  fullName: string;
  phone: string | null;
  ghanaCardNumber: string | null;
  primaryCrop: string | null;
  secondaryCrops?: string[] | unknown;
  gender: string | null;
  dateOfBirth?: string | Date | null;
  bio: string | null;
  cooperativeName: string | null;
  farmProfiles: Array<{
    id?: string;
    farmName: string | null;
    farmType: string | null;
    farmSize: number | string | null;
    farmSizeUnit: string | null;
    ownershipType: string | null;
    irrigationType: string | null;
    numberOfPlots: number | null;
    locations: Array<{
      id?: string;
      community: string | null;
      district: string | null;
      region: string | null;
      address: string | null;
      latitude: number | string | null;
      longitude: number | string | null;
      isValidated: boolean | null;
    }>;
  }>;
};

export function SubmissionFarmerEditor({
  farmer,
  isPending,
}: {
  farmer: SubmissionFarmerData;
  isPending: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingGps, setValidatingGps] = useState(false);

  const profile = farmer.farmProfiles[0] || null;
  const location = profile?.locations?.[0] || null;

  // Form State
  const [fullName, setFullName] = useState(farmer.fullName || "");
  const [phone, setPhone] = useState(farmer.phone || "");
  const [ghanaCardNumber, setGhanaCardNumber] = useState(farmer.ghanaCardNumber || "");
  const [primaryCrop, setPrimaryCrop] = useState(farmer.primaryCrop || "");
  const [gender, setGender] = useState(farmer.gender || "");
  const [cooperativeName, setCooperativeName] = useState(farmer.cooperativeName || "");
  const [bio, setBio] = useState(farmer.bio || "");

  const [farmName, setFarmName] = useState(profile?.farmName || "");
  const [farmType, setFarmType] = useState(profile?.farmType || "");
  const [farmSize, setFarmSize] = useState(profile?.farmSize?.toString() || "");
  const [farmSizeUnit, setFarmSizeUnit] = useState(profile?.farmSizeUnit || "acres");
  const [ownershipType, setOwnershipType] = useState(profile?.ownershipType || "");
  const [irrigationType, setIrrigationType] = useState(profile?.irrigationType || "");
  const [numberOfPlots, setNumberOfPlots] = useState(profile?.numberOfPlots?.toString() || "");

  const [address, setAddress] = useState(location?.address || "");
  const [latitude, setLatitude] = useState(location?.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(location?.longitude?.toString() || "");
  const [isValidated, setIsValidated] = useState(Boolean(location?.isValidated));

  const handleQuickValidateGps = async () => {
    setValidatingGps(true);
    try {
      const res = await apiFetch(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            latitude: latitude ? Number(latitude) : location?.latitude ? Number(location.latitude) : 5.6037,
            longitude: longitude ? Number(longitude) : location?.longitude ? Number(location.longitude) : -0.187,
            isValidated: true,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to validate GPS");

      toast.success("GPS Location marked as Validated!");
      setIsValidated(true);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "GPS Validation failed");
    } finally {
      setValidatingGps(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const latNum = latitude.trim() !== "" ? Number(latitude) : undefined;
      const lngNum = longitude.trim() !== "" ? Number(longitude) : undefined;

      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        ghanaCardNumber: ghanaCardNumber.trim() || undefined,
        primaryCrop: primaryCrop.trim() || undefined,
        gender: gender.trim() || undefined,
        cooperativeName: cooperativeName.trim() || undefined,
        bio: bio.trim() || undefined,
        farmName: farmName.trim() || undefined,
        farmType: farmType.trim() || undefined,
        farmSize: farmSize.trim() !== "" ? Number(farmSize) : undefined,
        farmSizeUnit: farmSizeUnit || undefined,
        ownershipType: ownershipType.trim() || undefined,
        irrigationType: irrigationType.trim() || undefined,
        numberOfPlots: numberOfPlots.trim() !== "" ? Number(numberOfPlots) : undefined,
        location: {
          address: address.trim() || undefined,
          latitude: latNum,
          longitude: lngNum,
          isValidated,
        },
      };

      const res = await apiFetch(`/api/farmers/${farmer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update farmer details");

      toast.success("Farmer details updated successfully!");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl">
        <div className="space-y-1">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Farmer Details Review & Edit
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Admin can view and update farmer info or validate GPS prior to approval/rejection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {location && !location.isValidated && isPending ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-white border-none shadow-md"
              disabled={validatingGps}
              onClick={handleQuickValidateGps}
            >
              {validatingGps ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Quick Validate GPS
            </Button>
          ) : null}

          <Button
            size="sm"
            className="rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md"
            onClick={() => setOpen(true)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Details
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-primary" />
              Edit Farmer & Onboarding Details
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Modify any missing or incomplete onboarding details for {farmer.fullName} before approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Farmer Personal Details */}
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Full Name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Phone Number *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Ghana Card Number *</Label>
                  <Input value={ghanaCardNumber} onChange={(e) => setGhanaCardNumber(e.target.value)} placeholder="GHA-XXXXXXXXX-X" className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Primary Crop *</Label>
                  <Input value={primaryCrop} onChange={(e) => setPrimaryCrop(e.target.value)} placeholder="e.g. Maize, Cocoa" className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Gender</Label>
                  <Input value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Cooperative Name</Label>
                  <Input value={cooperativeName} onChange={(e) => setCooperativeName(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl font-bold min-h-[70px]" />
                </div>
              </CardContent>
            </Card>

            {/* Farm Profile Information */}
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-primary" />
                  Farm Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Farm Name *</Label>
                  <Input value={farmName} onChange={(e) => setFarmName(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Farm Type</Label>
                  <Input value={farmType} onChange={(e) => setFarmType(e.target.value)} placeholder="e.g. Crop, Livestock" className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Farm Size</Label>
                  <Input type="number" step="any" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Farm Size Unit</Label>
                  <Input value={farmSizeUnit} onChange={(e) => setFarmSizeUnit(e.target.value)} placeholder="acres or hectares" className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Ownership Type</Label>
                  <Input value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} placeholder="Owned, Rented, Family" className="rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Irrigation Type</Label>
                  <Input value={irrigationType} onChange={(e) => setIrrigationType(e.target.value)} placeholder="Rain-fed, Irrigated, Mixed" className="rounded-xl font-bold" />
                </div>
              </CardContent>
            </Card>

            {/* Location & GPS Validation */}
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location & GPS Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Latitude</Label>
                    <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 5.6037" className="rounded-xl font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Longitude</Label>
                    <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. -0.1870" className="rounded-xl font-bold" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Address / Description</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl font-bold" />
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900">GPS Validation Status</div>
                    <div className="text-xs text-slate-500">Toggle to mark GPS location as verified and clear the validation blocker.</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={isValidated ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" : "bg-amber-50 text-amber-700 border-amber-200 font-bold"}>
                      {isValidated ? "VALIDATED" : "UNVALIDATED"}
                    </Badge>
                    <Switch checked={isValidated} onCheckedChange={setIsValidated} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl font-black bg-primary hover:bg-primary/90" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
