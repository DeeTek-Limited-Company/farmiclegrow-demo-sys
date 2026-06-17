import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, MessageSquare, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SupportPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Platform Support</h1>
        <p className="text-slate-500 mt-2 font-medium">Resources and tools to assist tenant organizations and resolve issues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-primary/5 shadow-sm p-8">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Active Tickets</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Manage support requests from organization admins.</p>
            </div>
            <div className="text-3xl font-black text-slate-900">0</div>
            <Button variant="outline" className="w-full rounded-xl font-bold">Open Support Desk</Button>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-primary/5 shadow-sm p-8">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Admin Guide</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Documentation for platform and tenant management.</p>
            </div>
            <div className="flex -space-x-2">
              {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />)}
            </div>
            <Button variant="outline" className="w-full rounded-xl font-bold gap-2">
              Read Docs <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-primary/5 shadow-sm p-8 bg-slate-900 text-white">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black">Emergency Contact</h3>
              <p className="text-slate-400 font-medium text-sm mt-1">24/7 technical support for Enterprise tenants.</p>
            </div>
            <div className="font-mono text-primary font-bold">+1-800-FARMICLE</div>
            <Button className="w-full rounded-xl font-black bg-white text-slate-900 hover:bg-slate-100">Contact Support</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
