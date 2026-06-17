"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export function ForcePasswordChange() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    // Client-side basic validation
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      toast.error("Password must contain uppercase, lowercase, number, and special character.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const response = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.message ?? "Failed to update password.");
      setLoading(false);
      return;
    }

    toast.success("Password updated! You can now use the platform.");
    setLoading(false);
    
    // Force a re-login or refresh the session
    // For now, just refresh the page to let the layout re-check the session
    window.location.reload();
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldAlert className="w-6 h-6" />
            <DialogTitle className="text-xl">Security Update Required</DialogTitle>
          </div>
          <DialogDescription>
            For your security, you must reset your initial password before continuing to the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. @StrongPass123"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Must be 8-32 chars with uppercase, lowercase, number, and symbol.
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 w-4 h-4" />}
            Secure My Account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
