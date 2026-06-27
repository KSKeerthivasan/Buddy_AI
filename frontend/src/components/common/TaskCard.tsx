import React from 'react';
import { Calendar, Target, Clock, Shield, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate();

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
  
  // Calculate Progress & Next Action
  const completedMilestones = milestones.filter((m: any) => m.isCompleted);
  const remainingCount = milestones.length - completedMilestones.length;
  const nextAction = milestones.find((m: any) => !m.isCompleted);

  return (
    <div className="relative group rounded-3xl overflow-hidden bg-white/60 backdrop-blur-xl border border-gray-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-200">
      
      {/* Clickable Header/Compact View */}
      <div 
        className="p-5 md:p-6 cursor-pointer flex flex-col gap-4 relative z-10"
        onClick={() => navigate(`/task/${task.id}`)}
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

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-purple-400/0 to-blue-400/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

export default TaskCard;
