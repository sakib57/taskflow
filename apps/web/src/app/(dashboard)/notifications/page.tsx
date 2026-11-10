'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Notification } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const orgId = user?.organizations[0]?.id;

  const loadNotifications = useCallback(async () => {
    if (!user || !orgId) return;
    try {
      const { data } = await api.get(`/notifications?user_id=${user.id}&org_id=${orgId}`);
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, orgId]);

  useEffect(() => {
    loadNotifications();
    // Poll every 10s (later → WebSocket)
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await api.put(`/notifications/${id}/read?user_id=${user.id}`);
      loadNotifications();
    } catch (err) {
      toast.add({ title: 'Failed to mark as read', type: 'error' });
    }
  };

  const markAllRead = async () => {
    if (!user || !orgId) return;
    try {
      await api.put(`/notifications/read-all?user_id=${user.id}&org_id=${orgId}`);
      toast.add({ title: 'All notifications marked as read' });
      loadNotifications();
    } catch (err) {
      toast.add({ title: 'Failed', type: 'error' });
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && <Badge className="bg-red-500">{unreadCount} unread</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            No notifications yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? 'opacity-60' : 'border-l-4 border-l-blue-500'}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{n.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {n.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
