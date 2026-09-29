import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/overview', adminController.getOverview);
router.get('/audit-logs', adminController.listAuditLogs);

export default router;
