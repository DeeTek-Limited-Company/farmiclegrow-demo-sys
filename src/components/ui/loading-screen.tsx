'use client';

import React from 'react';
import Image from 'next/image';
import { Spinner } from './spinner';

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Pulse effect */}
        <div className="relative mb-8 h-20 w-20 animate-pulse">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 p-3">
            <Image
              src="/logo.png"
              alt="FarmicleGrow Logo"
              width={60}
              height={60}
              className="h-full w-full object-contain brightness-0 invert"
              priority
            />
          </div>
        </div>

        {/* Loading Text & Spinner */}
        <div className="flex items-center gap-3">
          <Spinner className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-widest text-primary uppercase">
            FarmicleGrow
          </span>
        </div>
        
        {/* Subtitle */}
        <p className="mt-2 text-xs font-medium text-slate-400">
          {message}
        </p>
      </div>
      
      {/* Bottom accent bar */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-slate-50 overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[loading_1.5s_infinite_ease-in-out]" />
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
