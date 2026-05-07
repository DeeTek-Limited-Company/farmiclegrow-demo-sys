'use client';

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreVertical,
  Phone,
  MapPin,
  ArrowUpRight,
  ExternalLink,
  ClipboardList,
  Package,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Farmer {
  id: string;
  fullName: string;
  phone: string | null;
  qualityScore: number;
  ghanaCardNumber: string | null;
  primaryCrop: string | null;
  createdAt: string;
  farmProfiles: any[];
  submissions: any[];
}

interface FarmerListHybridProps {
  farmers: Farmer[];
  baseUrl: string; // e.g., "/agronomist/farmers" or "/admin/farmers"
}

export function FarmerListHybrid({ farmers, baseUrl }: FarmerListHybridProps) {
  if (farmers.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">No farmers found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="w-[300px] font-black uppercase text-[10px] tracking-widest text-slate-400 py-6 pl-8">Farmer</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Quality</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Location</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Status</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 py-6 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmers.map((farmer) => {
              const latestSub = farmer.submissions[0];
              const primaryProfile = farmer.farmProfiles[0];
              const qualityColor = farmer.qualityScore >= 80 ? "text-emerald-600" : farmer.qualityScore >= 50 ? "text-amber-600" : "text-red-600";

              return (
                <TableRow key={farmer.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="py-6 pl-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {farmer.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{farmer.fullName}</p>
                        <p className="text-[10px] font-medium text-slate-400">Registered {format(new Date(farmer.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-1000",
                            farmer.qualityScore >= 80 ? "bg-emerald-500" :
                              farmer.qualityScore >= 50 ? "bg-amber-500" :
                                "bg-red-500"
                          )}
                          style={{ width: `${farmer.qualityScore}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-black", qualityColor)}>{farmer.qualityScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                        {primaryProfile?.farmName || "Unnamed Farm"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <StatusBadge status={latestSub?.status || "DRAFT"} />
                  </TableCell>
                  <TableCell className="py-6 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5 hover:text-primary">
                        <Link href={`${baseUrl}/${farmer.id}`}>
                          <ArrowUpRight className="w-5 h-5" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl">
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-2xl p-2 min-w-[180px]">
                          <DropdownMenuItem asChild className="rounded-xl font-bold py-3 cursor-pointer">
                            <Link href={`${baseUrl}/${farmer.id}`}>
                              <ExternalLink className="w-4 h-4 mr-2" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl font-bold py-3 cursor-pointer">
                            <ClipboardList className="w-4 h-4 mr-2" /> Add Production
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl font-bold py-3 cursor-pointer">
                            <Package className="w-4 h-4 mr-2" /> Create Batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
        {farmers.map((farmer) => {
          const latestSub = farmer.submissions[0];
          const primaryProfile = farmer.farmProfiles[0];

          return (
            <Link key={farmer.id} href={`${baseUrl}/${farmer.id}`} className="block group">
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden hover:scale-[1.02] transition-all">
                <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {farmer.fullName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">{farmer.fullName}</CardTitle>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{farmer.phone || "No phone"}</p>
                    </div>
                  </div>
                  <StatusBadge status={latestSub?.status || "DRAFT"} />
                </CardHeader>
                <CardContent className="p-6 pt-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Quality</p>
                      <p className={cn("text-base font-black",
                        farmer.qualityScore >= 80 ? "text-emerald-600" :
                          farmer.qualityScore >= 50 ? "text-amber-600" :
                            "text-red-600"
                      )}>{farmer.qualityScore}%</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Primary Crop</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{farmer.primaryCrop || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">{primaryProfile?.farmName || "Village unknown"}</span>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100 icon-emerald-500",
    REJECTED: "bg-red-50 text-red-700 border-red-100 icon-red-500",
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-100 icon-amber-500",
    DRAFT: "bg-slate-50 text-slate-500 border-slate-100 icon-slate-400",
  };

  const Icon = status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? AlertCircle : AlertCircle;

  return (
    <Badge className={cn("rounded-lg font-black text-[10px] px-2 py-0.5 shadow-sm border", styles[status] || styles.DRAFT)}>
      {status.replace("_", " ")}
    </Badge>
  );
}
