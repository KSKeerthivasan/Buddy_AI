import { eventBus } from './src/executionCore/events/EventBus';
import { EventType } from './src/executionCore/events/eventTypes';
import { registerSubscribers } from './src/executionCore/events/EventSubscriber';
import { saveReflection } from './src/repositories/reflectionRepository';
import { db } from './src/config/firebase';

import dotenv from 'dotenv';
dotenv.config();

async function run() {
  registerSubscribers();

  // Create a dummy task so EventSubscriber doesn't bail early when fetching task
  await db.collection('tasks').doc('TEST_REFLECTION_TASK').set({
    id: 'TEST_REFLECTION_TASK',
    priority: 'HIGH',
    deadline: '2026-12-31',
    safetyBufferDays: 1,
    estimatedHours: 4,
    analysis: {
      scheduleDetails: {
        sessions: [
          { durationMinutes: 60, scheduledDate: '2026-07-20' },
          { durationMinutes: 60, scheduledDate: '2026-07-21' }
        ],
        feasibility: {
          status: 'FEASIBLE',
          capacityShortfall: 0
        },
        capacityUtilization: 30
      }
    }
  });

  console.log('Seeding mock reflection...');
  const savedReflection = await saveReflection({
    userId: 'TEST_USER_123',
    taskId: 'TEST_REFLECTION_TASK',
    sessionId: 'TEST_SESSION_XYZ',
    completionResult: 'YES', // The user CLAIMS they finished it
    notes: "I managed to finish the database migration code and it compiles. But honestly I just copy pasted a lot of it from StackOverflow, and I'm super stressed because I don't really understand how the new indexes work. I hope it doesn't break in production.",
    submittedAt: new Date().toISOString()
  });

  console.log('Publishing REFLECTION_SUBMITTED...');

  eventBus.publish(EventType.REFLECTION_SUBMITTED, {
    userId: 'TEST_USER_123',
    taskId: 'TEST_REFLECTION_TASK',
    sessionId: 'TEST_SESSION_XYZ',
    reflectionId: savedReflection.reflectionId || '',
    payload: {}
  });

  // Wait for event subscriber to finish
  setTimeout(() => {
    console.log('Test finished.');
    process.exit(0);
  }, 15000);
}

run().catch(console.error);
