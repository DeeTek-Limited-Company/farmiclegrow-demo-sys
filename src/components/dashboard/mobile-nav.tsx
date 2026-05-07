"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Plus, 
  Search,
  Settings,
  MoreHorizontal,
  ClipboardList,
  Package,
  Bell,
  Menu,
  ShieldCheck,
  TrendingUp,
  FileText,
  ShoppingCart,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function MobileNav({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const role = userRole || user?.role || "farmer";

  const getNavItems = () => {
    switch (role) {
      case "admin":
        return [
          { icon: LayoutDashboard, label: "Home", href: "/admin" },
          { icon: ClipboardList, label: "Review", href: "/admin/submissions" },
          { icon: Search, label: "Search", href: "/admin/farmers", isCenter: true },
          { icon: Settings, label: "Users", href: "/admin/users" },
          { icon: Menu, label: "More", href: "/admin/audit" }, // Could trigger a sheet
        ];
      case "agronomist":
        return [
          { icon: LayoutDashboard, label: "Home", href: "/agronomist" },
          { icon: Users, label: "Farmers", href: "/agronomist/farmers" },
          { icon: Plus, label: "Onboard", href: "/agronomist/onboarding", isCenter: true },
          { icon: Package, label: "Ops", href: "/agronomist/production" },
          { icon: Menu, label: "More", href: "/settings" }, // Could trigger a sheet
        ];
      case "ops":
        return [
          { icon: LayoutDashboard, label: "Home", href: "/ops" },
          { icon: Search, label: "Reports", href: "/ops/reports" },
          { icon: FileText, label: "Docs", href: "/admin/documents", isCenter: true },
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: Menu, label: "More", href: "/settings" },
        ];
      case "buyer":
        return [
          { icon: LayoutDashboard, label: "Home", href: "/buyer" },
          { icon: ShoppingCart, label: "Market", href: "/buyer/marketplace" },
          { icon: Search, label: "Trace", href: "/trace", isCenter: true },
          { icon: Package, label: "Orders", href: "/buyer/orders" },
          { icon: MessageSquare, label: "Chat", href: "/buyer/chat" },
        ];
      case "farmer":
      default:
        return [
          { icon: LayoutDashboard, label: "Home", href: "/farmer" },
          { icon: TrendingUp, label: "Records", href: "/farmer/production" },
          { icon: Plus, label: "Log", href: "/farmer/production/new", isCenter: true },
          { icon: Bell, label: "Alerts", href: "/farmer/notifications" },
          { icon: Menu, label: "Menu", href: "/settings" },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 px-6">
      <nav className="bg-[linear-gradient(180deg,#14532D_0%,#0B2713_100%)] backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] rounded-[2.5rem] flex items-center justify-between p-2 h-20 relative">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href.split('?')[0];
          
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-8"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-accent shadow-xl shadow-accent/30 flex items-center justify-center text-accent-foreground border-4 border-[#0B2713] transition-transform active:scale-90 duration-300">
                    <item.icon className="w-8 h-8" strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-accent mt-2 absolute -bottom-5">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 px-3 py-2 rounded-2xl min-w-[64px]",
                isActive ? "text-white" : "text-white/70 hover:text-white"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1 transition-transform", isActive && "scale-110")} />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter transition-opacity",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
