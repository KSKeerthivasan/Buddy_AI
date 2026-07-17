import React, { useState } from 'react';
import { Sparkles, CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

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
}

export interface Decision {
  decisionId: string;
  decisionType: string;
  problem: string;
  evidence: Record<string, any>;
  primaryRecommendation: RecommendationOption;
  alternativeRecommendations: RecommendationOption[];
  confidence: number;
  status: string;
}

interface DecisionCardProps {
  decision: Decision;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onModify: (id: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, onAccept, onReject, onModify }) => {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const handleExplainMore = async () => {
    if (explanation) {
      setExplanation(null);
      return;
    }
    
    setIsExplaining(true);
    try {
      const res = await fetch(`http://localhost:5000/api/decisions/${decision.decisionId}/explain`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setExplanation(data.explanation);
      }
    } catch (e) {
      console.error(e);
      setExplanation("Unable to generate explanation right now.");
    } finally {
      setIsExplaining(false);
    }
  };

  const renderTradeOffs = (tradeOffs: RecommendationTradeOffs) => (
    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
        <h5 className="font-bold text-emerald-800 mb-1">Benefits</h5>
        <ul className="list-disc pl-4 text-emerald-700">
          {tradeOffs.benefits.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
        <h5 className="font-bold text-rose-800 mb-1">Risks</h5>
        <ul className="list-disc pl-4 text-rose-700">
          {tradeOffs.risks.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2 mt-2">
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Capacity: {tradeOffs.capacityImpact}</span>
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Buffer: {tradeOffs.bufferImpact}</span>
        <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Deadline: {tradeOffs.deadlineImpact}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-indigo-900/5 border border-indigo-100 flex flex-col relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
            {decision.decisionType} DECISION
          </span>
          <h3 className="text-2xl font-black text-gray-900">{decision.problem}</h3>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          <AlertTriangle size={16} className="text-amber-500" />
          <span className="text-xs font-bold text-gray-600">Confidence: {decision.confidence}%</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
        <h4 className="text-sm font-bold text-gray-700 mb-2">Evidence</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(decision.evidence).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-sm font-black text-gray-900">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Primary Recommendation</h4>
        <div className="bg-indigo-50/50 rounded-2xl p-5 border-2 border-indigo-100">
          <h5 className="text-xl font-black text-indigo-900 mb-1">{decision.primaryRecommendation.name}</h5>
          <p className="text-sm font-medium text-indigo-700/80 mb-4">{decision.primaryRecommendation.expectedResult}</p>
          {renderTradeOffs(decision.primaryRecommendation.tradeOffs)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button 
          onClick={() => onAccept(decision.decisionId)}
          className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          <CheckCircle size={20} /> Accept Action
        </button>
        <button 
          onClick={() => onModify(decision.decisionId)}
          className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors flex items-center gap-2 border border-gray-200"
        >
          <Edit3 size={20} /> Modify
        </button>
        <button 
          onClick={() => onReject(decision.decisionId)}
          className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-2 border border-rose-200"
        >
          <XCircle size={20} /> Reject
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button 
          onClick={() => setShowAlternatives(!showAlternatives)}
          className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showAlternatives ? 'Hide' : 'View'} Alternatives ({decision.alternativeRecommendations.length})
        </button>
        
        <button 
          onClick={handleExplainMore}
          disabled={isExplaining}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          <Sparkles size={16} />
          {isExplaining ? 'Thinking...' : explanation ? 'Hide Explanation' : 'Explain More'}
        </button>
      </div>

      {explanation && (
        <div className="mt-4 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-indigo-500" />
            <h4 className="font-bold text-indigo-900">Buddy AI Insight</h4>
          </div>
          <p className="text-sm font-medium text-indigo-800/80 whitespace-pre-wrap leading-relaxed">
            {explanation}
          </p>
        </div>
      )}

      {showAlternatives && decision.alternativeRecommendations.length > 0 && (
        <div className="mt-4 space-y-4">
          {decision.alternativeRecommendations.map((alt) => (
            <div key={alt.optionId} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <h5 className="text-lg font-black text-gray-900 mb-1">{alt.name}</h5>
              <p className="text-sm font-medium text-gray-500 mb-4">{alt.expectedResult}</p>
              {renderTradeOffs(alt.tradeOffs)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
