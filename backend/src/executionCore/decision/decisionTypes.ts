export type DecisionType = 
  | 'RECOVERY' 
  | 'SCHEDULING' 
  | 'CAPACITY' 
  | 'DEADLINE' 
  | 'PRIORITY' 
  | 'AVAILABILITY';

export type DecisionState = 
  | 'PENDING' 
  | 'ACCEPTED' 
  | 'MODIFIED' 
  | 'REJECTED' 
  | 'EXPIRED';

export type PresentationPriority = 
  | 'IMMEDIATE' 
  | 'QUEUE' 
  | 'DASHBOARD' 
  | 'SILENT';

export interface RecommendationTradeOffs {
  benefits: string[];
  risks: string[];
  deadlineImpact: string;
  bufferImpact: string;
  capacityImpact: string;
}

export interface RecommendationOption {
  optionId: string;
  name: string;
  expectedResult: string;
  tradeOffs: RecommendationTradeOffs;
  actionPayload?: any;
}

export interface DecisionCard {
  id?: string;
  decisionId: string;
  userId: string;
  taskId: string;
  decisionType: DecisionType;
  
  problem: string;
  evidence: Record<string, any>;
  
  primaryRecommendation: RecommendationOption;
  alternativeRecommendations: RecommendationOption[];
  
  confidence: number;
  presentationPriority: PresentationPriority;
  
  generatedAt: string;
  status: DecisionState;
}

export interface DecisionEngineInput {
  userId: string;
  taskId: string;
  decisionType: DecisionType;
  triggerEvent: string;
  // Raw reports from existing deterministic engines
  healthReport?: any; 
  recoveryReport?: any;
  capacityReport?: any;
}
