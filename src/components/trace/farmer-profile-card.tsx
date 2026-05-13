'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Quote } from 'lucide-react';

interface FarmerProfileProps {
  name: string;
  community: string;
  location: string;
  image?: string;
  impactQuote?: string;
}

export function FarmerProfileCard({ 
  name, 
  community, 
  location, 
  image = "https://images.unsplash.com/photo-1594488687126-04355b74bc4d?q=80&w=2070&auto=format&fit=crop",
  impactQuote = "Farming is not just my job, it's how I provide a better future for my family."
}: FarmerProfileProps) {
  return (
    <Card className="overflow-hidden rounded-[2.5rem] border-0 shadow-xl bg-white group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{community}</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">{name}</h3>
        </div>
      </div>
      <CardContent className="p-6">
        <p className="text-slate-600 font-medium italic leading-relaxed text-xs">
          "{impactQuote}"
        </p>
        <div className="mt-4 pt-4 border-t border-slate-100">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</div>
           <div className="text-xs font-bold text-slate-900">{location}</div>
        </div>
      </CardContent>
    </Card>
  );
}
