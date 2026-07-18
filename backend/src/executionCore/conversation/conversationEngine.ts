import { aiClient } from '../../ai/client';
import { CONVERSATION_SYSTEM_INSTRUCTION } from '../../prompts/conversationPrompts';
import { saveConversation, getConversationForTask } from '../../repositories/conversationRepository';
import { ConversationContext, ConversationMessage } from '@buddy-ai/shared';
import { eventBus } from '../events/EventBus';
import { EventType } from '../events/eventTypes';
import { getTaskById } from '../../repositories/taskRepository';

export const conversationEngine = {
  async processMessage(taskId: string, userId: string, message: string): Promise<ConversationContext> {
    
    // 1. Fetch task to get context
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 2. Fetch existing conversation or initialize new one
    let context = await getConversationForTask(taskId);
    if (!context) {
      context = {
        taskId,
        userId,
        triggerEvent: 'DEVIATION_DETECTED', // In a real flow, this comes from the trigger source
        status: 'ACTIVE',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // If it's already resolved/ready, we shouldn't process more chat unless they reset it.
    if (context.status !== 'ACTIVE') {
      throw new Error(`Conversation for task ${taskId} is no longer active (Status: ${context.status})`);
    }

    // 3. Append user message
    context.messages.push({
      role: 'user',
      text: message,
      timestamp: new Date().toISOString()
    });

    // 4. Construct Gemini Chat format
    // Map our 'user' | 'model' roles to what Gemini expects
    const geminiContents = context.messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // Optionally append task details into the first user message or as a system Instruction context
    const enrichedInstruction = `${CONVERSATION_SYSTEM_INSTRUCTION}\n\nCurrent Task Context:\nTitle: ${task.title}\nDeadline: ${task.deadline}\nStatus: ${task.status}`;

    // 5. Call Gemini AI
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: geminiContents,
      config: {
        systemInstruction: enrichedInstruction,
        temperature: 0.7,
      }
    });

    let aiText = response.text || "I'm having trouble understanding right now. Could you rephrase?";

    // 6. Detect [RECOVERY_READY] token
    let isReady = false;
    const token = '[RECOVERY_READY]';
    if (aiText.includes(token)) {
      isReady = true;
      // Strip token for user-facing output
      aiText = aiText.replace(token, '').trim();
      context.status = 'RECOVERY_READY';
    }

    // 7. Append AI response
    context.messages.push({
      role: 'model',
      text: aiText,
      timestamp: new Date().toISOString()
    });

    // 8. Save updated context
    const savedContext = await saveConversation(context);

    // 9. Fire internal event if ready
    if (isReady) {
      console.log(`[Conversation Engine] Conversation for task ${taskId} reached RECOVERY_READY.`);
      eventBus.publish(EventType.DEVIATION_CONTEXT_GATHERED, {
        taskId,
        userId,
        conversationId: savedContext.id as string,
        payload: savedContext
      });
    }

    return savedContext;
  }
};
