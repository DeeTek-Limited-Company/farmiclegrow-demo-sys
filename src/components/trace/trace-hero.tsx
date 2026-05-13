'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Calendar, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface TraceHeroProps {
  code: string;
  crop: string;
  quantity: string;
  date: string;
}

export function TraceHero({ code, crop, quantity, date }: TraceHeroProps) {
  return (
    <section className="p-8 md:p-12 bg-slate-900 text-white relative overflow-hidden rounded-[2.5rem] shadow-2xl mb-8">
      {/* Background Abstract elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-0 translate-x-1/4 -translate-y-1/4" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <Badge variant="secondary" className="rounded-full px-4 py-1 text-[9px] font-black tracking-[0.2em] uppercase bg-primary text-white border-0 shadow-lg shadow-primary/20">
                Verified Batch
              </Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1 text-[9px] font-black tracking-[0.2em] uppercase border-white/20 text-white/60">
                ID: {code}
              </Badge>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black tracking-tight leading-tight"
            >
              Traceability Passport: <br />
              <span className="text-primary text-glow">{crop}</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-base text-slate-400 font-medium leading-relaxed"
            >
              Full digital chain-of-custody verification. This batch is tracked from seed planting to final harvest.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Harvested</span>
              </div>
              <div className="text-base font-black">{date}</div>
            </div>
            <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Yield</span>
              </div>
              <div className="text-base font-black">{quantity}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
