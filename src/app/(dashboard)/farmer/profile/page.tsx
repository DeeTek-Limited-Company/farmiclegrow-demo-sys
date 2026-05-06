import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  CheckCircle, 
  ShieldCheck, 
  Sprout, 
  FileText, 
  QrCode,
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(value: Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export default async function FarmerProfilePage() {
  const user = await requireRole(["farmer"]);

  const farmer = await prisma.farmer.findFirst({
    where: {
      OR: [{ externalRef: user.id }, { externalRef: user.email }, { fullName: user.name }],
    },
    include: {
      farmProfiles: {
        include: { locations: true },
      },
      certifications: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  const latestStatus = farmer?.submissions[0]?.status ?? "PENDING_REVIEW";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Header Banner */}
      <div className="relative mb-20">
        <div className="relative h-48 w-full rounded-[2.5rem] bg-gradient-to-r from-emerald-600 via-primary to-emerald-800 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="absolute bottom-6 left-8 md:left-12 flex flex-col md:flex-row items-end gap-6 z-10">
          <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl ring-4 ring-white/20 shrink-0">
             <div className="w-full h-full rounded-[1.25rem] bg-slate-100 flex items-center justify-center text-primary overflow-hidden">
                <User className="w-16 h-16 opacity-20" />
             </div>
          </div>
          <div className="pb-2">
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-md">{farmer?.fullName ?? user.name}</h1>
               {latestStatus === "APPROVED" && (
                 <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/30">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Verified</span>
                 </div>
               )}
            </div>
            <p className="text-emerald-50/80 font-medium tracking-tight text-sm" suppressHydrationWarning>Registered Member since {formatDate(farmer?.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
        {/* Left Side: Information & Assets */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About Section */}
          <Card className="border-primary/5 shadow-md rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-white/80">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Info className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Phone Number</label>
                   <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-primary">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800">{farmer?.phone ?? "Not provided"}</span>
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Date of Birth</label>
                   <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-primary">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800" suppressHydrationWarning>{formatDate(farmer?.dateOfBirth)}</span>
                   </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Bio / Description</label>
                   <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {farmer?.bio ?? "No biography details added to this profile yet. This information helps agronomists and buyers understand your background."}
                   </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farms Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                   <Sprout className="w-6 h-6 text-primary" />
                   Verified Farm Assets
                </h2>
                <Badge variant="outline" className="rounded-full border-primary/20 text-primary bg-primary/5">
                   {farmer?.farmProfiles.length ?? 0} Assets
                </Badge>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {farmer?.farmProfiles.map((farm) => (
                   <Card key={farm.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden group">
                      <div className="h-2 bg-primary/20 w-full group-hover:bg-primary transition-colors" />
                      <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors">{farm.farmName}</h3>
                               <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">{farmer?.primaryCrop ?? "Not set"}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                               <MapPin className="w-5 h-5 text-primary" />
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4 border-t border-dashed pt-4 mt-4">
                            <div>
                               <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Total Area</span>
                               <span className="font-bold text-slate-800">{farm.totalAreaHectare?.toString() ?? "N/A"} ha</span>
                            </div>
                            <div>
                               <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Irrigation</span>
                               <span className="font-bold text-slate-800">{farm.irrigationType ?? "N/A"}</span>
                            </div>
                         </div>
                      </CardContent>
                   </Card>
                ))}
                {(!farmer?.farmProfiles || farmer.farmProfiles.length === 0) && (
                   <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No farm profiles detected</p>
                   </div>
                )}
             </div>
          </div>

          {/* Certifications */}
          <div className="space-y-4 pt-4">
             <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Certifications & Quality Badges
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {farmer?.certifications.map((cert) => (
                   <div key={cert.id} className="bg-white border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                         <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-black text-slate-900 text-sm">{cert.name}</h4>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{cert.issuer}</p>
                      </div>
                   </div>
                ))}
                {(!farmer?.certifications || farmer.certifications.length === 0) && (
                   <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-slate-400 font-medium text-sm italic">No active certifications recorded.</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Side: Digital ID & Verification */}
        <div className="space-y-8">
           {/* Digital Identity Card */}
           <Card className="border-primary/5 shadow-xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white group">
              <div className="p-8 bg-gradient-to-br from-primary/20 to-transparent">
                 <div className="flex justify-between items-start mb-12">
                    <div>
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 p-2 shadow-inner">
                          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                       </div>
                       <h3 className="text-xl font-black tracking-tight leading-none">FarmicleGrow<br/><span className="text-primary">Identity Card</span></h3>
                    </div>
                    <div className="w-16 h-16 bg-white rounded-2xl p-1 flex items-center justify-center group-hover:scale-110 transition-transform">
                       <QrCode className="w-full h-full text-slate-900" />
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">Farmer ID</label>
                       <p className="font-mono text-sm tracking-widest text-primary font-bold">{farmer?.id ?? "UNKNOWN_MEMBER"}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">Status</label>
                          <div className="flex items-center gap-1.5">
                             <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", latestStatus === "APPROVED" ? "bg-primary" : "bg-amber-500")} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{latestStatus === "APPROVED" ? "Active Member" : "Verification Pending"}</span>
                          </div>
                       </div>
                       <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">Level</label>
                          <span className="text-[10px] font-black uppercase tracking-widest">Smallholder Gold</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Verified Traceability System</p>
                    <ShieldCheck className="w-5 h-5 text-primary/40" />
                 </div>
              </div>
           </Card>

           {/* Location Snapshot */}
           <Card className="border-primary/5 shadow-md rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                 <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Regional Context
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <div className="p-4 bg-muted/50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400">
                       <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-900">Geographic Center</p>
                       <p className="text-xs text-muted-foreground font-medium">Coordinate-based mapping enabled</p>
                    </div>
                 </div>
                 <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Your profile is currently linked to <span className="text-primary font-bold">{farmer?.farmProfiles[0]?.locations.length ?? 0}</span> GPS verification points across your agricultural assets.
                 </p>
                 <button className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                    View Asset Map <ChevronRight className="w-3 h-3" />
                 </button>
              </CardContent>
           </Card>

           {/* Support */}
           <Card className="border-emerald-100 bg-emerald-50/20 rounded-[2rem] p-6">
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Info className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">Profile Management</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                       Core identity details can only be modified by your assigned agronomist to maintain data integrity and supply chain trust.
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
