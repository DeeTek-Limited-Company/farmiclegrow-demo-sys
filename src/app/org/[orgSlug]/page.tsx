'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LoginV1 from '@/components/ui/login-1';
import { useAuth } from '@/lib/auth-context';

export default function OrgLoginPage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = String(params.orgSlug || '');
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

  useEffect(() => {
    if (!isMounted || authLoading || !user) return;

    if (user.roles?.includes('super_admin') || user.role === 'super_admin') {
      router.replace('/super-admin');
      return;
    }

    const base = `/org/${orgSlug}`;
    if (user.role === 'admin') router.replace(`${base}/admin`);
    else if (user.role === 'agronomist') router.replace(`${base}/agronomist`);
    else if (user.role === 'ops') router.replace(`${base}/ops`);
    else if (user.role === 'buyer') router.replace(`${base}/buyer`);
    else router.replace(`${base}/farmer`);
  }, [user, authLoading, router, isMounted, orgSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password, orgSlug);
      toast.success('Logged in successfully');
    } catch (error: any) {
      if (error.message === 'Too many login attempts.' || error.status === 429) {
        const resetTime = (error as any).resetTime;
        if (resetTime) {
          setLockoutTime(resetTime);
          toast.error(`Too many attempts. Locked for ${Math.ceil((resetTime - Date.now()) / 1000)}s`);
        } else {
          toast.error(error.message || 'Too many login attempts.');
        }
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) return null;

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

