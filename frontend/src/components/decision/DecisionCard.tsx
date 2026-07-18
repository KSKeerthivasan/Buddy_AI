import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, CheckCircle, XCircle, Edit3, 
  ChevronDown, ChevronUp, Bot, ArrowRight, ShieldAlert, Zap
} from 'lucide-react';
import type { DecisionCard as DecisionCardType, RecommendationOption } from '../../api/decisionApi';

interface DecisionCardProps {
  decision: DecisionCardType;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onModify: (id: string) => Promise<void>;
  onExplain: (id: string) => Promise<string>;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision, onAccept, onReject, onModify, onExplain
}) => {
  const [expandedOption, setExpandedOption] = useState<string | null>(decision.primaryRecommendation.optionId);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleExplain = async () => {
    setIsExplaining(true);
    try {
      const text = await onExplain(decision.decisionId);
      setExplanationText(text);
    } catch (error) {
      setExplanationText('Failed to generate explanation. Please rely on the provided metrics.');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAction = async (action: 'accept' | 'reject' | 'modify') => {
    setActionLoading(true);
    try {
      if (action === 'accept') await onAccept(decision.decisionId);
      else if (action === 'reject') await onReject(decision.decisionId);
      else if (action === 'modify') {
        // Trigger interactive modify workflow
        setIsModifying(true);
        // await onModify(decision.decisionId); // Called after modal interaction
      }
    } finally {
      if (action !== 'modify') {
        setActionLoading(false);
      }
    }
  };

  const handleConfirmModify = async () => {
    setActionLoading(true);
    try {
      await onModify(decision.decisionId);
      setIsModifying(false);
    } finally {
      setActionLoading(false);
    }
  }

  const renderTradeOffs = (option: RecommendationOption) => (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
        <p className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5"><CheckCircle size={14}/> Benefits</p>
        <ul className="list-disc pl-5 text-emerald-700/80 space-y-1">
          {option.tradeOffs.benefits.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
        <p className="font-bold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle size={14}/> Risks</p>
        <ul className="list-disc pl-5 text-red-700/80 space-y-1">
          {option.tradeOffs.risks.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-2 mt-2">
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          Deadline: {option.tradeOffs.deadlineImpact}
        </span>
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Buffer: {option.tradeOffs.bufferImpact}
        </span>
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          Capacity: {option.tradeOffs.capacityImpact}
        </span>
      </div>
    </div>
  );

  const isResolved = decision.status !== 'PENDING';

  return (
    <div className={`bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden transition-all duration-300 ${isResolved ? 'opacity-75 grayscale-[0.2]' : ''}`}>
      {/* Header section focusing on plain language */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-white/10 text-indigo-100 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              {decision.decisionType.replace('_', ' ')}
            </span>
            {isResolved && (
              <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full border border-indigo-400 shadow-sm">
                {decision.status}
              </span>
            )}
          </div>
          <h2 className="text-3xl font-black mb-3 tracking-tight">{decision.problem}</h2>
          <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-2xl">
            A deviation has been detected in your execution plan. Please review the AI-generated recommendations below and choose how to proceed to resolve the conflict.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        
        {/* Raw Metrics / Evidence (kept secondary) */}
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-wrap gap-6 items-center border border-gray-100 shadow-inner">
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldAlert size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Metrics Snapshot</span>
          </div>
          <div className="flex gap-6 text-sm">
            <div><span className="text-gray-400">Capacity Deficit:</span> <strong className="text-gray-900">{decision.evidence.capacityDeficit} mins</strong></div>
            <div><span className="text-gray-400">Buffer Remaining:</span> <strong className="text-gray-900">{decision.evidence.bufferDays} days</strong></div>
          </div>
        </div>

        {/* Options Section */}
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            AI Recommendations
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-wider">High Confidence</span>
          </h3>
          
          <div className="space-y-4">
            {/* Primary Recommendation */}
            <div 
              className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${expandedOption === decision.primaryRecommendation.optionId ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}
            >
              <button 
                className="w-full text-left p-5 flex items-center justify-between bg-white focus:outline-none"
                onClick={() => setExpandedOption(expandedOption === decision.primaryRecommendation.optionId ? null : decision.primaryRecommendation.optionId)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner border border-indigo-100">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {decision.primaryRecommendation.name}
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Recommended</span>
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{decision.primaryRecommendation.expectedResult}</p>
                  </div>
                </div>
                {expandedOption === decision.primaryRecommendation.optionId ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
              </button>
              
              <AnimatePresence>
                {expandedOption === decision.primaryRecommendation.optionId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-100 bg-gray-50/50"
                  >
                    <div className="p-5">
                      {renderTradeOffs(decision.primaryRecommendation)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Alternative Recommendations */}
            {decision.alternativeRecommendations.map((option, idx) => (
              <div 
                key={option.optionId}
                className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${expandedOption === option.optionId ? 'border-gray-400 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <button 
                  className="w-full text-left p-5 flex items-center justify-between bg-white focus:outline-none"
                  onClick={() => setExpandedOption(expandedOption === option.optionId ? null : option.optionId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-black shadow-inner border border-gray-200">
                      {idx + 2}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-700 text-lg">{option.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{option.expectedResult}</p>
                    </div>
                  </div>
                  {expandedOption === option.optionId ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                </button>
                
                <AnimatePresence>
                  {expandedOption === option.optionId && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100 bg-gray-50/50"
                    >
                      <div className="p-5">
                        {renderTradeOffs(option)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Why this is recommended (AI Explanation) */}
        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-indigo-900 flex items-center gap-2">
              <Bot size={18} className="text-indigo-600" />
              Why this is recommended
            </h4>
            {!explanationText && !isExplaining && (
              <button 
                onClick={handleExplain}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Generate Detailed Rationale <ArrowRight size={14} />
              </button>
            )}
            {isExplaining && (
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Thinking...
              </span>
            )}
          </div>
          
          <AnimatePresence>
            {explanationText && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-indigo-900/80 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-indigo-100/50 prose prose-indigo max-w-none prose-p:my-1"
                dangerouslySetInnerHTML={{ __html: explanationText.replace(/\n/g, '<br/>') }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Actions (Only if pending) */}
        {!isResolved && (
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleAction('accept')}
              disabled={actionLoading}
              className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle size={18} />
              Accept Primary Plan
            </button>
            <button
              onClick={() => handleAction('modify')}
              disabled={actionLoading}
              className="w-full sm:w-auto flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 px-6 rounded-xl border border-gray-200 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Edit3 size={18} />
              Modify & Replan
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={actionLoading}
              className="w-full sm:w-auto flex-none bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <XCircle size={18} />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Modify Interactive Modal Placeholder */}
      <AnimatePresence>
        {isModifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-2">Interactive Replanning</h3>
              <p className="text-gray-500 text-sm mb-6">
                Adjust the constraints and preferences below to generate a new custom recovery plan.
              </p>
              
              <div className="space-y-4 mb-8 text-sm">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 flex items-center justify-center italic">
                  [Interactive Re-planning Interface Placeholder]
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 flex items-center justify-center italic">
                  Drag & Drop Priority Modules
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsModifying(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmModify}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center"
                >
                  {actionLoading ? 'Applying...' : 'Apply Modifications'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
