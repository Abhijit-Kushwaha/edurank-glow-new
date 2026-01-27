import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../database';
import { organisations, invites } from '../types/database';
import { eq, and } from 'drizzle-orm';
import { authenticate, authorize, enforceOrgIsolation } from '../middleware/auth';
import { auditService } from '../services/audit';
import { ApiResponse, CreateOrganisationRequest, InviteUserRequest } from '../types/auth';

const router = Router();

/**
 * POST /org
 * Create a new organisation
 */
router.post(
  '/',
  authenticate,
  [
    body('name').isLength({ min: 1, max: 255 }),
    body('slug').matches(/^[a-z0-9-]+$/).isLength({ min: 3, max: 100 }),
    body('verifiedDomain').optional().isFQDN(),
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

      const data: CreateOrganisationRequest = req.body;
      const userId = req.user!.id;
      const db = getDatabase();

      // Check if slug is unique
      const existingOrg = await db
        .select()
        .from(organisations)
        .where(and(eq(organisations.slug, data.slug), eq(organisations.deletedAt, null)))
        .limit(1);

      if (existingOrg.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_EXISTS',
            message: 'Organisation slug already exists',
          },
        });
        return;
      }

      // Create organisation
      const [org] = await db
        .insert(organisations)
        .values({
          name: data.name,
          slug: data.slug,
          verifiedDomain: data.verifiedDomain,
          createdBy: userId,
        })
        .returning();

      // Assign user as ADMIN of the organisation
      // TODO: Implement role assignment

      // Audit log
      await auditService.logOrganisationAction(
        userId,
        org.id,
        'organisation.created',
        'organisation',
        org.id,
        { name: data.name, slug: data.slug }
      );

      res.status(201).json({
        success: true,
        data: { organisation: org },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: error.message || 'Failed to create organisation',
        },
      });
    }
  }
);

/**
 * GET /org/:organisationId
 * Get organisation details
 */
router.get(
  '/:organisationId',
  authenticate,
  enforceOrgIsolation(),
  authorize({ resource: 'organisation', action: 'view' }),
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { organisationId } = req.params;
      const db = getDatabase();

      const [org] = await db
        .select()
        .from(organisations)
        .where(and(eq(organisations.id, organisationId), eq(organisations.deletedAt, null)))
        .limit(1);

      if (!org) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organisation not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { organisation: org },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch organisation',
        },
      });
    }
  }
);

/**
 * PATCH /org/:organisationId
 * Update organisation settings
 */
router.patch(
  '/:organisationId',
  authenticate,
  enforceOrgIsolation(),
  authorize({ resource: 'organisation', action: 'manage' }),
  [
    body('name').optional().isLength({ min: 1, max: 255 }),
    body('verifiedDomain').optional().isFQDN(),
    body('status').optional().isIn(['active', 'suspended']),
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

      const { organisationId } = req.params;
      const updates = req.body;
      const userId = req.user!.id;
      const db = getDatabase();

      // Get current organisation for audit
      const [currentOrg] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, organisationId))
        .limit(1);

      // Update organisation
      const [org] = await db
        .update(organisations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();

      // Audit log
      await auditService.logOrganisationAction(
        userId,
        organisationId,
        'organisation.updated',
        'organisation',
        organisationId,
        { oldValues: currentOrg, newValues: updates }
      );

      res.json({
        success: true,
        data: { organisation: org },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update organisation',
        },
      });
    }
  }
);

/**
 * POST /org/:organisationId/invite
 * Invite user to organisation
 */
router.post(
  '/:organisationId/invite',
  authenticate,
  enforceOrgIsolation(),
  authorize({ resource: 'user', action: 'invite' }),
  [
    body('email').isEmail().normalizeEmail(),
    body('roleId').isUUID(),
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

      const { organisationId } = req.params;
      const data: InviteUserRequest = req.body;
      const userId = req.user!.id;
      const db = getDatabase();

      // Check if user is already invited
      const existingInvite = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.organisationId, organisationId),
            eq(invites.email, data.email),
            eq(invites.status, 'pending')
          )
        )
        .limit(1);

      if (existingInvite.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            code: 'INVITE_EXISTS',
            message: 'User already has a pending invitation',
          },
        });
        return;
      }

      // Generate secure token
      const token = require('crypto').randomBytes(32).toString('hex');
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create invite
      const [invite] = await db
        .insert(invites)
        .values({
          organisationId,
          invitedBy: userId,
          email: data.email,
          roleId: data.roleId,
          tokenHash,
          expiresAt,
        })
        .returning();

      // TODO: Send email invitation

      // Audit log
      await auditService.logOrganisationAction(
        userId,
        organisationId,
        'user.invited',
        'invite',
        invite.id,
        { email: data.email, roleId: data.roleId }
      );

      res.status(201).json({
        success: true,
        data: {
          invite: invite,
          message: 'Invitation sent successfully',
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INVITE_FAILED',
          message: error.message || 'Failed to send invitation',
        },
      });
    }
  }
);

/**
 * GET /org/:organisationId/users
 * Get organisation users
 */
router.get(
  '/:organisationId/users',
  authenticate,
  enforceOrgIsolation(),
  authorize({ resource: 'user', action: 'view' }),
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { organisationId } = req.params;

      // TODO: Implement user fetching with roles
      // This is a placeholder - need to join users with user_roles

      res.json({
        success: true,
        data: { users: [] }, // Placeholder
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch users',
        },
      });
    }
  }
);

export default router;