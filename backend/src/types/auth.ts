// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organisationId?: string; // For joining existing org
  inviteToken?: string; // For accepting invites
}

export interface TokenPayload {
  userId: string;
  email: string;
  organisationId?: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserContext {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organisationId?: string;
  roles: UserRole[];
  permissions: string[];
  tokenVersion: number;
}

export interface UserRole {
  id: string;
  name: string;
  organisationId?: string;
}

// Organisation Types
export interface CreateOrganisationRequest {
  name: string;
  slug: string;
  verifiedDomain?: string;
}

export interface InviteUserRequest {
  email: string;
  roleId: string;
  organisationId: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Permission Types
export type PermissionCheck = {
  resource: string;
  action: string;
  organisationId?: string;
};

export type PermissionResult = {
  granted: boolean;
  reason?: string;
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    timestamp: string;
    requestId: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error Types
export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'AUTHZ_ERROR') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// Audit Types
export interface AuditEvent {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  organisationId?: string;
}