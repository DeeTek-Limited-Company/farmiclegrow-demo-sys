import { Building2, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 p-8 rounded-[2.5rem] bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest">
          <ShieldAlert className="w-4 h-4" />
          <span>404 - Page Not Found</span>
        </div>

        {/* Big 404 Visual */}
        <div className="relative my-4">
          <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-600 select-none">
            404
          </h1>
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center mx-auto -mt-6 shadow-xl shadow-primary/20 backdrop-blur-md">
            <Building2 className="w-8 h-8" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Organization Link Not Found
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            The organization link or URL slug you entered does not exist or may have been misspelled. Please double-check the URL or contact your administrator.
          </p>
        </div>

        <p className="text-[11px] text-slate-500 font-medium pt-2">
          FarmicleGroww Enterprise Platform · Multi-tenant Operations
        </p>
      </div>
    </div>
  );
}
