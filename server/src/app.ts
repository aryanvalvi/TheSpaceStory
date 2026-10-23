import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import catalogueRoutes from './routes/catalogue.js';
import quotationRoutes from './routes/quotations.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security & Parsing
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development or if origin matches CORS_ORIGIN, allow
      if (
        env.NODE_ENV === 'development' ||
        origin === env.CORS_ORIGIN ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static client build if it exists (for production & desktop apps)
const electronResourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath;
const possibleClientDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  electronResourcesPath ? path.resolve(electronResourcesPath, 'client/dist') : '',
  electronResourcesPath ? path.resolve(electronResourcesPath, 'app/client/dist') : '',
].filter(Boolean);

const clientDistPath = possibleClientDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Catch-all for unhandled API or non-static routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
