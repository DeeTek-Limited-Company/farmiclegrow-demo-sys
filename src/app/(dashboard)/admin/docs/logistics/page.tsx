import { 
  Truck, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  MessageSquare, 
  Package, 
  MapPin, 
  CheckCircle2, 
  Database,
  Search,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LogisticsDocsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Logistics & Supply Chain Flow</h1>
        </div>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl">
          An in-depth look at how FarmicleGrow bridges the gap between African smallholder farms and international buyers through data-driven transparency.
        </p>
      </div>

      {/* Overview Card */}
      <Card className="rounded-[3rem] border-primary/5 shadow-2xl overflow-hidden bg-slate-900 text-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-10 space-y-6 relative z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">The Architecture of Trust</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">How the "Chain of Custody" Works</h2>
          <p className="text-slate-400 leading-relaxed text-lg">
            Our logistics architecture is built on a **Single Source of Truth**. Every action—from harvest to final delivery—is recorded as a permanent milestone linked to a Unique Batch ID. This ensures that when a buyer scans a QR code, they aren't just seeing a location; they are seeing a verified history.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <Database className="w-6 h-6 text-primary mb-3" />
              <h4 className="font-bold mb-1">Prisma/PostgreSQL</h4>
              <p className="text-xs text-slate-500">Relational data linking Farmers, Batches, Orders, and Movements.</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <Zap className="w-6 h-6 text-primary mb-3" />
              <h4 className="font-bold mb-1">Next.js API</h4>
              <p className="text-xs text-slate-500">Server-side validation and role-based access control (RBAC).</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <Search className="w-6 h-6 text-primary mb-3" />
              <h4 className="font-bold mb-1">Traceability Engine</h4>
              <p className="text-xs text-slate-500">Dynamic event sorting for the "Quality Passport" visualization.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Flow */}
      <div className="space-y-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">The Functional Lifecycle</h2>
        
        <div className="grid grid-cols-1 gap-4 relative before:absolute before:inset-0 before:left-8 before:w-0.5 before:bg-slate-100 before:h-full">
          
          {/* Step 1 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">01. Buyer Onboarding & Profile</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Before placing an order, buyers must complete a **Business Profile**. This captures Company Name, Tax ID, and registered address. This data is used to automatically pre-fill logistics requirements and ensure commercial compliance.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <Package className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">02. Quote Request & Intent</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A buyer selects produce from the Marketplace. A modal captures the **Destination Address** and **Special Instructions**. This creates a "PENDING" Order and links it to the specific production batch.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">03. Contextual Negotiation</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Admin and Buyer enter a dedicated chat for that specific order. They discuss pricing, quality metrics (visible via the Quality Passport), and shipping terms. The order moves to "NEGOTIATING".
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">04. Confirmation & Processing</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Once terms are met, Admin clicks "Confirm Order". The produce enters the **Processing Phase**. Admin marks milestones for **Cleaning** and **Packaging**, which are instantly logged to the batch's permanent traceability record.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <Truck className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">05. Logistics & Last Mile</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Admin assigns a **Driver** and **Vehicle**. Clicking "Dispatch Truck" creates a `MovementLog`. This record links the Order, the Batch, and the physical transit details. The status moves to "DISPATCHED".
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="relative pl-20 group">
            <div className="absolute left-4 top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">06. Delivery & Chain Completion</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Upon arrival, the Admin (or Logistics Partner) marks the order as "DELIVERED". The buyer can now see the **Full History** on their Traceability page, from the farmer's harvest to the exact truck that delivered it.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Traceability Integration */}
      <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <Badge className="bg-primary text-white border-0 px-4 py-1 rounded-full text-[10px] font-black uppercase">Technical Insight</Badge>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Traceability Bridge</h2>
          <p className="text-slate-500 leading-relaxed">
            The **Trace Page** is the public face of our logistics. It uses a custom priority-sorting algorithm to merge data from:
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Agronomist Inputs: Soil health, harvest data, and lab tests.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                <Truck className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Logistics Logs: Driver details and real-time transit milestones.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1">
                <Package className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Warehouse Milestones: Cleaning, grading, and packaging history.</span>
            </li>
          </ul>
        </div>
        <div className="relative">
          <div className="p-8 rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between mb-4">
               <Package className="w-10 h-10 text-slate-900" />
               <Badge variant="outline" className="border-emerald-200 text-emerald-600 font-bold">Verified</Badge>
            </div>
            <div className="space-y-2">
               <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
               <div className="h-2 w-1/2 bg-slate-100 rounded-full" />
            </div>
            <div className="pt-4 border-t border-slate-50 space-y-3">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Batch ID</span>
                  <span className="text-xs font-bold text-slate-900">FG-2024-CORN-001</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Provenance</span>
                  <span className="text-xs font-bold text-slate-900">Ghana / Ashanti</span>
               </div>
            </div>
          </div>
          {/* Decorative Arrow */}
          <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-primary shadow-xl">
             <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
