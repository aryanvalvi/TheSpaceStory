import { Router } from 'express';
import { quotationController } from '../controllers/quotationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createQuotationSchema, updateQuotationSchema, calculateQuotationSchema, quotationQuerySchema } from '../validators/quotation.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(quotationQuerySchema, 'query'), quotationController.list);
router.post('/', validate(createQuotationSchema), quotationController.create);
router.post('/calculate', validate(calculateQuotationSchema), quotationController.calculate);
router.get('/:id', quotationController.getById);
router.get('/:id/pdf', quotationController.getPdf);
router.patch('/:id', validate(updateQuotationSchema), quotationController.update);
router.post('/:id/issue', quotationController.issue);
router.post('/:id/revisions', quotationController.createRevision);
router.post('/:id/approve', quotationController.approve);
router.post('/:id/reject', quotationController.reject);
router.post('/:id/cancel', quotationController.cancel);

export default router;
