"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  MapPin, 
  Sprout, 
  Trees, 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2,
  Calendar,
  Camera,
  Info,
  Copy,
  Locate,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  farmerOnboardingSchema, 
  type FarmerOnboardingData,
  personalSchema,
  locationSchema,
  farmSchema,
  cropsSchema
} from "@/lib/validations/onboarding-schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CROP_OPTIONS } from "@/lib/crops";

const STORAGE_KEY = "farmiclegrow_onboarding_draft";

const steps = [
  { id: "personal", title: "Personal Info", description: "Identity & contact details", icon: User, schema: personalSchema },
  { id: "location", title: "Location", description: "Farm geography & region", icon: MapPin, schema: locationSchema },
  { id: "farm", title: "Farm Profile", description: "Land size & ownership", icon: Sprout, schema: farmSchema },
  { id: "crops", title: "Crops", description: "Primary & secondary crops", icon: Trees, schema: cropsSchema },
  { id: "certifications", title: "Certifications", description: "Quality standards & awards", icon: Award },
  { id: "review", title: "Review", description: "Final verification", icon: CheckCircle2 },
];

export function FarmerOnboardingWizard({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsBestAccuracy, setGpsBestAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("");
  const watchIdRef = useRef<number | null>(null);
  const [uploadingGhanaCard, setUploadingGhanaCard] = useState(false);
  const [uploadingFarmSite, setUploadingFarmSite] = useState(false);
  const [districts, setDistricts] = useState<{ id: string; name: string; region: { id: string; name: string } }[]>([]);
  const [communities, setCommunities] = useState<{ id: string; name: string; districtId: string }[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const ghanaCardInputRef = useRef<HTMLInputElement | null>(null);
  const farmSiteInputRef = useRef<HTMLInputElement | null>(null);

  const stopWatchingLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setGpsStatus("Getting GPS fix...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setValue("location.latitude", latitude);
        setValue("location.longitude", longitude);
        setGpsAccuracy(Number.isFinite(accuracy) ? accuracy : null);
        setGpsBestAccuracy(Number.isFinite(accuracy) ? accuracy : null);
        setGpsStatus("");
        setIsLocating(false);
        toast.success("GPS location captured");
      },
      (error) => {
        setIsLocating(false);
        setGpsStatus("");
        toast.error("Failed to capture location: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const refineGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    stopWatchingLocation();
    setIsLocating(true);
    setGpsStatus("Refining GPS accuracy...");
    setGpsBestAccuracy(null);

    const startedAt = Date.now();
    const maxMs = 25000;
    const goodEnoughMeters = 25;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const meters = Number.isFinite(accuracy) ? accuracy : null;
        if (meters !== null) setGpsAccuracy(meters);

        const best = gpsBestAccuracy;
        const isBetter = meters !== null && (best === null || meters < best);

        if (isBetter) {
          setGpsBestAccuracy(meters);
          setValue("location.latitude", latitude);
          setValue("location.longitude", longitude);
        }

        const elapsed = Date.now() - startedAt;
        if ((meters !== null && meters <= goodEnoughMeters) || elapsed >= maxMs) {
          stopWatchingLocation();
          setIsLocating(false);
          setGpsStatus("");
          toast.success("GPS location refined");
        }
      },
      (error) => {
        stopWatchingLocation();
        setIsLocating(false);
        setGpsStatus("");
        toast.error("Failed to refine GPS: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FarmerOnboardingData>({
    // Removed global resolver to prevent full-form validation on each step
    defaultValues: initialData ? {
      personal: {
        fullName: initialData.fullName || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        cooperativeName: initialData.cooperativeName || "",
        gender: initialData.gender || "Male",
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : "",
        ghanaCardNumber: initialData.ghanaCardNumber || "",
        bio: initialData.bio || "",
        ghanaCardPhotoUrl: initialData.ghanaCardPhotoUrl || ""
      },
      location: {
        districtId: initialData.community?.districtId || "",
        communityId: initialData.communityId || "",
        region: initialData.community?.district?.region?.name || "",
        district: initialData.community?.district?.name || "",
        community: initialData.community?.name || "",
        latitude: initialData.farmProfiles?.[0]?.locations?.[0]?.latitude || undefined,
        longitude: initialData.farmProfiles?.[0]?.locations?.[0]?.longitude || undefined,
      },
      farm: {
        farmName: initialData.farmProfiles?.[0]?.farmName || "",
        farmSize: Number(initialData.farmProfiles?.[0]?.farmSize) || 0,
        farmSizeUnit: initialData.farmProfiles?.[0]?.farmSizeUnit || "acres",
        ownershipType: initialData.farmProfiles?.[0]?.ownershipType || "Owned",
        irrigationType: initialData.farmProfiles?.[0]?.irrigationType || "Rain-fed",
        farmSitePhotoUrl: initialData.farmProfiles?.[0]?.farmSitePhotoUrl || ""
      },
      crops: {
        primaryCrop: initialData.primaryCrop || "",
        secondaryCrops: initialData.secondaryCrops || []
      },
      certifications: initialData.certifications || [],
    } : {
      personal: { fullName: "", phone: "", email: "", cooperativeName: "", gender: "Male", ghanaCardPhotoUrl: "", bio: "", dateOfBirth: "", ghanaCardNumber: "" },
      location: { districtId: "", communityId: "", region: "", district: "", community: "" },
      farm: { farmName: "", farmSize: 0, farmSizeUnit: "acres", ownershipType: "Owned", irrigationType: "Rain-fed", farmSitePhotoUrl: "" },
      crops: { primaryCrop: "", secondaryCrops: [] },
      certifications: [],
    },
  });

  const isFirstLoadRef = useRef(true);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "certifications",
  });

  const nextStep = async () => {
    const step = steps[currentStep];
    
    if (step.schema) {
      const stepData = getValues(step.id as any);
      const result = step.schema.safeParse(stepData);
      
      if (!result.success) {
        // Clear previous errors for this step
        clearErrors(step.id as any);
        
        // Map Zod errors to React Hook Form errors
        result.error.issues.forEach((issue) => {
          const path = issue.path.length ? `${step.id}.${issue.path.join(".")}` : String(step.id);
          setError(path as any, {
            type: "manual",
            message: issue.message,
          });
        });
        
        const first = result.error.issues[0];
        const field = first?.path?.[0] ? String(first.path[0]) : null;
        const message = first?.message ? (field ? `${step.title}: ${first.message}` : first.message) : `Please complete the ${step.title} section.`;
        toast.error(message);
        return;
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string; farmerName: string } | null>(null);
  const [secondaryCropDraft, setSecondaryCropDraft] = useState<string>("");

  const onSubmit = async (data: FarmerOnboardingData) => {
    setIsSubmitting(true);
    try {
      const method = initialData ? "PUT" : "POST";
      const url = initialData ? `/api/farmers/${initialData.id}` : "/api/farmers";

      const payload = {
        ...data.personal,
        ...data.farm,
        districtId: data.location.districtId,
        communityId: data.location.communityId,
        location: data.location,
        crops: data.crops,
        certifications: data.certifications,
        // Flatten crops for PUT schema
        ...(initialData ? {
          primaryCrop: data.crops.primaryCrop,
          secondaryCrops: data.crops.secondaryCrops,
        } : {})
      };

      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to save farmer record.");
      }

      const result = await response.json();

      if (!initialData && result.tempPassword) {
        // Show credentials screen before closing
        clearDraft();
        setCredentials({
          email: result.email,
          tempPassword: result.tempPassword,
          farmerName: result.farmer?.fullName ?? data.personal.fullName,
        });
      } else {
        clearDraft();
        toast.success(initialData ? "Farmer updated successfully!" : "Farmer onboarded successfully!");
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message ?? "Error submitting form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadFile = async (file: File, kind: "docs" | "photos" | "certs") => {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    const res = await apiFetch("/api/uploads/image", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Upload failed");
    if (!json?.url) throw new Error("Upload failed");
    return String(json.url);
  };

  const ghanaCardPhotoUrl = watch("personal.ghanaCardPhotoUrl");
  const farmSitePhotoUrl = watch("farm.farmSitePhotoUrl");

  const pickGhanaCard = () => ghanaCardInputRef.current?.click();
  const pickFarmSite = () => farmSiteInputRef.current?.click();

  const onPickGhanaCardFile = async (file: File | null) => {
    if (!file) return;
    setUploadingGhanaCard(true);
    try {
      const url = await uploadFile(file, "docs");
      setValue("personal.ghanaCardPhotoUrl", url);
      toast.success("Ghana Card photo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUploadingGhanaCard(false);
      if (ghanaCardInputRef.current) ghanaCardInputRef.current.value = "";
    }
  };

  const onPickFarmSiteFile = async (file: File | null) => {
    if (!file) return;
    setUploadingFarmSite(true);
    try {
      const url = await uploadFile(file, "photos");
      setValue("farm.farmSitePhotoUrl", url);
      toast.success("Farm site photo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUploadingFarmSite(false);
      if (farmSiteInputRef.current) farmSiteInputRef.current.value = "";
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  // --- Draft Persistence Logic ---
  const formData = watch();

  // Save draft on change
  useEffect(() => {
    if (!initialData && !isSubmitting && !credentials) {
      const draft = {
        data: formData,
        step: currentStep,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [formData, currentStep, initialData, isSubmitting, credentials]);

  // Load draft on mount
  useEffect(() => {
    if (!initialData) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { data, step, timestamp } = JSON.parse(saved);
          // Only offer to resume if it's less than 24 hours old
          const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
          
          if (isRecent && data) {
            toast("Found an unfinished draft", {
              description: "Would you like to resume where you left off?",
              action: {
                label: "Resume",
                onClick: () => {
                  Object.entries(data).forEach(([key, value]) => {
                    setValue(key as any, value);
                  });
                  setCurrentStep(step || 0);
                  toast.success("Draft restored!");
                },
              },
              duration: 10000,
            });
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [initialData, setValue]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    const loadDistricts = async () => {
      setDistrictsLoading(true);
      try {
        const res = await apiFetch("/api/districts");
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || `Failed to load districts (${res.status})`);
        }
        const json = await res.json();
        setDistricts(json.districts || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };
    void loadDistricts();
  }, []);

  const selectedDistrictId = watch("location.districtId");

  useEffect(() => {
    const loadCommunities = async () => {
      if (!selectedDistrictId) {
        setCommunities([]);
        if (!isFirstLoadRef.current) {
          setValue("location.communityId", "");
          setValue("location.community", "");
        }
        return;
      }

      const district = districts.find((d) => d.id === selectedDistrictId);
      if (district) {
        setValue("location.district", district.name);
        setValue("location.region", district.region.name);
      }

      setCommunitiesLoading(true);
      try {
        const res = await apiFetch(`/api/communities?districtId=${encodeURIComponent(selectedDistrictId)}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || `Failed to load communities (${res.status})`);
        }
        const json = await res.json();
        setCommunities((json.communities || []).map((c: any) => ({ id: c.id, name: c.name, districtId: c.districtId })));
        
        if (!isFirstLoadRef.current) {
          setValue("location.communityId", "");
          setValue("location.community", "");
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load communities");
      } finally {
        setCommunitiesLoading(false);
        isFirstLoadRef.current = false;
      }
    };
    void loadCommunities();
  }, [selectedDistrictId, districts, setValue]);

  // --- Credentials screen shown after successful submission ---
  if (credentials) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Farmer Registered!</h2>
            <p className="text-primary-foreground/80 mt-1 text-sm">
              Share these login details with <span className="font-semibold text-white">{credentials.farmerName}</span>
            </p>
          </div>

          {/* Credentials */}
          <div className="p-8 space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-700 text-sm">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Copy these credentials now — the password will <strong>not</strong> be shown again. The farmer must change it on first login.</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email / Login</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={credentials.email}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Email copied!"); }}
                  className="p-3 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Temporary Password</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={credentials.tempPassword}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-blue-700 font-mono font-bold text-sm tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(credentials.tempPassword); toast.success("Password copied!"); }}
                  className="p-3 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { onSuccess(); setCredentials(null); }}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-colors mt-2"
            >
              Done — Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 pt-16 lg:pt-24">
      {/* Stepper Header - Repositioned and with extra top margin to avoid address bar */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6 px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
              <div 
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  index <= currentStep 
                    ? "bg-primary text-white shadow-lg ring-4 ring-primary/20" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={cn(
                "text-[8px] sm:text-[10px] uppercase font-black mt-2 text-center line-clamp-1 max-w-[60px] sm:max-w-none",
                index <= currentStep ? "text-primary" : "text-muted-foreground",
                index !== currentStep && "hidden md:block"
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1.5 bg-slate-100" />
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-white overflow-hidden rounded-[2.5rem]">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log("Validation Errors:", errors);
            toast.error("Please check the form for errors before completing.");
          })}>
            <div className="min-h-[500px] p-8 md:p-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* STEP 1: Personal */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Personal Information</h2>
                          <p className="text-slate-500 text-sm">Basic identity details for the farmer record.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input 
                            id="fullName" 
                            placeholder="e.g. Samuel Adjetey" 
                            {...register("personal.fullName")}
                            className={cn("rounded-xl border-slate-300 focus:ring-primary/20", errors.personal?.fullName && "border-red-500")}
                          />
                          {errors.personal?.fullName && <p className="text-red-500 text-[10px] mt-1">{errors.personal.fullName.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            placeholder="+233 24 000 0000" 
                            {...register("personal.phone")}
                            className={cn("rounded-xl border-slate-300", errors.personal?.phone && "border-red-500")}
                          />
                          {errors.personal?.phone && <p className="text-red-500 text-[10px] mt-1">{errors.personal.phone.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address (Optional)</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="farmer@example.com" 
                            {...register("personal.email")}
                            className="rounded-xl border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cooperativeName">Cooperative Name (Optional)</Label>
                          <Input
                            id="cooperativeName"
                            placeholder="e.g. Ahafo Cocoa Cooperative"
                            {...register("personal.cooperativeName")}
                            className="rounded-xl border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select onValueChange={(v) => setValue("personal.gender", v)} defaultValue={getValues("personal.gender")}>
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input 
                            id="dob" 
                            type="date" 
                            {...register("personal.dateOfBirth")}
                            className="rounded-xl border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ghanaCard">Ghana Card Number</Label>
                          <Input 
                            id="ghanaCard" 
                            placeholder="GHA-123456789-0" 
                            {...register("personal.ghanaCardNumber")}
                            className={cn("rounded-xl border-slate-300", errors.personal?.ghanaCardNumber && "border-red-500")}
                          />
                          {errors.personal?.ghanaCardNumber ? (
                            <p className="text-red-500 text-[10px] mt-1">{errors.personal.ghanaCardNumber.message}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-1">Format: GHA-XXXXXXXXX-X</p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="bio">Farmer Bio (Optional)</Label>
                          <Textarea 
                            id="bio" 
                            placeholder="Briefly describe the farmer's history, experience, or specialized knowledge..." 
                            {...register("personal.bio")}
                            className="rounded-xl border-slate-300 min-h-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Location */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Location Information</h2>
                          <p className="text-slate-500 text-sm">Where the farm is physically located.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="districtId">District</Label>
                          <Select
                            value={watch("location.districtId")}
                            onValueChange={(v) => setValue("location.districtId", v)}
                          >
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue placeholder={districtsLoading ? "Loading..." : "Select district"} />
                            </SelectTrigger>
                            <SelectContent>
                              {districts.length === 0 ? (
                                <div className="p-4 text-xs font-bold text-slate-500 text-center">
                                  No districts available. Ask an admin to assign you to a district.
                                </div>
                              ) : (
                                districts.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.region.name} · {d.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {errors.location?.districtId && <p className="text-red-500 text-[10px] mt-1">{errors.location.districtId.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="communityId">Community</Label>
                          <Select
                            value={watch("location.communityId")}
                            onValueChange={(v) => {
                              setValue("location.communityId", v);
                              const c = communities.find((x) => x.id === v);
                              setValue("location.community", c?.name || "");
                            }}
                            disabled={!watch("location.districtId")}
                          >
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue
                                placeholder={
                                  !watch("location.districtId")
                                    ? "Select district first"
                                    : communitiesLoading
                                      ? "Loading..."
                                      : "Select community"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {communities.length === 0 ? (
                                <div className="p-4 text-xs font-bold text-slate-500 text-center">
                                  No communities found for this district.
                                </div>
                              ) : (
                                communities.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {errors.location?.communityId && <p className="text-red-500 text-[10px] mt-1">{errors.location.communityId.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="region">Region (auto)</Label>
                          <Input
                            id="region"
                            value={watch("location.region") || ""}
                            readOnly
                            className="rounded-xl border-slate-300 bg-slate-50"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="lat">GPS Coordinates (Auto or Manual)</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={captureLocation}
                                disabled={isLocating}
                                className="h-8 rounded-lg bg-primary/5 border-primary/20 text-primary font-bold"
                              >
                                {isLocating ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                ) : (
                                  <Locate className="w-3.5 h-3.5 mr-2" />
                                )}
                                Capture GPS
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={refineGpsLocation}
                                disabled={isLocating}
                                className="h-8 rounded-lg border-slate-200 font-bold"
                              >
                                Refine
                              </Button>
                            </div>
                          </div>
                          {gpsStatus ? <div className="text-xs font-bold text-slate-500">{gpsStatus}</div> : null}
                          {gpsAccuracy !== null ? (
                            <div className="text-xs font-bold text-slate-500">
                              Accuracy: ~{Math.round(gpsAccuracy)}m{gpsBestAccuracy !== null ? ` · Best: ~${Math.round(gpsBestAccuracy)}m` : ""}
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Latitude</span>
                              <Input 
                                id="lat" 
                                type="number" 
                                step="0.000001" 
                                {...register("location.latitude", { valueAsNumber: true })}
                                className="rounded-xl border-slate-300"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Longitude</span>
                              <Input 
                                id="lng" 
                                type="number" 
                                step="0.000001" 
                                {...register("location.longitude", { valueAsNumber: true })}
                                className="rounded-xl border-slate-300"
                              />
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const lat = watch("location.latitude");
                          const lng = watch("location.longitude");
                          if (lat === undefined || lat === null || lng === undefined || lng === null) return null;
                          const latNum = Number(lat);
                          const lngNum = Number(lng);
                          if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
                          const delta = 0.01;
                          const left = lngNum - delta;
                          const right = lngNum + delta;
                          const bottom = latNum - delta;
                          const top = latNum + delta;
                          const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                            `${left},${bottom},${right},${top}`,
                          )}&layer=mapnik&marker=${encodeURIComponent(`${latNum},${lngNum}`)}`;
                          const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${latNum},${lngNum}`)}`;
                          return (
                            <div className="space-y-2 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Map preview</Label>
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-primary underline"
                                >
                                  Open in Maps
                                </a>
                              </div>
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <iframe title="Farm location" src={src} className="h-64 w-full" loading="lazy" />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Farm Profile */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <Sprout className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Farm Profile</h2>
                          <p className="text-slate-500 text-sm">General characteristics of the farm operations.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="farmName">Farm Name</Label>
                          <Input 
                            id="farmName" 
                            placeholder="e.g. Sunrise Organic Farm" 
                            {...register("farm.farmName")}
                            className="rounded-xl border-slate-300"
                          />
                          {errors.farm?.farmName && <p className="text-red-500 text-[10px] mt-1">{errors.farm.farmName.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="farmSize">Farm Size</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="farmSize" 
                              type="number" 
                              step="0.1" 
                              {...register("farm.farmSize")}
                              className="rounded-xl border-slate-300 flex-1"
                            />
                            <Select onValueChange={(v) => setValue("farm.farmSizeUnit", v as any)} defaultValue={getValues("farm.farmSizeUnit")}>
                              <SelectTrigger className="w-40 rounded-xl border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="acres">Acres</SelectItem>
                                <SelectItem value="hectares">Hectares</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.farm?.farmSize && <p className="text-red-500 text-[10px] mt-1">{errors.farm.farmSize.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ownership">Land Ownership</Label>
                          <Select onValueChange={(v) => setValue("farm.ownershipType", v as any)} defaultValue={getValues("farm.ownershipType")}>
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Owned">Owned</SelectItem>
                              <SelectItem value="Rented">Rented</SelectItem>
                              <SelectItem value="Family">Family Land</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="plots">Number of Plots</Label>
                          <Input 
                            id="plots" 
                            type="number" 
                            {...register("farm.numberOfPlots")}
                            className="rounded-xl border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="irrigation">Irrigation Type</Label>
                          <Select onValueChange={(v) => setValue("farm.irrigationType", v as any)} defaultValue={getValues("farm.irrigationType")}>
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rain-fed">Rain-fed</SelectItem>
                              <SelectItem value="Irrigated">Irrigated</SelectItem>
                              <SelectItem value="Mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Crops */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <Trees className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Crops</h2>
                          <p className="text-slate-500 text-sm">Capture the farmer's primary crop and optional secondary crops.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="primaryCrop">Primary Crop</Label>
                          <Select
                            value={watch("crops.primaryCrop")}
                            onValueChange={(v) => setValue("crops.primaryCrop", v)}
                          >
                            <SelectTrigger className="rounded-xl border-slate-300">
                              <SelectValue placeholder="Select crop" />
                            </SelectTrigger>
                            <SelectContent>
                              {CROP_OPTIONS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.crops?.primaryCrop && <p className="text-red-500 text-[10px] mt-1">{errors.crops.primaryCrop.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="secondaryCrops">Secondary Crops (optional)</Label>
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <Select value={secondaryCropDraft} onValueChange={setSecondaryCropDraft}>
                                <SelectTrigger className="rounded-xl border-slate-300 flex-1">
                                  <SelectValue placeholder="Select and add" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CROP_OPTIONS.filter((c) => c !== watch("crops.primaryCrop")).map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                  const value = secondaryCropDraft;
                                  if (!value) return;
                                  const existing = watch("crops.secondaryCrops") || [];
                                  if (!existing.includes(value)) {
                                    setValue("crops.secondaryCrops", [...existing, value]);
                                  }
                                  setSecondaryCropDraft("");
                                }}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(watch("crops.secondaryCrops") || []).map((c) => (
                                <Badge
                                  key={c}
                                  variant="secondary"
                                  className="rounded-full cursor-pointer"
                                  onClick={() => {
                                    const next = (watch("crops.secondaryCrops") || []).filter((x) => x !== c);
                                    setValue("crops.secondaryCrops", next);
                                  }}
                                >
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Certifications */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Certifications</h2>
                          <p className="text-slate-500 text-sm">Add any agricultural certifications the farmer holds.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Camera className="w-5 h-5" />
                            <h3 className="font-bold">Ghana Card Photo</h3>
                          </div>
                          <input
                            ref={ghanaCardInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => onPickGhanaCardFile(e.target.files?.[0] ?? null)}
                          />
                          <div
                            className={cn(
                              "h-32 border-2 rounded-xl flex flex-col items-center justify-center bg-white group cursor-pointer transition-all relative overflow-hidden",
                              ghanaCardPhotoUrl ? "border-primary/30" : "border-dashed border-primary/20 hover:border-primary/40"
                            )}
                            style={ghanaCardPhotoUrl ? { backgroundImage: `url(${ghanaCardPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                            onClick={pickGhanaCard}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? pickGhanaCard() : null)}
                          >
                            <div className={cn("absolute inset-0", ghanaCardPhotoUrl ? "bg-black/30" : "bg-transparent")} />
                            <div className="relative z-10 flex flex-col items-center justify-center">
                              {uploadingGhanaCard ? (
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                              ) : (
                                <Plus className={cn("w-6 h-6 transition-colors", ghanaCardPhotoUrl ? "text-white" : "text-primary/40 group-hover:text-primary")} />
                              )}
                              <span className={cn("text-[10px] font-black uppercase tracking-widest mt-2", ghanaCardPhotoUrl ? "text-white" : "text-primary/40 group-hover:text-primary")}>
                                {ghanaCardPhotoUrl ? "Replace Image" : "Upload Image"}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic font-medium text-center">Required for verification</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-5 h-5" />
                            <h3 className="font-bold">Farm Site Photo</h3>
                          </div>
                          <input
                            ref={farmSiteInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => onPickFarmSiteFile(e.target.files?.[0] ?? null)}
                          />
                          <div
                            className={cn(
                              "h-32 border-2 rounded-xl flex flex-col items-center justify-center bg-white group cursor-pointer transition-all relative overflow-hidden",
                              farmSitePhotoUrl ? "border-slate-300" : "border-dashed border-slate-200 hover:border-slate-300"
                            )}
                            style={farmSitePhotoUrl ? { backgroundImage: `url(${farmSitePhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                            onClick={pickFarmSite}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? pickFarmSite() : null)}
                          >
                            <div className={cn("absolute inset-0", farmSitePhotoUrl ? "bg-black/25" : "bg-transparent")} />
                            <div className="relative z-10 flex flex-col items-center justify-center">
                              {uploadingFarmSite ? (
                                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                              ) : (
                                <Plus className={cn("w-6 h-6 transition-colors", farmSitePhotoUrl ? "text-white" : "text-slate-300 group-hover:text-slate-400")} />
                              )}
                              <span className={cn("text-[10px] font-black uppercase tracking-widest mt-2", farmSitePhotoUrl ? "text-white" : "text-slate-400 group-hover:text-slate-500")}>
                                {farmSitePhotoUrl ? "Replace Image" : "Upload Image"}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic font-medium text-center">Recommended for quality score</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-slate-400" />
                          <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Other Certifications</h3>
                        </div>
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-6 rounded-2xl bg-slate-100/80 border border-slate-200 relative group animate-in slide-in-from-right-2 duration-300">
                            <button 
                              type="button" 
                              onClick={() => remove(index)}
                              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Certification Name</Label>
                                <Input 
                                  {...register(`certifications.${index}.name` as const)}
                                  placeholder="e.g. Fairtrade, Rainforest Alliance"
                                  className="rounded-xl bg-white"
                                />
                                {errors.certifications?.[index]?.name && <p className="text-red-500 text-[10px] mt-1">{errors.certifications[index].name.message}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label>Issuing Body</Label>
                                <Input 
                                  {...register(`certifications.${index}.issuingBody` as const)}
                                  placeholder="e.g. FLOCERT"
                                  className="rounded-xl bg-white"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input 
                                  type="date"
                                  {...register(`certifications.${index}.expiryDate` as const)}
                                  className="rounded-xl bg-white"
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Document (optional)</Label>
                                <Input
                                  type="file"
                                  accept="application/pdf,image/jpeg,image/png"
                                  className="rounded-xl bg-white"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (!file) return;
                                    try {
                                      const url = await uploadFile(file, "certs");
                                      setValue(`certifications.${index}.documentUrl` as const, url);
                                      toast.success("Document uploaded");
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to upload document");
                                    } finally {
                                      e.currentTarget.value = "";
                                    }
                                  }}
                                />
                                <Input
                                  {...register(`certifications.${index}.documentUrl` as const)}
                                  placeholder="Paste a PDF/JPG/PNG link (or data: URI)"
                                  className="rounded-xl bg-white"
                                />
                                {errors.certifications?.[index]?.documentUrl && (
                                  <p className="text-red-500 text-[10px] mt-1">
                                    {errors.certifications[index].documentUrl?.message as any}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => append({ name: "", issuingBody: "", expiryDate: "", documentUrl: "" })}
                          className="w-full h-14 border-dashed rounded-2xl text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Certification
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Review */}
                  {currentStep === 5 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl text-green-600">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">Review & Submit</h2>
                          <p className="text-slate-500 text-sm">Please verify the information before finalizing.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Summary Section: Personal */}
                        <div className="p-6 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <User className="w-4 h-4 text-primary" /> Personal
                            </h3>
                            <Button variant="ghost" size="sm" type="button" onClick={() => setCurrentStep(0)} className="text-[10px] uppercase font-bold text-primary">Edit</Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between text-slate-500 gap-0.5 sm:gap-4">
                              <span>Name:</span> 
                              <span className="font-bold text-slate-800 break-words">{watch("personal.fullName")}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between text-slate-500 gap-0.5 sm:gap-4">
                              <span>Phone:</span> 
                              <span className="font-bold text-slate-800">{watch("personal.phone")}</span>
                            </div>
                            {watch("personal.email") && (
                              <div className="flex flex-col sm:flex-row sm:justify-between text-slate-500 gap-0.5 sm:gap-4">
                                <span>Email:</span> 
                                <span className="font-bold text-slate-800 truncate max-w-[200px]">{watch("personal.email")}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Summary Section: Farm */}
                        <div className="p-6 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <Sprout className="w-4 h-4 text-primary" /> Farm
                            </h3>
                            <Button variant="ghost" size="sm" type="button" onClick={() => setCurrentStep(2)} className="text-[10px] uppercase font-bold text-primary">Edit</Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-slate-500"><span>Farm Name:</span> <span className="font-medium text-slate-800">{watch("farm.farmName")}</span></div>
                            <div className="flex justify-between text-slate-500"><span>Size:</span> <span className="font-medium text-slate-800">{watch("farm.farmSize")} {watch("farm.farmSizeUnit")}</span></div>
                            <div className="flex justify-between text-slate-500"><span>Primary Crop:</span> <span className="font-medium text-slate-800">{watch("crops.primaryCrop")}</span></div>
                          </div>
                        </div>

                        {/* Summary Section: Location */}
                        <div className="p-6 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-4 md:col-span-2">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" /> Location
                            </h3>
                            <Button variant="ghost" size="sm" type="button" onClick={() => setCurrentStep(1)} className="text-[10px] uppercase font-bold text-primary">Edit</Button>
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            {watch("location.community")}, {watch("location.district")}, {watch("location.region")}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-700">
                        <Info className="w-5 h-5 shrink-0" />
                        <p className="text-[11px] leading-relaxed">
                          By submitting this form, you certify that you have verified the farmer's identification and visited the farm site in person.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 bg-slate-100/50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={prevStep}
                disabled={currentStep === 0 || isSubmitting}
                className={cn("rounded-xl font-bold uppercase text-[10px] tracking-wider w-full sm:w-auto order-2 sm:order-1", currentStep === 0 && "opacity-0")}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
 
              {currentStep === steps.length - 1 ? (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-10 rounded-xl font-bold shadow-lg shadow-green-200 w-full sm:w-auto order-1 sm:order-2 h-12"
                >
                  {isSubmitting ? "Submitting..." : "Complete Onboarding"}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="bg-primary hover:bg-primary/90 text-white px-10 rounded-xl font-bold shadow-lg shadow-primary/20 w-full sm:w-auto order-1 sm:order-2 h-12"
                >
                  Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
