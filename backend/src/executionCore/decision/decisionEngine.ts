import crypto from 'crypto';
import { aiClient } from '../../ai/client';
import { EXPLAIN_DECISION_PROMPT } from '../../prompts/decisionPrompts';
import { createDecision, getDecisionById } from '../../repositories/decisionRepository';
import { getTaskById } from '../../repositories/taskRepository';
import { 
  DecisionEngineInput, 
  DecisionCard, 
  PresentationPriority, 
  RecommendationOption 
} from './decisionTypes';

function determinePresentationPriority(severity: string): PresentationPriority {
  switch (severity) {
    case 'CRITICAL': return 'IMMEDIATE';
    case 'HIGH': return 'QUEUE';
    case 'MEDIUM': return 'DASHBOARD';
    default: return 'SILENT';
  }
}

export const decisionEngine = {
  async generateDecision(input: DecisionEngineInput): Promise<DecisionCard> {
    const { userId, taskId, decisionType, triggerEvent, recoveryReport, healthReport, capacityReport } = input;
    
    // In MVP, we construct a deterministic decision primarily from the recoveryReport
    // If we had health/capacity, we'd merge them here.
    
    const severity = recoveryReport?.severity || 'LOW';
    const problem = triggerEvent;
    
    const evidence = {
      remainingEffort: recoveryReport?.metrics?.remainingEffortMinutes || 0,
      availableCapacity: recoveryReport?.metrics?.remainingCapacityMinutes || 0,
      bufferDays: recoveryReport?.metrics?.bufferRemainingDays || 0,
      capacityDeficit: recoveryReport?.metrics?.capacityDeficitMinutes || 0
    };

    let primaryRecommendation: RecommendationOption;
    let alternativeRecommendations: RecommendationOption[] = [];

    // Map deterministic recovery strategies into ranked Decision Options
    const strategies = recoveryReport?.recommendedStrategies || [];
    
    if (strategies.length > 0) {
      // Just take the first one as primary for MVP deterministic ranking
      const rawPrimary = strategies[0];
      primaryRecommendation = {
        optionId: rawPrimary.strategyId,
        name: rawPrimary.name,
        expectedResult: 'Resolves the immediate capacity or buffer constraint.',
        tradeOffs: {
          benefits: ['Directly addresses the problem'],
          risks: ['May impact other scheduled items'],
          deadlineImpact: rawPrimary.strategyId === 'EXTEND_DEADLINE' ? 'Pushes deadline out' : 'Neutral',
          bufferImpact: rawPrimary.strategyId === 'REDUCE_SAFETY_BUFFER' ? 'Consumes buffer' : 'Neutral',
          capacityImpact: rawPrimary.strategyId === 'INCREASE_CAPACITY' ? 'Requires more daily hours' : 'Neutral'
        },
        actionPayload: rawPrimary.actionPayload
      };
      
      // The rest are alternatives
      alternativeRecommendations = strategies.slice(1).map((s: any) => ({
        optionId: s.strategyId,
        name: s.name,
        expectedResult: 'Alternative approach to handle the constraint.',
        tradeOffs: {
          benefits: ['Provides flexibility'],
          risks: ['Might not fully resolve the deficit immediately'],
          deadlineImpact: 'Neutral',
          bufferImpact: 'Neutral',
          capacityImpact: 'Neutral'
        },
        actionPayload: s.actionPayload
      }));
    } else {
      primaryRecommendation = {
        optionId: 'CONTINUE',
        name: 'Continue as Planned',
        expectedResult: 'No changes required.',
        tradeOffs: {
          benefits: ['No interruption'],
          risks: ['None'],
          deadlineImpact: 'Neutral',
          bufferImpact: 'Neutral',
          capacityImpact: 'Neutral'
        }
      };
    }

    const decision: DecisionCard = {
      decisionId: crypto.randomUUID(),
      userId,
      taskId,
      decisionType,
      problem,
      evidence,
      primaryRecommendation,
      alternativeRecommendations,
      confidence: 95, // Highly confident since it's deterministic
      presentationPriority: determinePresentationPriority(severity),
      generatedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    const savedDecision = await createDecision(decision);
    console.log(`[Decision Engine] Generated ${decisionType} decision ${savedDecision.decisionId} for task ${taskId}. Priority: ${savedDecision.presentationPriority}`);
    
    return savedDecision;
  },

  async explainDecisionWithAI(decisionId: string): Promise<string> {
    const decision = await getDecisionById(decisionId);
    if (!decision) throw new Error('Decision not found');

    const prompt = `
${EXPLAIN_DECISION_PROMPT}

Decision Context:
Problem: ${decision.problem}
Severity/Priority: ${decision.presentationPriority}
Evidence: 
- Remaining Effort: ${decision.evidence.remainingEffort} mins
- Available Capacity: ${decision.evidence.availableCapacity} mins
- Buffer Remaining: ${decision.evidence.bufferDays} days
- Capacity Deficit: ${decision.evidence.capacityDeficit} mins

Primary Recommendation: ${decision.primaryRecommendation.name}
Alternative Recommendations: ${decision.alternativeRecommendations.map(a => a.name).join(', ')}
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      if (!response.text) {
        return "I couldn't generate an explanation right now, but you can trust the deterministic metrics provided above.";
      }

      return response.text;
    } catch (error) {
      console.error('Error generating explanation with Gemini:', error);
      return "Explanation service is currently unavailable. Please rely on the raw metrics.";
    }
  }
};
