'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface AccordionItem {
  id: number;
  title: string;
  imageUrl: string;
}

const accordionItems: AccordionItem[] = [
  {
    id: 1,
    title: 'Farmer Onboarding',
    imageUrl: '/image1.jpg',
  },
  {
    id: 2,
    title: 'Farm Data Collection',
    imageUrl: '/image2.jpg',
  },
  {
    id: 3,
    title: 'Supply Chain Traceability',
    imageUrl: '/image3.jpg',
  },
  {
    id: 4,
    title: 'Verified Farmer Records',
    imageUrl: '/image4.jpg',
  },
  {
    id: 5,
    title: 'Market Access & Transparency',
    imageUrl: '/image5.jpg',
  },
];

export function HeroSection() {
  const [activeId, setActiveId] = useState<number>(3); // Default expanded item

  return (
    <section className="relative w-full pt-32 pb-16 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="w-full lg:w-[45%] flex flex-col items-start text-left">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6 animate-in fade-in slide-in-from-bottom-3 duration-1000">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Agri-Tech Platform
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-[var(--color-heading)] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              Connecting Farmers to <span className="text-primary">Transparent</span> Markets
            </h1>

            <p className="text-lg text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200 leading-relaxed">
              FarmicleGrow enables trusted farmer onboarding, verified farm data, and full supply chain traceability to empower farmers and buyers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <Button size="lg" asChild className="rounded-full px-8 h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
                <Link href="/login">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8 h-12 text-base font-bold border-2 transition-all hover:bg-muted active:scale-95">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Accordion Image Gallery */}
          <div className="w-full lg:w-[55%] h-[400px] md:h-[500px] lg:h-[600px] flex gap-2 md:gap-3 overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-500">
            {accordionItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "relative h-full transition-all duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] overflow-hidden rounded-2xl md:rounded-[2.5rem] cursor-pointer group flex-shrink-0",
                  activeId === item.id ? "flex-[5] min-w-[200px]" : "flex-[1] min-w-[60px] md:min-w-[80px]"
                )}
                onMouseEnter={() => setActiveId(item.id)}
                onClick={() => setActiveId(item.id)}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className={cn(
                    "object-cover transition-transform duration-700 group-hover:scale-110",
                    activeId === item.id ? "scale-100" : "scale-105 grayscale opacity-60"
                  )}
                  priority={item.id === activeId}
                />

                {/* Overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500",
                  activeId === item.id ? "opacity-100" : "opacity-0"
                )} />

                {/* Content */}
                <div className={cn(
                  "absolute bottom-0 left-0 w-full p-4 md:p-8 transition-all duration-500 delay-100",
                  activeId === item.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                      <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-base md:text-xl font-bold text-white whitespace-nowrap">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Vertical Title for Collapsed State */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                  activeId === item.id ? "opacity-0 pointer-events-none" : "opacity-100"
                )}>
                  <span className="rotate-90 whitespace-nowrap text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/50 group-hover:text-white/90 transition-colors">
                    {item.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full max-w-7xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>
    </section>
  );
}
