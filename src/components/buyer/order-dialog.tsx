"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Package, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";

interface OrderDialogProps {
  listing: {
    id: string;
    title: string;
    price: any;
    unit: string | null;
    currency: string;
    images: string[];
    batch: {
      id: string;
      quantity: any;
    };
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function OrderDialog({ listing, open, onOpenChange, trigger }: OrderDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    quantity: "",
    shippingAddress: "",
    notes: "",
  });

  const controlledOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = onOpenChange ?? setIsOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          batchId: listing.batch.id,
          quantity,
          shippingAddress: form.shippingAddress || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to place order");
      }

      toast.success("Order placed successfully!");
      handleOpenChange(false);
      router.push("/buyer/orders");
      router.refresh();
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error(error.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const dialogForm = (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {/* Listing Summary */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Product
            </p>
            <p className="text-sm font-bold text-slate-900">{listing.title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
            Price
          </p>
          <p className="text-sm font-bold text-primary">
            {listing.currency} {listing.price.toString()} / {listing.unit}
          </p>
        </div>
      </div>

      {/* Available Quantity */}
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <p className="text-xs font-bold text-emerald-600">
          Available: {listing.batch.quantity.toString()} {listing.unit}
        </p>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label
          htmlFor="quantity"
          className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1"
        >
          Order Quantity ({listing.unit}) *
        </Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={Number(listing.batch.quantity)}
          step={1}
          placeholder="Enter quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="rounded-xl border-slate-200 focus:ring-primary/20 h-12"
          required
        />
      </div>

      {/* Shipping Address */}
      <div className="space-y-2">
        <Label
          htmlFor="shippingAddress"
          className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1"
        >
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Shipping Address
          </div>
        </Label>
        <Textarea
          id="shippingAddress"
          placeholder="Enter full delivery address"
          value={form.shippingAddress}
          onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
          className="rounded-xl border-slate-200 focus:ring-primary/20 min-h-[80px] text-sm"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label
          htmlFor="notes"
          className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1"
        >
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Notes
          </div>
        </Label>
        <Textarea
          id="notes"
          placeholder="Any special instructions or requirements..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="rounded-xl border-slate-200 focus:ring-primary/20 min-h-[60px] text-sm"
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="ghost"
          onClick={() => handleOpenChange(false)}
          className="rounded-xl font-bold"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !form.quantity}
          className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Place Order
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <Dialog open={controlledOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            Place Order
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Complete the form below to order {listing.title}.
          </DialogDescription>
        </DialogHeader>
        {dialogForm}
      </DialogContent>
    </Dialog>
  );
}