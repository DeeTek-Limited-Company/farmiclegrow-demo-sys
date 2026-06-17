import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building2, Mail, ShieldCheck } from "lucide-react";

export default async function BuyerProfilePage() {
  const user = await requireRole(["buyer"]);

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Business Profile</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Manage your company information and verification documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>This information will be visible to sellers when you request quotes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</p>
                  <p className="font-bold text-slate-700">{profile?.companyName || "Not Provided"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Type</p>
                  <p className="font-bold text-slate-700">{profile?.businessType || "Not Provided"}</p>
                </div>
              </div>
              <Button className="mt-4">Edit Details</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>Verified buyers get access to better pricing and payment terms.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-900">Verification Pending</p>
                    <p className="text-sm text-amber-700">Please upload your business registration documents to gain full access.</p>
                  </div>
               </div>
               <Button variant="outline" className="mt-6">Upload Documents</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-primary font-bold">Change Password</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
