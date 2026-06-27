import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Clock, Zap, ArrowRight, AlertCircle, 
  Loader2, Calendar, Shield, CheckCircle, BrainCircuit,
  ListTodo, CalendarDays, X, Plus, Edit2, Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ReviewPlan: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Convert location state to local state so we can mutate it after modifying the plan
  const [currentPlanData, setCurrentPlanData] = useState<any>(location.state?.planData);
  const [currentRawTask, setCurrentRawTask] = useState<any>(location.state?.rawTask);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  
  // Form State for editing
  const [editDeadline, setEditDeadline] = useState('');
  const [editEstimatedHours, setEditEstimatedHours] = useState(0);
  const [editDailyHours, setEditDailyHours] = useState('');
  const [editMilestones, setEditMilestones] = useState<{id: string, title: string, estimatedHours: number}[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  useEffect(() => {
    if (!currentPlanData) {
      navigate('/new-task', { replace: true });
    }
  }, [currentPlanData, navigate]);

  if (!currentPlanData || !currentRawTask) return null;

  // Initialize form state when opening edit mode
  const openEditMode = () => {
    setEditDeadline(currentRawTask.deadline.split('T')[0]); // ensure YYYY-MM-DD format
    setEditEstimatedHours(currentPlanData.estimatedHours || 0);
    setEditDailyHours('');
    setEditMilestones(
      (currentPlanData.milestones || []).map((m: any, idx: number) => ({
        id: `m-${idx}-${Math.random()}`,
        title: m.title,
        estimatedHours: m.estimatedHours || 0
      }))
    );
    setIsEditMode(true);
  };

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setEditMilestones([...editMilestones, {
      id: `m-new-${Math.random()}`,
      title: newMilestoneTitle.trim(),
      estimatedHours: 0
    }]);
    setNewMilestoneTitle('');
  };

  const handleRemoveMilestone = (id: string) => {
    setEditMilestones(editMilestones.filter(m => m.id !== id));
  };

  const handleUpdateMilestone = (id: string, field: 'title' | 'estimatedHours', value: any) => {
    setEditMilestones(editMilestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleUpdatePlan = async () => {
    setIsRecomputing(true);
    setError('');

    // Clean up milestones for the API
    const finalMilestones = editMilestones.map(m => ({
      title: m.title,
      estimatedHours: m.estimatedHours
    }));

    try {
      const response = await fetch('http://localhost:5000/api/scheduler/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: editDeadline,
          estimatedHours: editEstimatedHours,
          milestones: finalMilestones,
          dailyAvailableHours: editDailyHours ? parseFloat(editDailyHours) : undefined,
          role: currentRawTask.role
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to recompute the schedule.');
      }

      const scheduleResult = await response.json();

      // Update local state to reflect the new plan
      setCurrentRawTask({
        ...currentRawTask,
        deadline: editDeadline
      });
      
      setCurrentPlanData({
        ...currentPlanData,
        estimatedHours: editEstimatedHours,
        milestones: finalMilestones,
        scheduleDetails: scheduleResult
      });

      setIsEditMode(false);
    } catch (err: any) {
      console.error('Error recomputing plan:', err);
      setError(err.message || 'An unexpected error occurred while modifying the plan.');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleAccept = async () => {
    setIsSaving(true);
    setError('');

    const finalTaskData = {
      userId: user?.uid,
      title: currentRawTask.title,
      description: currentRawTask.description,
      deadline: currentRawTask.deadline,
      role: currentRawTask.role,
      status: 'approved',
      analysis: {
        ...currentPlanData
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

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error saving approved plan:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const { scheduleDetails } = currentPlanData;
  const executionSessions = scheduleDetails?.executionSessions || [];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans text-gray-900 selection:bg-blue-100">
      
      {/* Edit Mode Modal Overlay */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-gray-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                    <Settings size={20} />
                  </span>
                  <h2 className="text-xl font-extrabold text-gray-900">Modify Plan</h2>
                </div>
                <button onClick={() => setIsEditMode(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase">Core Settings</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
                    <input 
                      type="date" 
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Hours</label>
                      <input 
                        type="number" 
                        step="0.5"
                        min="0.5"
                        value={editEstimatedHours}
                        onChange={(e) => setEditEstimatedHours(parseFloat(e.target.value) || 0)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Daily Max (hrs) <span className="text-gray-400 font-normal italic">Optional</span></label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. 2"
                        value={editDailyHours}
                        onChange={(e) => setEditDailyHours(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase">Milestones</h3>
                  
                  <div className="space-y-3">
                    {editMilestones.map((m) => (
                      <div key={m.id} className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            value={m.title}
                            onChange={(e) => handleUpdateMilestone(m.id, 'title', e.target.value)}
                            placeholder="Milestone title"
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-500 transition-colors"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">Estimate:</span>
                            <input 
                              type="number" 
                              step="0.1"
                              value={m.estimatedHours || ''}
                              onChange={(e) => handleUpdateMilestone(m.id, 'estimatedHours', parseFloat(e.target.value) || 0)}
                              placeholder="Hours"
                              className="w-24 p-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:border-indigo-500 transition-colors"
                            />
                            <span className="text-xs text-gray-400">hrs</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveMilestone(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="text"
                      placeholder="Add a new milestone..."
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 transition-all"
                    />
                    <button onClick={handleAddMilestone} className="p-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors shrink-0">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium border border-red-100">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-white">
                <button 
                  onClick={handleUpdatePlan}
                  disabled={isRecomputing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                >
                  {isRecomputing ? <><Loader2 size={18} className="animate-spin" /> Regenerating...</> : 'Save & Regenerate Schedule'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto space-y-8"
      >
        
        {/* 1. Task Summary */}
        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 -z-10" />
          
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-100 text-blue-700 p-2 rounded-xl">
              <Target size={20} strokeWidth={2.5} />
            </span>
            <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase">Task Summary</h2>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
            {currentRawTask.title}
          </h1>
          
          <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mb-8">
            {currentRawTask.description || 'No description provided.'}
          </p>

          <div className="inline-flex items-center gap-3 bg-gray-50/80 border border-gray-100 px-5 py-3 rounded-2xl">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-gray-500 font-medium">Deadline:</span>
            <span className="font-bold text-gray-900">{new Date(currentRawTask.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 2. AI Analysis */}
          <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/60">
            <div className="flex items-center gap-2 mb-8">
              <span className="bg-purple-100 text-purple-700 p-2 rounded-xl">
                <BrainCircuit size={20} strokeWidth={2.5} />
              </span>
              <h2 className="text-sm font-bold tracking-widest text-purple-600 uppercase">AI Analysis</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><CheckCircle size={14}/> Task Type</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{currentPlanData.taskType || 'Standard'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><AlertCircle size={14}/> Priority</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{currentPlanData.priority}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><ListTodo size={14}/> Complexity</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{currentPlanData.complexity}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><Zap size={14}/> Confidence</p>
                <p className="text-lg font-bold text-gray-900">{currentPlanData.confidence ? `${Math.round(currentPlanData.confidence * 100)}%` : 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* 3. Work Estimate */}
          <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/60 flex flex-col">
            <div className="flex items-center gap-2 mb-8">
              <span className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                <Clock size={20} strokeWidth={2.5} />
              </span>
              <h2 className="text-sm font-bold tracking-widest text-emerald-600 uppercase">Work Estimate</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><Clock size={14}/> Total Effort</p>
                <p className="text-3xl font-black text-emerald-600 tracking-tight">{currentPlanData.estimatedHours} <span className="text-lg font-bold text-gray-400">hrs</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5"><CalendarDays size={14}/> Buffer Days</p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{scheduleDetails?.bufferDays ?? 0} <span className="text-lg font-bold text-gray-400">days</span></p>
                <p className="text-xs text-gray-400 italic leading-snug mt-1">You are expected to finish before the deadline, leaving time for revisions or unexpected delays.</p>
              </div>
            </div>
            
            <div className="mt-auto space-y-1 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5"><Shield size={14}/> Risk Assessment</p>
              <div className="flex items-center gap-2">
                <p className={`font-bold ${scheduleDetails?.riskLevel === 'HIGH' ? 'text-red-600' : 'text-gray-900'}`}>{scheduleDetails?.riskLevel || 'Unknown'} Risk</p>
              </div>
              {scheduleDetails?.message && (
                <p className="text-sm text-gray-500 mt-1">{scheduleDetails.message}</p>
              )}
            </div>
          </section>
        </div>

        {/* 4. Execution Plan */}
        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100/60">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                <CalendarDays size={20} strokeWidth={2.5} />
              </span>
              <h2 className="text-sm font-bold tracking-widest text-indigo-600 uppercase">Execution Plan</h2>
            </div>
            <span className="text-sm font-bold bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100">
              {executionSessions.length} Sessions
            </span>
          </div>

          {executionSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">No execution sessions could be generated.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {executionSessions.map((session: any, idx: number) => (
                <div key={idx} className="bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300 rounded-2xl p-6 border border-gray-200/60 flex flex-col group relative">
                  
                  {/* Execution Order Badge */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md border-2 border-white transform group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>

                  <div className="flex justify-between items-start mb-5 mt-1">
                    <span className="text-sm font-black text-indigo-700 bg-indigo-100/60 px-3.5 py-1.5 rounded-xl border border-indigo-200/50 shadow-sm">
                      {session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unscheduled'}
                    </span>
                    <span className="text-xs font-extrabold text-gray-500 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1">
                      <Clock size={12} />
                      {session.durationMinutes} min
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-5 leading-tight group-hover:text-indigo-600 transition-colors">
                    {session.sessionTitle}
                  </h3>
                  
                  <div className="mt-auto pt-4 border-t border-gray-200/60">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Target size={14} className="text-indigo-400" /> Today's Goal
                    </p>
                    <div className="space-y-2.5">
                      {session.tasks?.map((task: any, tIdx: number) => (
                        <div key={tIdx} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 font-medium leading-relaxed">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Main Error */}
        {error && !isEditMode && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        {/* 5. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 pb-12">
          <button 
            onClick={openEditMode}
            className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Edit2 size={18} />
            Modify Plan
          </button>
          <button 
            onClick={handleAccept}
            disabled={isSaving}
            className="w-full sm:w-auto px-10 py-4 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-gray-900/10 hover:shadow-gray-900/20 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Accept Plan
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default ReviewPlan;
