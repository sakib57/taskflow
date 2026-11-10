'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Bell, FolderKanban, TrendingUp } from 'lucide-react';
import { useAuth } from '@/store/auth';

export default function DashboardPage() {
  const [stats, setStats] = useState({ tasks: 0, notifications: 0, projects: 0 });

  const { user } = useAuth();
  const orgId = user?.organizations[0]?.id;

  useEffect(() => {
    Promise.all([
      api.get('/tasks').catch(() => ({ data: [] })),
      api
        .get(`/notifications?user_id=${user?.id}&org_id=${orgId}`)
        .catch(() => ({ data: { total: 0 } })),
      api.get('/projects').catch(() => ({ data: [] })),
    ]).then(([tasks, notifs, projects]) => {
      setStats({
        tasks: Array.isArray(tasks.data) ? tasks.data.length : 0,
        notifications: notifs.data?.total || 0,
        projects: Array.isArray(projects.data) ? projects.data.length : 0,
      });
    });
  }, []);

  const cards = [
    { title: 'Total Tasks', value: stats.tasks, icon: ListTodo, color: 'text-blue-600' },
    { title: 'Projects', value: stats.projects, icon: FolderKanban, color: 'text-purple-600' },
    { title: 'Notifications', value: stats.notifications, icon: Bell, color: 'text-orange-600' },
    { title: 'Team Efficiency', value: '94%', icon: TrendingUp, color: 'text-green-600' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
