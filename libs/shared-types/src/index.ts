// ============================================
// Common Types
// ============================================
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User & Auth
// ============================================
export interface User extends BaseEntity {
  email: string;
  name: string;
  emailVerified: boolean;
  avatarUrl?: string;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface Membership extends BaseEntity {
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

// ============================================
// Task
// ============================================
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task extends BaseEntity {
  orgId: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  createdBy: string;
  dueDate?: Date;
}

// ============================================
// Events (RabbitMQ)
// ============================================
export enum EventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  TASK_ASSIGNED = 'task.assigned',
  ORG_CREATED = 'org.created',
  MEMBER_INVITED = 'member.invited',
}

export interface DomainEvent<T = any> {
  id: string;
  type: EventType;
  aggregateId: string;
  orgId: string;
  payload: T;
  timestamp: string;
  version: number;
}

// ============================================
// API Response
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ============================================
// Auth
// ============================================
export interface JwtPayload {
  sub: string; // user id
  email: string;
  orgId?: string;
  roles?: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
