import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Store, 
  ShoppingBag, 
  ArrowUpRight, 
  MapPin, 
  ShieldCheck,
  Package,
  Star
} from "lucide-react";

export default async function BuyerMarketplacePage() {
  await requireRole(["buyer"]);

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      batch: {
        include: {
          farmer: {
            include: {
              community: {
                include: {
                  district: {
                    include: {
                      region: true
                    }
                  }
                }
              }
            }
          },
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
        <p className="text-muted-foreground mt-2">Explore verified supply and secure high-quality produce.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
             <Store className="w-16 h-16 text-slate-200 mx-auto" />
             <p className="text-slate-400 font-black text-xl uppercase tracking-widest">No active listings</p>
             <p className="text-slate-400 font-medium italic">Check back soon for new verified batches.</p>
          </div>
        ) : (
          listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-primary/5 flex flex-col h-full rounded-[2.5rem]">
               <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {listing.images[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                     <Badge className="rounded-full bg-white/90 backdrop-blur-md border-0 text-primary font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-lg">
                        {listing.category}
                     </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                     <div className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                     </div>
                  </div>
               </div>

               <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4 gap-4">
                     <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                           {listing.title}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                           <MapPin className="w-3 h-3 text-primary" />
                           <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                              {listing.batch.farmer.community?.name}, {listing.batch.farmer.community?.district.name}
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
                        {listing.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="rounded-full font-bold text-[9px] px-2 uppercase bg-primary/5 text-primary border-0">
                             {tag}
                          </Badge>
                        ))}
                        {listing.tags.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{listing.tags.length - 2} more</span>}
                     </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                     <Button className="flex-1 rounded-2xl font-black h-12 bg-slate-900 hover:bg-primary transition-all text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Request Quote
                     </Button>
                     <Button asChild variant="outline" size="icon" className="w-12 h-12 rounded-2xl border-slate-200">
                        <Link href={`/trace/${listing.batch.batchId}`} target="_blank">
                           <ArrowUpRight className="w-5 h-5" />
                        </Link>
                     </Button>
                  </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
