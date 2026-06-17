"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { 
  Store, 
  ShoppingBag, 
  ArrowUpRight, 
  MapPin, 
  ShieldCheck,
  Package,
  Star,
  Loader2,
  FileText,
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildOrgTraceUrl } from "@/lib/trace/urls";

export function MarketplaceClient({ 
  initialListings,
  buyerProfile 
}: { 
  initialListings: any[],
  buyerProfile?: any 
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    quantity: 1,
    shippingAddress: buyerProfile?.businessAddress || "",
    notes: ""
  });
  const router = useRouter();

  const handleOpenQuoteModal = (listing: any) => {
    setSelectedListing(listing);
    setQuoteForm({
      quantity: Number(listing.minOrderQuantity || 1),
      shippingAddress: buyerProfile?.businessAddress || "",
      notes: ""
    });
  };

  const handleRequestQuote = async () => {
    if (!selectedListing) return;
    
    setLoadingId(selectedListing.id);
    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          batchId: selectedListing.batchId,
          quantity: Number(quoteForm.quantity),
          unit: selectedListing.unit,
          pricePerUnit: Number(selectedListing.price),
          shippingAddress: quoteForm.shippingAddress,
          notes: quoteForm.notes || `Quote requested for ${selectedListing.title} from Marketplace.`
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Request failed');
      }

      toast.success("Quote requested successfully! You can track it in your orders.");
      setSelectedListing(null);
      router.push("/buyer/orders");
    } catch (error: any) {
      console.error("Quote request error:", error);
      toast.error(error.message || "Failed to request quote");
    } finally {
      setLoadingId(null);
    }
  };

  if (initialListings.length === 0) {
    return (
      <div className="col-span-full py-20 text-center space-y-4">
        <Store className="w-16 h-16 text-slate-200 mx-auto" />
        <p className="text-slate-400 font-black text-xl uppercase tracking-widest">No active listings</p>
        <p className="text-slate-400 font-medium italic">Check back soon for new verified batches.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {initialListings.map((listing) => (
        <Card
          key={listing.id}
          className="group flex h-full flex-col overflow-hidden rounded-[2rem] border-primary/5 transition-all duration-300 hover:shadow-2xl"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {listing.images[0] ? (
              <Image 
                src={listing.images[0]} 
                alt={listing.title} 
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Package className="w-16 h-16" />
              </div>
            )}
            <div className="absolute top-4 left-4 z-10">
              <Badge variant="outline" className="rounded-full bg-white/90 backdrop-blur-md border-0 text-primary font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-lg">
                {listing.category}
              </Badge>
            </div>
            <div className="absolute top-4 right-4 z-10">
              <div className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
            </div>
          </div>

          <CardContent className="flex flex-grow flex-col p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                  {listing.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 mt-2">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                    {listing.batch.farmer?.community?.name ?? listing.organization.name}
                    {listing.batch.farmer?.community?.district?.name
                      ? `, ${listing.batch.farmer.community.district.name}`
                      : ""}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">${Number(listing.price).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">per {listing.unit}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Batch Info</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-black text-slate-900">{listing.batch.batchId}</span>
                  <span className="text-xs font-black text-emerald-600">Traceability: 100%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {listing.tags.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="rounded-full font-bold text-[9px] px-2 uppercase bg-primary/5 text-primary border-0">
                    {tag}
                  </Badge>
                ))}
                {listing.tags.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{listing.tags.length - 2} more</span>}
              </div>
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => handleOpenQuoteModal(listing)}
                className="w-full h-11 rounded-2xl bg-slate-900 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all hover:bg-primary sm:h-12"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Request Quote
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-12 h-11 rounded-2xl border-slate-200 sm:h-12 sm:px-0"
              >
                <Link
                  href={buildOrgTraceUrl({
                    orgSlug: listing.organization.slug,
                    batchId: listing.batch.batchId,
                    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
                    nodeEnv: process.env.NODE_ENV,
                    windowOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
                  })}
                  target="_blank"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span className="ml-2 sm:hidden">Open Trace</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Quote Request Modal */}
      <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <DialogContent className="rounded-[2rem] p-4 sm:max-w-[500px] sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Request Quote</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium italic">
              Please provide your delivery details and order requirements.
            </DialogDescription>
          </DialogHeader>

          {selectedListing && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Product</p>
                    <p className="text-sm font-bold text-slate-900">{selectedListing.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Price</p>
                  <p className="text-sm font-bold text-primary">${selectedListing.price} / {selectedListing.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                    Order Quantity ({selectedListing.unit})
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={selectedListing.minOrderQuantity || 1}
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: Number(e.target.value) })}
                    className="rounded-xl border-slate-200 focus:ring-primary/20 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Destination Address
                    </div>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full delivery address"
                    value={quoteForm.shippingAddress}
                    onChange={(e) => setQuoteForm({ ...quoteForm, shippingAddress: e.target.value })}
                    className="rounded-xl border-slate-200 focus:ring-primary/20 min-h-[80px] text-sm"
                  />
                  <p className="text-[10px] text-slate-400 italic ml-1">
                    * Defaults to your registered business address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Special Instructions
                    </div>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or questions?"
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    className="rounded-xl border-slate-200 focus:ring-primary/20 min-h-[60px] text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedListing(null)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRequestQuote}
              disabled={loadingId === selectedListing?.id || !quoteForm.shippingAddress}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8 bg-slate-900 hover:bg-primary transition-all shadow-lg shadow-slate-900/10"
            >
              {loadingId === selectedListing?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Truck className="w-4 h-4 mr-2" />
              )}
              Confirm Quote Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
