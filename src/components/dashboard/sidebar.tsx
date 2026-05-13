'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  Settings,
  ShieldCheck,
  FileText,
  PlusCircle,
  TrendingUp,
  Package,
  MapPin,
  Map,
  Bell,
  User,
  LogOut,
  Sprout,
  ClipboardList,
  Wheat,
  Truck,
  Warehouse,
  Handshake,
  ShoppingCart,
  MessageSquare,
  Search
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function Sidebar({
  userRole = 'farmer',
  isMobile = false
}: {
  userRole?: string;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const getNavGroups = (): NavGroup[] => {
    switch (userRole) {
      case 'admin':
        return [
          {
            group: 'Control Center',
            items: [
              { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
              { name: 'Farmers', href: '/admin/farmers', icon: <Users className="w-5 h-5" /> },
              { name: 'Review Queue', href: '/admin/submissions', icon: <CheckCircle className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Management',
            items: [
              { name: 'User Directory', href: '/admin/users', icon: <Settings className="w-5 h-5" /> },
              { name: 'Market Inventory', href: '/admin/inventory', icon: <Warehouse className="w-5 h-5" /> },
              { name: 'Agronomist Assignment', href: '/admin/assignments', icon: <ClipboardList className="w-5 h-5" /> },
              { name: 'Document Review', href: '/admin/documents', icon: <FileText className="w-5 h-5" /> },
              { name: 'Locations', href: '/admin/locations', icon: <MapPin className="w-5 h-5" /> },
              { name: 'Audit Trails', href: '/admin/audit', icon: <ShieldCheck className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Intelligence',
            items: [
              { name: 'Platform Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Account',
            items: [
              { name: 'Notifications', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
              { name: 'Global Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
            ]
          }
        ];
      case 'agronomist':
        return [
          {
            group: 'Field Desk',
            items: [
              { name: 'Overview', href: '/agronomist', icon: <LayoutDashboard className="w-5 h-5" /> },
              { name: 'My Districts', href: '/agronomist/districts', icon: <MapPin className="w-5 h-5" /> },
              { name: 'Communities', href: '/agronomist/communities', icon: <MapPin className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Farmers',
            items: [
              { name: 'All Farmers', href: '/agronomist/farmers', icon: <Users className="w-5 h-5" /> },
              { name: 'Register Farmer', href: '/agronomist/onboarding', icon: <PlusCircle className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Farm Setup',
            items: [
              { name: 'Farm Profiles', href: '/agronomist/farm-profiles', icon: <Sprout className="w-5 h-5" /> },
              { name: 'Plots', href: '/agronomist/plots', icon: <Map className="w-5 h-5" /> },
              { name: 'Farm Locations', href: '/agronomist/locations', icon: <MapPin className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Production',
            items: [
              { name: 'Production Cycles', href: '/agronomist/production', icon: <TrendingUp className="w-5 h-5" /> },
              { name: 'Quality Testing', href: '/agronomist/quality-testing', icon: <ShieldCheck className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Traceability',
            items: [
              { name: 'Batches', href: '/agronomist/batches', icon: <Package className="w-5 h-5" /> },
              { name: 'Movement Logs', href: '/agronomist/movements', icon: <Truck className="w-5 h-5" /> },
              { name: 'Warehousing', href: '/agronomist/warehousing', icon: <Warehouse className="w-5 h-5" /> },
              { name: 'Sales Records', href: '/agronomist/sales', icon: <Handshake className="w-5 h-5" /> },
            ]
          },
          {
            group: 'System',
            items: [
              { name: 'Notifications', href: '/agronomist/notifications', icon: <Bell className="w-5 h-5" /> },
              { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
            ]
          }
        ];
      case 'ops':
        return [
          {
            group: 'Operations',
            items: [
              { name: 'Dashboard', href: '/ops', icon: <LayoutDashboard className="w-5 h-5" /> },
              { name: 'Reports', href: '/ops/reports', icon: <FileText className="w-5 h-5" /> },
              { name: 'Document Review', href: '/admin/documents', icon: <FileText className="w-5 h-5" /> },
            ],
          },
          {
            group: 'Account',
            items: [
              { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
            ],
          },
        ];
      case 'buyer':
        return [
          {
            group: 'Buyer Hub',
            items: [
              { name: 'Dashboard', href: '/buyer', icon: <LayoutDashboard className="w-5 h-5" /> },
              { name: 'Marketplace', href: '/buyer/marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
              { name: 'Orders', href: '/buyer/orders', icon: <Package className="w-5 h-5" /> },
              { name: 'Trace Lookup', href: '/trace', icon: <Search className="w-5 h-5" /> },
            ],
          },
          {
            group: 'Messages',
            items: [
              { name: 'Chat', href: '/buyer/chat', icon: <MessageSquare className="w-5 h-5" /> },
              { name: 'Notifications', href: '/buyer/notifications', icon: <Bell className="w-5 h-5" /> },
            ],
          },
          {
            group: 'Account',
            items: [{ name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> }],
          },
        ];
      case 'farmer':
      default:
        return [
          {
            group: 'My Farm',
            items: [
              { name: 'Dashboard', href: '/farmer', icon: <LayoutDashboard className="w-5 h-5" /> },
              { name: 'Production Log', href: '/farmer/production', icon: <ClipboardList className="w-5 h-5" /> },
              { name: 'Farm Sites', href: '/farmer/farms', icon: <Sprout className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Personal',
            items: [
              { name: 'Inbox', href: '/farmer/notifications', icon: <Bell className="w-5 h-5" /> },
              { name: 'Profile Settings', href: '/farmer/profile', icon: <User className="w-5 h-5" /> },
            ]
          },
          {
            group: 'Settings',
            items: [
              { name: 'Account Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
            ]
          }
        ];
    }
  };

  const groups = getNavGroups();

  const isActive = (href: string) => {
    if (href === '/agronomist' || href === '/admin' || href === '/farmer' || href === '/buyer') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "flex flex-col border-r border-sidebar-border text-sidebar-foreground h-full overflow-hidden transition-all duration-300 bg-[linear-gradient(180deg,#14532D_0%,#0B2713_100%)]",
      isMobile ? "w-full" : "w-64 hidden lg:flex"
    )}>
      {/* Brand Header */}
      <div className="p-8 border-b border-sidebar-border/10 flex items-center gap-4 bg-white/5 backdrop-blur-xl">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-1.5 shadow-xl shadow-black/25 ring-1 ring-white/10">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            width={48} 
            height={48} 
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
                      {item.icon}
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
        
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] text-sidebar-foreground/60 font-black uppercase tracking-widest">
            Live Network Active
          </p>
        </div>
      </div>
    </aside>
  );
}
