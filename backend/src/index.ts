import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import kycRouter from './routes/kyc';
import configRouter from './routes/config';
import invoiceRouter from './routes/invoice';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/rwa-platform';

console.log('Connecting to MongoDB:', MONGO_URL.substring(0, 30) + '...');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/kyc', kycRouter);
app.use('/config', configRouter);
app.use('/invoice', invoiceRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'RWA Backend API is running' });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

export default app;
