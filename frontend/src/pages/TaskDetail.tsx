import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait until auth is resolved

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchTask = async () => {
      try {
        // We will need to implement a GET endpoint for a single task later
        // For now, we can just fetch all and find it, or placeholder
        const response = await fetch(`http://localhost:5000/api/tasks?userId=${user.uid}`);
        const data = await response.json();
        
        if (data.success) {
          const foundTask = data.tasks.find((t: any) => t.id === taskId);
          setTask(foundTask || null);
        }
      } catch (error) {
        console.error('Error fetching task details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user, authLoading, navigate]);

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading task details...</div>;
  if (!task) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Task not found</div>;

  const analysis = task.analysis || {};
  const milestones = analysis.milestones || [];
  const scheduleDetails = analysis.scheduleDetails || {};
  const executionSessions = scheduleDetails.executionSessions || [];

  const dailyPlanMap = new Map<string, any[]>();
  for (const session of executionSessions) {
    const date = session.scheduledDate || 'Unscheduled';
    if (!dailyPlanMap.has(date)) {
      dailyPlanMap.set(date, []);
    }
    dailyPlanMap.get(date)!.push(session);
  }
  const dailyPlan = Array.from(dailyPlanMap.entries()).map(([date, sessions]) => ({ date, sessions }));

  const completedMilestones = milestones.filter((m: any) => m.isCompleted);
  const progressPercent = milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0;

  const formattedDate = new Date(task.deadline).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const getRiskColor = (risk?: string) => {
    switch(risk) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 p-8 md:p-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'
            }`}>
              {task.status === 'approved' ? 'Active' : task.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getRiskColor(scheduleDetails.riskLevel)}`}>
              {scheduleDetails.riskLevel || 'Unknown'} Risk
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{task.title}</h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">{task.description}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Deadline</p>
            <p className="text-lg font-bold text-gray-900">{formattedDate}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Est. Effort</p>
            <p className="text-lg font-bold text-gray-900">{analysis.estimatedHours || 0} Hours</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Priority</p>
            <p className="text-lg font-bold text-purple-700">{analysis.priority || 'Medium'}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Complexity</p>
            <p className="text-lg font-bold text-indigo-700">{analysis.complexity || 'Unknown'}</p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Milestones (Left Column) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Milestones</h2>
              <span className="text-sm font-bold text-blue-600">{progressPercent}% Completed</span>
            </div>
            
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="space-y-4">
              {milestones.length === 0 && <p className="text-gray-500 italic">No milestones available.</p>}
              {milestones.map((m: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
                  <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${m.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                    {m.isCompleted && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${m.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{m.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{m.estimatedHours}h estimated effort</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Schedule Timeline (Right Column) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Daily Execution Plan</h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
              {dailyPlan.length === 0 && <p className="text-gray-500 italic relative z-10 pl-12">No schedule generated.</p>}
              {dailyPlan.map((day: any, idx: number) => (
                <div key={idx} className="relative flex items-start group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow-sm flex items-center justify-center z-10 font-bold text-sm">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="ml-6 flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-900 text-lg">{day.date}</span>
                      <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{day.sessions.length} sessions</span>
                    </div>
                    {day.sessions.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No tasks scheduled for today.</p>
                    ) : (
                      <div className="space-y-4">
                        {day.sessions.map((s: any, sIdx: number) => (
                          <div key={sIdx} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-800 text-sm">{s.sessionTitle}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500">{s.durationMinutes}m</span>
                                {!s.isCompleted && s.sessionId && (
                                  <button 
                                    onClick={() => navigate(`/focus/${task.id}/${s.sessionId}`)}
                                    className="px-3 py-1.5 bg-gray-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                                  >
                                    Start Session
                                  </button>
                                )}
                                {s.isCompleted && (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                            <ul className="space-y-1.5">
                              {s.tasks?.map((m: any, mIdx: number) => (
                                <li key={mIdx} className="flex justify-between items-start gap-3 text-sm">
                                  <div className="flex items-start gap-2 pt-0.5 text-gray-600">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-2 shrink-0" />
                                    <span className="leading-tight">{m.title}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
