"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FarmerOnboardingWizard } from "./farmer-onboarding-wizard";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";

export function EditFarmerButton({ farmer }: { farmer: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button 
        variant="outline" 
        className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm"
        onClick={() => setIsOpen(true)}
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 border-none bg-transparent shadow-none top-20 translate-y-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="sr-only">
            <DialogTitle>Edit Farmer Profile</DialogTitle>
            <DialogDescription>Update the farmer's information.</DialogDescription>
          </div>
          <FarmerOnboardingWizard 
            initialData={farmer}
            onSuccess={() => {
              setIsOpen(false);
              router.refresh();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
