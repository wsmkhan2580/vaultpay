import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { getAdminOverview } from '../services/analyticsService';
import { AuditLog } from '../models/AuditLog';

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await getAdminOverview();
  sendSuccess(res, 200, 'Overview retrieved', overview);
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { action, resource, page, limit } = req.query as Record<string, string | undefined>;
  const query: Record<string, unknown> = {};
  if (action) query.action = action;
  if (resource) query.resource = resource;

  const pageNum = page ? Math.max(parseInt(page, 10), 1) : 1;
  const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Audit logs retrieved', { items, total, page: pageNum, limit: limitNum });
});
