import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { requireUser } from "@/lib/auth/server";
import { ForcePasswordChange } from "@/components/auth/force-password-change";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (user.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  const primaryRole = user.roles[0];

  return (
    <Sheet>
      <div className="relative flex h-screen bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/12 blur-[110px]" />
          <div className="absolute -bottom-56 -left-32 h-[620px] w-[620px] rounded-full bg-accent/14 blur-[120px]" />
          <div className="absolute -bottom-56 -right-32 h-[620px] w-[620px] rounded-full bg-primary/10 blur-[130px]" />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar userRole={primaryRole} />
        </div>

        {/* Mobile Sidebar Content */}
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-0">
          <div className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access platform sections and settings</SheetDescription>
          </div>
          <Sidebar userRole={primaryRole} isMobile />
        </SheetContent>

        {/* Main Content Area */}
        <div className="relative flex flex-col flex-1 w-full min-w-0 overflow-hidden bg-card/60 backdrop-blur-xl md:rounded-[2.5rem] shadow-[0_30px_90px_-60px_rgba(15,23,42,0.55)] dark:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.8)] md:my-6 md:mr-6 border border-border/60">
          {/* Header */}
          <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
            <div className="px-4 md:px-8 py-4">
              <Header
                userName={user.name}
                userRole={primaryRole}
                showMobileMenu={true}
              />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileNav userRole={primaryRole} />
        </div>
      </div>
    </Sheet>
  );
}
