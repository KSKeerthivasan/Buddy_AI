import { eventBus } from './src/executionCore/events/EventBus';
import { EventType } from './src/executionCore/events/eventTypes';
import { registerSubscribers } from './src/executionCore/events/EventSubscriber';
import { saveProfile } from './src/repositories/profileRepository';

import dotenv from 'dotenv';
dotenv.config();

async function run() {
  registerSubscribers();

  console.log('Seeding mock profile...');
  await saveProfile('TEST_USER_123', {
    id: 'TEST_USER_123',
    email: 'test@example.com',
    defaultAvailability: [
      {
        dayOfWeek: 'MONDAY',
        timeWindows: [{ start: '09:00', end: '17:00' }]
      }
    ],
    timezone: 'UTC'
  });

  console.log('Publishing DEVIATION_CONTEXT_GATHERED...');

  eventBus.publish(EventType.DEVIATION_CONTEXT_GATHERED, {
    userId: 'TEST_USER_123',
    taskId: 'TEST_CONVO_TASK',
    conversationId: 'PwcA0MG5acQzgaAapTNk',
    payload: {}
  });

  // Wait for event subscriber to finish
  setTimeout(() => {
    console.log('Test finished.');
    process.exit(0);
  }, 60000);
}

run().catch(console.error);
