import { Router } from 'express';
import * as receiptController from '../controllers/receiptController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

// Local-storage signed download endpoint is intentionally public (no auth
// middleware) because it's accessed via a direct link the browser follows,
// exactly like a native S3 pre-signed URL would be. Its security comes
// entirely from the short-lived HMAC signature verified inside the
// controller, not from a session — same trust model as S3.
router.get('/download-local', receiptController.downloadLocalReceipt);

router.use(authenticate);

router.get('/invoice/:invoiceId', authorize('CLIENT'), receiptController.getMyReceiptsForInvoice);
router.get('/me/:id/download-url', authorize('CLIENT'), receiptController.getMyReceiptDownloadUrl);
router.get('/me/:id/download', authorize('CLIENT'), receiptController.downloadMyReceipt);
router.get('/:id/download-url', authorize('ADMIN'), receiptController.getReceiptDownloadUrlAdmin);

export default router;
