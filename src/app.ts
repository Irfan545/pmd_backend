import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import homeCategoryRoutes from './routes/HomeCategories.routes';
import settingsRoutes from './routes/settings.routes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import couponRoutes from './routes/couponRoutes';
import addressRoutes from './routes/addressRoutes';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/home-categories', homeCategoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/address', addressRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', success: false });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Prisma Client disconnected');
  process.exit(0);
});

export { app, prisma }; 