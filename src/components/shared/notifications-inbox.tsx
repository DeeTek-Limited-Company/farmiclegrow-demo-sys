"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2, Info, Inbox, RefreshCcw, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationType = "SUBMISSION_CREATED" | "SUBMISSION_APPROVED" | "SUBMISSION_REJECTED" | "SYSTEM";

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  metadata: any | null;
};

type InboxFilter = "all" | "unread" | "read";

function iconFor(type: NotificationType) {
  switch (type) {
    case "SUBMISSION_APPROVED":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "SUBMISSION_REJECTED":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "SUBMISSION_CREATED":
      return <Info className="w-4 h-4 text-blue-600" />;
    case "SYSTEM":
    default:
      return <Info className="w-4 h-4 text-blue-600" />;
  }
}

function hrefForNotification(userRole: "admin" | "agronomist" | "farmer", n: NotificationRow) {
  const meta = (n.metadata ?? {}) as any;
  const farmerId = typeof meta.farmerId === "string" ? meta.farmerId : null;
  const submissionId = typeof meta.submissionId === "string" ? meta.submissionId : null;

  if (submissionId && userRole === "admin") return `/admin/submissions/${submissionId}`;
  if (farmerId && (userRole === "admin" || userRole === "agronomist")) return `/${userRole}/farmers/${farmerId}`;
  return null;
}

function typeBadge(type: NotificationType) {
  switch (type) {
    case "SUBMISSION_CREATED":
      return <Badge variant="secondary">Submission</Badge>;
    case "SUBMISSION_APPROVED":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Approved</Badge>;
    case "SUBMISSION_REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    case "SYSTEM":
    default:
      return <Badge variant="outline">System</Badge>;
  }
}

export function NotificationsInbox({ userRole }: { userRole: "admin" | "agronomist" | "farmer" }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [type, setType] = useState<"ALL" | NotificationType>("ALL");
  const [query, setQuery] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("take", "200");
      if (type !== "ALL") params.set("type", type);
      if (filter === "read") params.set("isRead", "true");
      if (filter === "unread") params.set("isRead", "false");

      const res = await apiFetch(`/api/notifications?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
      } else {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, type]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter((n) => {
      const a = `${n.title} ${n.body ?? ""}`.toLowerCase();
      return a.includes(q);
    });
  }, [notifications, query]);

  const markAsRead = async (id?: string) => {
    const payload = id ? { notificationId: id } : { markAll: true };
    const res = await apiFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;
    if (id) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    router.refresh();
  };

  const openNotification = async (n: NotificationRow) => {
    if (!n.isRead) await markAsRead(n.id);
    const href = hrefForNotification(userRole, n);
    if (href) router.push(href);
  };

  return (
    <Card className="border-primary/5 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-primary text-white hover:bg-primary">{unreadCount} unread</Badge>
            )}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications..."
                className="pl-9 w-64"
              />
            </div>

            <Select value={filter} onValueChange={(v) => setFilter(v as InboxFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="SUBMISSION_CREATED">Submission created</SelectItem>
                <SelectItem value="SUBMISSION_APPROVED">Submission approved</SelectItem>
                <SelectItem value="SUBMISSION_REJECTED">Submission rejected</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2" onClick={() => fetchNotifications()} disabled={loading}>
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button onClick={() => markAsRead()} className="gap-2">
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[560px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="w-12 h-12 mb-3 opacity-60" />
              <p className="text-sm font-semibold">No notifications found</p>
              <p className="text-xs opacity-70 mt-1">Try changing filters or clearing the search.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((n) => {
                const href = hrefForNotification(userRole, n);
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors rounded-xl ${
                      n.isRead ? "" : "bg-primary/[0.03]"
                    }`}
                  >
                    <div className="pt-0.5">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-bold ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        {typeBadge(n.type)}
                        <span className="text-[11px] text-muted-foreground ml-auto whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        {!n.isRead && (
                          <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>
                            Mark read
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openNotification(n)} disabled={!href}>
                          Open
                        </Button>
                        {href && (
                          <Link href={href} className="text-xs text-primary font-semibold hover:underline">
                            Go to record
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
