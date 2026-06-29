import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserProfileV2 } from '../types/profile';
import { Save, User, Clock, Target, CalendarDays, Moon, Sun, Briefcase } from 'lucide-react';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfileV2>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/profile/${user.uid}`);
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const updateSection = (section: keyof UserProfileV2, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Profile Settings</h1>
            <p className="text-gray-500 mt-1">Manage your persona, routine, and preferences.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">Profile successfully updated!</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Basic Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><User size={20} /></div>
              <h2 className="text-lg font-bold text-gray-900">Basic Info</h2>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Persona</label>
              <select 
                value={profile.basic?.persona || 'Student'}
                onChange={(e) => updateSection('basic', 'persona', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
              >
                <option value="Student">Student</option>
                <option value="Working Professional">Working Professional</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Entrepreneur">Entrepreneur</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
              <input 
                type="text" 
                value={profile.basic?.timezone || ''}
                readOnly
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-100 text-gray-500 font-medium outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Purpose Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Target size={20} /></div>
              <h2 className="text-lg font-bold text-gray-900">Primary Goal</h2>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">What's your primary goal right now?</label>
              <select 
                value={profile.purpose?.primaryGoal || 'Skill Development'}
                onChange={(e) => updateSection('purpose', 'primaryGoal', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
              >
                <option value="Placement">Placement</option>
                <option value="Higher Studies">Higher Studies</option>
                <option value="Startup">Startup</option>
                <option value="MBA">MBA</option>
                <option value="Research">Research</option>
                <option value="Skill Development">Skill Development</option>
                <option value="Financial Growth">Financial Growth</option>
                <option value="Personal Productivity">Personal Productivity</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {profile.purpose?.primaryGoal === 'Other' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Goal</label>
                <input 
                  type="text" 
                  value={profile.purpose?.customGoal || ''}
                  onChange={(e) => updateSection('purpose', 'customGoal', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Routine Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 md:col-span-2">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Sun size={20} /></div>
              <h2 className="text-lg font-bold text-gray-900">Daily Routine</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wake-up Time</label>
                <input 
                  type="time" 
                  value={profile.routine?.wakeUpTime || '07:00'}
                  onChange={(e) => updateSection('routine', 'wakeUpTime', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Time</label>
                <input 
                  type="time" 
                  value={profile.routine?.sleepTime || '23:00'}
                  onChange={(e) => updateSection('routine', 'sleepTime', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Morning Prep (m)</label>
                <input 
                  type="number" min="0" max="240"
                  value={profile.routine?.morningPrepMins || 0}
                  onChange={(e) => updateSection('routine', 'morningPrepMins', parseInt(e.target.value) || 0)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Commute (m)</label>
                <input 
                  type="number" min="0" max="240"
                  value={profile.routine?.commuteMins || 0}
                  onChange={(e) => updateSection('routine', 'commuteMins', parseInt(e.target.value) || 0)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lunch (m)</label>
                <input 
                  type="number" min="0" max="180"
                  value={profile.routine?.lunchMins || 0}
                  onChange={(e) => updateSection('routine', 'lunchMins', parseInt(e.target.value) || 0)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dinner (m)</label>
                <input 
                  type="number" min="0" max="180"
                  value={profile.routine?.dinnerMins || 0}
                  onChange={(e) => updateSection('routine', 'dinnerMins', parseInt(e.target.value) || 0)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Weekend Routine</label>
              <select 
                value={profile.routine?.weekendRoutine || 'Same as Weekdays'}
                onChange={(e) => updateSection('routine', 'weekendRoutine', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium mb-4 max-w-sm"
              >
                <option value="Same as Weekdays">Same as Weekdays</option>
                <option value="Different">Different</option>
              </select>
              
              {profile.routine?.weekendRoutine === 'Different' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Wake-up</label>
                    <input 
                      type="time" 
                      value={profile.routine?.weekendWakeUpTime || '09:00'}
                      onChange={(e) => updateSection('routine', 'weekendWakeUpTime', e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Sleep</label>
                    <input 
                      type="time" 
                      value={profile.routine?.weekendSleepTime || '23:30'}
                      onChange={(e) => updateSection('routine', 'weekendSleepTime', e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Planning Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 md:col-span-2">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Clock size={20} /></div>
              <h2 className="text-lg font-bold text-gray-900">Planning Preferences</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Max Daily Work Hours</label>
                  <span className="font-bold text-indigo-600">{profile.planning?.maxDailyWorkHours || 6} hrs</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="16" step="1"
                  value={profile.planning?.maxDailyWorkHours || 6}
                  onChange={(e) => updateSection('planning', 'maxDailyWorkHours', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Session Length</label>
                <select 
                  value={profile.planning?.preferredSessionLength || 60}
                  onChange={(e) => updateSection('planning', 'preferredSessionLength', parseInt(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                >
                  <option value={25}>25 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Break Style</label>
                <select 
                  value={profile.planning?.preferredBreakStyle || 'Pomodoro'}
                  onChange={(e) => updateSection('planning', 'preferredBreakStyle', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                >
                  <option value="Pomodoro">Pomodoro (25/5)</option>
                  <option value="52/17">52/17 Rule</option>
                  <option value="90/20">90/20 Block</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Planning</label>
                <select 
                  value={profile.planning?.weekendPlanning || 'Light Work'}
                  onChange={(e) => updateSection('planning', 'weekendPlanning', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                >
                  <option value="Allow Work">Allow Work</option>
                  <option value="Light Work">Light Work</option>
                  <option value="No Work">No Work</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
