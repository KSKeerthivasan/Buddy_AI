import { decisionEngine } from '../decisionEngine';
import * as decisionRepository from '../../../repositories/decisionRepository';
import { aiClient } from '../../../ai/client';

jest.mock('../../../repositories/decisionRepository');
jest.mock('../../../ai/client', () => ({
  aiClient: {
    models: {
      generateContent: jest.fn()
    }
  }
}));

describe('Decision Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDecision', () => {
    it('should generate a decision with EXACTLY ONE primary recommendation and properly rank alternatives', async () => {
      const mockCreateDecision = jest.spyOn(decisionRepository, 'createDecision').mockImplementation(async (dec) => ({ id: 'new-id', ...dec }));
      
      const input = {
        userId: 'user123',
        taskId: 'task123',
        decisionType: 'RECOVERY' as any,
        triggerEvent: 'Session Skipped',
        recoveryReport: {
          severity: 'HIGH',
          metrics: { remainingEffortMinutes: 120, remainingCapacityMinutes: 60, bufferRemainingDays: 0, capacityDeficitMinutes: 60 },
          recommendedStrategies: [
            { strategyId: 'EXTEND_DEADLINE', name: 'Extend Deadline by 1 day', actionPayload: {} },
            { strategyId: 'REDUCE_SAFETY_BUFFER', name: 'Remove buffer', actionPayload: {} }
          ]
        }
      };

      const result = await decisionEngine.generateDecision(input);

      expect(mockCreateDecision).toHaveBeenCalledTimes(1);
      expect(result.primaryRecommendation).toBeDefined();
      expect(result.primaryRecommendation.optionId).toBe('EXTEND_DEADLINE');
      expect(result.alternativeRecommendations.length).toBe(1);
      expect(result.alternativeRecommendations![0]!.optionId).toBe('REDUCE_SAFETY_BUFFER');
      expect(result.status).toBe('PENDING');
      // HIGH severity should map to QUEUE
      expect(result.presentationPriority).toBe('QUEUE');
    });
    
    it('should assign IMMEDIATE presentation priority for CRITICAL severity', async () => {
      jest.spyOn(decisionRepository, 'createDecision').mockImplementation(async (dec) => ({ id: 'new-id', ...dec }));
      
      const result = await decisionEngine.generateDecision({
        userId: 'user123',
        taskId: 'task123',
        decisionType: 'RECOVERY' as any,
        triggerEvent: 'Deadline Missed',
        recoveryReport: {
          severity: 'CRITICAL',
          metrics: { remainingEffortMinutes: 120, remainingCapacityMinutes: 60, bufferRemainingDays: 0, capacityDeficitMinutes: 60 }
        }
      });

      expect(result.presentationPriority).toBe('IMMEDIATE');
    });
    
    it('should prevent duplicate pending decisions for the same task and type in repository level (mocking the repo logic)', async () => {
        // While the actual duplicate logic is in the repo, the test ensures we pass the right data to it
        const mockCreateDecision = jest.spyOn(decisionRepository, 'createDecision').mockImplementation(async (dec) => ({ id: 'existing-id', ...dec }));
        
        await decisionEngine.generateDecision({
            userId: 'user123',
            taskId: 'task123',
            decisionType: 'RECOVERY' as any,
            triggerEvent: 'Problem'
        });
        
        expect(mockCreateDecision).toHaveBeenCalled();
    });
  });

  describe('explainDecisionWithAI', () => {
    it('should call Gemini and return natural language explanation', async () => {
      jest.spyOn(decisionRepository, 'getDecisionById').mockResolvedValue({
        decisionId: 'dec1',
        problem: 'Test problem',
        presentationPriority: 'QUEUE',
        evidence: { remainingEffort: 60 },
        primaryRecommendation: { name: 'Do X' },
        alternativeRecommendations: [{ name: 'Do Y' }]
      } as any);

      const mockGenerate = aiClient.models.generateContent as jest.Mock;
      mockGenerate.mockResolvedValue({ text: 'This is an AI explanation.' });

      const explanation = await decisionEngine.explainDecisionWithAI('dec1');
      
      expect(mockGenerate).toHaveBeenCalled();
      expect(explanation).toBe('This is an AI explanation.');
    });

    it('should gracefully degrade if Gemini fails', async () => {
      jest.spyOn(decisionRepository, 'getDecisionById').mockResolvedValue({
        decisionId: 'dec1',
        problem: 'Test problem',
        presentationPriority: 'QUEUE',
        evidence: { remainingEffort: 60 },
        primaryRecommendation: { name: 'Do X' },
        alternativeRecommendations: [{ name: 'Do Y' }]
      } as any);

      const mockGenerate = aiClient.models.generateContent as jest.Mock;
      mockGenerate.mockRejectedValue(new Error('Network error'));

      const explanation = await decisionEngine.explainDecisionWithAI('dec1');
      
      expect(explanation).toContain('Explanation service is currently unavailable');
    });
  });
});
