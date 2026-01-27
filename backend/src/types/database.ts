import { pgTable, uuid, varchar, text, boolean, timestamp, inet, jsonb, integer, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).defaultNow(),
  accountLocked: boolean('account_locked').default(false),
  accountLockedUntil: timestamp('account_locked_until', { withTimezone: true }),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email).where(sql`${table.deletedAt} IS NULL`),
  emailVerifiedIdx: index('idx_users_email_verified').on(table.emailVerified).where(sql`${table.deletedAt} IS NULL`),
}));

// Organisations table
export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  verifiedDomain: varchar('verified_domain', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active').$type<'active' | 'suspended' | 'pending'>(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
}, (table) => ({
  slugIdx: index('idx_organisations_slug').on(table.slug).where(sql`${table.deletedAt} IS NULL`),
  createdByIdx: index('idx_organisations_created_by').on(table.createdBy),
  statusCheck: check('status_check', sql`${table.status} IN ('active', 'suspended', 'pending')`),
}));

// Roles table
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').default(false),
  organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
}, (table) => ({
  nameOrgUnique: uniqueIndex('roles_name_org_unique').on(table.name, table.organisationId),
  orgIdx: index('idx_roles_organisation_id').on(table.organisationId).where(sql`${table.deletedAt} IS NULL`),
}));

// Permissions table
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull().unique(),
  description: text('description'),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  isSystemPermission: boolean('is_system_permission').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  resourceActionUnique: uniqueIndex('permissions_resource_action_unique').on(table.resource, table.action),
}));

// Role-Permission mapping
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedBy: uuid('granted_by').notNull().references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  rolePermissionUnique: uniqueIndex('role_permissions_unique').on(table.roleId, table.permissionId),
}));

// User-Role assignments
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').notNull().references(() => users.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  userRoleOrgUnique: uniqueIndex('user_roles_user_role_org_unique').on(table.userId, table.roleId, table.organisationId),
  userIdx: index('idx_user_roles_user_id').on(table.userId).where(sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > NOW()`),
  orgIdx: index('idx_user_roles_organisation_id').on(table.organisationId),
}));

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull().unique(),
  deviceFingerprint: text('device_fingerprint'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').default(false),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_sessions_user_id').on(table.userId).where(sql`NOT ${table.revoked}`),
  tokenIdx: index('idx_sessions_refresh_token_hash').on(table.refreshTokenHash).where(sql`NOT ${table.revoked} AND ${table.expiresAt} > NOW()`),
}));

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  actorEmail: varchar('actor_email', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  organisationId: uuid('organisation_id').references(() => organisations.id),
}, (table) => ({
  actorIdx: index('idx_audit_logs_actor_id').on(table.actorId),
  resourceIdx: index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
  timestampIdx: index('idx_audit_logs_timestamp').on(table.timestamp).desc(),
  orgIdx: index('idx_audit_logs_organisation_id').on(table.organisationId),
}));

// Invites table
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('pending').$type<'pending' | 'accepted' | 'expired' | 'cancelled'>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedBy: uuid('accepted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  orgEmailStatusUnique: uniqueIndex('invites_org_email_status_unique').on(table.organisationId, table.email, table.status),
  orgIdx: index('idx_invites_organisation_id').on(table.organisationId),
  emailIdx: index('idx_invites_email').on(table.email),
  tokenIdx: index('idx_invites_token_hash').on(table.tokenHash).where(sql`${table.status} = 'pending' AND ${table.expiresAt} > NOW()`),
  statusCheck: check('status_check', sql`${table.status} IN ('pending', 'accepted', 'expired', 'cancelled')`),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;