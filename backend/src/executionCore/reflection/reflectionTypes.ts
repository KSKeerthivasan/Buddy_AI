export type CompletionResult = 'YES' | 'PARTIALLY' | 'NO';

export type PrimaryReason = 
  | 'Underestimated effort' 
  | 'Unexpected interruption' 
  | 'Lack of understanding' 
  | 'Low motivation' 
  | 'Technical issue' 
  | 'Health' 
  | 'Other';

export interface ReflectionAnalysis {
  completionConfidence: number; // 0-100
  emotionalState: string;
  detectedBlockers: string[];
  actionableAdvice: string;
}

export interface Reflection {
  reflectionId?: string;
  userId: string;
  taskId: string;
  sessionId: string;
  completionResult: CompletionResult;
  primaryReason?: PrimaryReason;
  notes?: string;
  aiAnalysis?: ReflectionAnalysis;
  submittedAt: string; // ISO String
}
