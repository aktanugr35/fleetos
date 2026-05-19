import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Audit log middleware
 * Records all mutating operations (POST, PUT, PATCH, DELETE) to the audit_logs table
 */
export function auditMiddleware(
  action: string,
  entityType: string,
  getEntityId?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only audit successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = getEntityId
          ? getEntityId(req)
          : req.params.id || body?.data?.id || 'unknown';

        // Fire and forget — don't block the response
        prisma.auditLog
          .create({
            data: {
              companyId: req.tenantId || null,
              userId: req.user.userId,
              action,
              entityType,
              entityId,
              oldValue: undefined, // Could be populated with pre-update data
              newValue: req.body || undefined,
              ipAddress: req.ip || null,
              userAgent: req.headers['user-agent'] || null,
            },
          })
          .catch((err) => {
            logger.warn('Audit log write failed', { err, action, entityType, entityId });
          });
      }

      return originalJson(body);
    };

    next();
  };
}
