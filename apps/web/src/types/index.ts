export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  organizations: Organization[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string | null;
  createdBy: string;
  dueDate: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}
