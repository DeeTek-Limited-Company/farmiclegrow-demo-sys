'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { Mail, Eye, EyeOff } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

/* ─────────────────────────────────────────────
   Input component
───────────────────────────────────────────── */
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
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="w-full relative text-left">
      {label && (
        <label className="block mb-1.5 text-xs font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <input
          className="
            peer relative z-10 border-2 border-[var(--color-border)]
            h-11 w-full rounded-lg bg-[var(--color-surface)] px-4 pr-10
            text-sm text-[var(--color-text-primary)] font-normal outline-none
            drop-shadow-sm transition-all duration-200 ease-in-out
            focus:bg-[var(--color-bg)] focus:border-[var(--color-text-primary)]
            placeholder:font-medium placeholder:text-[var(--color-text-secondary)]
          "
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-lg overflow-hidden"
              style={{ background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)` }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-lg overflow-hidden"
              style={{ background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-text-primary) 0%, transparent 70%)` }}
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
  );
};

/* ─────────────────────────────────────────────
   Carousel data
───────────────────────────────────────────── */
const carouselItems = [
  { image: '/image1.jpg', title: 'Empowering Farmers',   description: 'Transparent digital markets for a sustainable agricultural future.' },
  { image: '/image2.jpg', title: 'Precision Tracking',   description: 'Monitoring productivity from soil to silo with real-time data.' },
  { image: '/image3.jpg', title: 'Direct Connections',   description: 'Bridging the gap between smallholder farmers and global markets.' },
  { image: '/image4.jpg', title: 'Smart Analytics',      description: 'Leveraging modern technology for maximized crop yields.' },
  { image: '/image5.jpg', title: 'Nurturing Growth',     description: 'Supporting the next generation of agricultural entrepreneurs.' },
];

/* ─────────────────────────────────────────────
   LoginV1 props
───────────────────────────────────────────── */
interface LoginV1Props {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isGlobal?: boolean;
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function LoginV1({
  email, setEmail, password, setPassword, onSubmit, isLoading,
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
    const r = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    /*
     * OUTER SHELL
     * ─ min-h-screen  → fills viewport (and beyond when content is tall)
     * ─ overflow-y-auto → allows natural scroll when content > viewport
     * ─ items-start + py-6 → card stacks from top with padding;
     *   my-auto on the card centres it when there's leftover space.
     * ─ On xl+ we switch to items-center for a pure centred look since
     *   the card is always comfortably smaller than a 900px+ tall screen.
     */
    <div className="
      min-h-screen w-full bg-primary overflow-y-auto
      flex flex-col items-center justify-start
      py-6 px-4 sm:px-6
      xl:justify-center xl:py-8
    ">
      {/*
       * CARD
       * Small  (<768px)  : single column, max-w-sm, centred
       * Medium (768-1279): two columns, tighter spacing – fits ~700px height
       * Large  (1280px+) : two columns, more spacious, premium feel
       */}
      <div className="
        my-auto w-full
        max-w-sm                        /* mobile: compact card */
        md:max-w-2xl                    /* medium: two-column (narrower) */
        xl:max-w-4xl                    /* large: wider two-column (narrower) */
        2xl:max-w-5xl                   /* extra large: slightly wider */
        flex flex-col md:flex-row
        bg-[var(--color-surface)] rounded-2xl overflow-hidden
        shadow-[0_0_60px_rgba(0,0,0,0.4)] border border-white/10
      ">

        {/* ── FORM COLUMN ────────────────────────────── */}
        <div
          className="
            relative overflow-hidden
            w-full md:w-[52%] xl:w-1/2
            px-7 sm:px-8 md:px-10 xl:px-14
            py-8 md:py-10 xl:py-14
            flex flex-col justify-center
          "
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* ambient glow blob */}
          <div
            className={`
              absolute pointer-events-none rounded-full
              w-72 h-72 xl:w-96 xl:h-96
              bg-gradient-to-r from-accent/30 via-white/10 to-accent/30
              blur-[70px] xl:blur-[100px]
              transition-opacity duration-500
              ${isHovering ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              transform: `translate(${mousePosition.x - 150}px, ${mousePosition.y - 150}px)`,
              transition: 'transform 0.2s ease-out',
            }}
          />

          <div className="relative z-10 w-full">
            {/* ── Logo ── */}
            <div className="flex justify-center md:justify-start mb-5 md:mb-6 xl:mb-8">
              <div className="flex h-10 xl:h-12 items-center rounded-xl xl:rounded-2xl bg-white px-2.5 shadow-lg border border-white/20 overflow-hidden">
                <img src="/logo.png" alt="FarmicleGrow" className="h-7 xl:h-9 w-auto object-contain" />
              </div>
            </div>

            {/* ── Heading ── */}
            <div className="mb-4 md:mb-5 xl:mb-7 text-center md:text-left">
              <h1 className="text-2xl md:text-2xl xl:text-4xl font-black text-[var(--color-heading)] tracking-tight leading-none">
                Sign In
              </h1>
              <p className="text-[var(--color-text-secondary)] text-xs xl:text-sm font-medium mt-1.5">
                Secure access to your agricultural dashboard
              </p>
            </div>

            {/* ── Form ── */}
            <form className="flex flex-col gap-3 md:gap-3 xl:gap-5" onSubmit={onSubmit}>

              {/* inputs */}
              <div className="flex flex-col gap-2.5 xl:gap-3.5">
                <AppInput
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  icon={<Mail className="w-4 h-4" />}
                />
                <AppInput
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
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
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* remember me / forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-primary focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    Remember me
                  </span>
                </label>
                <a href="#" className="text-xs font-bold text-primary hover:text-accent transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  group/btn relative w-full overflow-hidden
                  inline-flex justify-center items-center
                  rounded-lg bg-primary
                  py-2.5 xl:py-3
                  text-sm font-bold text-white
                  transition-all duration-300 ease-in-out
                  hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20
                  disabled:opacity-50 disabled:hover:scale-100 cursor-pointer
                "
              >
                <span className="px-2 flex items-center gap-2">
                  {isLoading ? <Spinner className="w-4 h-4" /> : 'Sign In to Account'}
                </span>
                {/* shimmer sweep */}
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/20" />
                </div>
              </button>

              {/* buyer link */}
              <p className="text-xs text-center text-[var(--color-text-secondary)]">
                Buying products?{' '}
                <Link href="/buyer/signup" className="font-bold text-primary hover:text-accent transition-colors">
                  Create a buyer account
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* ── CAROUSEL COLUMN (hidden on mobile < md) ─── */}
        <div
          className="hidden md:block md:w-[48%] xl:w-1/2 relative group overflow-hidden"
          ref={emblaRef}
          style={{ minHeight: 'clamp(380px, 50vh, 600px)' }}
        >
          <div className="flex h-full">
            {carouselItems.map((item, i) => (
              <div key={i} className="relative flex-[0_0_100%] h-full" style={{ minHeight: 'clamp(380px, 50vh, 600px)' }}>
                <Image
                  src={item.image}
                  fill
                  priority={i === 0}
                  alt={item.title}
                  className="object-cover opacity-70"
                  sizes="(max-width: 1280px) 48vw, 50vw"
                />
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent" />

                {/* caption card */}
                <div className="absolute bottom-6 left-6 right-6 xl:bottom-10 xl:left-10 xl:right-10 z-20">
                  <div className="
                    p-5 xl:p-7 rounded-xl xl:rounded-2xl
                    bg-white/5 backdrop-blur-xl
                    border border-white/10 shadow-2xl
                    transform transition-all duration-500
                    group-hover:-translate-y-1.5
                  ">
                    <h2 className="text-base xl:text-xl font-bold text-white mb-1 xl:mb-1.5 leading-tight uppercase tracking-tighter">
                      {item.title}
                    </h2>
                    <p className="text-white/70 text-xs xl:text-sm font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
