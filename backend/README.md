# EduRank Multi-Tenant Authentication & Authorization Backend

A production-ready, secure authentication and authorization system supporting organisation-based and independent users.

## 🏗️ Architecture

### Core Principles
- **Zero-trust architecture** with comprehensive RBAC + ABAC
- **Organisation-level isolation** preventing cross-org data access
- **Token-based authentication** with JWT access/refresh tokens
- **Security-first design** with auditability and rate limiting

### User Types
- **Organisation Users**: ADMIN, TEACHER, STUDENT (bound to one organisation)
- **Independent Users**: IND_TEACHER, IND_STUDENT (no organisation affiliation)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for enhanced session management)

### Installation

1. **Clone and setup:**
```bash
cd backend
npm install
cp .env.example .env
```

2. **Configure environment:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/edurank_auth

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secure-access-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key

# Email (for invitations)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

3. **Setup database:**
```bash
# Run migrations
npm run migrate

# Or manually:
psql $DATABASE_URL -f database/migrations/001_create_auth_tables.sql
psql $DATABASE_URL -f database/migrations/002_insert_default_roles_permissions.sql
```

4. **Start server:**
```bash
npm run dev  # Development with hot reload
npm start    # Production
```

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login with email/password
POST /api/auth/refresh      - Refresh access token
POST /api/auth/logout       - Logout (revoke refresh token)
GET  /api/auth/me          - Get current user profile
```

### Organisations
```
POST /api/org               - Create organisation
GET  /api/org/:id           - Get organisation details
PATCH /api/org/:id          - Update organisation
POST /api/org/:id/invite    - Invite user to organisation
GET  /api/org/:id/users     - List organisation users
```

## 🔐 Security Features

### Authentication
- **Argon2/Bcrypt password hashing** (configurable)
- **JWT tokens** with short-lived access tokens (15min)
- **Rotating refresh tokens** stored securely
- **Token versioning** for invalidation on password change
- **Device fingerprinting** and session tracking

### Authorization
- **RBAC (Role-Based Access Control)** with granular permissions
- **ABAC (Attribute-Based Access Control)** for contextual checks
- **Organisation isolation** preventing cross-org access
- **Permission inheritance** and wildcard support

### Security Hardening
- **Rate limiting** (configurable per endpoint)
- **Brute-force protection** with account lockout
- **CSRF protection** via SameSite cookies
- **Helmet.js** security headers
- **Input validation** with express-validator
- **SQL injection prevention** via parameterized queries

### Audit & Compliance
- **Comprehensive audit logging** for all sensitive operations
- **Actor tracking** with IP addresses and user agents
- **Immutable audit trail** with tamper detection
- **GDPR compliance** with data retention policies

## 🗃️ Database Schema

### Core Tables
- `users` - User accounts with security fields
- `organisations` - Organisation entities
- `roles` - RBAC roles (global + org-specific)
- `permissions` - ABAC permissions
- `role_permissions` - Role-permission mappings
- `user_roles` - User-role assignments
- `sessions` - Refresh token storage
- `audit_logs` - Security audit trail
- `invites` - Organisation invitations

### Key Relationships
```
users (1) ──── (N) user_roles (N) ──── (1) roles
organisations (1) ──── (N) user_roles
roles (1) ──── (N) role_permissions (N) ──── (1) permissions
organisations (1) ──── (N) invites
users (1) ──── (N) sessions
```

## 🔧 Configuration

### Environment Variables
```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
USE_ARGON2=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# CORS
CORS_ORIGIN=https://yourapp.com
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## 📊 Monitoring & Logging

### Application Logs
- Structured JSON logging with Winston
- Log levels: error, warn, info, debug
- Separate log files for different environments

### Security Monitoring
- Failed authentication attempts
- Suspicious activity patterns
- Rate limit violations
- Permission denied events

### Performance Monitoring
- Response times
- Database query performance
- Rate limiting metrics
- Error rates

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting tuned
- [ ] Monitoring/alerting setup
- [ ] Backup strategy implemented
- [ ] Security headers verified

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Scaling Considerations
- **Horizontal scaling** with Redis for session storage
- **Database connection pooling** with PgBouncer
- **CDN** for static assets
- **Load balancer** with sticky sessions
- **Database read replicas** for analytics

## 🔍 API Examples

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Access Protected Route
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3001/api/auth/me
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@edurank.com
- 📖 Docs: https://docs.edurank.com
- 🐛 Issues: GitHub Issues