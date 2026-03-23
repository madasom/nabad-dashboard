import { Router } from 'express';
import { authenticate, requirePasswordChangeComplete } from '../middleware/auth';
import { createFormController, getFormPublicController, listFormsController, submitFormController, updateFormController, listFormResponsesController, listAllFormResponsesController, deleteFormController } from '../controllers/formsController';

const router = Router();

// admin/protected
router.get('/', authenticate, requirePasswordChangeComplete, listFormsController);
router.post('/', authenticate, requirePasswordChangeComplete, createFormController);
router.put('/:id', authenticate, requirePasswordChangeComplete, updateFormController);
router.get('/responses/all', authenticate, requirePasswordChangeComplete, listAllFormResponsesController);
router.get('/:id/responses', authenticate, requirePasswordChangeComplete, listFormResponsesController);
router.delete('/:id', authenticate, requirePasswordChangeComplete, deleteFormController);

// public
router.get('/:slug', getFormPublicController);
router.post('/:slug/submit', submitFormController);

export default router;
