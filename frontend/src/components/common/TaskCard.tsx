import React, { useState } from 'react';
import { Calendar, Target, Clock, Shield, PlayCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100/80 text-emerald-700 border-emerald-200';
      case 'Active':
      case 'approved':
        return 'bg-blue-100/80 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100/80 text-gray-700 border-gray-200';
    }
  };

  const getRiskColor = (risk?: string) => {
    switch(risk) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      await fetch(`http://localhost:5000/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      // Delay to show the completed state before removing
      setTimeout(() => {
        setIsFadingOut(true);
      }, 1500);
    } catch (error) {
      console.error('Failed to complete task:', error);
      setIsCompleting(false);
    }
  };

  const formattedDate = new Date(task.deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const analysis = task.analysis || {};
  const milestones = analysis.milestones || [];
  const scheduleDetails = analysis.scheduleDetails || {};
  
  const completedMilestones = milestones.filter((m: any) => m.isCompleted);
  const remainingCount = milestones.length - completedMilestones.length;
  const nextAction = milestones.find((m: any) => !m.isCompleted);

  return (
    <AnimatePresence>
      {!isFadingOut && (
        <motion.div 
          layout
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, height: 0, overflow: 'hidden' }}
          transition={{ duration: 0.4 }}
          className={`relative group rounded-3xl overflow-hidden bg-white/60 backdrop-blur-xl border ${isCompleting ? 'border-emerald-300 shadow-emerald-100' : 'border-gray-200/60 hover:border-blue-200'} shadow-sm transition-all duration-300 hover:shadow-lg`}
        >
          
          <div 
            className={`p-5 md:p-6 cursor-pointer flex flex-col gap-4 relative z-10 transition-opacity duration-500 ${isCompleting ? 'opacity-60' : ''}`}
            onClick={() => !isCompleting && navigate(`/task/${task.id}`)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 mr-4">
                <h3 className={`font-bold text-xl leading-tight mb-2 ${isCompleting ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'}`}>
                  {task.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className={`px-2.5 py-1 rounded-full border ${getStatusColor(isCompleting ? 'completed' : task.status)}`}>
                    {isCompleting ? 'Completed' : (task.status === 'approved' ? 'Active' : task.status)}
                  </span>
                  {!isCompleting && (
                    <>
                      <span className={`px-2.5 py-1 rounded-full border ${getRiskColor(scheduleDetails.riskLevel)} flex items-center gap-1`}>
                        <Shield size={12} /> {scheduleDetails.riskLevel || 'Unknown'} Risk
                      </span>
                      <span className="px-2.5 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                        <Target size={12} /> {analysis.priority || 'Medium'} Priority
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {!isCompleting && task.status !== 'completed' && (
                <button 
                  onClick={handleComplete}
                  className="shrink-0 flex items-center justify-center p-2 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border border-gray-200 hover:border-emerald-200 transition-all z-20 shadow-sm"
                  title="Mark Project Complete"
                >
                  <CheckCircle2 size={20} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 py-4 border-t border-b border-gray-100/50">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Due Date</p>
                <p className="font-semibold text-gray-800 text-sm">{formattedDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12} /> Est. Effort</p>
                <p className="font-semibold text-gray-800 text-sm">{analysis.estimatedHours || 0} hrs</p>
              </div>
              <div className="col-span-2 md:col-span-2">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PlayCircle size={12} /> Next Action</p>
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm truncate max-w-[200px] ${isCompleting ? 'text-gray-400' : 'text-blue-700'}`}>
                    {isCompleting ? 'Project Finished!' : (nextAction ? nextAction.title : 'All caught up!')}
                  </p>
                  {!isCompleting && remainingCount > 0 && (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      +{remainingCount} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-purple-400/0 to-blue-400/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
          
          {isCompleting && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-emerald-500 text-white px-6 py-3 rounded-full font-black text-lg flex items-center gap-2 shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 size={24} /> COMPLETED
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskCard;
