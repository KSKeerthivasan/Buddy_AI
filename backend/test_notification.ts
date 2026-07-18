import { eventBus } from './src/executionCore/events/EventBus';
import { EventType } from './src/executionCore/events/eventTypes';
import { registerSubscribers } from './src/executionCore/events/EventSubscriber';
import { db } from './src/config/firebase';

import dotenv from 'dotenv';
dotenv.config();

async function run() {
  registerSubscribers();

  const userId = 'TEST_USER_123';
  const taskId = 'TEST_NOTIF_TASK';

  console.log('\n--- 1. Testing ACTION_REQUIRED (Recovery Plan) ---');
  eventBus.publish(EventType.RECOVERY_PLAN_GENERATED, {
    id: 'evt-1',
    type: EventType.RECOVERY_PLAN_GENERATED,
    timestamp: new Date().toISOString(),
    userId,
    taskId,
    reportId: 'rep-1',
    payload: {}
  });

  // Wait a moment for async dispatch
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n--- 2. Testing ALERT (Health Drop) ---');
  eventBus.publish(EventType.HEALTH_STATE_CHANGED, {
    id: 'evt-2',
    type: EventType.HEALTH_STATE_CHANGED,
    timestamp: new Date().toISOString(),
    userId,
    taskId,
    payload: { overallHealth: 45, conflicts: [] }
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n--- 3. Testing ALERT Cooldown (Spam prevention) ---');
  // Emitting another health drop immediately, which should be dropped by the cooldown mechanism
  eventBus.publish(EventType.HEALTH_STATE_CHANGED, {
    id: 'evt-3',
    type: EventType.HEALTH_STATE_CHANGED,
    timestamp: new Date().toISOString(),
    userId,
    taskId,
    payload: { overallHealth: 40, conflicts: [] }
  });

  await new Promise(r => setTimeout(r, 2000));
  
  // Cleanup
  console.log('\nCleaning up notifications...');
  const snapshot = await db.collection('notifications').where('userId', '==', userId).get();
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
  }
  
  console.log('Test finished.');
  process.exit(0);
}

run().catch(console.error);
