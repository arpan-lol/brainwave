import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
}));
app.use(express.json({ limit: '100mb' }));

app.get('/health', (req: Request, res: Response) => {
  res.send('All good!');
});

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});