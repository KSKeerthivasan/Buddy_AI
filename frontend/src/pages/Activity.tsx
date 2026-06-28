import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, Clock, ArrowLeft, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type FilterType = 'All' | 'Execution Tasks' | 'Quick Reminders' | 'Completed' | 'Pending';

const Activity: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (!user?.uid) return;
        const response = await fetch(`http://localhost:5000/api/tasks?userId=${user.uid}`);
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  const activities = useMemo(() => {
    const arr: any[] = [];
    
    tasks.forEach(task => {
      // Search filter check first on task title
      if (searchQuery && !task.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      if (task.taskType === 'REMINDER') {
        if (activeFilter === 'Execution Tasks') return;
        if (activeFilter === 'Completed' && task.status !== 'completed') return;
        if (activeFilter === 'Pending' && task.status === 'completed') return;
        
        arr.push({
          id: task.id,
          title: task.title,
          type: 'Reminder',
          status: task.status,
          timestamp: task.completedAt || task.createdAt || task.deadline || new Date().toISOString()
        });
      } else {
        if (activeFilter === 'Quick Reminders') return;
        
        // Push the overarching task
        if (
           (activeFilter === 'All' || activeFilter === 'Execution Tasks') || 
           (activeFilter === 'Completed' && task.status === 'completed') ||
           (activeFilter === 'Pending' && task.status !== 'completed')
        ) {
          arr.push({
            id: task.id + (task.status === 'completed' ? '-complete' : '-create'),
            title: task.title,
            type: 'Task',
            status: task.status,
            timestamp: task.completedAt || task.createdAt || new Date().toISOString()
          });
        }
        
        // Extract completed individual sessions for the timeline!
        // We only show completed sessions on the timeline to reduce clutter of "pending" sessions.
        if (activeFilter !== 'Pending') {
          const sessions = task.analysis?.scheduleDetails?.executionSessions || [];
          sessions.forEach((s: any, idx: number) => {
            if (s.isCompleted && s.completedAt) {
              arr.push({
                id: `${task.id}-session-${idx}`,
                title: task.title,
                parentTitle: s.sessionTitle,
                type: 'Session',
                status: 'completed',
                timestamp: s.completedAt,
                duration: s.durationMinutes,
                completionMethod: s.completionMethod,
                earlyCompletionReason: s.earlyCompletionReason
              });
            }
          });
        }
      }
    });

    return arr;
  }, [tasks, searchQuery, activeFilter]);

  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: any[] } = {
      'Today': [],
      'Yesterday': [],
      'Last Week': [],
      'Older': []
    };

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = new Date(lastWeek.getTime() - lastWeek.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    activities.forEach(act => {
      const refDateObj = new Date(act.timestamp);
      const refDateIso = new Date(refDateObj.getTime() - refDateObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      if (refDateIso === todayStr) {
        groups['Today'].push(act);
      } else if (refDateIso === yesterdayStr) {
        groups['Yesterday'].push(act);
      } else if (refDateIso > lastWeekStr) {
        groups['Last Week'].push(act);
      } else {
        groups['Older'].push(act);
      }
    });

    // Sort each group (newest first based on ref date)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    });

    return groups;
  }, [activities]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || tasksLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold">Loading History...</div>;
  }

  const hasAnyActivities = activities.length > 0;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans selection:bg-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <ActivityIcon size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Activity & History</h1>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/60 flex flex-col md:flex-row gap-4 justify-between items-center relative overflow-hidden">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar pb-1 md:pb-0">
            {(['All', 'Execution Tasks', 'Quick Reminders', 'Completed', 'Pending'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900"
            />
          </div>
        </div>

        {/* Activity Feed */}
        {!hasAnyActivities ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No activity found</h3>
            <p className="text-gray-500 font-medium">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedActivities).map(([groupName, groupActs]) => (
                groupActs.length > 0 && (
                  <motion.div 
                    key={groupName}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-4 pl-1">
                      {groupName}
                    </h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {groupActs.map((act) => {
                          const isCompleted = act.status === 'completed';
                          
                          let badgeClass = 'bg-gray-100 text-gray-600';
                          let badgeText = act.type;
                          let isEarly = false;
                          
                          if (act.type === 'Reminder') badgeClass = 'bg-amber-50 text-amber-600';
                          if (act.type === 'Task') badgeClass = 'bg-indigo-50 text-indigo-600';
                          if (act.type === 'Session') {
                             if (act.completionMethod === 'early' || act.earlyCompletionReason) {
                               badgeClass = 'bg-teal-50 text-teal-600 border border-teal-200';
                               badgeText = `Completed early`;
                               isEarly = true;
                             } else {
                               badgeClass = 'bg-emerald-50 text-emerald-600';
                               badgeText = `${act.duration}m Focus Session`;
                             }
                          }

                          return (
                            <div key={act.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                              <div className="pt-0.5">
                                {isCompleted ? (
                                  <CheckCircle2 size={20} className={isEarly ? "text-teal-500" : "text-emerald-500"} strokeWidth={2.5} />
                                ) : (
                                  <Clock size={20} className="text-amber-400" strokeWidth={2.5} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-base font-bold truncate ${isCompleted ? 'text-gray-600 line-through decoration-gray-300' : 'text-gray-900'}`}>
                                    {act.title}
                                  </h4>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${badgeClass}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                
                                {act.parentTitle && (
                                  <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <span className="w-3 h-3 flex items-center justify-center rounded bg-gray-100">⏱️</span>
                                    {act.parentTitle}
                                  </p>
                                )}
                                
                                <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mt-1">
                                  {isCompleted ? (
                                    <>
                                      Completed at {formatTime(act.timestamp)} 
                                      {groupName === 'Older' && ` on ${formatDate(act.timestamp)}`}
                                    </>
                                  ) : (
                                    <>
                                      Started at {formatTime(act.timestamp)}
                                      {groupName === 'Older' && ` on ${formatDate(act.timestamp)}`}
                                      <span className="text-gray-300">•</span> 
                                      <span className="text-amber-500">Pending</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default Activity;
