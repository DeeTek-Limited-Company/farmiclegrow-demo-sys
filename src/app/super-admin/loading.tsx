import { Spinner } from '@/components/ui/spinner';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <Spinner className="h-12 w-12 text-primary relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-bold text-primary uppercase tracking-widest">
          Loading Content
        </p>
        <p className="text-xs text-slate-400 font-medium">
          Fetching the latest data...
        </p>
      </div>
    </div>
  );
}
