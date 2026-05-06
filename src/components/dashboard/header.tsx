'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bell, LogOut, Search, Settings, User, Menu } from 'lucide-react';
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
import { SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  userName?: string;
  userRole?: string;
  onSearch?: (query: string) => void;
  showMobileMenu?: boolean;
}

export function Header({
  userName = 'User',
  userRole = 'agronomist',
  onSearch,
  showMobileMenu = false,
}: HeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'agronomist':
        return 'bg-blue-500';
      case 'farmer':
        return 'bg-primary';
      default:
        return 'bg-gray-500';
    }
  };

  return (
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
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1.5 shadow-sm border border-slate-100">
            <Image 
              src="/logo.png" 
              alt="FarmicleGrow Logo" 
              width={32} 
              height={32} 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="font-black text-primary tracking-tighter text-lg">Farmicle</span>
        </div>

        <div className="hidden md:flex items-center relative max-w-md w-64 lg:w-96">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search records..."
            aria-label="Search records"
            onChange={(e) => onSearch?.(e.target.value)}
            className="h-10 pl-9 bg-muted/50 border-none focus-visible:ring-primary/20 rounded-xl"
          />
        </div>
      </div>

      {/* Right Side - Notifications and Avatar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-2xl border border-border/50">
          <NotificationBell userRole={userRole} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="User menu"
                className="hidden md:flex items-center gap-2 h-10 px-3 rounded-xl hover:bg-white/80 transition-all shadow-sm"
              >
                <Avatar className={`w-8 h-8 ${getRoleColor(userRole)} shadow-sm`}>
                  <AvatarFallback className="text-white text-[10px] font-black uppercase tracking-tighter">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-black text-slate-900 leading-none mb-0.5">{userName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize font-bold tracking-tight">
                    {userRole}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/50">
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className={`w-10 h-10 ${getRoleColor(userRole)}`}>
                    <AvatarFallback className="text-white text-xs font-black">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-black text-slate-900">{userName}</p>
                    <p className="text-xs text-muted-foreground capitalize font-medium">{userRole} Portal</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem className="rounded-lg h-11 cursor-pointer" onClick={() => router.push(`/${userRole}/profile`)}>
                <User className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="font-bold text-sm text-slate-700">My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg h-11 cursor-pointer">
                <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="font-bold text-sm text-slate-700">Account Settings</span>
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
  );
}
