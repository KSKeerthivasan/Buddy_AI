import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { 
  getDecisionsForTask, 
  acceptDecision, 
  rejectDecision, 
  modifyDecision, 
  explainDecision
} from '../api/decisionApi';
import type { DecisionCard as DecisionCardType } from '../api/decisionApi';
import { DecisionCard } from '../components/decision/DecisionCard';

const DecisionCenter: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<DecisionCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      loadDecisions();
    }
  }, [taskId]);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const data = await getDecisionsForTask(taskId!);
      setDecisions(data);
    } catch (err) {
      console.error('Failed to load decisions:', err);
      setError('Failed to load decision center data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    await acceptDecision(id);
    await loadDecisions(); // Refresh to get updated status
  };

  const handleReject = async (id: string) => {
    await rejectDecision(id);
    await loadDecisions();
  };

  const handleModify = async (id: string) => {
    await modifyDecision(id);
    await loadDecisions();
  };

  const handleExplain = async (id: string) => {
    return await explainDecision(id);
  };

  const pendingDecisions = decisions.filter(d => d.status === 'PENDING');
  const resolvedDecisions = decisions.filter(d => d.status !== 'PENDING');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-indigo-400 font-bold">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading Decision Center...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans selection:bg-indigo-100">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-semibold"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-indigo-600" size={32} />
              Decision Center
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              Review AI-generated recovery plans and safely resolve execution deviations.
            </p>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-bold">
            <div className="text-center">
              <p className="text-2xl text-amber-500">{pendingDecisions.length}</p>
              <p className="text-gray-400 uppercase tracking-wider text-xs">Action Required</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-emerald-500">{resolvedDecisions.length}</p>
              <p className="text-gray-400 uppercase tracking-wider text-xs">Resolved</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">
            {error}
          </div>
        )}

        {/* Pending Decisions */}
        <div className="space-y-6">
          {pendingDecisions.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No pending decisions!</h3>
              <p className="text-gray-500 font-medium">Your execution plan is on track. You can return to the dashboard.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {pendingDecisions.map(decision => (
                <motion.div
                  key={decision.decisionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8"
                >
                  <DecisionCard 
                    decision={decision}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onModify={handleModify}
                    onExplain={handleExplain}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Decision History */}
        {resolvedDecisions.length > 0 && (
          <div className="pt-8">
            <h3 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" /> Decision History
            </h3>
            <div className="space-y-6">
              {resolvedDecisions.map(decision => (
                <DecisionCard 
                  key={decision.decisionId}
                  decision={decision}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onModify={handleModify}
                  onExplain={handleExplain}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DecisionCenter;
