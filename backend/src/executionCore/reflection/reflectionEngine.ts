import { Reflection, CompletionResult, PrimaryReason, ReflectionAnalysis } from './reflectionTypes';
import { SessionState } from '../focus/focusTypes';
import { aiClient } from '../../ai/client';
import { REFLECTION_SYSTEM_INSTRUCTION, reflectionSchema } from '../../prompts/reflectionPrompt';

export class ReflectionEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReflectionEngineError';
  }
}

export const validateReflection = (data: Partial<Reflection>): void => {
  if (!data.completionResult) {
    throw new ReflectionEngineError('Completion result is required.');
  }

  if (['PARTIALLY', 'NO'].includes(data.completionResult) && !data.primaryReason) {
    throw new ReflectionEngineError('Primary reason is required for PARTIALLY or NO completion results.');
  }

  if (data.notes && data.notes.length > 500) {
    throw new ReflectionEngineError('Notes must be a maximum of 500 characters.');
  }
};

export const shouldAllowEdit = (reflection: Reflection, currentTime?: Date): boolean => {
  const now = currentTime ? currentTime.getTime() : new Date().getTime();
  const submittedAt = new Date(reflection.submittedAt).getTime();
  
  // 15 minutes in milliseconds
  const GRACE_PERIOD_MS = 15 * 60 * 1000;
  
  return (now - submittedAt) <= GRACE_PERIOD_MS;
};

export const requiresReflection = (sessionStatus: SessionState): boolean => {
  return ['CANCELLED', 'FAILED', 'SKIPPED'].includes(sessionStatus);
};

export const analyzeReflection = async (reflection: Reflection, taskInfo?: any): Promise<ReflectionAnalysis> => {
  // If there are no notes, and they just checked YES, it's a basic reflection
  if (reflection.completionResult === 'YES' && (!reflection.notes || reflection.notes.trim() === '')) {
    return {
      completionConfidence: 100,
      emotionalState: 'Neutral',
      detectedBlockers: [],
      actionableAdvice: 'Great job completing the session!'
    };
  }

  const promptText = `
User reported completion: ${reflection.completionResult}
Primary Reason (if any): ${reflection.primaryReason || 'N/A'}
User Notes: "${reflection.notes || 'None'}"
Task Context: ${JSON.stringify(taskInfo || {})}
  `.trim();

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: reflectionSchema,
        systemInstruction: REFLECTION_SYSTEM_INSTRUCTION
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Fallback if parsing fails
    if (result.completionConfidence === undefined) {
       result.completionConfidence = reflection.completionResult === 'YES' ? 100 : (reflection.completionResult === 'PARTIALLY' ? 50 : 0);
    }
    return result as ReflectionAnalysis;
  } catch (error) {
    console.error('[Reflection Engine] Failed to analyze reflection with AI:', error);
    // Graceful fallback
    return {
      completionConfidence: reflection.completionResult === 'YES' ? 100 : (reflection.completionResult === 'PARTIALLY' ? 50 : 0),
      emotionalState: 'Unknown',
      detectedBlockers: [],
      actionableAdvice: 'Keep pushing forward!'
    };
  }
};
