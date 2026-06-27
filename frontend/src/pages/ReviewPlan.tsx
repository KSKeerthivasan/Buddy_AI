import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Clock, Zap, Plus, X, ArrowRight, Edit2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ReviewPlan: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const planData = location.state?.planData;
  const rawTask = location.state?.rawTask;
  
  // State for milestones to make them editable
  const [milestones, setMilestones] = useState<{id: string, text: string, isEditing: boolean}[]>(
    planData?.milestones?.map((m: any, idx: number) => ({
      id: String(idx),
      text: m.title,
      isEditing: false
    })) || []
  );
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!planData) {
      navigate('/new-task', { replace: true });
    }
  }, [planData, navigate]);

  if (!planData) return null;
  
  // Handlers for Milestone editing
  const handleAddMilestone = () => {
    if (!newMilestoneText.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    setMilestones([...milestones, { id: newId, text: newMilestoneText, isEditing: false }]);
    setNewMilestoneText('');
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const toggleEditMilestone = (id: string) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, isEditing: !m.isEditing } : m
    ));
  };

  const updateMilestoneText = (id: string, newText: string) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, text: newText } : m
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      toggleEditMilestone(id);
    }
  };

  // Action handlers
  const handleAccept = async () => {
    setIsSaving(true);
    setError('');

    const finalMilestones = milestones.map((m, idx) => ({
      title: m.text,
      estimatedHours: planData.milestones[idx]?.estimatedHours || 0
    }));

    const finalTaskData = {
      userId: user?.uid, // Make sure we store the owner of the task
      title: rawTask?.title,
      description: rawTask?.description,
      deadline: rawTask?.deadline,
      role: rawTask?.role,
      status: 'approved',
      analysis: {
        ...planData,
        milestones: finalMilestones
      }
    };

    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalTaskData),
      });

      if (!response.ok) {
        throw new Error('Failed to save the approved task.');
      }

      alert('Task successfully approved and saved!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error saving approved plan:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-blue-600 p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <h1 className="text-sm font-bold tracking-wider text-blue-200 uppercase mb-3 flex items-center gap-2">
              <Zap size={16} /> AI Execution Plan
            </h1>
            <h2 className="text-3xl font-bold mb-2 relative z-10">{rawTask?.title || 'New Task Plan'}</h2>
            <p className="text-blue-100 relative z-10 text-lg">Review and customize the suggested approach before proceeding.</p>
          </div>

          <div className="p-8 md:p-10">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">AI Priority</p>
                  <p className="text-lg font-bold text-gray-900">{planData.priority}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Estimated Effort</p>
                  <p className="text-lg font-bold text-gray-900">{planData.estimatedHours} Hours</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Complexity</p>
                  <p className="text-lg font-bold text-gray-900">{planData.complexity}</p>
                </div>
              </div>
            </div>

            {/* Editable Milestones */}
            <div className="mb-10">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                Suggested Milestones
                <span className="bg-gray-100 text-gray-600 text-xs py-1 px-2.5 rounded-full ml-2">Editable</span>
              </h3>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {milestones.map((milestone, index) => (
                    <motion.div 
                      key={milestone.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:border-blue-300 transition-colors shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        {milestone.isEditing ? (
                          <input 
                            type="text"
                            value={milestone.text}
                            onChange={(e) => updateMilestoneText(milestone.id, e.target.value)}
                            onBlur={() => toggleEditMilestone(milestone.id)}
                            onKeyDown={(e) => handleKeyDown(e, milestone.id)}
                            autoFocus
                            className="w-full px-3 py-1.5 bg-gray-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900"
                          />
                        ) : (
                          <p className="text-gray-700 font-medium">{milestone.text}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleEditMilestone(milestone.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveMilestone(milestone.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add new milestone */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={newMilestoneText}
                      onChange={(e) => setNewMilestoneText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                      placeholder="Add another milestone..."
                      className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition-colors text-gray-700"
                    />
                    <button 
                      onClick={handleAddMilestone}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-100">
              <button 
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                className="w-full sm:w-auto px-6 py-3 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Modify Plan
              </button>
              <button 
                onClick={handleAccept}
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Accept Plan
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReviewPlan;
