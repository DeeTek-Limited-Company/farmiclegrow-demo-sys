'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="w-full min-w-[200px] relative text-left">
      {label &&
        <label className='block mb-2 text-sm text-[var(--color-text-primary)]'>
          {label}
        </label>
      }
      <div className="relative w-full">
        <input
          className="peer relative z-10 border-2 border-[var(--color-border)] h-12 w-full rounded-md bg-[var(--color-surface)] px-4 text-[var(--color-text-primary)] font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] focus:border-[var(--color-text-primary)] placeholder:font-medium placeholder:text-[var(--color-text-secondary)]"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 text-[var(--color-text-secondary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface LoginV1Props {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from 'react';

const carouselItems = [
  {
    image: '/image1.jpg',
    title: 'Empowering Farmers',
    description: 'Transparent digital markets for a sustainable agricultural future.'
  },
  {
    image: '/image2.jpg',
    title: 'Precision Tracking',
    description: 'Monitoring productivity from soil to silo with real-time data.'
  },
  {
    image: '/image3.jpg',
    title: 'Direct Connections',
    description: 'Bridging the gap between smallholder farmers and global markets.'
  },
  {
    image: '/image4.jpg',
    title: 'Smart Analytics',
    description: 'Leveraging modern technology for maximized crop yields.'
  },
  {
    image: '/image5.jpg',
    title: 'Nurturing Growth',
    description: 'Supporting the next generation of agricultural entrepreneurs.'
  }
];

export default function LoginV1({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  isLoading
}: LoginV1Props) {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    const interval = setInterval(scrollNext, 5000);
    return () => clearInterval(interval);
  }, [scrollNext]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div className="h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className='card w-full lg:w-[80%] xl:w-[70%] max-w-6xl flex flex-col lg:flex-row justify-between h-auto lg:h-[650px] bg-[var(--color-surface)] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/10'>
        <div
          className='w-full lg:w-1/2 px-6 md:px-12 lg:px-16 py-12 flex flex-col justify-center left relative overflow-hidden'
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <div
            className={`absolute pointer-events-none w-[500px] h-[500px] bg-gradient-to-r from-accent/30 via-white/10 to-accent/30 rounded-full blur-[100px] transition-opacity duration-500 ${isHovering ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.2s ease-out'
            }}
          />

          <div className="z-10 w-full">
            <div className="flex items-center gap-2 mb-10 justify-center lg:justify-start">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg border border-white/20 p-1.5 overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
              </div>
              <span className="text-2xl font-black text-[var(--color-heading)] tracking-tighter">FarmicleGrow</span>
            </div>

            <form className='grid gap-8' onSubmit={onSubmit}>
              <div className='grid gap-2'>
                <h1 className='text-3xl md:text-5xl font-black text-[var(--color-heading)] tracking-tight'>Sign In</h1>
                <p className='text-[var(--color-text-secondary)] text-sm font-medium'>Secure access to your agricultural dashboard</p>
              </div>

              <div className='grid gap-5'>
                <AppInput
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  icon={<Mail className="w-5 h-5" />}
                />
                <AppInput
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  icon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-primary focus:ring-offset-0 focus:ring-0" />
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">Remember me</span>
                </label>
                <a href="#" className='text-xs font-bold text-primary hover:text-accent transition-colors'>Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group/button relative w-full inline-flex justify-center items-center overflow-hidden rounded-lg bg-primary py-3 text-sm font-bold text-white transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="px-2 flex items-center gap-2">
                  {isLoading ? <Spinner className="w-4 h-4" /> : 'Sign In to Account'}
                </span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-12 bg-white/20" />
                </div>
              </button>

              <div className="text-xs text-center text-[var(--color-text-secondary)]">
                Buying products?{" "}
                <Link href="/buyer/signup" className="font-bold text-primary hover:text-accent transition-colors">
                  Create a buyer account
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className='hidden lg:block w-1/2 right h-full relative group overflow-hidden' ref={emblaRef}>
          <div className="flex h-full">
            {carouselItems.map((item, index) => (
              <div key={index} className="relative flex-[0_0_100%] h-full">
                <Image
                  src={item.image}
                  width={1000}
                  height={1000}
                  priority
                  alt={item.title}
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-90" />

                <div className="absolute bottom-12 left-12 right-12 z-20">
                  <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transform transition-all duration-500 group-hover:translate-y-[-10px]">
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight uppercase tracking-tighter">{item.title}</h2>
                    <p className="text-white/70 text-sm font-medium leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
