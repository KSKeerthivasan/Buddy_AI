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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search logic
      const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Filter logic
      switch (activeFilter) {
        case 'Execution Tasks':
          return task.taskType !== 'REMINDER';
        case 'Quick Reminders':
          return task.taskType === 'REMINDER';
        case 'Completed':
          return task.status === 'completed';
        case 'Pending':
          return task.status !== 'completed';
        default:
          return true; // 'All'
      }
    });
  }, [tasks, searchQuery, activeFilter]);

  const groupedTasks = useMemo(() => {
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

    filteredTasks.forEach(task => {
      // Use completedAt if available, otherwise fallback to createdAt or deadline
      const refDateString = task.completedAt || task.createdAt || task.deadline || new Date().toISOString();
      const refDateObj = new Date(refDateString);
      const refDateIso = new Date(refDateObj.getTime() - refDateObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      if (refDateIso === todayStr) {
        groups['Today'].push(task);
      } else if (refDateIso === yesterdayStr) {
        groups['Yesterday'].push(task);
      } else if (refDateIso > lastWeekStr) {
        groups['Last Week'].push(task);
      } else {
        groups['Older'].push(task);
      }
    });

    // Sort each group (newest first based on ref date)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date(a.completedAt || a.createdAt || a.deadline).getTime();
        const dateB = new Date(b.completedAt || b.createdAt || b.deadline).getTime();
        return dateB - dateA;
      });
    });

    return groups;
  }, [filteredTasks]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || tasksLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading History...</div>;
  }

  const hasAnyTasks = filteredTasks.length > 0;

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
        {!hasAnyTasks ? (
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
              {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                groupTasks.length > 0 && (
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
                        {groupTasks.map((task) => {
                          const isCompleted = task.status === 'completed';
                          const isReminder = task.taskType === 'REMINDER';

                          return (
                            <div key={task.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                              <div className="pt-0.5">
                                {isCompleted ? (
                                  <CheckCircle2 size={20} className="text-emerald-500" strokeWidth={2.5} />
                                ) : (
                                  <Clock size={20} className="text-amber-400" strokeWidth={2.5} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-base font-bold truncate ${isCompleted ? 'text-gray-600 line-through decoration-gray-300' : 'text-gray-900'}`}>
                                    {task.title}
                                  </h4>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${isReminder ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {isReminder ? 'Reminder' : 'Execution'}
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                  {isCompleted ? (
                                    <>
                                      Completed at {formatTime(task.completedAt)} 
                                      {groupName === 'Older' && ` on ${formatDate(task.completedAt)}`}
                                    </>
                                  ) : (
                                    <>
                                      Created at {formatTime(task.createdAt)}
                                      {groupName === 'Older' && ` on ${formatDate(task.createdAt)}`}
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
