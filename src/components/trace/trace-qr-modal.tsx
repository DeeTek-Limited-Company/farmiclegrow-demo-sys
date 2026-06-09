"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, Download, Copy, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { buildOrgTraceUrl } from "@/lib/trace/urls";

interface TraceQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  cropName: string;
  orgSlug: string;
  orderId?: string;
}

export function TraceQrModal({
  isOpen,
  onClose,
  batchId,
  cropName,
  orgSlug,
  orderId,
}: TraceQrModalProps) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const traceUrl = buildOrgTraceUrl({
    orgSlug,
    batchId,
    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    windowOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `trace-${batchId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  const printQr = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Trace QR - ${batchId}</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 32px; display: grid; place-items: center; background: white; }
            .sheet { width: 360px; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; text-align: center; }
            .title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
            .sub { color: #475569; margin-bottom: 20px; }
            .url { font-size: 11px; color: #64748b; word-break: break-all; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="title">${cropName}</div>
            <div class="sub">Batch ${batchId}</div>
            ${canvas.outerHTML}
            <div class="url">${traceUrl}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <div ref={canvasRef} className="p-4 bg-white rounded-3xl border-4 border-slate-50 shadow-xl">
            <QRCodeCanvas
              value={traceUrl} 
              size={200}
              level="H"
              includeMargin={true}
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

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-2xl font-black text-xs uppercase tracking-widest h-12"
                onClick={downloadQr}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl font-black text-xs uppercase tracking-widest h-12"
                onClick={printQr}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
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
