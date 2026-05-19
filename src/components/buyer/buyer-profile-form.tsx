"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/card"; // Wait, button is usually in ui/button
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import { toast } from "sonner";

const profileSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  businessAddress: z.string().min(5, "Business address is required"),
  country: z.string().min(2, "Country is required"),
  taxId: z.string().optional(),
  businessType: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface BuyerProfileFormProps {
  initialData?: ProfileFormValues;
}

export function BuyerProfileForm({ initialData }: BuyerProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData || {
      companyName: "",
      phoneNumber: "",
      businessAddress: "",
      country: "",
      taxId: "",
      businessType: "",
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    try {
      const response = await apiFetch("/api/buyer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save profile");
      }

      toast.success("Profile saved successfully");
      router.push("/buyer");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
        <CardDescription>
          Please provide your business details before proceeding with orders.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                {...register("companyName")}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                placeholder="+1 234 567 890"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address *</Label>
            <Textarea
              id="businessAddress"
              {...register("businessAddress")}
              placeholder="Full physical address"
            />
            {errors.businessAddress && (
              <p className="text-sm text-destructive">{errors.businessAddress.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                {...register("country")}
                placeholder="e.g. United Kingdom"
              />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                {...register("businessType")}
                placeholder="e.g. Wholesaler, Retailer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / VAT Number</Label>
            <Input
              id="taxId"
              {...register("taxId")}
              placeholder="Optional"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <UIButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </UIButton>
        </CardFooter>
      </form>
    </Card>
  );
}
