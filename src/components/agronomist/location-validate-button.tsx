"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function LocationValidateButton({
  locationId,
  isValidated,
}: {
  locationId: string;
  isValidated: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isValidated: !isValidated }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update location");
      }

      toast.success(!isValidated ? "Location validated" : "Location marked unverified");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isValidated ? "outline" : "default"}
      className="rounded-2xl font-black h-10 px-4"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : isValidated ? (
        <CheckCircle2 className="w-4 h-4 mr-2" />
      ) : (
        <XCircle className="w-4 h-4 mr-2" />
      )}
      {isValidated ? "Validated" : "Validate"}
    </Button>
  );
}

