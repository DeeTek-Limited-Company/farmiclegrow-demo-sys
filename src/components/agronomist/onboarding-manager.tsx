"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { FarmerOnboardingWizard } from "./farmer-onboarding-wizard";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Edit,
  Trash2,
  UserPlus,
  Save,
  User,
  Plus
} from "lucide-react";

type FarmerRecord = {
  id: string;
  fullName: string;
  phone: string | null;
  gender: string | null;
  bio: string | null;
  externalRef: string | null;
  primaryCrop: string | null;
  farmProfiles: Array<{
    id: string;
    farmName: string;
    farmSize: string | null;
    farmSizeUnit: string | null;
    ownershipType: string | null;
    irrigationType: string | null;
    numberOfPlots: number | null;
    totalAreaHectare: string | null;
    locations: Array<{
      id: string;
      latitude: string | null;
      longitude: string | null;
      address: string | null;
    }>;
  }>;
  submissions: Array<{
    id: string;
    status: string;
    submittedAt: string;
  }>;
};

type OnboardingManagerView = "all" | "queue" | "approved";

function getStatusColor(status: string | undefined) {
  switch (status) {
    case "APPROVED": return "bg-green-100 text-green-700 border-green-200";
    case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
    case "PENDING_REVIEW": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function normalizeStatus(status: string | undefined) {
  if (!status) return "No submission";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OnboardingManager({
  initialRecords,
  view = "all",
}: {
  initialRecords: FarmerRecord[];
  view?: OnboardingManagerView;
}) {
  const [records, setRecords] = useState<FarmerRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);

  const filteredRecords = useMemo(() => {
    if (view === "approved") {
      return records.filter(r => r.submissions[0]?.status === "APPROVED");
    }
    if (view === "queue") {
      return records.filter(r => r.submissions[0]?.status === "PENDING_REVIEW" || !r.submissions[0]);
    }
    return records;
  }, [records, view]);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewingFarmer, setViewingFarmer] = useState<FarmerRecord | null>(null);

  async function loadFarmers() {
    setLoading(true);
    try {
      const response = await apiFetch("/api/farmers", { method: "GET" });
      if (!response.ok) {
        toast.error("Failed to load farmer records.");
        return;
      }
      const payload = await response.json();
      setRecords(payload.farmers);
    } catch (error) {
      console.error("Failed to load farmers", error);
      toast.error("An error occurred while loading farmers.");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteFarmer(farmerId: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;

    const response = await apiFetch(`/api/farmers/${farmerId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.message ?? "Unable to delete farmer record.");
      return;
    }

    toast.success("Farmer record deleted.");
    await loadFarmers();
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  // Manage body class to hide mobile nav when wizard is open
  useEffect(() => {
    if (isWizardOpen) {
      document.body.classList.add("wizard-open");
    } else {
      document.body.classList.remove("wizard-open");
    }
    return () => document.body.classList.remove("wizard-open");
  }, [isWizardOpen]);

  return (
    <div className="space-y-8 relative">
      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-24 right-6 z-50">
        <Button 
          onClick={() => setIsWizardOpen(true)}
          className="w-16 h-16 rounded-full bg-primary text-white shadow-[0_12px_48px_-12px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Farmer Onboarding</h1>
          <p className="text-primary-foreground/80 font-medium">Manage and register new farmers to the FarmicleGrow platform.</p>
        </div>
        
        <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-white text-primary hover:bg-slate-50 rounded-2xl font-bold px-8 shadow-lg shadow-black/10">
              <UserPlus className="w-5 h-5 mr-2" />
              Register New Farmer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl p-0 border-none bg-transparent shadow-none top-20 translate-y-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sr-only">
              <DialogTitle>Farmer Onboarding Wizard</DialogTitle>
              <DialogDescription>Complete the 6 steps to register a new farmer.</DialogDescription>
            </div>
            <FarmerOnboardingWizard onSuccess={() => {
              setIsWizardOpen(false);
              loadFarmers();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Farmers List Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800">
              {view === "approved" ? "Registered Farmers" : 
               view === "queue" ? "Onboarding Queue" : 
               "Full Database"}
            </h2>
            <p className="text-sm text-slate-500">
              {view === "approved" ? "All farmers with approved records." : 
               view === "queue" ? "Farmers currently in the review process." : 
               "View and manage all registered farmer profiles."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadFarmers} disabled={loading} className="rounded-xl font-bold text-[10px] uppercase tracking-widest">
            {loading ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Refresh List
          </Button>
        </div>

        {loading && records.length === 0 ? (
          <div className="flex justify-center py-20">
            <Spinner className="w-10 h-10 text-primary" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="p-20 text-center text-muted-foreground bg-slate-50 border-dashed rounded-[2rem]">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-slate-100 rounded-full">
                <UserPlus className="w-10 h-10 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800">
                  {view === "approved" ? "No approved farmers" : 
                   view === "queue" ? "Queue is empty" : 
                   "No farmers registered yet"}
                </p>
                <p className="text-sm">
                  {view === "all" ? "Click the button above to start onboarding your first farmer." : "Try switching filters or registering a new farmer."}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map((record) => {
              const latestSubmission = record.submissions[0];
              const profile = record.farmProfiles[0];
              return (
                <Card key={record.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 bg-white rounded-3xl overflow-hidden shadow-md">
                  <div className={cn("h-2 w-full", getStatusColor(latestSubmission?.status).split(' ')[0])} />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold text-slate-800">{record.fullName}</CardTitle>
                        <Badge variant="outline" className={cn("rounded-lg text-[10px] font-bold uppercase px-2 py-0.5", getStatusColor(latestSubmission?.status))}>
                          {normalizeStatus(latestSubmission?.status)}
                        </Badge>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                        <User className="w-5 h-5 text-slate-400 group-hover:text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Farm</p>
                        <p className="font-semibold text-slate-700 truncate">{profile?.farmName ?? "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Primary Crop</p>
                        <p className="font-semibold text-slate-700 truncate">{record.primaryCrop ?? "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Contact</p>
                        <p className="font-semibold text-slate-700 text-xs truncate">{record.phone ?? "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Area</p>
                        <p className="font-semibold text-slate-700 truncate">{profile?.totalAreaHectare ?? "0"} ha</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-50">
                      <Button variant="secondary" size="sm" className="flex-1 rounded-xl font-bold text-xs" onClick={() => setViewingFarmer(record)}>
                        <Edit className="w-3 h-3 mr-2" /> View Details
                      </Button>
                      <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDeleteFarmer(record.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Farmer Details Sheet */}
      <Sheet open={!!viewingFarmer} onOpenChange={(open) => !open && setViewingFarmer(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold">{viewingFarmer?.fullName}</SheetTitle>
            <SheetDescription>
              {viewingFarmer?.submissions[0] 
                ? `Status: ${normalizeStatus(viewingFarmer.submissions[0].status)}`
                : "No submission yet"}
            </SheetDescription>
          </SheetHeader>

          {viewingFarmer && (() => {
            const profile = viewingFarmer.farmProfiles[0];
            const location = profile?.locations[0];
            const submission = viewingFarmer.submissions[0];
            return (
              <div className="space-y-6">
                {/* Status Badge */}
                <Badge variant="outline" className={cn("rounded-lg text-xs font-bold uppercase px-3 py-1", getStatusColor(submission?.status))}>
                  {normalizeStatus(submission?.status)}
                </Badge>

                {/* Personal Info */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Phone</p>
                      <p className="font-semibold text-slate-700">{viewingFarmer.phone ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Gender</p>
                      <p className="font-semibold text-slate-700">{viewingFarmer.gender ?? "N/A"}</p>
                    </div>
                  </div>
                  {viewingFarmer.bio && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Bio</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{viewingFarmer.bio}</p>
                    </div>
                  )}
                </div>

                {/* Farm Info */}
                {profile && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Farm Profile</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Farm Name</p>
                        <p className="font-semibold text-slate-700">{profile.farmName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Primary Crop</p>
                        <p className="font-semibold text-slate-700">{viewingFarmer.primaryCrop ?? "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Area (ha)</p>
                        <p className="font-semibold text-slate-700">{profile.totalAreaHectare ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Info */}
                {location && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</h3>
                    {location.address && <p className="text-sm font-medium text-slate-700">{location.address}</p>}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Latitude</p>
                        <p className="font-mono text-slate-600">{location.latitude ?? "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Longitude</p>
                        <p className="font-mono text-slate-600">{location.longitude ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submission Info */}
                {submission && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Submission</h3>
                    <div className="text-sm">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Submitted At</p>
                      <p className="font-medium text-slate-700">{new Date(submission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  </div>
                )}

                <Button 
                  variant="destructive" 
                  className="w-full rounded-2xl" 
                  onClick={() => { setViewingFarmer(null); onDeleteFarmer(viewingFarmer.id); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Farmer Record
                </Button>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
