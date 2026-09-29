import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
} from '../validators/invoiceValidators';

const router = Router();

router.use(authenticate);

// --- Client-facing (must come before /:id admin routes to avoid role leakage via path collision) ---
router.get('/me', authorize('CLIENT'), invoiceController.listMyInvoices);
router.get('/me/:id', authorize('CLIENT'), validate(invoiceIdParamSchema), invoiceController.getMyInvoice);

// --- Admin ---
router.post('/', authorize('ADMIN'), validate(createInvoiceSchema), invoiceController.createInvoice);
router.get('/', authorize('ADMIN'), validate(listInvoicesQuerySchema), invoiceController.listInvoicesAdmin);
router.get('/:id', authorize('ADMIN'), validate(invoiceIdParamSchema), invoiceController.getInvoiceAdmin);
router.patch('/:id', authorize('ADMIN'), validate(updateInvoiceSchema), invoiceController.updateInvoice);

export default router;
