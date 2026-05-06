"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductionRecordForm } from "@/components/agronomist/production-record-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ProductionRecordFormWrapper() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-emerald-500/20"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Record
      </Button>
      <ProductionRecordForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}