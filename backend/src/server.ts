import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes';
import schedulerRoutes from './routes/schedulerRoutes';

import uploadRoutes from './routes/uploadRoutes';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Expose local uploads folder for MVP
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Execution Core is running on http://localhost:${PORT}`);
});
