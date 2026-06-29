import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { UserProfileV2, Persona, PrimaryGoal, WeekendRoutine, SessionLength, BreakStyle, WeekendPlanning } from '../types/profile';
import { CheckCircle2, ChevronRight, ChevronLeft, Briefcase, GraduationCap, Laptop, Sparkles, User as UserIcon } from 'lucide-react';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'persona', title: 'Persona' },
  { id: 'purpose', title: 'Purpose' },
  { id: 'routine', title: 'Routine' },
  { id: 'planning', title: 'Preferences' },
  { id: 'finish', title: 'Finish' }
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Partial<UserProfileV2>>({
    isOnboarded: true,
    basic: {
      name: user?.displayName || '',
      email: user?.email || '',
      persona: 'Student',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'English'
    },
    purpose: {
      primaryGoal: 'Skill Development'
    },
    routine: {
      wakeUpTime: '07:00',
      sleepTime: '23:00',
      morningPrepMins: 45,
      commuteMins: 30,
      lunchMins: 45,
      dinnerMins: 45,
      weekendRoutine: 'Same as Weekdays'
    },
    planning: {
      maxDailyWorkHours: 6,
      preferredSessionLength: 60,
      preferredBreakStyle: 'Pomodoro',
      weekendPlanning: 'Light Work'
    }
  });

  const updateSection = (section: keyof UserProfileV2, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  const nextStep = () => {
    setError(null);
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/profile/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  // --- RENDERING VARIOUS STEPS ---
  
  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
        <Sparkles size={40} />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Welcome to Buddy AI</h1>
      <p className="text-lg text-gray-600 max-w-md">Let's set up your profile so Buddy can make intelligent, personalized scheduling decisions just for you.</p>
      <div className="bg-blue-50 text-blue-800 text-sm font-medium py-3 px-6 rounded-xl inline-block mt-4 border border-blue-100">
        Takes less than 2 minutes
      </div>
    </div>
  );

  const renderPersona = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Who are you?</h2>
        <p className="text-gray-500">This helps Buddy tailor its communication and scheduling logic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Student', 'Working Professional', 'Freelancer', 'Entrepreneur', 'Other'].map(p => (
          <button
            key={p}
            onClick={() => updateSection('basic', 'persona', p)}
            className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              profile.basic?.persona === p 
                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-2 rounded-xl ${profile.basic?.persona === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
               {p === 'Student' && <GraduationCap size={20} />}
               {p === 'Working Professional' && <Briefcase size={20} />}
               {p === 'Freelancer' && <Laptop size={20} />}
               {p === 'Entrepreneur' && <Sparkles size={20} />}
               {p === 'Other' && <UserIcon size={20} />}
            </div>
            <span className="font-bold text-gray-900">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderPurpose = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your primary goal right now?</h2>
        <p className="text-gray-500">Buddy aligns your tasks with your long-term ambitions.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {['Placement', 'Higher Studies', 'Startup', 'MBA', 'Research', 'Skill Development', 'Financial Growth', 'Personal Productivity', 'Other'].map(g => (
          <button
            key={g}
            onClick={() => updateSection('purpose', 'primaryGoal', g)}
            className={`px-5 py-3 rounded-full font-bold text-sm border-2 transition-all ${
              profile.purpose?.primaryGoal === g 
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      
      {profile.purpose?.primaryGoal === 'Other' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Goal</label>
          <input
            type="text"
            placeholder="E.g., Learning to play guitar"
            value={profile.purpose?.customGoal || ''}
            onChange={(e) => updateSection('purpose', 'customGoal', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-indigo-600 focus:ring-0 outline-none"
          />
        </motion.div>
      )}
    </div>
  );

  const renderRoutine = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Daily Routine</h2>
        <p className="text-gray-500">So Buddy knows exactly when you're available.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wake-up Time</label>
          <input 
            type="time" 
            value={profile.routine?.wakeUpTime}
            onChange={(e) => updateSection('routine', 'wakeUpTime', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Time</label>
          <input 
            type="time" 
            value={profile.routine?.sleepTime}
            onChange={(e) => updateSection('routine', 'sleepTime', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Morning Prep (mins)</label>
          <input 
            type="number" 
            min="0" max="240"
            value={profile.routine?.morningPrepMins}
            onChange={(e) => updateSection('routine', 'morningPrepMins', parseInt(e.target.value) || 0)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">One-Way Commute (mins)</label>
          <input 
            type="number" 
            min="0" max="240"
            value={profile.routine?.commuteMins}
            onChange={(e) => updateSection('routine', 'commuteMins', parseInt(e.target.value) || 0)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Lunch Duration (mins)</label>
          <input 
            type="number" 
            min="0" max="180"
            value={profile.routine?.lunchMins}
            onChange={(e) => updateSection('routine', 'lunchMins', parseInt(e.target.value) || 0)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Dinner Duration (mins)</label>
          <input 
            type="number" 
            min="0" max="180"
            value={profile.routine?.dinnerMins}
            onChange={(e) => updateSection('routine', 'dinnerMins', parseInt(e.target.value) || 0)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none" 
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Weekend Routine</label>
        <div className="flex gap-4">
          {['Same as Weekdays', 'Different'].map(w => (
            <button
              key={w}
              onClick={() => updateSection('routine', 'weekendRoutine', w)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                profile.routine?.weekendRoutine === w 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      
      {profile.routine?.weekendRoutine === 'Different' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Wake-up</label>
            <input 
              type="time" 
              value={profile.routine?.weekendWakeUpTime || '09:00'}
              onChange={(e) => updateSection('routine', 'weekendWakeUpTime', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none bg-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Sleep</label>
            <input 
              type="time" 
              value={profile.routine?.weekendSleepTime || '23:30'}
              onChange={(e) => updateSection('routine', 'weekendSleepTime', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-600 outline-none bg-white" 
            />
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderPlanning = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Planning Preferences</h2>
        <p className="text-gray-500">How would you like Buddy to structure your work sessions?</p>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Max Daily Work Hours</label>
          <span className="font-bold text-indigo-600">{profile.planning?.maxDailyWorkHours} hrs</span>
        </div>
        <input 
          type="range" 
          min="1" max="16" step="1"
          value={profile.planning?.maxDailyWorkHours}
          onChange={(e) => updateSection('planning', 'maxDailyWorkHours', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
        />
        <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
          <span>1 hr</span>
          <span>16 hrs</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Preferred Session Length (mins)</label>
        <div className="flex gap-3">
          {[25, 45, 60, 90].map(s => (
            <button
              key={s}
              onClick={() => updateSection('planning', 'preferredSessionLength', s)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                profile.planning?.preferredSessionLength === s 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Break Style</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'Pomodoro', desc: '25m work / 5m break' },
            { id: '52/17', desc: '52m work / 17m break' },
            { id: '90/20', desc: '90m work / 20m break' },
            { id: 'Custom', desc: 'I will manage my own breaks' }
          ].map(b => (
            <button
              key={b.id}
              onClick={() => updateSection('planning', 'preferredBreakStyle', b.id)}
              className={`p-4 rounded-2xl text-left border-2 transition-all ${
                profile.planning?.preferredBreakStyle === b.id 
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`font-bold text-sm mb-1 ${profile.planning?.preferredBreakStyle === b.id ? 'text-indigo-900' : 'text-gray-900'}`}>{b.id}</div>
              <div className="text-xs text-gray-500">{b.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Weekend Planning</label>
        <div className="flex gap-3">
          {['Allow Work', 'Light Work', 'No Work'].map(w => (
            <button
              key={w}
              onClick={() => updateSection('planning', 'weekendPlanning', w)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                profile.planning?.weekendPlanning === w 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFinish = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 size={48} />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">You're all set!</h1>
      <p className="text-lg text-gray-600 max-w-md">Buddy has learned your preferences and is ready to build your intelligent schedule.</p>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium w-full mt-4">
          {error}
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={loading}
        className="w-full max-w-xs mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? 'Saving Profile...' : 'Go to Dashboard'}
      </button>
    </div>
  );

  const steps = [
    renderWelcome,
    renderPersona,
    renderPurpose,
    renderRoutine,
    renderPlanning,
    renderFinish
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      {/* Progress Bar */}
      {step > 0 && step < steps.length - 1 && (
        <div className="w-full max-w-2xl mb-8 flex items-center gap-2">
          {ONBOARDING_STEPS.slice(1, -1).map((s, idx) => (
            <div key={s.id} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${idx < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>
      )}

      {/* Main Card */}
      <motion.div 
        layout
        className="bg-white w-full max-w-2xl rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100"
      >
        <div className="p-8 md:p-12 min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[step]()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {step > 0 && step < steps.length - 1 && (
          <div className="px-8 md:px-12 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={prevStep}
              className="text-gray-500 hover:text-gray-900 font-semibold px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} /> Back
            </button>
            
            <button
              onClick={nextStep}
              className="bg-gray-900 hover:bg-black text-white font-bold px-8 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}
        
        {step === 0 && (
          <div className="px-8 md:px-12 py-6 bg-gray-50 border-t border-gray-100 flex justify-center">
             <button
              onClick={nextStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-3.5 rounded-xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
            >
              Get Started <ChevronRight size={20} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
