import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema, registerClientSchema, changePasswordSchema } from '../validators/authValidators';
import { authenticate } from '../middleware/authenticate';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/register', authRateLimiter, validate(registerClientSchema), authController.registerClient);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
