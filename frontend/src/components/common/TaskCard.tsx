import React from 'react';
import { Calendar } from 'lucide-react';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100/80 text-emerald-700 border-emerald-200';
      case 'Active':
        return 'bg-blue-100/80 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100/80 text-gray-700 border-gray-200';
    }
  };

  // Format date to be more readable
  const formattedDate = new Date(task.deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative group overflow-hidden">
      {/* Glassmorphism Card */}
      <div className="p-5 rounded-2xl bg-white/40 backdrop-blur-lg border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:bg-white/60 hover:-translate-y-1">
        
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-800 text-lg leading-tight line-clamp-1 flex-1 mr-4">
            {task.title}
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)} flex-shrink-0`}>
            {task.status}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-500 mb-5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200/50">
          <div className="flex items-center text-gray-500 text-sm font-medium">
            <Calendar size={14} className="mr-1.5 opacity-70" />
            {formattedDate}
          </div>
        </div>
      </div>
      
      {/* Subtle background glow effect (visible on hover) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-purple-400/0 to-blue-400/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl pointer-events-none" />
    </div>
  );
};

export default TaskCard;
