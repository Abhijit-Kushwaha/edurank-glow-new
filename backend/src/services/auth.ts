import bcrypt from 'bcrypt';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { getDatabase } from '../database';
import { users, sessions, auditLogs } from '../types/database';
import { eq, and, gt } from 'drizzle-orm';
import {
  LoginRequest,
  RegisterRequest,
  TokenPayload,
  RefreshTokenPayload,
  AuthTokens,
  UserContext,
  AuthenticationError,
  AuditEvent
} from '../types/auth';
import { auditService } from './audit';

export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly bcryptRounds: number;
  private readonly useArgon2: boolean;

  constructor() {
    this.jwtAccessSecret = process.env.JWT_ACCESS_SECRET!;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.useArgon2 = process.env.USE_ARGON2 === 'true';
  }

  /**
   * Hash password using configured algorithm
   */
  async hashPassword(password: string): Promise<string> {
    if (this.useArgon2) {
      return argon2.hash(password, {
        timeCost: parseInt(process.env.ARGON2_TIME_COST || '3'),
        memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '4096'),
        parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1'),
      });
    }
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (this.useArgon2) {
        return argon2.verify(hash, password);
      }
      return bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.jwtAccessSecret, {
      expiresIn: this.jwtAccessExpiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtAccessSecret) as TokenPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as RefreshTokenPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<UserContext> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const db = getDatabase();
    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.deletedAt, null)))
      .limit(1);

    if (existingUser.length > 0) {
      throw new AuthenticationError('User already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        emailVerified: false,
      })
      .returning();

    // Get user context (will assign default role)
    const userContext = await this.getUserContext(newUser.id);

    // Audit log
    await auditService.log({
      actorId: newUser.id,
      action: 'user.registered',
      resourceType: 'user',
      resourceId: newUser.id,
      newValues: { email, firstName, lastName },
    });

    return userContext;
  }

  /**
   * Login user
   */
  async login(
    data: LoginRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: UserContext; tokens: AuthTokens }> {
    const { email, password, deviceFingerprint } = data;
    const db = getDatabase();

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.deletedAt, null)))
      .limit(1);

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if account is locked
    if (user.accountLocked && user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new AuthenticationError('Account is temporarily locked');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed attempts
      await this.handleFailedLogin(user.id);
      throw new AuthenticationError('Invalid credentials');
    }

    // Reset failed attempts and update last login
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Get user context
    const userContext = await this.getUserContext(user.id);

    // Create session and tokens
    const tokens = await this.createSession(user.id, deviceFingerprint, ipAddress, userAgent);

    // Audit log
    await auditService.log({
      actorId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { ipAddress, userAgent, deviceFingerprint },
    });

    return { user: userContext, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const db = getDatabase();

    // Find and validate session
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, this.hashToken(refreshToken)),
          eq(sessions.revoked, false),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session || session.userId !== payload.userId) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Update session last used
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Generate new tokens
    const userContext = await this.getUserContext(session.userId);
    const tokens = this.generateTokens(userContext, session.id);

    return tokens;
  }

  /**
   * Logout user (revoke session)
   */
  async logout(refreshToken: string, userId: string): Promise<void> {
    const db = getDatabase();
    const hash = this.hashToken(refreshToken);

    await db
      .update(sessions)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(and(eq(sessions.refreshTokenHash, hash), eq(sessions.userId, userId)));

    // Audit log
    await auditService.log({
      actorId: userId,
      action: 'user.logout',
      resourceType: 'session',
    });
  }

  /**
   * Get user context with roles and permissions
   */
  async getUserContext(userId: string): Promise<UserContext> {
    const db = getDatabase();
    // This is a simplified version - in production you'd join with user_roles, roles, and permissions
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // TODO: Implement proper role and permission fetching
    // For now, return basic context
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      roles: [], // TODO: Fetch actual roles
      permissions: [], // TODO: Fetch actual permissions
      tokenVersion: 1, // TODO: Implement token versioning
    };
  }

  /**
   * Create session and generate tokens
   */
  private async createSession(
    userId: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const db = getDatabase();
    const sessionId = randomBytes(16).toString('hex');
    const refreshToken = this.generateRefreshToken({
      userId,
      tokenVersion: 1, // TODO: Get from user
      sessionId,
    });

    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(sessions).values({
      userId,
      refreshTokenHash,
      deviceFingerprint,
      ipAddress,
      userAgent,
      expiresAt,
    });

    const userContext = await this.getUserContext(userId);
    return this.generateTokens(userContext, sessionId);
  }

  /**
   * Generate both access and refresh tokens
   */
  private generateTokens(userContext: UserContext, sessionId: string): AuthTokens {
    const accessToken = this.generateAccessToken({
      userId: userContext.id,
      email: userContext.email,
      organisationId: userContext.organisationId,
      roles: userContext.roles.map(r => r.name),
      permissions: userContext.permissions,
      tokenVersion: userContext.tokenVersion,
    });

    const refreshToken = this.generateRefreshToken({
      userId: userContext.id,
      tokenVersion: userContext.tokenVersion,
      sessionId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const db = getDatabase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;

    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updates: any = { failedLoginAttempts: attempts };

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setHours(lockUntil.getHours() + 1); // Lock for 1 hour
      updates.accountLocked = true;
      updates.accountLockedUntil = lockUntil;
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
  }
}

export const authService = new AuthService();