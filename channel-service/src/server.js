import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import logger from './config/logger.js';
import channelRoutes from './routes/channelRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'smartcrm-channel-service', status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'SmartCRM Channel Service - simulated messaging provider', version: '1.0.0' });
});

app.use('/', channelRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 6000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`SmartCRM Channel Service running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

start();

export default app;
