import { Router } from 'express';
import multer from 'multer';
import { listSitesController, importSitesController, listIndicatorObservationsController, syncGamController } from '../controllers/sitesController';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', listSitesController);
router.get('/indicators', listIndicatorObservationsController);
router.post('/import', upload.single('file'), importSitesController);
router.post('/sync-gam', syncGamController);

export default router;
