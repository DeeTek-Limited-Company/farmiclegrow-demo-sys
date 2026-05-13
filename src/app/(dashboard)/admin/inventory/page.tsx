import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Package, 
  Store, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  History,
  Tag,
  AlertCircle
} from "lucide-react";

export default async function AdminInventoryPage() {
  await requireRole(["admin", "ops"]);

  const [batches, listings] = await Promise.all([
    prisma.batch.findMany({
      include: {
        farmer: true,
        productionRecord: true,
        marketplaceListing: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketplaceListing.findMany({
      include: {
        batch: {
          include: {
            farmer: true,
            productionRecord: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const unlistedBatches = batches.filter(b => !b.marketplaceListing);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage your verified supply and product listings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 bg-primary/[0.01]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{batches.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">
              {listings.filter(l => l.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unlisted Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{unlistedBatches.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total MT Listed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {listings.reduce((acc, l) => acc + Number(l.batch.quantity), 0).toLocaleString()}T
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Active Listings Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight">Marketplace Listings</h2>
          </div>
          
          <div className="space-y-4">
            {listings.length === 0 ? (
              <Card className="border-dashed py-12 text-center text-muted-foreground">
                <p>No listings created yet.</p>
              </Card>
            ) : (
              listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/5">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-48 h-48 bg-slate-100 relative overflow-hidden">
                      {listing.images[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className={`uppercase font-black text-[10px] ${
                          listing.status === "ACTIVE" ? "bg-emerald-500" : 
                          listing.status === "DRAFT" ? "bg-slate-400" : "bg-red-500"
                        }`}>
                          {listing.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-black text-lg text-slate-900 group-hover:text-primary transition-colors">{listing.title}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{listing.category} · {listing.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-primary">${Number(listing.price).toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">per {listing.unit}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Batch Source</p>
                          <p className="text-sm font-bold truncate">{listing.batch.batchId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Farmer</p>
                          <p className="text-sm font-bold truncate">{listing.batch.farmer.fullName}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl font-bold border-slate-200">
                          <Link href={`/admin/inventory/edit/${listing.id}`}>Edit Listing</Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary" className="rounded-xl font-bold">
                          <Link href={`/marketplace/${listing.id}`} target="_blank">
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Unlisted Supply Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Package className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-black tracking-tight">Unlisted Supply</h2>
          </div>

          <div className="space-y-3">
            {unlistedBatches.length === 0 ? (
              <Card className="border-dashed py-12 text-center text-muted-foreground">
                <p>All batches have been listed!</p>
              </Card>
            ) : (
              unlistedBatches.map((batch) => (
                <Card key={batch.id} className="p-5 hover:bg-slate-50/50 transition-colors border-primary/5">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 truncate">{batch.batchId}</span>
                          <Badge variant="outline" className="rounded-full text-[9px] font-black uppercase bg-white">
                            {batch.productionRecord.cropType}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 truncate">
                          {Number(batch.quantity).toFixed(2)}T · {batch.farmer.fullName} · Harvested {new Date(batch.harvestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button asChild className="rounded-2xl font-black shadow-lg shadow-primary/10 px-6">
                      <Link href={`/admin/inventory/new?batchId=${batch.id}`}>
                        <Plus className="w-4 h-4 mr-2" />
                        List Item
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
