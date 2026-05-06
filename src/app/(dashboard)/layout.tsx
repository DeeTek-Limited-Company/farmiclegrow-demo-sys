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
      <div className="flex h-screen bg-slate-50/50">
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
        <div className="flex flex-col flex-1 w-full min-w-0 overflow-hidden bg-background md:rounded-tl-[2.5rem] md:rounded-bl-[2.5rem] md:ml-0 shadow-2xl md:my-0">
          {/* Header */}
          <header className="border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-40">
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
