'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LoginV1 from '@/components/ui/login-1';
import { useAuth } from '@/lib/auth-context';

export default function GlobalLoginPage() {
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

    // Discovery logic: Redirect based on user role and organization
    if (user.roles?.includes('super_admin') || user.role === 'super_admin') {
      router.replace('/super-admin');
      return;
    }

    if (user.roles?.includes('buyer') || user.role === 'buyer') {
      // Buyers go to global dashboard if no org, or org dashboard if bound
      if (user.organizationSlug) {
        router.replace(`/org/${user.organizationSlug}/buyer`);
      } else {
        router.replace('/buyer');
      }
      return;
    }

    // For staff, they MUST have an organization
    if (user.organizationSlug) {
      const base = `/org/${user.organizationSlug}`;
      if (user.role === 'admin') router.replace(`${base}/admin`);
      else if (user.role === 'agronomist') router.replace(`${base}/agronomist`);
      else if (user.role === 'ops') router.replace(`${base}/ops`);
      else router.replace(`${base}/farmer`);
    } else {
      toast.error('Your account is not associated with any organization.');
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
      // Global login - no orgSlug provided initially
      await login(email, password);
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
        isGlobal={true}
      />

      {lockoutTime && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Account Locked</h2>
            <p className="text-slate-600 mb-6">Too many failed attempts. Please wait before trying again.</p>
            <div className="text-4xl font-black text-primary tabular-nums">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
