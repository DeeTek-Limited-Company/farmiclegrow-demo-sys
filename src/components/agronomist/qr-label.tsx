"use client";

import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, QrCode, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface QRLabelProps {
  batch: {
    batchId: string;
    crop: string;
    quantity: number | string;
    harvestDate: Date | string;
    farmerName: string;
  };
}

export function QRLabel({ batch }: QRLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const traceUrl = `https://farmiclegrow.com/trace/${batch.batchId}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${batch.batchId}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { 
              font-family: sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: white;
            }
            .label-container {
              border: 2px solid black;
              padding: 20px;
              width: 400px;
              text-align: center;
            }
            .qr-placeholder { margin: 20px 0; }
            .batch-id { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .details { font-size: 14px; color: #333; line-height: 1.5; }
            .footer { margin-top: 15px; font-size: 10px; color: #666; border-top: 1px solid #eee; pt-2; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="batch-id">${batch.batchId}</div>
            <div class="qr-placeholder">
              ${printContent.querySelector("canvas")?.outerHTML || ""}
            </div>
            <div class="details">
              <strong>Crop:</strong> ${batch.crop}<br/>
              <strong>Farmer:</strong> ${batch.farmerName}<br/>
              <strong>Quantity:</strong> ${Number(batch.quantity).toFixed(2)} Tons<br/>
              <strong>Harvested:</strong> ${format(new Date(batch.harvestDate), "PPP")}
            </div>
            <div class="footer">
              Scan to verify traceability journey at farmiclegrow.com
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const canvas = printRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `QR_${batch.batchId}.png`;
    link.href = url;
    link.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 font-bold hover:bg-slate-50 gap-2 h-10"
        >
          <QrCode className="w-4 h-4 text-primary" />
          Label
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">QR Label</DialogTitle>
              <p className="text-slate-400 text-sm font-medium">Verify & print traceability tag</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 bg-white">
          <div
            ref={printRef}
            className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center"
          >
            <div className="bg-white p-6 rounded-3xl shadow-xl mb-6">
              <QRCodeCanvas
                value={traceUrl}
                size={180}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 30,
                  width: 30,
                  excavate: true,
                }}
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {batch.batchId}
              </h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                {batch.crop} · {batch.farmerName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handlePrint}
              className="rounded-2xl font-black h-14 bg-slate-900 text-white hover:bg-slate-800 gap-3 shadow-xl"
            >
              <Printer className="w-5 h-5" />
              Print Label
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="rounded-2xl font-black h-14 border-slate-200 gap-3 hover:bg-slate-50"
            >
              <Download className="w-5 h-5" />
              Save PNG
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
            <a
              href={traceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-widest"
            >
              Preview Trace Page
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
