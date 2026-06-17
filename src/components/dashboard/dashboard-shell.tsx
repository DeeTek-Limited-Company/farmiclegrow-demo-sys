import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

type DashboardShellProps = {
  tabletSidebar: ReactNode;
  desktopSidebar: ReactNode;
  mobileSidebar: ReactNode;
  header: ReactNode;
  mobileNav: ReactNode;
  children: ReactNode;
};

export function DashboardShell({
  tabletSidebar,
  desktopSidebar,
  mobileSidebar,
  header,
  mobileNav,
  children,
}: DashboardShellProps) {
  return (
    <Sheet>
      <div className="relative flex min-h-dvh bg-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/12 blur-[110px]" />
          <div className="absolute -bottom-56 -left-32 h-[620px] w-[620px] rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute -bottom-56 -right-32 h-[620px] w-[620px] rounded-full bg-primary/9 blur-[130px]" />
        </div>

        <div className="hidden md:flex lg:hidden">{tabletSidebar}</div>

        <div className="hidden lg:block">{desktopSidebar}</div>

        <SheetContent side="left" className="w-72 border-r-0 bg-sidebar p-0 md:hidden">
          <div className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access platform sections and settings</SheetDescription>
          </div>
          {mobileSidebar}
        </SheetContent>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden border border-primary/10 bg-card/75 backdrop-blur-xl shadow-[0_30px_90px_-60px_rgba(92,59,0,0.22)] dark:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.8)] md:m-4 md:rounded-[2rem] lg:my-6 lg:mr-6">
          <header className="sticky top-0 z-40 border-b border-primary/10 bg-card/70 backdrop-blur-xl">
            <div className="px-4 py-3 md:px-6 md:py-4 lg:px-8">{header}</div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {mobileNav}
      </div>
    </Sheet>
  );
}
