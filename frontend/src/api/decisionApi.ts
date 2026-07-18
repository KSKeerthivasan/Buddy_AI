const API_BASE_URL = 'http://localhost:5000/api';

export interface TradeOffs {
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
  tradeOffs: TradeOffs;
  actionPayload?: any;
}

export interface DecisionCard {
  decisionId: string;
  userId: string;
  taskId: string;
  decisionType: string;
  problem: string;
  evidence: {
    remainingEffort: number;
    availableCapacity: number;
    bufferDays: number;
    capacityDeficit: number;
  };
  primaryRecommendation: RecommendationOption;
  alternativeRecommendations: RecommendationOption[];
  confidence: number;
  presentationPriority: 'SILENT' | 'DASHBOARD' | 'QUEUE' | 'IMMEDIATE';
  generatedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
}

export const getDecisionsForTask = async (taskId: string): Promise<DecisionCard[]> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/decisions`);
  if (!response.ok) throw new Error('Failed to fetch decisions');
  const data = await response.json();
  return data.decisions;
};

export const acceptDecision = async (decisionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/accept`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to accept decision');
};

export const rejectDecision = async (decisionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/reject`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to reject decision');
};

export const modifyDecision = async (decisionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/modify`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to modify decision');
};

export const explainDecision = async (decisionId: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/explain`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to explain decision');
  const data = await response.json();
  return data.explanation;
};
