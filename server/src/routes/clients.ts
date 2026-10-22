import { Router } from 'express';
import { clientController } from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema, clientQuerySchema } from '../validators/client.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(clientQuerySchema, 'query'), clientController.list);
router.post('/', validate(createClientSchema), clientController.create);
router.get('/:id', clientController.getById);
router.patch('/:id', validate(updateClientSchema), clientController.update);
router.delete('/:id', clientController.delete);

export default router;
