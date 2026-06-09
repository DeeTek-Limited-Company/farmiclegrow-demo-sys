import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  MapPin,
  ShieldCheck,
  Package,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { OrderDialog } from "@/components/buyer/order-dialog";
import { buildOrgTraceUrl } from "@/lib/trace/urls";

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const user = await requireRole(["buyer"]);
  const { id } = await params;

  const listing = await prisma.marketplaceListing.findFirst({
    where: {
      id,
      status: "ACTIVE",
    },
    include: {
      organization: true,
      batch: {
        include: {
          farmer: true,
          productionRecord: true,
        },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  const images = listing.images as string[];
  const primaryImage = images?.[0];
  const orderListing = {
    id: listing.id,
    title: listing.title,
    price: Number(listing.price),
    unit: listing.unit,
    currency: listing.currency,
    images,
    batch: {
      id: listing.batch.id,
      quantity: Number(listing.batch.quantity),
    },
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/buyer/marketplace">Marketplace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{listing.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={listing.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Package className="w-24 h-24" />
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(0, 4).map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <Image
                    src={img}
                    alt={`${listing.title} - Image ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listing Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-slate-500">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{listing.organization.name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-primary">
                  {listing.currency} {listing.price.toString()}
                </p>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  per {listing.unit}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {listing.category && (
                <Badge variant="outline" className="rounded-full font-bold text-xs px-3 py-1">
                  {listing.category}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full font-bold text-xs px-3 py-1 bg-emerald-50 text-emerald-600 border-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified Traceable
              </Badge>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="prose prose-slate max-w-none">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2">
                Description
              </h3>
              <p className="text-slate-600 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Batch Info */}
          <Card className="rounded-3xl border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4" />
                Batch Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    Crop
                  </p>
                  <p className="text-sm font-bold text-slate-900">{listing.batch.crop}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    Batch ID
                  </p>
                  <p className="text-sm font-bold text-slate-900 font-mono">
                    {listing.batch.batchId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    Quantity Available
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {listing.batch.quantity.toString()} {listing.unit}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    Harvest Date
                  </p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(listing.batch.harvestDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Farmer Info */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                  Farmer
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {listing.batch.farmer.fullName}
                </p>
                {listing.batch.farmer.certificationStatus && (
                  <Badge variant="outline" className="mt-2 rounded-full text-[10px] font-bold">
                    {listing.batch.farmer.certificationStatus} Certified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Traceability Link */}
          {listing.batch.batchId && (
            <Button asChild variant="outline" className="w-full rounded-2xl h-12 font-bold border-slate-200">
              <Link
                href={buildOrgTraceUrl({
                  orgSlug: listing.organization.slug,
                  batchId: listing.batch.batchId,
                  configuredUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL,
                  nodeEnv: process.env.NODE_ENV,
                })}
                target="_blank"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                View Traceability Report
              </Link>
            </Button>
          )}

          {/* Order Button */}
          <OrderDialog
            listing={orderListing}
            trigger={
              <Button className="w-full rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Order Now
              </Button>
            }
          />

          {/* Back Link */}
          <Button asChild variant="ghost" className="w-full rounded-2xl h-12 font-bold text-slate-500 hover:text-slate-700">
            <Link href="/buyer/marketplace">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
