import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/server";
import { ForcePasswordChange } from "@/components/auth/force-password-change";

export default async function BuyerGlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (user.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  // Ensure it's a buyer
  if (!user.roles.includes("buyer")) {
     // If they are not a buyer, they probably shouldn't be here
     // but let's just let the page handle specific role checks
  }

  const primaryRole = "buyer"; // Force buyer role UI for this layout

  return (
    <DashboardShell
      tabletSidebar={<Sidebar userRole={primaryRole} mode="tablet" />}
      desktopSidebar={<Sidebar userRole={primaryRole} mode="desktop" />}
      mobileSidebar={<Sidebar userRole={primaryRole} isMobile mode="mobile" />}
      header={<Header userName={user.name} userRole={primaryRole} showMobileMenu />}
      mobileNav={<MobileNav userRole={primaryRole} />}
    >
      {children}
    </DashboardShell>
  );
}
