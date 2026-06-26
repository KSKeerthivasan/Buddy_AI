import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const NewTask: React.FC = () => {
  const navigate = useNavigate();
  const { addTask } = useTasks();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addTask({
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      deadline: new Date(deadline),
      priority: 'Medium',
      status: 'Active',
      createdAt: new Date(),
    });
    
    navigate('/dashboard');
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 resize-none"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
              >
                <CheckCircle2 size={18} />
                Create Task
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default NewTask;
