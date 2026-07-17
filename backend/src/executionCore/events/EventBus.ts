import { EventEmitter } from 'events';
import { EventType, EventPayloadMap } from './eventTypes';
import { v4 as uuidv4 } from 'uuid';

class BuddyEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners since we have multiple AI engines listening to the same events
    this.setMaxListeners(20);
  }

  /**
   * Strongly typed emit method.
   * Enforces that the payload matches the expected structure for the given EventType.
   */
  public publish<T extends EventType>(eventType: T, payload: Omit<EventPayloadMap[T], 'id' | 'type' | 'timestamp'>): void {
    const fullEvent = {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    
    // Asynchronously emit to avoid blocking the main thread during heavy AI execution
    setImmediate(() => {
      try {
        this.emit(eventType, fullEvent);
      } catch (error) {
        console.error(`[EventBus] Error emitting event ${eventType}:`, error);
      }
    });
  }

  /**
   * Strongly typed subscribe method.
   */
  public subscribe<T extends EventType>(eventType: T, handler: (event: EventPayloadMap[T]) => void | Promise<void>): void {
    this.on(eventType, async (event: EventPayloadMap[T]) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in handler for event ${eventType}:`, error);
        // Optionally emit a SYSTEM_ERROR event here, but be careful of infinite loops
      }
    });
  }
}

// Export a singleton instance of the EventBus
export const eventBus = new BuddyEventBus();
