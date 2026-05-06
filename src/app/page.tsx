'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import LoginV1 from '@/components/ui/login-1';

export default function RootPage() {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle countdown
  useEffect(() => {
    if (!lockoutTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setLockoutTime(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTime]);

  // Redirect if already logged in
  useEffect(() => {
    if (!isMounted || authLoading) return;

    if (user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'agronomist') router.replace('/agronomist');
      else if (user.role === 'ops') router.replace('/ops');
      else if (user.role === 'buyer') router.replace('/buyer');
      else router.replace('/farmer');
    }
  }, [user, authLoading, router, isMounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success('Logged in successfully');

      // The useEffect above will handle redirection once the user state is updated
    } catch (error: any) {
      if (error.message === 'Too many login attempts.' || error.status === 429) {
        // If the error message is generic but the status is 429, we need the resetTime.
        // Since the AuthContext login might not return the full response, 
        // I'll check if the error object has a resetTime property.
        const resetTime = (error as any).resetTime;
        if (resetTime) {
          setLockoutTime(resetTime);
          toast.error(`Too many attempts. Locked for ${Math.ceil((resetTime - Date.now()) / 1000)}s`);
        } else {
          // Fallback if resetTime is missing
          toast.error(error.message || 'Too many login attempts.');
        }
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // While checking auth status, AuthProvider handles showing the LoadingScreen.
  // We only reach here if authLoading is false.
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="relative">
      <LoginV1
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleSubmit}
        isLoading={isSubmitting || !!lockoutTime}
      />

      {lockoutTime && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6 border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <span className="text-3xl">🔒</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
              <p className="text-slate-500 text-sm font-medium">
                Too many failed attempts. For your security, login is temporarily disabled.
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black mb-1">Retry available in</p>
              <p className="text-4xl font-black text-primary tabular-nums">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Please wait for the timer to expire before trying again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
