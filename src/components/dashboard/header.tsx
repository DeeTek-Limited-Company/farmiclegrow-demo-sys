'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut, Search, Settings, User, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from './notification-bell';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  userName?: string;
  userRole?: string;
  onSearch?: (query: string) => void;
  showMobileMenu?: boolean;
}

export function getHeaderAccountLinks({
  userRole,
  organizationSlug,
}: {
  userRole?: string;
  organizationSlug?: string | null;
}) {
  const resolvedRole = userRole ?? "agronomist";

  if (resolvedRole === 'super_admin') {
    return {
      profileHref: '/super-admin/settings',
      settingsHref: '/super-admin/settings',
    };
  }

  const orgBase = organizationSlug ? `/org/${organizationSlug}` : "";
  const roleBase = orgBase ? `${orgBase}/${resolvedRole}` : `/${resolvedRole}`;
  const settingsHref = orgBase ? `${orgBase}/settings` : "/settings";

  if (resolvedRole === "farmer") {
    return {
      profileHref: settingsHref,
      settingsHref,
    };
  }

  if (resolvedRole === "buyer") {
    return {
      profileHref: `${roleBase}/profile`,
      settingsHref: orgBase ? settingsHref : `${roleBase}/profile`,
    };
  }

  return {
    profileHref: settingsHref,
    settingsHref,
  };
}

export function Header({
  userName = 'User',
  userRole = 'agronomist',
  onSearch,
  showMobileMenu = false,
}: HeaderProps) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleAvatarStyles = (role: string) => {
    switch (role) {
      case 'admin':
        return { avatar: 'bg-accent', text: 'text-accent-foreground' };
      case 'ops':
        return { avatar: 'bg-accent', text: 'text-accent-foreground' };
      default:
        return { avatar: 'bg-primary', text: 'text-primary-foreground' };
    }
  };

  const avatarStyles = getRoleAvatarStyles(userRole);
  const accountLinks = getHeaderAccountLinks({
    userRole,
    organizationSlug: user?.organizationSlug,
  });

  return (
    <>
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Trigger */}
          <div className="lg:hidden">
            {showMobileMenu && (
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/5" aria-label="Open navigation menu">
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <div className="flex h-9 items-center rounded-xl border border-primary/10 bg-[#FFF8EC] px-1.5 shadow-sm">
              <Image
                src="/logo.png"
                alt="FarmicleGrow Logo"
                width={96}
                height={36}
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center relative max-w-md w-64 lg:w-96">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchQuery}
              placeholder="Search records..."
              aria-label="Search records"
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 pl-9 rounded-2xl border border-primary/10 bg-[#FFF8EC]/90 shadow-sm focus-visible:ring-primary/20"
            />
          </div>
        </div>

        {/* Right Side - Notifications and Avatar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-primary/10 bg-card/70 p-1 backdrop-blur-xl shadow-[0_18px_50px_-40px_rgba(92,59,0,0.22)] dark:shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden rounded-2xl hover:bg-primary/5"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Open search"
            >
              <Search className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            </Button>

            <NotificationBell userRole={userRole} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="User menu"
                  className="flex h-10 w-10 items-center justify-center gap-2 rounded-2xl px-0 transition-all shadow-sm hover:bg-[#FFF8EC] md:w-auto md:px-3 dark:hover:bg-white/5"
                >
                  <Avatar className={`w-8 h-8 ${avatarStyles.avatar} shadow-sm`}>
                    <AvatarFallback className={`${avatarStyles.text} text-[10px] font-black uppercase tracking-tighter`}>
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="mb-0.5 text-xs leading-none font-black text-[#16311F]">{userName}</p>
                    <p className="text-[10px] text-muted-foreground capitalize font-bold tracking-tight">
                      {userRole}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-primary/10 bg-[#FFFDF7] p-2 shadow-xl">
                <DropdownMenuLabel className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className={`w-10 h-10 ${avatarStyles.avatar}`}>
                      <AvatarFallback className={`${avatarStyles.text} text-xs font-black`}>
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-[#16311F]">{userName}</p>
                      <p className="text-xs text-muted-foreground capitalize font-medium">{userRole} Portal</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem className="rounded-lg h-11 cursor-pointer" onClick={() => router.push(accountLinks.profileHref)}>
                  <User className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="text-sm font-bold text-[#36523E]">My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-11 cursor-pointer" onClick={() => router.push(accountLinks.settingsHref)}>
                  <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="text-sm font-bold text-[#36523E]">Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem className="rounded-lg h-11 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="font-bold text-sm">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="border-b border-primary/10 bg-[#FFFDF7]">
          <div className="sr-only">
            <SheetTitle>Search</SheetTitle>
            <SheetDescription>Search records and dashboard content</SheetDescription>
          </div>
          <div className="pt-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                value={searchQuery}
                placeholder="Search records..."
                aria-label="Search records"
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-11 rounded-2xl border-primary/10 bg-[#FFF8EC] pl-9"
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
