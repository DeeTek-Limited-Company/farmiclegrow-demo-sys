"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface TraceQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  cropName: string;
  orderId?: string;
}

export function TraceQrModal({ isOpen, onClose, batchId, cropName, orderId }: TraceQrModalProps) {
  const [copied, setCopied] = useState(false);
  const traceUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/trace/${batchId}${orderId ? `?orderId=${orderId}` : ""}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8">
        <DialogHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            Quality Passport
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium italic">
            Scan this code to verify the origin and quality of your {cropName} batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          <div className="p-4 bg-white rounded-3xl border-4 border-slate-50 shadow-xl">
            <QRCodeSVG 
              value={traceUrl} 
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "/logo.png", // Assuming there is a logo
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div className="w-full space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate max-w-[200px]">
                {traceUrl}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyToClipboard}
                className="h-8 w-8 rounded-xl"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </Button>
            </div>
            
            <Button 
              className="w-full rounded-2xl bg-slate-900 hover:bg-emerald-600 transition-all font-black text-xs uppercase tracking-widest h-12 shadow-lg shadow-slate-900/10"
              onClick={() => window.open(traceUrl, "_blank")}
            >
              Open Passport Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
