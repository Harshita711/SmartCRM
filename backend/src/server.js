import 'dotenv/config';
import './seed/seed.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import logger from './config/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import segmentRoutes from './routes/segmentRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();

// --- Core middleware -----------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('dev', {
    stream: { write: (message) => logger.http ? logger.http(message.trim()) : logger.info(message.trim()) },
  })
);

// --- Health check ----------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'xeno-crm-backend', status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Xeno AI-Native CRM API', version: '1.0.0' });
});

// --- API routes -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// --- Error handling ---------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`SmartCRM backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

start();

export default app;
