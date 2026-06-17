import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Megaphone, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function GlobalNotificationsPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Broadcast Center</h1>
          <p className="text-slate-500 mt-2 font-medium">Send global announcements and platform-wide notifications.</p>
        </div>
        <Button className="rounded-2xl font-black gap-2">
          <Megaphone className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[3rem] border-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-900">Recent Broadcasts</CardTitle>
          </CardHeader>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">No active broadcasts</h3>
              <p className="text-slate-500 font-medium max-w-sm">Global messages sent to all tenant administrators or field staff will appear here.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[3rem] border-primary/5 shadow-sm p-8 bg-primary/5 border-primary/10">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6">Quick Notify</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
              <div className="p-4 rounded-2xl bg-white border border-primary/10 font-bold text-sm">All Tenant Admins</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Channel</label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 rounded-xl bg-white border border-primary/10 flex items-center gap-2 text-xs font-bold">
                  <Mail className="w-3 h-3 text-primary" /> Email
                </div>
                <div className="flex-1 p-3 rounded-xl bg-white border border-primary/10 flex items-center gap-2 text-xs font-bold">
                  <Bell className="w-3 h-3 text-primary" /> Push
                </div>
              </div>
            </div>
            <Button className="w-full rounded-2xl font-black gap-2 h-14 shadow-lg shadow-primary/20">
              <Send className="w-4 h-4" /> Compose Message
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
