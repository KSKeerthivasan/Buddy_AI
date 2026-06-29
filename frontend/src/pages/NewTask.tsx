import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Sparkles, StickyNote } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type TaskMode = 'AI' | 'REMINDER';

const NewTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [taskMode, setTaskMode] = useState<TaskMode>('AI');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(location.state?.error || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (taskMode === 'AI') {
        const response = await fetch('http://localhost:5000/api/tasks/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, deadline, role: 'Student' }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to analyze task with AI.');
        }

        const responseData = await response.json();
        const planData = responseData.analysis || responseData;
        
        navigate('/review-plan', { 
          state: { 
            planData, 
            rawTask: { title, description, deadline, role: 'Student' } 
          } 
        });
      } else {
        // QUICK REMINDER MODE: Bypass AI Planner
        const response = await fetch('http://localhost:5000/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            title,
            description, // Used as 'Optional Note'
            deadline,
            taskType: 'REMINDER',
            status: 'pending'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create quick reminder.');
        }

        // Successfully saved directly to DB
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/60 overflow-hidden">
          
          <div className="p-8 border-b border-gray-100 bg-gray-50/30">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Create New Goal</h1>
            <p className="text-gray-500 font-medium">Choose how you want to approach this objective.</p>
          </div>

          <div className="p-8">
            {/* Mode Selector */}
            <div className="flex bg-gray-100/80 p-1.5 rounded-2xl mb-8 relative">
              <button
                type="button"
                onClick={() => { setTaskMode('AI'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  taskMode === 'AI' 
                    ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <Sparkles size={18} />
                AI Execution Task
              </button>
              <button
                type="button"
                onClick={() => { setTaskMode('REMINDER'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  taskMode === 'REMINDER' 
                    ? 'bg-white text-amber-700 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <StickyNote size={18} />
                Quick Reminder
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                  <p className="text-sm font-medium text-red-700 leading-relaxed">{error}</p>
                </motion.div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-2">
                  {taskMode === 'AI' ? 'Task Title' : 'Reminder Title'}
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-900 font-medium disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder={taskMode === 'AI' ? "e.g., Build new landing page" : "e.g., Email John about metrics"}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                  {taskMode === 'AI' ? 'Description' : 'Optional Note'}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-900 font-medium resize-none disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder={taskMode === 'AI' ? "Provide more details so the AI can chunk it..." : "Any quick context..."}
                />
              </div>

              <div className="mb-8">
                <label htmlFor="deadline" className="block text-sm font-bold text-gray-700 mb-2">
                  {taskMode === 'AI' ? 'Deadline' : 'Due Date'}
                </label>
                <input
                  type="date"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-900 font-medium disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex items-center justify-center w-full md:w-auto gap-2 px-8 py-4 rounded-2xl font-bold transition-all shadow-md active:translate-y-0 disabled:translate-y-0 disabled:shadow-none ${
                    taskMode === 'AI' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white shadow-indigo-200 hover:-translate-y-0.5' 
                      : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white shadow-amber-200 hover:-translate-y-0.5'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {taskMode === 'AI' ? 'Analyzing...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      {taskMode === 'AI' ? <Sparkles size={20} /> : <CheckCircle2 size={20} />}
                      {taskMode === 'AI' ? 'Generate Plan' : 'Save Reminder'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewTask;
