import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Play, Pause, CheckCircle, Clock, X, StopCircle, RefreshCw, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReflectionModal from '../components/ReflectionModal';

type Technique = 'Pomodoro' | 'Deep Work' | '52/17' | 'Quick Focus' | 'Continuous Focus';
type TimerPhase = 'idle' | 'work' | 'break';

const TECHNIQUES: Record<Technique, { work: number; break: number }> = {
  'Pomodoro': { work: 25 * 60, break: 5 * 60 },
  'Deep Work': { work: 60 * 60, break: 0 },
  '52/17': { work: 52 * 60, break: 17 * 60 },
  'Quick Focus': { work: 0, break: 0 }, // Dynamic based on session duration
  'Continuous Focus': { work: 0, break: 0 } // Dynamic based on session duration
};

const EARLY_REASONS = [
  'The task was easier than expected',
  'I was highly focused',
  'I had prior knowledge or preparation',
  'The estimated duration was too high',
  'Other'
];

const FocusMode: React.FC = () => {
  const { taskId, sessionId } = useParams<{ taskId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [sessionIndex, setSessionIndex] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Timer State
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  // Progress State
  const [accumulatedWorkTime, setAccumulatedWorkTime] = useState(0);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);
  const [cycleCount, setCycleCount] = useState(1);

  // Notes State
  const [notes, setNotes] = useState('');
  
  // Modals & Initialization States
  const [showFinishEarly, setShowFinishEarly] = useState(false);
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  
  // Reflection State
  const [earlyReason, setEarlyReason] = useState<string>('');
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // General Reflection State
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionMandatory, setReflectionMandatory] = useState(false);
  const [reflectionSubmitting, setReflectionSubmitting] = useState(false);

  // Persistence prompt
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<any>(null);

  // Refs for autosave
  const stateRef = useRef({
    accumulatedWorkTime,
    notes,
    technique,
    cycleCount,
    phase,
    timeLeft,
    isRunning,
    status: 'In Progress'
  });

  useEffect(() => {
    stateRef.current = {
      accumulatedWorkTime, notes, technique, cycleCount, phase, timeLeft, isRunning,
      status: phase === 'idle' ? 'Pending' : 'In Progress'
    };
  }, [accumulatedWorkTime, notes, technique, cycleCount, phase, timeLeft, isRunning]);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        if (!user?.uid) return;
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/tasks?userId=${user.uid}`);
        const data = await response.json();
        
        if (data.success) {
          const foundTask = data.tasks.find((t: any) => t.id === taskId);
          if (foundTask) {
            setTask(foundTask);
            const sessions = foundTask.analysis?.scheduleDetails?.executionSessions || [];
            setTotalSessions(sessions.length);
            
            const idx = sessions.findIndex((s: any) => s.sessionId === sessionId || sessions.indexOf(s).toString() === sessionId);
            if (idx !== -1) {
              const sess = sessions[idx];
              setSession(sess);
              setSessionIndex(idx);
              setNotes(sess.notes || '');
              
              const requiredSeconds = (sess.durationMinutes || 60) * 60;
              setSessionDurationSeconds(requiredSeconds);
              setAccumulatedWorkTime(sess.accumulatedTime || 0);

              const sessionStatus = sess.status || (sess.isCompleted ? 'COMPLETED' : 'PENDING');

              // Check if session is already in progress and has valid saved state
              if (sessionStatus === 'IN_PROGRESS' || (sess.status === 'In Progress' && sess.technique)) {
                setSavedSessionData(sess);
                setShowRestorePrompt(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching task for focus mode:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [user, taskId, sessionId]);

  const saveProgressToBackend = useCallback(async (overrides: any = {}) => {
    if (!taskId || (!session?.sessionId && !sessionId)) return;
    
    const currentState = { ...stateRef.current, ...overrides };
    if (currentState.status === 'Pending' && !overrides.status) return;

    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: currentState.notes,
          accumulatedTime: currentState.accumulatedWorkTime,
          technique: currentState.technique,
          cycleCount: currentState.cycleCount,
          timerPhase: currentState.phase,
          timeLeft: currentState.timeLeft
        })
      });
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }, [taskId, session, sessionId]);

  useEffect(() => {
    if (phase === 'idle') return;
    const interval = setInterval(() => {
      saveProgressToBackend();
    }, 60000); 
    return () => clearInterval(interval);
  }, [phase, saveProgressToBackend]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase !== 'idle') {
        saveProgressToBackend();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase, saveProgressToBackend]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (phase === 'work') {
          setAccumulatedWorkTime(prev => prev + 1);
        }
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      handlePhaseComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, phase]);

  const handlePhaseComplete = () => {
    if (!technique) return;
    const config = TECHNIQUES[technique];
    
    if (phase === 'work') {
      if (config.break > 0) {
        setPhase('break');
        setTimeLeft(config.break);
      } else {
        setCycleCount(c => c + 1);
        setTimeLeft(config.work);
      }
    } else if (phase === 'break') {
      setPhase('work');
      setCycleCount(c => c + 1);
      setTimeLeft(config.work);
    }
    setTimeout(() => saveProgressToBackend(), 0);
  };

  const handleRestore = (choice: 'continue' | 'restart') => {
    if (choice === 'continue' && savedSessionData) {
      setTechnique(savedSessionData.technique as Technique);
      setPhase(savedSessionData.timerPhase as TimerPhase);
      setTimeLeft(savedSessionData.timeLeft);
      setCycleCount(savedSessionData.cycleCount || 1);
      setAccumulatedWorkTime(savedSessionData.accumulatedTime || 0);
      setNotes(savedSessionData.notes || '');
      setIsRunning(false); 
      setShowRestorePrompt(false);
    } else {
      setTechnique(null);
      setPhase('idle');
      setTimeLeft(0);
      setCycleCount(1);
      setAccumulatedWorkTime(0);
      setNotes('');
      setIsRunning(false);
      setShowRestorePrompt(false);
      saveProgressToBackend({
        notes: '', accumulatedWorkTime: 0, status: 'Pending',
        technique: null, cycleCount: 1, phase: 'idle', timeLeft: 0, isRunning: false
      });
    }
  };

  const startSessionWithTechnique = async (t: Technique) => {
    setTechnique(t);
    setPhase('work');
    
    let initialTime = TECHNIQUES[t].work;
    if (t === 'Quick Focus' || t === 'Continuous Focus') {
      initialTime = sessionDurationSeconds;
    }
    
    setTimeLeft(initialTime);
    setCycleCount(1);
    setIsRunning(true);
    
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      saveProgressToBackend({ technique: t, phase: 'work', timeLeft: initialTime, cycleCount: 1, status: 'IN_PROGRESS' });
    } catch (e) {
      console.error('Failed to start session lifecycle', e);
    }
  };

  const toggleTimer = async () => {
    if (phase === 'idle') return;
    const nextRunningState = !isRunning;
    setIsRunning(nextRunningState);
    
    const endpoint = nextRunningState ? 'resume' : 'pause';
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      saveProgressToBackend();
    } catch (e) {
      console.error(`Failed to ${endpoint} session lifecycle`, e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Completion logic
  const canComplete = accumulatedWorkTime >= sessionDurationSeconds;

  const sessionDurationMinutes = session?.durationMinutes || 60;
  const minFocusRequired = sessionDurationMinutes <= 60 ? (15 * 60) : (sessionDurationSeconds * 0.25);
  const canFinishEarly = accumulatedWorkTime >= minFocusRequired;

  const performCompletion = async (method: 'full' | 'early', additionalData: any = {}) => {
    if (!taskId || (!session?.sessionId && !sessionId)) return;
    setIsCompleting(true);
    
    if (isRunning) {
      try {
        await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/pause`, { method: 'POST' });
      } catch (e) {}
    }

    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes, 
          accumulatedTime: accumulatedWorkTime,
          completionMethod: method,
          ...additionalData
        })
      });
      
      setIsCompleting(false);
      setReflectionMandatory(false);
      setShowReflectionModal(true);
    } catch (error) {
      console.error('Failed to complete session:', error);
      setIsCompleting(false);
    }
  };

  const handleFullComplete = () => performCompletion('full');

  const handleEarlyComplete = async () => {
    if (!earlyReason) return;
    
    let attachmentMetadata = null;
    
    if (attachmentFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', attachmentFile);
      formData.append('taskId', taskId || '');
      formData.append('sessionId', session?.sessionId || sessionId || '');
      
      try {
        const uploadRes = await fetch('http://localhost:5000/api/uploads', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          attachmentMetadata = uploadData.metadata;
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploading(false);
      }
    }

    performCompletion('early', {
      earlyCompletionReason: earlyReason,
      reflectionNotes,
      referenceLink,
      attachment: attachmentMetadata
    });
  };

  const handleSaveProgress = async () => {
    setIsSavingProgress(true);
    if (isRunning) {
      try {
        await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/pause`, { method: 'POST' });
      } catch (e) {}
    }
    await saveProgressToBackend();
    navigate('/dashboard');
  };

  const handleCancelSession = async () => {
    if (!taskId || (!session?.sessionId && !sessionId)) return;
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/sessions/${session?.sessionId || sessionId}/cancel`, {
        method: 'POST'
      });
      setReflectionMandatory(true);
      setShowReflectionModal(true);
      setShowFinishEarly(false);
    } catch (e) {
      console.error('Failed to cancel session', e);
    }
  };

  const handleReflectionSubmit = async (data: any) => {
    if (!user) return;
    setReflectionSubmitting(true);
    try {
      await fetch(`http://localhost:5000/api/reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          taskId,
          sessionId: session?.sessionId || sessionId,
          ...data
        })
      });
    } catch (e) {
      console.error('Reflection submission failed', e);
    } finally {
      setReflectionSubmitting(false);
      setShowReflectionModal(false);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f3f6f9] flex items-center justify-center font-bold text-gray-500">Loading Focus Mode...</div>;
  }

  if (!task || !session) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-bold">Session not found.</p>
        <button onClick={() => navigate('/dashboard')} className="text-indigo-600 font-bold">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900 font-sans flex flex-col items-center py-10 px-4 relative">
      
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <button 
          onClick={() => {
            if (phase !== 'idle') {
              setIsRunning(false);
              setShowFinishEarly(true);
            } else {
              navigate(-1);
            }
          }} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors"
        >
          <ArrowLeft size={20} />
          {phase === 'idle' ? 'Exit' : 'End Session'}
        </button>
        <div className="text-xs font-bold text-gray-400 tracking-widest uppercase px-4 py-1.5 bg-gray-100 rounded-full border border-gray-200">
          Session {sessionIndex + 1} of {totalSessions}
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/50">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight mb-2">
              {task.title}
            </h1>
            <span className="text-xl font-bold text-gray-500 mb-4 block">
              {session.sessionTitle}
            </span>
            <div className="flex gap-4 items-center text-sm font-bold text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock size={16} />
                {session.scheduledDate ? format(parseISO(session.scheduledDate), 'MMM d, yyyy') : 'No Date'}
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <div>Target: {session.durationMinutes} mins</div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/50">
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-500 rounded-full" />
              Today's Goal
            </h2>
            {session.tasks && session.tasks.length > 0 ? (
              <ul className="space-y-3">
                {session.tasks.map((t: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-none mt-0.5 border border-indigo-100">
                      <span className="text-[10px] font-black">{i + 1}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 leading-tight">{t.title}</p>
                      {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No specific milestones for this block.</p>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/50 flex flex-col flex-1">
            <h2 className="text-lg font-black text-gray-900 mb-4">Session Notes</h2>
            <textarea 
              className="w-full flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none font-medium text-gray-800"
              placeholder="Jot down important thoughts, discoveries, or where you left off..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          {(() => {
            const sessionStatus = session.status || (session.isCompleted ? 'COMPLETED' : 'PENDING');
            if (sessionStatus === 'COMPLETED') {
              return (
                <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col items-center justify-center text-center min-h-[400px] shadow-sm">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-900 mb-2">Session Completed</h3>
                  <p className="text-emerald-700/80 font-medium mb-8">Great job! You accumulated {Math.floor((session.accumulatedTime || accumulatedWorkTime) / 60)} minutes of focus time.</p>
                  
                  {session.completionMethod === 'early' && (
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 w-full mb-4 shadow-sm text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Finished Early</p>
                      <p className="text-sm font-medium text-emerald-900">{session.earlyCompletionReason}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-colors shadow-lg shadow-emerald-200"
                  >
                    Return to Dashboard
                  </button>
                </div>
              );
            }

            return (
              <>
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-900/5 border border-gray-100 flex flex-col relative overflow-hidden min-h-[400px]">
                  {phase === 'idle' ? (
                    <div className="flex flex-col h-full justify-center">
                
                {/* Dynamic Selection Logic */}
                {(() => {
                  const durationMins = Math.round(sessionDurationSeconds / 60);

                  // ≤ 20 mins: Quick Focus
                  if (durationMins <= 20) {
                    return (
                      <div className="text-center space-y-6">
                        <h3 className="text-2xl font-black text-gray-900">Quick Focus Session</h3>
                        <p className="text-gray-500 font-medium">This is a short block. We've simplified the interface so you can jump straight into a continuous flow.</p>
                        <button onClick={() => startSessionWithTechnique('Quick Focus')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-colors shadow-lg shadow-indigo-200">
                          Start Timer
                        </button>
                      </div>
                    );
                  }

                  // 20-45 mins: Pomodoro vs Continuous Focus
                  if (durationMins > 20 && durationMins <= 45) {
                    return (
                      <>
                        <h3 className="text-xl font-black text-gray-900 mb-6 text-center">Choose Technique</h3>
                        <div className="space-y-3">
                          <button onClick={() => startSessionWithTechnique('Continuous Focus')} className="w-full p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 text-left transition-colors relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">⭐ Recommended</div>
                            <h4 className="font-black text-indigo-900 text-lg">Continuous Focus</h4>
                            <p className="text-sm font-medium text-indigo-700">One single block, no forced breaks.</p>
                          </button>
                          <button onClick={() => startSessionWithTechnique('Pomodoro')} className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 text-left transition-colors group">
                            <h4 className="font-black text-gray-800 text-lg group-hover:text-gray-900">Pomodoro</h4>
                            <p className="text-sm font-medium text-gray-500">25m work / 5m break</p>
                          </button>
                        </div>
                      </>
                    );
                  }

                  // > 45 mins: Deep Tasks
                  return (
                    <>
                      <h3 className="text-xl font-black text-gray-900 mb-6 text-center">Choose Technique</h3>
                      {durationMins > 90 && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-sm font-bold text-amber-800 text-center">
                            Buddy AI recommends splitting this extensive block into multiple smaller execution sessions in the Modify Plan menu for better focus.
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        <button onClick={() => startSessionWithTechnique('Pomodoro')} className="w-full p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 text-left transition-colors relative group">
                          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">⭐ Recommended</div>
                          <h4 className="font-black text-indigo-900 text-lg">Pomodoro</h4>
                          <p className="text-sm font-medium text-indigo-700">25m work / 5m break</p>
                        </button>
                        <button onClick={() => startSessionWithTechnique('52/17')} className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 text-left transition-colors group">
                          <h4 className="font-black text-gray-800 text-lg">52/17 Rule</h4>
                          <p className="text-sm font-medium text-gray-500">52m work / 17m break</p>
                        </button>
                        <button onClick={() => startSessionWithTechnique('Deep Work')} className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 text-left transition-colors group">
                          <h4 className="font-black text-gray-800 text-lg">Deep Work</h4>
                          <p className="text-sm font-medium text-gray-500">Continuous focus</p>
                        </button>
                      </div>
                    </>
                  );
                })()}

              </div>
            ) : (
              <div className="flex flex-col h-full relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${phase === 'work' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {phase === 'work' ? 'Focusing' : 'Break Time'}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {(technique === 'Quick Focus' || technique === 'Continuous Focus') ? technique : `Cycle ${cycleCount}`}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className={`text-7xl font-black tracking-tighter tabular-nums transition-colors duration-300 ${isRunning ? (phase === 'work' ? 'text-indigo-600' : 'text-emerald-500') : 'text-gray-800'}`}>
                    {formatTime(timeLeft)}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-8">
                    <button 
                      onClick={toggleTimer}
                      className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                        isRunning ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-900 text-white hover:bg-black'
                      }`}
                    >
                      {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsRunning(false);
                        setShowFinishEarly(true);
                      }}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-rose-500 transition-colors"
                      title="End Session"
                    >
                      <StopCircle size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-500">Accumulated Focus</span>
              <span className="text-sm font-black text-indigo-600">{Math.floor(accumulatedWorkTime / 60)} / {session.durationMinutes} min</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${canComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, (accumulatedWorkTime / sessionDurationSeconds) * 100)}%` }}
              />
            </div>
            {canComplete && (
              <p className="text-xs font-bold text-emerald-600 mt-3 text-center">Required focus time achieved!</p>
            )}
          </div>

                <button 
                  onClick={handleFullComplete}
                  disabled={!canComplete || isCompleting || session.isCompleted}
                  className={`
                    w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl
                    ${session.isCompleted 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' 
                      : !canComplete
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                        : isCompleting 
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-500/20 hover:-translate-y-1'
                    }
                  `}
                >
                  <CheckCircle size={24} />
                  {isCompleting ? 'Completing...' : session.isCompleted ? 'Completed' : 'Mark Session Complete'}
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Restore Prompt Modal */}
      <AnimatePresence>
        {showRestorePrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-2">Session In Progress</h3>
              <p className="text-gray-500 font-medium mb-8">You previously started this session using the <strong className="text-gray-800">{savedSessionData?.technique}</strong> technique and accumulated <strong className="text-gray-800">{Math.floor((savedSessionData?.accumulatedTime || 0) / 60)} minutes</strong> of focus time.</p>
              
              <div className="space-y-3">
                <button onClick={() => handleRestore('continue')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Play size={20} /> Continue Session
                </button>
                <button onClick={() => { if (window.confirm("Are you sure you want to restart? All elapsed progress in this block will be lost.")) handleRestore('restart'); }} className="w-full py-4 bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-gray-600 hover:text-rose-600 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
                  <RefreshCw size={20} /> Restart Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish Early / Reflection Modal */}
      <AnimatePresence>
        {showFinishEarly && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative my-8"
            >
              <button onClick={() => { setShowFinishEarly(false); setShowReflectionForm(false); }} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              
              {!showReflectionForm ? (
                <>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">End Session</h3>
                  <p className="text-gray-500 font-medium mb-8">How would you like to proceed?</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        if (canFinishEarly) setShowReflectionForm(true);
                      }}
                      className={`w-full py-4 font-bold rounded-2xl transition-colors flex items-center justify-between px-6 ${
                        canFinishEarly 
                        ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 cursor-pointer'
                        : 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-left">
                        <span className={`block ${canFinishEarly ? 'text-emerald-900' : 'text-gray-500'}`}>I finished the work early</span>
                        <span className="text-xs font-medium opacity-80">
                          {canFinishEarly ? 'Proceed to quick reflection' : 'Spend a little more time on this session before finishing early.'}
                        </span>
                      </span>
                      {canFinishEarly && <CheckCircle size={20} />}
                    </button>
                    
                    <button 
                      onClick={handleSaveProgress}
                      disabled={isSavingProgress}
                      className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-2xl transition-colors flex items-center justify-between px-6"
                    >
                      <span className="text-left">
                        <span className="block text-indigo-900">Save as In Progress</span>
                        <span className="text-xs font-medium opacity-80">I will resume this session later</span>
                      </span>
                      <Pause size={20} />
                    </button>

                    <button 
                      onClick={handleCancelSession}
                      className="w-full py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-2xl transition-colors flex items-center justify-between px-6"
                    >
                      <span className="text-left">
                        <span className="block text-rose-900">Cancel Session</span>
                        <span className="text-xs font-medium opacity-80">This block didn't work out.</span>
                      </span>
                      <X size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Quick Reflection</h3>
                  <p className="text-gray-500 font-medium mb-6">How were you able to finish earlier than planned?</p>
                  
                  <div className="space-y-3 mb-8">
                    {EARLY_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => setEarlyReason(reason)}
                        className={`w-full text-left px-5 py-3 rounded-xl border-2 font-bold transition-all ${
                          earlyReason === reason 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200 hover:bg-gray-50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Optional Notes</label>
                      <textarea 
                        className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm font-medium"
                        placeholder="Describe what helped..."
                        rows={2}
                        value={reflectionNotes}
                        onChange={(e) => setReflectionNotes(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Reference Link (Optional)</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="url"
                          className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-3 border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                          placeholder="https://github.com/..."
                          value={referenceLink}
                          onChange={(e) => setReferenceLink(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Attachment (Optional)</label>
                      <div className="relative flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-6 h-6 mb-2 text-gray-400" />
                            <p className="text-xs text-gray-500 font-bold">
                              {attachmentFile ? attachmentFile.name : 'Click to upload supporting file'}
                            </p>
                          </div>
                          <input type="file" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleEarlyComplete}
                    disabled={!earlyReason || uploading || isCompleting}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? 'Uploading...' : isCompleting ? 'Completing...' : 'Mark Session Complete'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReflectionModal
        isOpen={showReflectionModal}
        onClose={() => {
          setShowReflectionModal(false);
          navigate('/dashboard');
        }}
        onSubmit={handleReflectionSubmit}
        isMandatory={reflectionMandatory}
        isSubmitting={reflectionSubmitting}
      />
    </div>
  );
};

export default FocusMode;
