'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardNavGroups, getPrimaryNavItems } from '@/components/dashboard/nav-config';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export function Sidebar({
  userRole = 'farmer',
  isMobile = false,
  mode = 'desktop',
}: {
  userRole?: string;
  isMobile?: boolean;
  mode?: 'desktop' | 'tablet' | 'mobile';
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const orgBase = user?.organizationSlug ? `/org/${user.organizationSlug}` : "";
  const withOrg = (href: string) => {
    if (href.startsWith('/super-admin')) {
      return href;
    }
    return orgBase ? `${orgBase}${href}` : href;
  };
  const groups = getDashboardNavGroups(userRole).map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, href: withOrg(item.href) })),
  }));

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (mode === 'tablet') {
    return (
      <aside className="hidden w-20 flex-col border-r border-border/60 bg-sidebar/90 px-3 py-4 text-sidebar-foreground backdrop-blur-xl md:flex lg:hidden">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-border/40">
            <Image
              src="/logo.png"
              alt="FarmicleGrow Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <nav className="flex-1 space-y-2" aria-label="Tablet Navigation">
          {getPrimaryNavItems(userRole).slice(0, 6).map((item) => {
            const resolvedHref = withOrg(item.href);
            const active = pathname === resolvedHref;

            return (
              <Link
                key={resolvedHref}
                href={resolvedHref}
                aria-label={item.name}
                title={item.name}
                className={cn(
                  "flex h-12 items-center justify-center rounded-2xl border text-[#E6EFE8] transition-colors",
                  active
                    ? "border-accent/40 bg-[#FFF4D6] text-[#14532D]"
                    : "border-transparent hover:border-white/10 hover:bg-white/6 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  const isDrawerMode = isMobile || mode === 'mobile';

  return (
    <aside className={cn(
      "flex flex-col border-r border-sidebar-border text-sidebar-foreground h-full overflow-hidden transition-all duration-300 bg-[linear-gradient(180deg,#14532D_0%,#0B2713_100%)]",
      isDrawerMode ? "w-full" : "w-64 hidden lg:flex"
    )}>
      {/* Brand Header */}
      <div className="p-8 border-b border-sidebar-border/10 flex items-center gap-4 bg-white/5 backdrop-blur-xl">
        <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-1 shadow-xl shadow-black/25 ring-1 ring-white/10">
          <Image 
            src="/logo.png" 
            alt="FarmicleGrow Logo" 
            width={44} 
            height={44} 
            className="w-full h-full object-contain" 
            priority
          />
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/25 blur-2xl" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-none tracking-tighter">
            FarmicleGrow
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-black mt-1">
            {userRole} portal
          </p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar" aria-label="Main Navigation">
        {groups.map((group) => (
          <div key={group.group} className="space-y-3">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/30">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                      active
                        ? "bg-white/10 text-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-full before:bg-accent"
                        : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "transition-transform duration-300 group-hover:scale-110",
                      active ? "text-white" : "opacity-70"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-xs tracking-tight",
                      active ? "font-black" : "font-semibold"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-8 border-t border-sidebar-border/5 bg-black/10">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-12 rounded-xl mb-6 group/logout"
          onClick={() => logout()}
        >
          <LogOut className="w-5 h-5 mr-4 transition-transform group-hover/logout:-translate-x-1" />
          <span className="font-black tracking-tight text-xs uppercase">Sign Out</span>
        </Button>
        
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-4 shadow-inner">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <p className="text-[10px] text-sidebar-foreground/60 font-black uppercase tracking-widest">
            Live Network Active
          </p>
        </div>
      </div>
    </aside>
  );
}
