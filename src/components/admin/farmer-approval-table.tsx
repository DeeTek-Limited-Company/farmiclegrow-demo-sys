'use client';

import { useState } from 'react';
import { Farmer, FarmerStatus } from '@/lib/mock-data';
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
import { Eye, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface FarmerApprovalTableProps {
  farmers: Farmer[];
  onApprove?: (farmerId: string) => void;
  onReject?: (farmerId: string) => void;
}

export function FarmerApprovalTable({
  farmers,
  onApprove,
  onReject,
}: FarmerApprovalTableProps) {
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(
    null
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    farmerId: string;
  }>({
    open: false,
    action: 'approve',
    farmerId: '',
  });

  const handleApproveClick = (farmerId: string) => {
    setConfirmDialog({
      open: true,
      action: 'approve',
      farmerId,
    });
  };

  const handleRejectClick = (farmerId: string) => {
    setConfirmDialog({
      open: true,
      action: 'reject',
      farmerId,
    });
  };

  const handleConfirm = () => {
    const farmer = farmers.find((f) => f.id === confirmDialog.farmerId);

    if (confirmDialog.action === 'approve') {
      onApprove?.(confirmDialog.farmerId);
      toast.success('Farmer approved', {
        description: `${farmer?.fullName} has been approved.`,
      });
    } else {
      onReject?.(confirmDialog.farmerId);
      toast.success('Farmer rejected', {
        description: `${farmer?.fullName} has been rejected.`,
      });
    }

    setConfirmDialog({ open: false, action: 'approve', farmerId: '' });
  };

  if (farmers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
        <p className="text-muted-foreground text-lg">
          No farmers to review
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          All farmers have been processed
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
              <TableHead>Farmer Name</TableHead>
              <TableHead>Crop Type</TableHead>
              <TableHead className="text-right">Farm Size</TableHead>
              <TableHead>Submission Date</TableHead>
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
                  {farmer.submissionDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <StatusBadge status={farmer.status} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFarmer(farmer)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {farmer.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() =>
                            handleApproveClick(farmer.id)
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            handleRejectClick(farmer.id)
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
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
              Review {selectedFarmer?.fullName}&apos;s application
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
                  Current Status
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

          {selectedFarmer?.status === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedFarmer(null)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleRejectClick(selectedFarmer.id);
                  setSelectedFarmer(null);
                }}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  handleApproveClick(selectedFarmer.id);
                  setSelectedFarmer(null);
                }}
              >
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({
            ...confirmDialog,
            open,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirmDialog.action === 'approve'
              ? 'Approve Farmer Application?'
              : 'Reject Farmer Application?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.action === 'approve'
              ? 'This farmer will be added to the active farmers list.'
              : 'This action cannot be undone. The farmer will be notified of the rejection.'}
          </AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              confirmDialog.action === 'reject'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }
          >
            {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
