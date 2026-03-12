import { Request, Response } from 'express';
import { getIndicatorObservations, getSites, isImportDataset, startImportJob, syncGamFromFsnau } from '../services/sitesService';

export async function listSitesController(_req: Request, res: Response) {
  try {
    const sites = await getSites();
    res.json(sites);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch sites' });
  }
}

export async function listIndicatorObservationsController(req: Request, res: Response) {
  try {
    const indicator = req.query.indicator === 'penta3' || req.query.indicator === 'gam'
      ? req.query.indicator
      : undefined;
    const observations = await getIndicatorObservations(indicator);
    res.json(observations);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch indicator observations' });
  }
}

export async function importSitesController(req: Request, res: Response) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const rawDataset = typeof req.body?.dataset === 'string'
      ? req.body.dataset
      : typeof req.body?.source === 'string'
        ? `${req.body.source.toUpperCase()}_ETT`
        : undefined;
    if (!file) return res.status(400).json({ message: 'file is required' });
    if (!rawDataset || !isImportDataset(rawDataset)) {
      return res.status(400).json({ message: 'valid dataset is required' });
    }
    const jobId = await startImportJob(file.buffer, file.originalname, rawDataset);
    res.status(202).json({ jobId });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Import failed' });
  }
}

export async function syncGamController(req: Request, res: Response) {
  try {
    const season = typeof req.body?.season === 'string' ? req.body.season : undefined;
    const result = await syncGamFromFsnau(season);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'GAM sync failed' });
  }
}
