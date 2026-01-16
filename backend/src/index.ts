import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req: Request, res: Response) => {
  res.send('Retail Media API is running...');
});

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 LangGraph Backend Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/route - Route user requests`);
  console.log(`   POST /api/creative - Run creative agent`);
  console.log(`   POST /api/validate - Validate designs`);
  console.log(`   POST /api/validate/auto-fix - Auto-fix violations`);
  console.log(`   POST /api/workflow - Complete workflow`);
});