import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createPaymentSchema } from '../validators/paymentValidators';
import { paymentRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post(
  '/checkout',
  authorize('CLIENT'),
  paymentRateLimiter,
  validate(createPaymentSchema),
  paymentController.createCheckoutSession
);
router.get('/me/:id', authorize('CLIENT'), paymentController.getMyPayment);
router.get('/', authorize('ADMIN'), paymentController.listPaymentsAdmin);

export default router;
