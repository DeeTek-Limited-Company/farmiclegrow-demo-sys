"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getPrimaryNavItems, getSecondaryNavItems } from "@/components/dashboard/nav-config";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function MobileNav({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const orgBase = user?.organizationSlug ? `/org/${user.organizationSlug}` : "";
  const withOrg = (href: string) => {
    if (!orgBase) return href;
    if (href.startsWith("/super-admin") || href.startsWith("/trace") || href.startsWith("/login") || href === "/") {
      return href;
    }
    return `${orgBase}${href}`;
  };

  const role = userRole || user?.role || "farmer";
  const primaryItems = useMemo(
    () =>
      getPrimaryNavItems(role)
        .map((item) => ({ ...item, href: withOrg(item.href) }))
        .slice(0, 4),
    [role, orgBase],
  );
  const moreItems = useMemo(
    () => [
      ...getPrimaryNavItems(role).slice(4).map((item) => ({ ...item, href: withOrg(item.href) })),
      ...getSecondaryNavItems(role).map((item) => ({ ...item, href: withOrg(item.href) })),
    ],
    [role, orgBase],
  );
  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = moreItems.some((item) => isItemActive(item.href));

  return (
    <>
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <nav className="grid h-16 grid-cols-5 gap-1 px-2 pb-[max(env(safe-area-inset-bottom),0px)]" aria-label="Primary navigation">
          {primaryItems.map((item) => {
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Open more navigation"
            aria-expanded={moreOpen}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="truncate">More</span>
          </button>
        </nav>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8"
        >
          <div className="sr-only">
            <SheetTitle>More navigation</SheetTitle>
            <SheetDescription>Access additional destinations and account actions.</SheetDescription>
          </div>
          <div className="space-y-2">
            {moreItems.map((item) => {
              const isActive = isItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-primary/25 bg-primary/5 text-primary"
                      : "border-border/60 bg-card text-foreground hover:bg-muted/60",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
