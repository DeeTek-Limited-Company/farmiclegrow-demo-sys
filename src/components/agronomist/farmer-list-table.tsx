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
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Crop Type</TableHead>
              <TableHead className="text-right">Farm Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmers.map((farmer) => (
              <TableRow
                key={farmer.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">
                  {farmer.fullName}
                </TableCell>
                <TableCell>{farmer.cropType}</TableCell>
                <TableCell className="text-right">
                  {farmer.farmSize} ha
                </TableCell>
                <TableCell>
                  <StatusBadge status={farmer.status} />
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFarmer(farmer)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
