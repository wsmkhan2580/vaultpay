import { Router } from 'express';
import * as clientController from '../controllers/clientController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createClientSchema, updateClientStatusSchema, clientIdParamSchema } from '../validators/clientValidators';

const router = Router();

router.use(authenticate);

// Client's own profile — must be declared before /:id so "me" is never
// interpreted as an ObjectId route param.
router.get('/me', authorize('CLIENT'), clientController.getMyProfile);

router.post('/', authorize('ADMIN'), validate(createClientSchema), clientController.createClient);
router.get('/', authorize('ADMIN'), clientController.listClients);
router.get('/:id', authorize('ADMIN'), validate(clientIdParamSchema), clientController.getClient);
router.patch('/:id/status', authorize('ADMIN'), validate(updateClientStatusSchema), clientController.updateClientStatus);

export default router;
