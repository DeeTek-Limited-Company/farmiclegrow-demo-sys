"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Download, ExternalLink, Printer } from "lucide-react";
import { toast } from "sonner";
import { buildInternalOrgTraceUrl, buildOrgTraceUrl } from "@/lib/trace/urls";

interface InternalTraceActionsProps {
  orgSlug: string;
  batchId: string;
  cropName: string;
}

export function InternalTraceActions({
  orgSlug,
  batchId,
  cropName,
}: InternalTraceActionsProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<"public" | "internal" | null>(null);

  const publicTraceUrl = buildOrgTraceUrl({
    orgSlug,
    batchId,
    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    windowOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const internalTraceUrl = buildInternalOrgTraceUrl({
    orgSlug,
    batchId,
    configuredUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    windowOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const copyLink = async (value: string, type: "public" | "internal") => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    toast.success(`${type === "public" ? "Public" : "Internal"} link copied`);
    setTimeout(() => setCopied(null), 1500);
  };

  const getCanvas = () => qrRef.current?.querySelector("canvas");

  const downloadQr = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `public-trace-${batchId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Public QR downloaded");
  };

  const printQr = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Public Trace QR - ${batchId}</title>
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
            <div class="sub">Public trace QR for batch ${batchId}</div>
            ${canvas.outerHTML}
            <div class="url">${publicTraceUrl}</div>
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
    <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Trace Actions
          </p>
          <h3 className="text-xl font-black tracking-tight text-slate-900 mt-1">
            Public QR and Internal Link
          </h3>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest"
        >
          Public QR Default
        </Badge>
      </div>

      <div
        ref={qrRef}
        className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center"
      >
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <QRCodeCanvas
            value={publicTraceUrl}
            size={180}
            level="H"
            includeMargin
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
        <p className="mt-4 text-sm font-black text-slate-900">{batchId}</p>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{cropName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="rounded-2xl h-11 font-black uppercase text-xs tracking-widest"
          onClick={downloadQr}
        >
          <Download className="w-4 h-4 mr-2" />
          Download QR
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl h-11 font-black uppercase text-xs tracking-widest"
          onClick={printQr}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print QR
        </Button>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
            Public Trace
          </p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">
              {publicTraceUrl}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => copyLink(publicTraceUrl, "public")}
            >
              {copied === "public" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => window.open(publicTraceUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
            Internal Trace
          </p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">
              {internalTraceUrl}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => copyLink(internalTraceUrl, "internal")}
            >
              {copied === "internal" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

