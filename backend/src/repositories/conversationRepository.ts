import { db } from '../config/firebase';
import { ConversationContext } from '@buddy-ai/shared';

const CONVERSATIONS_COLLECTION = 'conversations';

/**
 * Creates or updates a conversation context in Firestore.
 */
export async function saveConversation(conversation: ConversationContext): Promise<ConversationContext> {
  const collectionRef = db.collection(CONVERSATIONS_COLLECTION);
  
  if (conversation.id) {
    // Update existing
    conversation.updatedAt = new Date().toISOString();
    await collectionRef.doc(conversation.id).update(conversation as any);
    return conversation;
  } else {
    // Create new
    const newDoc = collectionRef.doc();
    const newConversation = {
      ...conversation,
      id: newDoc.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await newDoc.set(newConversation);
    return newConversation;
  }
}

/**
 * Retrieves the active or latest conversation for a specific task.
 * The SDD specifies keeping only the current recovery conversation.
 */
export async function getConversationForTask(taskId: string): Promise<ConversationContext | null> {
  const snapshot = await db.collection(CONVERSATIONS_COLLECTION)
    .where('taskId', '==', taskId)
    .get();

  if (snapshot.empty) {
    return null;
  }

  // Sort in memory to avoid requiring a composite index in Firestore
  const conversations = snapshot.docs.map(doc => doc.data() as ConversationContext);
  conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return conversations[0] || null;
}

/**
 * Retrieves a conversation by its ID.
 */
export async function getConversationById(conversationId: string): Promise<ConversationContext | null> {
  const doc = await db.collection(CONVERSATIONS_COLLECTION).doc(conversationId).get();
  
  if (!doc.exists) {
    return null;
  }

  return doc.data() as ConversationContext;
}
