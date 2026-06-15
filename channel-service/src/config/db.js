import mongoose from 'mongoose';
import logger from './logger.js';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      logger.warn('MONGO_URI not set - communication logs will not be persisted');
      return;
    }

    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, { maxPoolSize: 10 });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // Channel service can still operate (simulate + callback) without persistence
  }
};

export default connectDB;
