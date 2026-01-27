import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { ApiResponse, LoginRequest, RegisterRequest } from '../types/auth';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').optional().isLength({ min: 1, max: 100 }),
    body('lastName').optional().isLength({ min: 1, max: 100 }),
    body('organisationId').optional().isUUID(),
    body('inviteToken').optional().isLength({ min: 32, max: 64 }),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
        });
        return;
      }

      const data: RegisterRequest = req.body;
      const userContext = await authService.register(data);

      res.status(201).json({
        success: true,
        data: {
          user: userContext,
          message: 'User registered successfully. Please check your email for verification.',
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error.message || 'Registration failed',
        },
      });
    }
  }
);

/**
 * POST /auth/login
 * Login user and return tokens
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
    body('deviceFingerprint').optional().isLength({ min: 1, max: 255 }),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
        });
        return;
      }

      const data: LoginRequest = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.login(data, ipAddress, userAgent);

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.message || 'Login failed',
        },
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  [
    body('refreshToken').exists(),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: { tokens },
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: error.message || 'Token refresh failed',
        },
      });
    }
  }
);

/**
 * POST /auth/logout
 * Logout user by revoking refresh token
 */
router.post(
  '/logout',
  authenticate,
  [
    body('refreshToken').exists(),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      const { refreshToken } = req.body;
      const userId = req.user!.id;

      await authService.logout(refreshToken, userId);

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message || 'Logout failed',
        },
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  }
);

/**
 * POST /auth/verify-email
 * Verify user email address
 */
router.post(
  '/verify-email',
  [
    body('token').exists(),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    // TODO: Implement email verification
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Email verification not yet implemented',
      },
    });
  }
);

/**
 * POST /auth/forgot-password
 * Initiate password reset
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().normalizeEmail(),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    // TODO: Implement password reset
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Password reset not yet implemented',
      },
    });
  }
);

/**
 * POST /auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  [
    body('token').exists(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    // TODO: Implement password reset
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Password reset not yet implemented',
      },
    });
  }
);

export default router;