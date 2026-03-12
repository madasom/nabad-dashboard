import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createFormController, getFormPublicController, listFormsController, submitFormController, updateFormController, listFormResponsesController, listAllFormResponsesController, deleteFormController } from '../controllers/formsController';

const router = Router();

// admin/protected
router.get('/', authenticate, listFormsController);
router.post('/', authenticate, createFormController);
router.put('/:id', authenticate, updateFormController);
router.get('/responses/all', authenticate, listAllFormResponsesController);
router.get('/:id/responses', authenticate, listFormResponsesController);
router.delete('/:id', authenticate, deleteFormController);

// public
router.get('/:slug', getFormPublicController);
router.post('/:slug/submit', submitFormController);

export default router;
