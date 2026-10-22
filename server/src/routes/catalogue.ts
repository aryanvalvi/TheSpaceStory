import { Router } from 'express';
import { catalogueController } from '../controllers/catalogueController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCatalogueItemSchema, updateCatalogueItemSchema, catalogueQuerySchema } from '../validators/catalogue.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(catalogueQuerySchema, 'query'), catalogueController.list);
router.post('/', validate(createCatalogueItemSchema), catalogueController.create);
router.get('/:id', catalogueController.getById);
router.patch('/:id', validate(updateCatalogueItemSchema), catalogueController.update);
router.delete('/:id', catalogueController.delete);

export default router;
