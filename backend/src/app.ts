import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import sitesRoutes from './routes/sites';
import alertsRoutes from './routes/alerts';
import importsRoutes from './routes/imports';
import formsRoutes from './routes/forms';
import usersRoutes from './routes/users';
import { authenticate, requirePasswordChangeComplete } from './middleware/auth';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/sites', authenticate, requirePasswordChangeComplete, sitesRoutes);
app.use('/api/alerts', authenticate, requirePasswordChangeComplete, alertsRoutes);
app.use('/api/imports', authenticate, requirePasswordChangeComplete, importsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/users', usersRoutes);
