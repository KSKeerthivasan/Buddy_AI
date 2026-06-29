import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { WeeklyCommitment, DayOfWeek, CommitmentCategory } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trash2, MapPin, Power } from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const CATEGORY_COLORS: Record<string, string> = {
  Education: 'bg-blue-100 border-blue-300 text-blue-900',
  Work: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  Health: 'bg-green-100 border-green-300 text-green-900',
  Personal: 'bg-purple-100 border-purple-300 text-purple-900',
  Travel: 'bg-orange-100 border-orange-300 text-orange-900',
  Other: 'bg-gray-100 border-gray-300 text-gray-900',
};

export default function Commitments() {
  const { user } = useAuth();
  const [commitments, setCommitments] = useState<WeeklyCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CommitmentCategory>('Other');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);

  // Duplicate Modal State
  const [duplicateOpen, setDuplicateOpen] = useState<string | null>(null);
  const [targetDay, setTargetDay] = useState<DayOfWeek>('Tuesday');

  useEffect(() => {
    if (user) {
      fetchCommitments();
    }
  }, [user]);

  const fetchCommitments = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5000/api/commitments/${user.uid}`);
      const data = await res.json();
      if (data.success) {
        setCommitments(data.commitments);
      }
    } catch (err) {
      console.error('Failed to load commitments:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (day: DayOfWeek, hour: number) => {
    setEditingId(null);
    setTitle('');
    setCategory('Other');
    setDayOfWeek(day);
    setStartTime(`${hour.toString().padStart(2, '0')}:00`);
    setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
    setLocation('');
    setEnabled(true);
    setIsRecurring(true);
    setModalOpen(true);
  };

  const openEditModal = (commitment: WeeklyCommitment) => {
    setEditingId(commitment.id);
    setTitle(commitment.title);
    setCategory(commitment.category);
    setDayOfWeek(commitment.dayOfWeek);
    setStartTime(commitment.startTime);
    setEndTime(commitment.endTime);
    setLocation(commitment.location || '');
    setEnabled(commitment.enabled);
    setIsRecurring(commitment.isRecurring);
    setModalOpen(true);
  };

  const saveCommitment = async () => {
    if (!user) return;
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      dayOfWeek,
      startTime,
      endTime,
      location: location.trim() || undefined,
      enabled,
      isRecurring
    };

    try {
      const url = editingId 
        ? `http://localhost:5000/api/commitments/${user.uid}/${editingId}`
        : `http://localhost:5000/api/commitments/${user.uid}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setModalOpen(false);
      fetchCommitments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteCommitment = async (id: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this commitment?')) return;
    try {
      await fetch(`http://localhost:5000/api/commitments/${user.uid}/${id}`, { method: 'DELETE' });
      fetchCommitments();
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };


  const handleDuplicate = async () => {
    if (!user || !duplicateOpen) return;
    const source = commitments.find(c => c.id === duplicateOpen);
    if (!source) return;

    const payload = {
      title: source.title,
      category: source.category,
      dayOfWeek: targetDay,
      startTime: source.startTime,
      endTime: source.endTime,
      location: source.location,
      enabled: source.enabled,
      isRecurring: source.isRecurring
    };

    try {
      const res = await fetch(`http://localhost:5000/api/commitments/${user.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
      } else {
        setDuplicateOpen(null);
        fetchCommitments();
      }
    } catch (err: any) {
      alert('Error duplicating: ' + err.message);
    }
  };

  const timeToPixels = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h + m / 60) * 64;
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="flex-1 bg-gray-50 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Weekly Commitments</h1>
            <p className="text-gray-500 mt-1">Manage your recurring schedule and fixed obligations.</p>
          </div>
        </div>

        {/* Grid Container */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto relative">
          <div className="min-w-[800px] border-b border-gray-100 bg-gray-50/80 flex sticky top-0 z-30">
            <div className="w-20 shrink-0 border-r border-gray-200"></div>
            {DAYS.map(day => (
              <div key={day} className="flex-1 py-3 text-center font-bold text-gray-700 text-sm border-r border-gray-200 last:border-0">
                {day}
              </div>
            ))}
          </div>

          <div className="min-w-[800px] relative bg-white">
            {/* Background Grid Lines */}
            {HOURS.map(hour => (
              <div key={hour} className="flex border-b border-gray-100 h-16 relative">
                <div className="w-20 shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-400">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {DAYS.map(day => (
                  <div 
                    key={day} 
                    className="flex-1 border-r border-gray-100 last:border-0 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                    onClick={() => openCreateModal(day, hour)}
                  />
                ))}
              </div>
            ))}

            {/* Render Blocks */}
            <div className="absolute inset-0 z-10 pointer-events-none flex" style={{ paddingLeft: '5rem' }}>
              {DAYS.map(day => {
                const dayCommitments = commitments.filter(c => c.dayOfWeek === day);
                return (
                  <div key={day} className="flex-1 relative border-r border-transparent">
                    {dayCommitments.map(c => {
                      const top = timeToPixels(c.startTime);
                      const height = timeToPixels(c.endTime) - top;
                      const colorClass = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other;
                      
                      return (
                        <div
                          key={c.id}
                          onClick={() => openEditModal(c)}
                          className={`absolute inset-x-1 border-l-4 rounded-md shadow-sm overflow-hidden pointer-events-auto cursor-pointer group transition-all hover:shadow-md ${colorClass} ${!c.enabled ? 'opacity-50 grayscale' : ''}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="px-2 py-1.5 flex flex-col h-full">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-bold truncate leading-tight group-hover:underline">{c.title}</span>
                              {!c.enabled && <Power size={12} className="opacity-50 shrink-0" />}
                            </div>
                            <span className="text-xs font-medium opacity-80 mt-0.5 truncate">{c.startTime} - {c.endTime}</span>
                            
                            {height >= 64 && c.location && (
                              <div className="mt-1 flex items-center gap-1 text-xs opacity-75 truncate">
                                <MapPin size={10} /> {c.location}
                              </div>
                            )}

                            {/* Quick Actions overlay */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white/80 rounded backdrop-blur-sm p-0.5 shadow-sm">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDuplicateOpen(c.id); setTargetDay(c.dayOfWeek); }}
                                className="p-1 hover:text-indigo-600 rounded" title="Duplicate"
                              ><Copy size={12}/></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Modal */}
      <AnimatePresence>
        {duplicateOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-4">Duplicate to...</h3>
              <select 
                value={targetDay}
                onChange={(e) => setTargetDay(e.target.value as DayOfWeek)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-6 font-medium focus:border-indigo-600 outline-none"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setDuplicateOpen(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDuplicate} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">Duplicate</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Commitment' : 'New Commitment'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full"><X size={20} /></button>
              </div>

              {error && <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-4">{error}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                  <input
                    type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. University Lecture"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                    <select
                      value={category} onChange={(e) => setCategory(e.target.value as CommitmentCategory)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium"
                    >
                      {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day</label>
                    <select
                      value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                    <input
                      type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                    <input
                      type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location (Optional)</label>
                  <input
                    type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Room 101, Gym"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-600 font-medium text-sm"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enabled} 
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                    />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                {editingId && (
                  <button 
                    onClick={() => deleteCommitment(editingId)}
                    className="px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={saveCommitment}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  Save Commitment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
