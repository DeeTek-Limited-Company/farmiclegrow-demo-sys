import { Notification } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, Info } from 'lucide-react';

interface NotificationsSectionProps {
  notifications: Notification[];
}

export function NotificationsSection({
  notifications,
}: NotificationsSectionProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejection':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'system':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">
              No notifications yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Recent Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 p-3 rounded-lg border ${
                notification.read
                  ? 'bg-muted/30 border-border'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="pt-1">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {notification.timestamp.toLocaleDateString()}{' '}
                  {notification.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
