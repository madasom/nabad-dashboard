import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import youthRoutes from './routes/youths';
import programRoutes from './routes/programs';
import attendanceRoutes from './routes/attendance';
import dashboardRoutes from './routes/dashboard';
import sitesRoutes from './routes/sites';
import alertsRoutes from './routes/alerts';
import importsRoutes from './routes/imports';
import formsRoutes from './routes/forms';
import usersRoutes from './routes/users';
import { authenticate } from './middleware/auth';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/youths', authenticate, youthRoutes);
app.use('/api/programs', authenticate, programRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/sites', authenticate, sitesRoutes);
app.use('/api/alerts', authenticate, alertsRoutes);
app.use('/api/imports', authenticate, importsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/users', usersRoutes);
