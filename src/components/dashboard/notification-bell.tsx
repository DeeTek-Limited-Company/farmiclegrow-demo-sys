"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Bell, CheckCircle2, XCircle, Info, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: any | null;
};

function hrefForNotification(userRole: string | undefined, n: Notification) {
  const meta = (n.metadata ?? {}) as any;
  const farmerId = typeof meta.farmerId === "string" ? meta.farmerId : null;
  const submissionId = typeof meta.submissionId === "string" ? meta.submissionId : null;

  if (submissionId && userRole === "admin") return `/admin/submissions/${submissionId}`;
  if (farmerId && (userRole === "admin" || userRole === "agronomist")) return `/${userRole}/farmers/${farmerId}`;
  return null;
}

export function NotificationBell({ userRole }: { userRole?: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const response = await apiFetch("/api/notifications?take=20");
    if (response.ok) {
      const data = await response.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id?: string) => {
    const payload = id ? { notificationId: id } : { markAll: true };
    const response = await apiFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      if (id) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    }
  };

  const open = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    const href = hrefForNotification(userRole, n);
    if (href) {
      router.push(href);
      return;
    }
    if (userRole) {
      router.push(`/${userRole}/notifications`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SUBMISSION_APPROVED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "SUBMISSION_REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
      case "SUBMISSION_CREATED": return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] items-center justify-center text-white font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-primary/10">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h3 className="font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-7 px-2 text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => markAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground opacity-50">
              <Inbox className="w-12 h-12 mb-2" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-primary/[0.02]' : ''}`}
                  onClick={() => open(n)}
                >
                  {!n.isRead && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                  <div className="flex items-center gap-2">
                    {getIcon(n.type)}
                    <span className={`text-xs font-bold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                      {n.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2 bg-muted/10">
          <Button
            variant="ghost"
            className="w-full h-8 text-[11px] text-muted-foreground hover:text-primary"
            onClick={() => userRole && router.push(`/${userRole}/notifications`)}
          >
            View all activity
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
