-- Migration: Insert default roles and permissions
-- Date: 2026-01-27

-- Insert system permissions
INSERT INTO permissions (name, description, resource, action, is_system_permission) VALUES
-- Organisation permissions
('org.manage', 'Manage organisation settings and users', 'organisation', 'manage', true),
('org.view', 'View organisation details', 'organisation', 'view', true),
('org.invite', 'Invite users to organisation', 'organisation', 'invite', true),
('org.billing', 'Manage organisation billing', 'organisation', 'billing', true),

-- User permissions
('user.manage', 'Manage users in organisation', 'user', 'manage', true),
('user.view', 'View user profiles', 'user', 'view', true),
('user.invite', 'Send user invitations', 'user', 'invite', true),

-- Course/Content permissions
('course.create', 'Create courses and content', 'course', 'create', true),
('course.edit', 'Edit courses and content', 'course', 'edit', true),
('course.delete', 'Delete courses and content', 'course', 'delete', true),
('course.view', 'View courses and content', 'course', 'view', true),
('course.publish', 'Publish courses', 'course', 'publish', true),

-- Quiz/Test permissions
('quiz.create', 'Create quizzes and tests', 'quiz', 'create', true),
('quiz.edit', 'Edit quizzes and tests', 'quiz', 'edit', true),
('quiz.delete', 'Delete quizzes and tests', 'quiz', 'delete', true),
('quiz.view', 'View quizzes and tests', 'quiz', 'view', true),
('quiz.grade', 'Grade quiz submissions', 'quiz', 'grade', true),

-- Analytics/Reporting permissions
('analytics.view', 'View analytics and reports', 'analytics', 'view', true),
('analytics.export', 'Export analytics data', 'analytics', 'export', true),

-- System permissions
('system.admin', 'Full system administration', 'system', 'admin', true),
('audit.view', 'View audit logs', 'audit', 'view', true);

-- Insert system roles
INSERT INTO roles (name, description, is_system_role) VALUES
('ADMIN', 'Organisation administrator with full access', true),
('TEACHER', 'Teacher role for content creation and management', true),
('STUDENT', 'Student role for content consumption', true),
('IND_TEACHER', 'Independent teacher without organisation', true),
('IND_STUDENT', 'Independent student without organisation', true);

-- Assign permissions to roles
-- ADMIN role permissions
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, (SELECT id FROM users LIMIT 1) -- System user
FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND r.organisation_id IS NULL;

-- TEACHER role permissions (organisation-scoped)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, (SELECT id FROM users LIMIT 1)
FROM roles r, permissions p
WHERE r.name = 'TEACHER' AND r.organisation_id IS NULL
AND p.name IN (
  'course.create', 'course.edit', 'course.view', 'course.publish',
  'quiz.create', 'quiz.edit', 'quiz.view', 'quiz.grade',
  'analytics.view', 'user.view'
);

-- STUDENT role permissions (organisation-scoped)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, (SELECT id FROM users LIMIT 1)
FROM roles r, permissions p
WHERE r.name = 'STUDENT' AND r.organisation_id IS NULL
AND p.name IN ('course.view', 'quiz.view');

-- IND_TEACHER role permissions (global)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, (SELECT id FROM users LIMIT 1)
FROM roles r, permissions p
WHERE r.name = 'IND_TEACHER' AND r.organisation_id IS NULL
AND p.name IN (
  'course.create', 'course.edit', 'course.delete', 'course.view', 'course.publish',
  'quiz.create', 'quiz.edit', 'quiz.delete', 'quiz.view', 'quiz.grade',
  'analytics.view', 'analytics.export'
);

-- IND_STUDENT role permissions (global)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, (SELECT id FROM users LIMIT 1)
FROM roles r, permissions p
WHERE r.name = 'IND_STUDENT' AND r.organisation_id IS NULL
AND p.name IN ('course.view', 'quiz.view');