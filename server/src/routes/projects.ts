import { Router } from 'express';
import { projectController } from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema, projectQuerySchema } from '../validators/project.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(projectQuerySchema, 'query'), projectController.list);
router.post('/', validate(createProjectSchema), projectController.create);
router.get('/:id', projectController.getById);
router.patch('/:id', validate(updateProjectSchema), projectController.update);

export default router;
