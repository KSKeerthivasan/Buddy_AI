import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const NewTask: React.FC = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
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
      const planData = responseData.analysis || responseData; // extract the analysis object
      
      navigate('/review-plan', { 
        state: { 
          planData, 
          rawTask: { title, description, deadline } 
        } 
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
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

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
            <p className="text-gray-500 mt-1">Fill in the details below to add a new task.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Task Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g., Review project proposal"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Provide more details about this task..."
              />
            </div>

            <div className="mb-6">
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <input
                type="date"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default NewTask;
