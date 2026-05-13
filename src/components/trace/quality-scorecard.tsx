'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Droplets, Award, Star, ShieldCheck, Beaker } from 'lucide-react';
import { motion } from 'framer-motion';

interface QualityMetric {
  label: string;
  value: string;
  iconName: 'moisture' | 'purity' | 'aflatoxin' | 'grade' | 'compliance';
  score?: number;
}

const ICON_MAP = {
  moisture: Droplets,
  purity: ShieldCheck,
  aflatoxin: Beaker,
  grade: Star,
  compliance: Award,
};

interface QualityScorecardProps {
  metrics?: QualityMetric[];
  grade?: string;
}

export function QualityScorecard({ metrics, grade }: QualityScorecardProps) {
  const defaultMetrics: QualityMetric[] = [
    { label: "Moisture", value: "11.2%", iconName: 'moisture', score: 95 },
    { label: "Purity", value: "99.8%", iconName: 'purity', score: 98 },
    { label: "Aflatoxin", value: "Pass", iconName: 'aflatoxin', score: 100 },
    { label: "Grade", value: grade || "Premium", iconName: 'grade', score: 100 },
  ];

  const displayMetrics = metrics || defaultMetrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {displayMetrics.map((metric, i) => {
        const Icon = ICON_MAP[metric.iconName];
        return (
        <Card key={metric.label} className="rounded-3xl border-0 bg-white shadow-md overflow-hidden group hover:bg-primary transition-all duration-500">
           <CardContent className="p-5">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                 <Icon className="w-4 h-4 text-accent" />
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 group-hover:text-white/60 transition-colors">{metric.label}</div>
              <div className="text-sm font-black text-slate-900 group-hover:text-white transition-colors">{metric.value}</div>
              
              {metric.score !== undefined && (
                <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     whileInView={{ width: `${metric.score}%` }}
                     viewport={{ once: true }}
                     className="h-full bg-primary group-hover:bg-white transition-colors"
                   />
                </div>
              )}
           </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
