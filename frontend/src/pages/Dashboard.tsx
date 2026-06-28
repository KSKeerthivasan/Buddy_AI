import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, User as UserIcon, CheckSquare, Target, 
  Clock, ShieldAlert, CalendarDays, Play, 
  Activity, ArrowRight, StickyNote, CheckCircle
} from 'lucide-react';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import TaskCard from '../components/common/TaskCard';

const ReminderCard: React.FC<{ reminder: any, onComplete: (id: string) => void, isCompleted: boolean }> = ({ reminder, onComplete, isCompleted }) => {
  const handleCheck = () => {
    if (isCompleted) return;
    onComplete(reminder.id);
  };

  return (
    <motion.div
      layoutId={`reminder-${reminder.id}`}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: isCompleted ? 0.5 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4 }}
      className={`relative w-48 sm:w-56 shrink-0 bg-[#fffcd9] p-5 rounded-md shadow-md border border-[#f0ebc0] flex flex-col group
        before:absolute before:bottom-0 before:right-0 before:border-[12px] before:border-transparent 
        before:border-b-[#e5e1b3] before:border-r-[#e5e1b3] before:rounded-tl-md
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <button 
          onClick={handleCheck}
          disabled={isCompleted}
          className={`shrink-0 w-6 h-6 rounded-md border-[2px] flex items-center justify-center transition-all duration-300 ${
            isCompleted ? 'bg-amber-500 border-amber-500' : 'bg-white border-amber-200 hover:border-amber-400'
          }`}
        >
          {isCompleted && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }}>
              <CheckCircle size={14} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </button>
        <span className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest bg-amber-100/50 px-2 py-0.5 rounded">
          {new Date(reminder.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="relative">
        <h4 className={`font-bold text-amber-950 text-sm leading-snug transition-all duration-500 ${isCompleted ? 'text-amber-900/50' : ''}`}>
          {reminder.title}
        </h4>
        {isCompleted && (
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: '100%' }} 
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-1/2 left-0 h-0.5 bg-amber-500/60 -translate-y-1/2"
          />
        )}
      </div>

      {reminder.description && (
        <p className={`mt-2 text-xs text-amber-800/70 font-medium transition-all duration-500 ${isCompleted ? 'opacity-50' : ''}`}>
          {reminder.description}
        </p>
      )}

      {isCompleted && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-[10px] font-black text-amber-600 flex items-center gap-1"
        >
          Completed <CheckCircle size={10} />
        </motion.div>
      )}
    </motion.div>
  );
};
// -----------------------------------

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

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

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        const data = await response.json();
        if (data.status === 'ok') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };
    
    checkBackend();
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCompleteReminder = async (id: string) => {
    // Optimistic UI Update
    setTasks(prevTasks => prevTasks.map(t => 
      t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t
    ));
    
    try {
      await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch (error) {
      console.error('Failed to update status', error);
      // We could revert the optimistic update here if needed.
    }
  };

  // Segregate Tasks and Derived Metrics
  const { 
    todaySessions, 
    tasksDueSoon, 
    tasksAtRisk, 
    totalBufferDays,
    aiTasks,
    pendingReminders,
    completedTodayReminders
  } = useMemo(() => {
    const localToday = new Date();
    const todayStr = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    let dueSoonCount = 0;
    let riskCount = 0;
    let bufferSum = 0;
    const sessionsForToday: { session: any, task: any }[] = [];
    
    let pendingReminders: any[] = [];
    let completedTodayReminders: any[] = [];
    const aiList: any[] = [];

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    tasks.forEach(task => {
      if (task.taskType === 'REMINDER') {
        if (task.status !== 'completed') {
          pendingReminders.push(task);
        } else if (task.completedAt) {
          const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
          if (completedDate === todayStr) {
            completedTodayReminders.push(task);
          }
        }
      } else {
        aiList.push(task);

        // Metric: Due Soon
        const deadlineDate = new Date(task.deadline);
        if (deadlineDate <= threeDaysFromNow && deadlineDate >= localToday) {
          dueSoonCount++;
        }

        const schedule = task.analysis?.scheduleDetails;
        if (schedule) {
          if (schedule.riskLevel === 'HIGH') riskCount++;
          bufferSum += (schedule.bufferDays || 0);

          const sessions = schedule.executionSessions || [];
          sessions.forEach((session: any) => {
            // On-the-fly legacy status migration for Dashboard rendering
            const sessionStatus = session.status || (session.isCompleted ? 'COMPLETED' : 'PENDING');
            
            if (session.scheduledDate === todayStr && sessionStatus !== 'COMPLETED') {
              sessionsForToday.push({ session: { ...session, status: sessionStatus }, task });
            }
          });
        }
      }
    });

    return {
      todaySessions: sessionsForToday,
      tasksDueSoon: dueSoonCount,
      tasksAtRisk: riskCount,
      totalBufferDays: bufferSum,
      aiTasks: aiList,
      pendingReminders,
      completedTodayReminders
    };
  }, [tasks]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans selection:bg-indigo-100 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100 shadow-sm">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={24} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome, {user.displayName || 'User'}</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 text-sm font-medium">{user.email}</p>
                <div className="h-1 w-1 bg-gray-300 rounded-full" />
                {backendStatus === 'checking' && <span className="text-xs font-bold text-gray-400">CONNECTING...</span>}
                {backendStatus === 'connected' && <span className="text-xs font-bold text-emerald-500 tracking-wider">ONLINE</span>}
                {backendStatus === 'offline' && <span className="text-xs font-bold text-red-500 tracking-wider">OFFLINE</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-3 rounded-2xl font-bold transition-colors"
            >
              <CalendarDays size={18} strokeWidth={2.5} />
              Calendar
            </button>
            <button
              onClick={() => navigate('/activity')}
              className="flex items-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-3 rounded-2xl font-bold transition-colors"
            >
              <Activity size={18} strokeWidth={2.5} />
              Activity
            </button>
            <button
              onClick={() => navigate('/new-task')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Target size={18} />
              New Goal
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Overview Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Today's Sessions</p>
              <p className="text-2xl font-black text-gray-900">{todaySessions.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Due Soon</p>
              <p className="text-2xl font-black text-gray-900">{tasksDueSoon}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">At Risk</p>
              <p className="text-2xl font-black text-gray-900">{tasksAtRisk}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarDays size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Buffer</p>
              <p className="text-2xl font-black text-gray-900">{totalBufferDays} <span className="text-sm font-bold text-gray-400">days</span></p>
            </div>
          </div>
        </div>

        {/* Quick Reminders Widget */}
        {(pendingReminders.length > 0 || completedTodayReminders.length > 0) && (
          <section className="pt-2 flex flex-col gap-6">
            
            {/* Pending Reminders Row */}
            {pendingReminders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote size={18} className="text-amber-500" />
                  <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase">Quick Reminders</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                  <AnimatePresence>
                    {pendingReminders.map(reminder => (
                      <div key={reminder.id} className="snap-start shrink-0">
                        <ReminderCard reminder={reminder} onComplete={handleCompleteReminder} isCompleted={false} />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Completed Today Row */}
            {completedTodayReminders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={18} className="text-emerald-500" />
                  <h2 className="text-sm font-bold tracking-widest text-emerald-600/70 uppercase">Completed Today</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x opacity-80">
                  <AnimatePresence>
                    {completedTodayReminders.map(reminder => (
                      <div key={reminder.id} className="snap-start shrink-0">
                        <ReminderCard reminder={reminder} onComplete={handleCompleteReminder} isCompleted={true} />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            
          </section>
        )}

        {/* Today's Focus Section */}
        <section className="bg-indigo-900 rounded-[2rem] p-8 md:p-10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2 bg-indigo-500/20 rounded-xl backdrop-blur-sm border border-indigo-400/20">
              <Target size={24} className="text-indigo-200" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Today's Focus</h2>
          </div>

          {tasksLoading ? (
             <div className="py-12 flex justify-center">
               <div className="animate-pulse flex items-center gap-3 text-indigo-300 font-bold">
                 <div className="w-5 h-5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                 Scanning schedule...
               </div>
             </div>
          ) : todaySessions.length === 0 ? (
            <div className="bg-indigo-800/40 border border-indigo-700/50 rounded-2xl p-10 text-center backdrop-blur-sm">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <CheckSquare size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">You're all caught up today.</h3>
              <p className="text-indigo-200 font-medium">Enjoy your free time or jump ahead by starting a future session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
              {todaySessions.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-xl shadow-black/5 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200/50">
                      {item.session.durationMinutes} min
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      READY
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight group-hover:text-indigo-600 transition-colors">
                    {item.task.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 mb-6 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-[10px] shrink-0 border border-gray-200">⏱️</span>
                    <span className="truncate">{item.session.sessionTitle}</span>
                  </p>
                  
                  <div className="mt-auto pt-5 border-t border-gray-100">
                    <button 
                      onClick={() => navigate(`/focus/${item.task.id}/${item.session.sessionId || item.task.analysis?.scheduleDetails?.executionSessions.indexOf(item.session).toString()}`)}
                      className="w-full py-3.5 bg-gray-900 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 group/btn shadow-md"
                    >
                      <Play size={16} className="group-hover/btn:scale-110 transition-transform" />
                      Start Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Existing Task List */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Active Projects</h2>
          </div>

          {tasksLoading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Loading your tasks...</h3>
              <p className="text-gray-500 font-medium">Please wait while we fetch your active tasks.</p>
            </div>
          ) : aiTasks.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <CheckSquare size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No active projects</h3>
              <p className="text-gray-500 font-medium mb-6">You don't have any tasks in your backlog.</p>
              <button
                onClick={() => navigate('/new-task')}
                className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-6 py-2.5 rounded-xl font-bold transition-colors"
              >
                Create your first task <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {aiTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                />
              ))}
            </div>
          )}
        </section>
        
      </motion.div>
    </div>
  );
};

export default Dashboard;
