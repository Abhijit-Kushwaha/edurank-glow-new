import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { TokenPayload, UserContext, AuthorizationError, PermissionCheck } from '../types/auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      token?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT access token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthorizationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = authService.verifyAccessToken(token);

    // Get full user context
    const userContext = await authService.getUserContext(payload.userId);

    // Attach to request
    req.user = userContext;
    req.token = payload;

    next();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  }
};

/**
 * Middleware to check if user has required permissions
 */
export const authorize = (...requiredPermissions: PermissionCheck[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const userPermissions = req.user.permissions;
      const userRoles = req.user.roles;
      const userOrgId = req.user.organisationId;

      // Check each required permission
      for (const permission of requiredPermissions) {
        const hasPermission = checkPermission(
          permission,
          userPermissions,
          userRoles,
          userOrgId
        );

        if (!hasPermission) {
          throw new AuthorizationError(
            `Insufficient permissions: ${permission.resource}.${permission.action}`
          );
        }
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authorization failed',
          },
        });
      }
    }
  };
};

/**
 * Middleware to check if user owns the resource or has admin access
 */
export const requireOwnershipOrAdmin = (resourceIdParam: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;
      const userRoles = req.user.roles;

      // Check if user is admin or owns the resource
      const isAdmin = userRoles.some(role =>
        role.name === 'ADMIN' || role.name === 'SYSTEM_ADMIN'
      );

      const ownsResource = resourceId === userId;

      if (!isAdmin && !ownsResource) {
        throw new AuthorizationError('Access denied: ownership or admin role required');
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authorization failed',
          },
        });
      }
    }
  };
};

/**
 * Middleware to enforce organisation isolation
 */
export const enforceOrgIsolation = (orgIdParam: string = 'organisationId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const requestedOrgId = req.params[orgIdParam] || req.body.organisationId;
      const userOrgId = req.user.organisationId;

      // Independent users (no org) can only access their own resources
      if (!userOrgId && requestedOrgId) {
        throw new AuthorizationError('Independent users cannot access organisation resources');
      }

      // Organisation users can only access their own org's resources
      if (userOrgId && requestedOrgId && userOrgId !== requestedOrgId) {
        throw new AuthorizationError('Access denied: organisation isolation violation');
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Organization isolation check failed',
          },
        });
      }
    }
  };
};

/**
 * Check if user has specific permission
 */
function checkPermission(
  required: PermissionCheck,
  userPermissions: string[],
  userRoles: Array<{ id: string; name: string; organisationId?: string }>,
  userOrgId?: string
): boolean {
  // Check direct permissions
  if (userPermissions.includes(`${required.resource}.${required.action}`)) {
    return true;
  }

  // Check wildcard permissions
  if (userPermissions.includes(`${required.resource}.*`) ||
      userPermissions.includes(`*.${required.action}`) ||
      userPermissions.includes('*.*')) {
    return true;
  }

  // Check role-based permissions
  const hasAdminRole = userRoles.some(role =>
    role.name === 'ADMIN' || role.name === 'SYSTEM_ADMIN'
  );

  if (hasAdminRole) {
    return true;
  }

  // Organisation-specific checks
  if (required.organisationId && userOrgId !== required.organisationId) {
    return false;
  }

  return false;
}

/**
 * Middleware to validate request body
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement validation using a library like Joi or Zod
    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);
      const userContext = await authService.getUserContext(payload.userId);

      req.user = userContext;
      req.token = payload;
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
};