import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { registerSubscribers } from './executionCore/events/EventSubscriber';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes';
import schedulerRoutes from './routes/schedulerRoutes';

import evidenceRoutes from './routes/evidenceRoutes';
import profileRoutes from './routes/profileRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import commitmentRoutes from './routes/commitmentRoutes';
import routineRoutes from './routes/routineRoutes';
import capacityRoutes from './routes/capacityRoutes';
import healthRoutes from './routes/healthRoutes';
import observationRoutes from './routes/observationRoutes';
import reflectionRoutes from './routes/reflectionRoutes';
import recoveryRoutes from './routes/recoveryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import decisionRoutes from './routes/decisionRoutes';
import conversationRoutes from './routes/conversationRoutes';
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
app.use('/api', evidenceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/commitments', commitmentRoutes);
app.use('/api/routine', routineRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/reflection', reflectionRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', conversationRoutes); // since they are grouped under /api/tasks/:taskId/conversation
app.use('/api', decisionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global Error Handler (Must be registered after all routes)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Execution Core is running on http://localhost:${PORT}`);
  
  // Register Event Subscribers for internal async workflows
  registerSubscribers();
});
