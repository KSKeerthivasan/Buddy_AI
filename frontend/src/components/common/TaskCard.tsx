import React from 'react';
import { Calendar, ChevronDown, Target, Clock, Shield, PlayCircle, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isExpanded, onToggle }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
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

  const formattedDate = new Date(task.deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const analysis = task.analysis || {};
  const milestones = analysis.milestones || [];
  const scheduleDetails = analysis.scheduleDetails || {};
  const schedule = scheduleDetails.schedule || [];
  
  // Calculate Progress & Next Action
  const completedMilestones = milestones.filter((m: any) => m.isCompleted);
  const progressPercent = milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0;
  const remainingCount = milestones.length - completedMilestones.length;
  const nextAction = milestones.find((m: any) => !m.isCompleted);

  return (
    <div className="relative group rounded-3xl overflow-hidden bg-white/60 backdrop-blur-xl border border-gray-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-200">
      
      {/* Clickable Header/Compact View */}
      <div 
        className="p-5 md:p-6 cursor-pointer flex flex-col gap-4 relative z-10"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <h3 className="font-bold text-gray-900 text-xl leading-tight mb-2">
              {task.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className={`px-2.5 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                {task.status === 'approved' ? 'Active' : task.status}
              </span>
              <span className={`px-2.5 py-1 rounded-full border ${getRiskColor(scheduleDetails.riskLevel)} flex items-center gap-1`}>
                <Shield size={12} /> {scheduleDetails.riskLevel || 'Unknown'} Risk
              </span>
              <span className="px-2.5 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                <Target size={12} /> {analysis.priority || 'Medium'} Priority
              </span>
            </div>
          </div>
          <motion.div 
            animate={{ rotate: isExpanded ? 180 : 0 }} 
            transition={{ duration: 0.3 }}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>

        {/* Compact Summary Metrics */}
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
              <p className="font-semibold text-blue-700 text-sm truncate max-w-[200px]">
                {nextAction ? nextAction.title : 'All caught up!'}
              </p>
              {remainingCount > 0 && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  +{remainingCount} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-gray-50/50 border-t border-gray-100 relative z-10"
          >
            <div className="p-5 md:p-6 space-y-8">
              
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <h4 className="font-bold text-gray-800 text-sm">Overall Progress</h4>
                  <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Milestones List */}
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                    <Target size={16} className="text-purple-500" /> All Milestones
                  </h4>
                  <div className="space-y-3">
                    {milestones.length === 0 && <p className="text-sm text-gray-400 italic">No milestones defined.</p>}
                    {milestones.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        {m.isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle size={18} className="text-gray-300 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${m.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {m.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{m.estimatedHours}h estimated</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule Outline */}
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" /> Daily Schedule
                  </h4>
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                    {schedule.length === 0 && <p className="text-sm text-gray-400 italic">No schedule generated.</p>}
                    {schedule.map((day: any, idx: number) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <span className="text-xs font-bold">{idx + 1}</span>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-700">{day.date}</span>
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{day.assignedHours}h</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {day.milestones?.length > 0 ? day.milestones.map((m:any) => m.title).join(', ') : 'No tasks'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-purple-400/0 to-blue-400/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

export default TaskCard;
