import { db } from '../config/firebase';
import { ExecutionSession } from '../executionCore/scheduler/sessionGenerator';

const TASKS_COLLECTION = 'tasks';

/**
 * Retrieves all ExecutionSessions for a user on a specific date.
 * Currently, it extracts them from the tasks collection.
 * This abstraction allows us to later migrate sessions to their own collection
 * without breaking consumers like the Capacity Engine.
 */
export const getSessionsForDate = async (userId: string, date: string): Promise<ExecutionSession[]> => {
  try {
    const snapshot = await db.collection(TASKS_COLLECTION).where('userId', '==', userId).get();
    
    if (snapshot.empty) {
      return [];
    }

    const sessions: ExecutionSession[] = [];
    
    for (const doc of snapshot.docs) {
      const task = doc.data();
      if (task.sessions && Array.isArray(task.sessions)) {
        for (const session of task.sessions) {
          if (session.scheduledDate === date) {
            sessions.push(session as ExecutionSession);
          }
        }
      }
    }

    return sessions;
  } catch (error) {
    console.error(`[SessionRepository] Error fetching sessions for ${userId} on ${date}:`, error);
    return [];
  }
};

export const getSessionsForDateRange = async (userId: string, startDate: string, endDate: string): Promise<ExecutionSession[]> => {
  try {
    const snapshot = await db.collection(TASKS_COLLECTION).where('userId', '==', userId).get();
    
    if (snapshot.empty) {
      return [];
    }

    const sessions: ExecutionSession[] = [];
    
    for (const doc of snapshot.docs) {
      const task = doc.data();
      if (task.sessions && Array.isArray(task.sessions)) {
        for (const session of task.sessions) {
          if (session.scheduledDate && session.scheduledDate >= startDate && session.scheduledDate <= endDate) {
            sessions.push(session as ExecutionSession);
          }
        }
      }
    }

    return sessions;
  } catch (error) {
    console.error(`[SessionRepository] Error fetching sessions for ${userId} between ${startDate} and ${endDate}:`, error);
    return [];
  }
};
