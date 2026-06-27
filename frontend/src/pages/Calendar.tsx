import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  addDays, startOfWeek, format, 
  parseISO, addWeeks, subWeeks, isToday 
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ArrowLeft, Clock, Play, ExternalLink, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// --- Types ---
type EventCategory = 'Execution Session' | 'Quick Reminder' | 'Task Deadline' | 'Completed';

interface CalendarEvent {
  id: string;
  title: string;
  dateStr: string; // "YYYY-MM-DD"
  category: EventCategory;
  durationMinutes?: number;
  relatedTaskTitle?: string;
  goals?: string[];
  taskId?: string;
}

const getCategoryStyles = (category: EventCategory) => {
  switch(category) {
    case 'Execution Session': return 'bg-purple-100 text-purple-800 border-purple-200 shadow-sm';
    case 'Quick Reminder': return 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm';
    case 'Task Deadline': return 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm';
    case 'Completed': return 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-70';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCategoryColorHex = (category: EventCategory) => {
  switch(category) {
    case 'Execution Session': return '#a855f7'; // purple-500
    case 'Quick Reminder': return '#f59e0b'; // amber-500
    case 'Task Deadline': return '#f43f5e'; // rose-500
    case 'Completed': return '#9ca3af'; // gray-400
    default: return '#9ca3af';
  }
};

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [expandedDayStr, setExpandedDayStr] = useState<string | null>(null);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/tasks?userId=${user.uid}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const handleCompleteReminder = async (taskId: string) => {
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      fetchTasks(); // Refresh after completing
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const events = useMemo(() => {
    const list: CalendarEvent[] = [];
    tasks.forEach(task => {
      const isCompleted = task.status === 'completed';
      
      if (task.taskType === 'REMINDER') {
        list.push({
          id: task.id,
          title: task.title,
          dateStr: task.deadline,
          category: isCompleted ? 'Completed' : 'Quick Reminder',
          taskId: task.id
        });
      } else {
        // AI Execution Task
        // Deadline
        list.push({
          id: `deadline-${task.id}`,
          title: task.title, // ' Deadline' will be inferred by category
          dateStr: task.deadline,
          category: isCompleted ? 'Completed' : 'Task Deadline',
          taskId: task.id,
          relatedTaskTitle: task.title
        });

        // Sessions
        if (task.analysis?.scheduleDetails?.executionSessions) {
          task.analysis.scheduleDetails.executionSessions.forEach((session: any, idx: number) => {
            // Note: If task is completed, we mark sessions as completed too.
            // A more complex app might track session status individually.
            list.push({
              id: `session-${task.id}-${idx}`,
              title: session.sessionTitle,
              dateStr: session.scheduledDate,
              category: isCompleted ? 'Completed' : 'Execution Session',
              durationMinutes: session.durationMinutes,
              relatedTaskTitle: task.title,
              taskId: task.id,
              goals: session.includedTasks || []
            });
          });
        }
      }
    });
    return list;
  }, [tasks]);

  // Time grid parameters
  const START_HOUR = 0;
  const END_HOUR = 23; 
  const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  // --- Navigation Handlers ---
  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-gray-900 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Top Header */}
      <header className="flex-none bg-[#f8fafe] px-6 py-4 flex flex-col gap-4 border-b border-gray-200/50">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-xl shadow-sm border border-gray-100 transition-colors">
              <ArrowLeft size={18} />
            </button>
            
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight min-w-[160px]">
                {format(currentDate, 'MMMM yyyy')}
              </h1>
              <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                <button onClick={handleToday} className="px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  Today
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button onClick={handlePrevWeek} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={handleNextWeek} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 ml-[60px] text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            Execution Session
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            Quick Reminder
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            Deadline
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
            Completed
          </div>
        </div>
      </header>

      {/* Main Calendar Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#f0f4f8]">
        
        {/* Week Strip (Days Header) */}
        <div className="flex-none flex ml-[72px] pr-4 border-b border-gray-200/50 bg-[#f8fafe]">
          {weekDays.map((day, idx) => {
            const today = isToday(day);
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => e.dateStr === dayStr);
            const pendingCount = dayEvents.filter(e => e.category !== 'Completed').length;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center py-4 relative group cursor-pointer" onClick={() => setExpandedDayStr(dayStr)}>
                <div className={`
                  flex items-baseline gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300
                  ${today ? 'bg-[#dafb6c] text-[#1c2c06] shadow-sm' : 'text-gray-500 group-hover:bg-gray-100'}
                `}>
                  <span className="text-sm font-bold uppercase tracking-wider">{format(day, 'EEE')}</span>
                  <span className="text-2xl font-black">{format(day, 'dd')}</span>
                </div>
                
                {/* Pending Badge */}
                {pendingCount > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    • {pendingCount} {pendingCount === 1 ? 'Item' : 'Items'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Planned Sessions Lane (Top Stacked Layout) */}
        <div className="flex-none flex ml-[72px] pr-4 bg-white border-b border-gray-200/50 shadow-sm relative z-10 min-h-[80px]">
          {weekDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => e.dateStr === dayStr);
            
            const isExpanded = expandedDayStr === dayStr;
            const maxVisible = 3;
            const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, maxVisible);
            const hiddenCount = dayEvents.length - maxVisible;

            return (
              <div key={idx} className={`flex-1 border-r border-gray-100/50 p-2 flex flex-col gap-1.5 relative ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                {visibleEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`
                      px-2 py-1.5 rounded-lg border text-[10px] leading-tight cursor-pointer
                      transition-all hover:-translate-y-0.5 hover:shadow-md truncate
                      ${getCategoryStyles(event.category)}
                    `}
                    title={event.title}
                  >
                    <span className="font-bold truncate block">{event.title}</span>
                    {event.durationMinutes && (
                      <span className="opacity-70 mt-0.5 block">{event.durationMinutes} min</span>
                    )}
                  </div>
                ))}
                
                {!isExpanded && hiddenCount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedDayStr(dayStr); }}
                    className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 py-1 rounded transition-colors text-center mt-1"
                  >
                    + {hiddenCount} more
                  </button>
                )}
                
                {isExpanded && hiddenCount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedDayStr(null); }}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-700 py-1 rounded transition-colors text-center mt-1"
                  >
                    Show less
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Grid (Scrollable) - Empty for now, reserved for future */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-4 pl-0">
          <div className="flex relative">
            
            {/* Time Labels Column */}
            <div className="w-[72px] flex-none flex flex-col items-end pr-4 text-xs font-bold text-gray-400">
              {HOURS.map((hour) => (
                <div key={hour} className="relative w-full h-[80px] -mt-2 text-right">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a').toLowerCase()}
                </div>
              ))}
            </div>

            {/* Grid Columns container */}
            <div className="flex-1 relative bg-white/50 rounded-3xl border border-gray-100 overflow-hidden ml-2 flex">
              
              {/* Background horizontal hour lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-[80px] border-b border-gray-100 w-full" />
                ))}
              </div>

              {/* Empty Day Columns (for future drag & drop) */}
              {weekDays.map((day, dayIdx) => (
                <div key={dayIdx} className={`flex-1 relative border-r border-gray-100/50 ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                  {/* Empty space ready for exact-time layout */}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Event Detail Popover Overlay */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 relative overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Decorative top color bar */}
              <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: getCategoryColorHex(selectedEvent.category) }} />

              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mt-2 mb-4">
                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${getCategoryStyles(selectedEvent.category)}`}>
                  {selectedEvent.category}
                </span>
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-6 pr-8 leading-tight">
                {selectedEvent.title}
              </h3>

              <div className="space-y-4">
                
                {/* Standard Data */}
                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold">{selectedEvent.dateStr ? format(parseISO(selectedEvent.dateStr), 'EEEE, MMMM d, yyyy') : 'No Date'}</p>
                    {selectedEvent.durationMinutes && (
                      <p className="text-xs">{selectedEvent.durationMinutes} minutes</p>
                    )}
                  </div>
                </div>

                {/* Conditional Data based on type */}
                {selectedEvent.relatedTaskTitle && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Related Task</p>
                    <p className="text-sm font-bold text-gray-800">{selectedEvent.relatedTaskTitle}</p>
                  </div>
                )}

                {selectedEvent.goals && selectedEvent.goals.length > 0 && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-2">Today's Goals</p>
                    <ul className="space-y-1">
                      {selectedEvent.goals.map((goal, idx) => (
                        <li key={idx} className="text-sm font-medium text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span> {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Call to Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  {selectedEvent.category === 'Execution Session' && (
                    <button className="w-full py-3 bg-gray-900 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 group shadow-md">
                      <Play size={16} className="group-hover:scale-110 transition-transform" />
                      Start Session
                    </button>
                  )}

                  {selectedEvent.category === 'Quick Reminder' && selectedEvent.taskId && (
                    <button 
                      onClick={() => handleCompleteReminder(selectedEvent.taskId!)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                      <CheckCircle size={16} />
                      Mark Complete
                    </button>
                  )}

                  {selectedEvent.category === 'Task Deadline' && selectedEvent.taskId && (
                    <button 
                      onClick={() => navigate(`/task/${selectedEvent.taskId}`)}
                      className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Open Task
                    </button>
                  )}

                  {selectedEvent.category === 'Completed' && (
                    <button disabled className="w-full py-3 bg-gray-100 text-gray-400 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      <CheckCircle size={16} />
                      Completed
                    </button>
                  )}
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Calendar;
