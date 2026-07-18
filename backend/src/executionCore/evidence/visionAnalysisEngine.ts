import { aiClient } from '../../ai/client';
import { getEvidenceVisionPrompt } from '../prompts/evidenceVisionPrompt';
import { localFileSystemProvider } from '../../infrastructure/storage/LocalFileSystemProvider';
import { evidenceRepository } from '../../repositories/evidenceRepository';
import { EvidenceAnalysis } from './evidenceTypes';
import { eventBus } from '../events/EventBus';
import { EventType } from '../events/eventTypes';

export const visionAnalysisEngine = {
  async processEvidence(evidenceId: string, storagePath: string, mimeType: string, taskTitle: string, taskId: string, sessionId: string, userId: string) {
    try {
      console.log(`[Vision Analysis] Starting analysis for ${evidenceId}`);
      
      const fileBuffer = await localFileSystemProvider.download(storagePath);
      const prompt = getEvidenceVisionPrompt(taskTitle);
      
      // Call Gemini Vision
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { text: prompt },
          { inlineData: { data: fileBuffer.toString('base64'), mimeType } }
        ]
      });

      const rawText = response.text || '{}';
      
      // Parse JSON
      let analysisResult: any;
      try {
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          analysisResult = JSON.parse(rawText);
        }
      } catch (err) {
        console.error(`[Vision Analysis] Failed to parse JSON from AI:`, rawText);
        throw new Error('AI returned malformed JSON');
      }

      const aiAnalysis: EvidenceAnalysis = {
        summary: analysisResult.summary || 'No summary provided',
        observedProgress: analysisResult.observedProgress || 0,
        detectedWork: analysisResult.detectedWork || '',
        missingEvidence: analysisResult.missingEvidence || '',
        confidence: analysisResult.confidence || 'LOW',
        assumptions: analysisResult.assumptions || [],
        limitations: analysisResult.limitations || [],
        metadata: {
          model: 'gemini-3.1-flash-lite',
          promptVersion: '1.0',
          analysisTimestamp: new Date().toISOString(),
          analysisVersion: '1.0'
        }
      };

      await evidenceRepository.updateEvidenceAnalysis(evidenceId, 'ANALYZED', aiAnalysis);
      console.log(`[Vision Analysis] Completed analysis for ${evidenceId}`);

      eventBus.publish(EventType.EVIDENCE_ANALYSIS_COMPLETED, {
        userId,
        taskId,
        sessionId,
        evidenceId,
        payload: { aiAnalysis }
      });

    } catch (error) {
      console.error(`[Vision Analysis] Failed for ${evidenceId}:`, error);
      await evidenceRepository.updateEvidenceAnalysis(evidenceId, 'ANALYSIS_FAILED');

      eventBus.publish(EventType.EVIDENCE_ANALYSIS_FAILED, {
        userId,
        taskId,
        sessionId,
        evidenceId,
        payload: { error: String(error) }
      });
    }
  }
};
