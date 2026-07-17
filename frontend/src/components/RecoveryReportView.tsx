import React from 'react';
import { AlertTriangle, Clock, Calendar, Briefcase, Activity, CheckCircle, ShieldAlert } from 'lucide-react';

interface RecoveryStrategy {
  strategyId: string;
  name: string;
  description: string;
}

interface RecoveryMetrics {
  remainingEffortMinutes: number;
  remainingCapacityMinutes: number;
  bufferRemainingDays: number;
  deadlinePressure: number;
  capacityDeficitMinutes: number;
}

export interface RecoveryReport {
  taskId: string;
  triggerReason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metrics: RecoveryMetrics;
  recommendedStrategies: RecoveryStrategy[];
  requiresDecision: boolean;
  earliestCompletionDate?: string;
  generatedAt: string;
}

interface RecoveryReportViewProps {
  report: RecoveryReport;
}

const severityConfig = {
  LOW: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  MEDIUM: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Activity },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
  CRITICAL: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: ShieldAlert },
};

export const RecoveryReportView: React.FC<RecoveryReportViewProps> = ({ report }) => {
  const config = severityConfig[report.severity] || severityConfig.LOW;
  const Icon = config.icon;

  return (
    <div className={`p-6 rounded-3xl border ${config.border} ${config.bg} shadow-sm my-6`}>
      <div className="flex items-center gap-3 mb-6">
        <Icon className={config.color} size={28} />
        <div>
          <h2 className={`text-xl font-black ${config.color}`}>Recovery Analysis: {report.severity}</h2>
          <p className="text-sm font-medium text-gray-600 mt-1">
            Triggered by: <span className="font-bold text-gray-800">{report.triggerReason.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Remaining Effort</span>
          </div>
          <span className="text-xl font-black text-gray-900">
            {Math.round(report.metrics.remainingEffortMinutes / 60)}<span className="text-sm font-medium text-gray-500 ml-1">hrs</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Briefcase size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Available Capacity</span>
          </div>
          <span className="text-xl font-black text-gray-900">
            {Math.round(report.metrics.remainingCapacityMinutes / 60)}<span className="text-sm font-medium text-gray-500 ml-1">hrs</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Buffer Remaining</span>
          </div>
          <span className={`text-xl font-black ${report.metrics.bufferRemainingDays < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
            {report.metrics.bufferRemainingDays}<span className="text-sm font-medium text-gray-500 ml-1">days</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Earliest Finish</span>
          </div>
          <span className="text-lg font-black text-gray-900">
            {report.earliestCompletionDate ? new Date(report.earliestCompletionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Deterministic Strategies Generated</h3>
        </div>
        <div className="p-2 space-y-2">
          {report.recommendedStrategies.map((strategy, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center">
              <span className="font-bold text-gray-900 text-sm mb-1">{strategy.name}</span>
              <span className="text-xs font-medium text-gray-500 leading-snug">{strategy.description}</span>
            </div>
          ))}
          {report.recommendedStrategies.length === 0 && (
            <p className="p-4 text-sm text-gray-500 italic text-center font-medium">No specific strategies required.</p>
          )}
        </div>
      </div>
      
      {report.requiresDecision && (
        <div className="mt-4 text-center">
          <span className="inline-block px-3 py-1 bg-white border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest rounded-full">
            Pending Decision Engine Action
          </span>
        </div>
      )}
    </div>
  );
};
