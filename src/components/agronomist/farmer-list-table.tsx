'use client';

import { Farmer } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

interface FarmerListTableProps {
  farmers: Farmer[];
}

export function FarmerListTable({ farmers }: FarmerListTableProps) {
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(
    null
  );

  if (farmers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
        <p className="text-muted-foreground text-lg">
          No farmers registered yet
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Use the registration form above to add new farmers
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 py-6 pl-8">Name</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Crop Type</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Farm Size</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmers.map((farmer) => (
              <TableRow
                key={farmer.id}
                className="hover:bg-slate-50/30 transition-colors border-slate-50"
              >
                <TableCell className="font-bold text-slate-800 py-6 pl-8">
                  {farmer.fullName}
                </TableCell>
                <TableCell className="font-medium text-slate-600">{farmer.cropType}</TableCell>
                <TableCell className="text-right font-bold text-slate-700">
                  {farmer.farmSize} ha
                </TableCell>
                <TableCell>
                  <StatusBadge status={farmer.status} />
                </TableCell>
                <TableCell className="text-center pr-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl font-bold text-primary hover:bg-primary/5"
                    onClick={() => setSelectedFarmer(farmer)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {farmers.map((farmer) => (
          <Card key={farmer.id} className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden hover:scale-[1.01] transition-transform">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg">
                    {farmer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{farmer.fullName}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{farmer.cropType}</p>
                  </div>
                </div>
                <StatusBadge status={farmer.status} />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="text-sm font-bold text-slate-500">
                  {farmer.farmSize} Hectares
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-slate-200"
                  onClick={() => setSelectedFarmer(farmer)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Farmer Details Dialog */}
      <Dialog
        open={!!selectedFarmer}
        onOpenChange={(open) => !open && setSelectedFarmer(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Farmer Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedFarmer?.fullName}
            </DialogDescription>
          </DialogHeader>

          {selectedFarmer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Full Name
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.fullName}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Phone Number
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.phoneNumber}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Crop Type
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.cropType}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Farm Size
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.farmSize} hectares
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Expected Yield
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.expectedYield} tons
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Submission Date
                </label>
                <p className="text-lg font-medium mt-1">
                  {selectedFarmer.submissionDate.toLocaleDateString()}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-muted-foreground">
                  Location
                </label>
                <p className="text-lg font-medium mt-1">
                  Lat: {selectedFarmer.location.latitude.toFixed(4)}, Lon:{' '}
                  {selectedFarmer.location.longitude.toFixed(4)}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">
                  <StatusBadge status={selectedFarmer.status} />
                </div>
              </div>

              {selectedFarmer.rejectionReason && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="text-sm font-semibold text-red-800">
                    Rejection Reason
                  </label>
                  <p className="text-red-700 mt-1">
                    {selectedFarmer.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
