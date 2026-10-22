import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateStudioSettingsSchema } from '../validators/settings.js';

const router = Router();

router.use(authenticate);

router.get('/studio', settingsController.getStudio);
router.patch('/studio', validate(updateStudioSettingsSchema), settingsController.updateStudio);

export default router;
