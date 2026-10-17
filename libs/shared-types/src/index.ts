// ============================================
// Base Types
// ============================================
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User & Organization
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
  ownerId: string;
}

export interface Membership extends BaseEntity {
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

// ============================================
// JWT & Auth
// ============================================
export interface JwtPayload {
  sub: string;
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

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
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
// Event Types (RabbitMQ)
// ============================================
export enum EventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  ORG_CREATED = 'org.created',
  MEMBER_INVITED = 'member.invited',
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  TASK_ASSIGNED = 'task.assigned',
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
