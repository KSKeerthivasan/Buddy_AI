import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Settings, X, Copy, Edit2, Trash2, StickyNote, Palette } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

export type ActivityCategory = 'Education' | 'Work' | 'Exercise' | 'Personal' | 'Travel' | 'Meal' | 'Other';

export type SchedulingType = 'FIXED' | 'FLEXIBLE' | 'FOCUS_BLOCK';

export interface ScheduleBlock {
  id?: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  activity: string;
  category: ActivityCategory;
  schedulingType?: SchedulingType;
  note?: string;
  colorOverride?: string;
  isPinned?: boolean;
}

export interface UserProfile {
  role: string;
  wakeUpTime: string;
  sleepTime: string;
  preferredFocusDuration: number;
  maxDailyWorkHours: number;
  planningPreferences: {
    allowWeekendScheduling: boolean;
    allowEveningSessions: boolean;
  };
  weeklySchedule: Record<string, ScheduleBlock[]>;
  activityStyles?: Record<string, { color: string }>;
}

export const resolveBlockColor = (activity: string, category: ActivityCategory, colorOverride?: string, profileStyles?: Record<string, { color: string }>) => {
  if (colorOverride) return colorOverride;
  if (profileStyles && profileStyles[activity]?.color) return profileStyles[activity].color;
  return CATEGORY_COLORS[category];
};

export const getSchedulingStyle = (type?: SchedulingType) => {
  if (type === 'FLEXIBLE') return 'border-dashed border-opacity-70';
  if (type === 'FOCUS_BLOCK') return 'ring-2 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] border-solid';
  return 'border-solid';
};

export const getSchedulingName = (type?: SchedulingType) => {
  if (type === 'FLEXIBLE') return 'Flexible Commitment';
  if (type === 'FOCUS_BLOCK') return 'Focus Block';
  return 'Fixed Commitment';
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VISIBLE_START = 6;
const VISIBLE_END = 23;
const HOURS = Array.from({ length: VISIBLE_END - VISIBLE_START }, (_, i) => i + VISIBLE_START); 

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  Education: 'bg-blue-100 text-blue-800 border-blue-200',
  Work: 'bg-purple-100 text-purple-800 border-purple-200',
  Exercise: 'bg-green-100 text-green-800 border-green-200',
  Personal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Travel: 'bg-orange-100 text-orange-800 border-orange-200',
  Meal: 'bg-red-100 text-red-800 border-red-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Preset colors for the Change Color feature
const PRESET_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-gray-100 text-gray-800 border-gray-200'
];

const getDefaultProfile = (): UserProfile => ({
  role: 'Student',
  wakeUpTime: '07:00',
  sleepTime: '23:00',
  preferredFocusDuration: 60,
  maxDailyWorkHours: 4,
  planningPreferences: {
    allowWeekendScheduling: true,
    allowEveningSessions: true
  },
  weeklySchedule: {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  }
});

const inferCategory = (name: string): ActivityCategory => {
  const lower = name.toLowerCase();
  if (lower.match(/class|lecture|study|java|math|college|school|university|assignment/)) return 'Education';
  if (lower.match(/work|meeting|office|job|client|shift/)) return 'Work';
  if (lower.match(/gym|workout|run|sports|football|basketball|yoga/)) return 'Exercise';
  if (lower.match(/lunch|dinner|breakfast|eat|meal/)) return 'Meal';
  if (lower.match(/commute|drive|travel|transit/)) return 'Travel';
  if (lower.match(/hobby|friends|family|chill|relax|read/)) return 'Personal';
  return 'Other';
};

type InteractionMode = 'none' | 'moving' | 'resizing-top' | 'resizing-bottom';

type CellData = {
  id: string;
  activity: string;
  category: ActivityCategory;
  schedulingType?: SchedulingType;
  note?: string;
  colorOverride?: string;
  isPinned?: boolean;
} | null;

const Availability: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  // 2D Array [Day][Hour] (hours 0-23)
  const [grid, setGrid] = useState<CellData[][]>(
    () => DAYS.map(() => Array(24).fill(null))
  );

  // Main Drag/Drop Interaction State
  const [interaction, setInteraction] = useState<{
    mode: InteractionMode;
    dayIdx: number | null;
    activityName: string | null;
    startHour: number | null;
    endHour: number | null; // inclusive
    grabOffset: number | null;
    currentDayIdx: number | null;
    currentHour: number | null;
  }>({
    mode: 'none', dayIdx: null, activityName: null, startHour: null, endHour: null, grabOffset: null, currentDayIdx: null, currentHour: null
  });

  // Duplicate Placement Mode
  const [placementMode, setPlacementMode] = useState<{
    block: NonNullable<CellData>;
    duration: number; // in hours
    currentDayIdx: number | null;
    currentStartHour: number | null;
  } | null>(null);

  // Modals and Menus
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [modalStart, setModalStart] = useState<number | null>(null);
  const [modalEnd, setModalEnd] = useState<number | null>(null);
  const [modalActivity, setModalActivity] = useState('');
  const [modalCategory, setModalCategory] = useState<ActivityCategory>('Other');
  const [modalSchedulingType, setModalSchedulingType] = useState<SchedulingType>('FIXED');
  const [modalNote, setModalNote] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ dayIdx: number, startHour: number, endHour: number, activity: string } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dayIdx: number;
    startHour: number;
    endHour: number;
    block: NonNullable<CellData>;
    showColors?: boolean;
  } | null>(null);

  const [selectedActivity, setSelectedActivity] = useState<{
    dayIdx: number;
    startHour: number;
    endHour: number;
    block: NonNullable<CellData>;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const response = await fetch(`http://localhost:5000/api/profile/${user.uid}`);
        const data = await response.json();
        
        const loadedProfile = getDefaultProfile();
        
        if (data.success && data.profile) {
          Object.keys(loadedProfile).forEach(key => {
            if (data.profile[key] !== undefined) {
              (loadedProfile as any)[key] = data.profile[key];
            }
          });
          
          if (data.profile.weeklySchedule) {
            loadedProfile.weeklySchedule = data.profile.weeklySchedule;
          } else if (data.profile.availability) {
             loadedProfile.weeklySchedule = data.profile.availability;
          }
        }
        
        if (!loadedProfile.weeklySchedule) loadedProfile.weeklySchedule = {};
        DAYS.forEach(day => {
          if (!loadedProfile.weeklySchedule[day] || !Array.isArray(loadedProfile.weeklySchedule[day])) {
            loadedProfile.weeklySchedule[day] = [];
          }
        });
        
        setProfile(loadedProfile);
        
        const newGrid = DAYS.map(() => Array(24).fill(null));
        DAYS.forEach((day, dIdx) => {
          const blocks = loadedProfile.weeklySchedule[day];
          console.log(`[DEBUG Load] ${day} has ${blocks.length} blocks`);
          blocks.forEach(block => {
            console.log(`[DEBUG Load] Block:`, block);
            const startStr = String(block.start);
            const endStr = String(block.end);
            const startHour = parseInt(startStr.includes(':') ? startStr.split(':')[0] : startStr, 10);
            const endHour = parseInt(endStr.includes(':') ? endStr.split(':')[0] : endStr, 10); 
            const cellId = block.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9));
            for (let h = startHour; h < endHour; h++) {
              if (h >= 0 && h < 24) {
                newGrid[dIdx][h] = { 
                  id: cellId,
                  activity: block.activity, 
                  category: block.category,
                  schedulingType: block.schedulingType || 'FIXED',
                  note: block.note,
                  colorOverride: block.colorOverride,
                  isPinned: block.isPinned
                };
              }
            }
          });
        });
        console.log('[DEBUG Load] Reconstructed Grid:', newGrid);
        setGrid(newGrid);

      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: keyof UserProfile['planningPreferences'], value: boolean) => {
    setProfile(prev => ({
      ...prev,
      planningPreferences: { ...prev.planningPreferences, [field]: value }
    }));
  };

  const getBlockSpan = (dayIdx: number, hour: number, activityId: string) => {
    let s = hour, e = hour;
    while (s > 0 && grid[dayIdx][s - 1]?.id === activityId) s--;
    while (e < 23 && grid[dayIdx][e + 1]?.id === activityId) e++;
    return { s, e };
  };

  // --- External Clicks for Menus / Modes ---
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setSelectedActivity(null);
    };
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setPlacementMode(null);
        setSelectedActivity(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  // --- Interactions ---

  const handleDoubleClick = (dayIdx: number, hour: number) => {
    if (placementMode) return; // Ignore while placing
    const cell = grid[dayIdx][hour];
    if (cell === null) {
      setModalMode('create');
      setModalDay(dayIdx);
      setModalStart(hour);
      setModalEnd(hour);
      setModalActivity('');
      setModalCategory('Other');
      setModalSchedulingType('FIXED');
      setModalNote('');
      setModalOpen(true);
    } else {
      const { s, e } = getBlockSpan(dayIdx, hour, cell.id);
      setModalMode('edit');
      setModalDay(dayIdx);
      setModalStart(s);
      setModalEnd(e);
      setModalActivity(cell.activity);
      setModalCategory(cell.category);
      setModalSchedulingType(cell.schedulingType || 'FIXED');
      setModalNote(cell.note || '');
      setModalOpen(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, dayIdx: number, hour: number, mode: InteractionMode) => {
    if (e.button !== 0 || placementMode) return; // Only left click and not placing
    if (mode === 'none') return;
    e.stopPropagation(); 
    
    const cell = grid[dayIdx][hour];
    if (!cell) return;
    
    const { s, e: endSpan } = getBlockSpan(dayIdx, hour, cell.id);
    
    setInteraction({
      mode,
      dayIdx,
      activityName: cell.activity, // Used for overlap self-check logic. 
      startHour: s,
      endHour: endSpan,
      grabOffset: hour - s,
      currentDayIdx: dayIdx,
      currentHour: hour
    });
  };

  const handleMouseEnter = (dayIdx: number, hour: number) => {
    if (placementMode) {
      setPlacementMode(prev => prev ? { ...prev, currentDayIdx: dayIdx, currentStartHour: hour } : null);
      return;
    }
    if (interaction.mode === 'none') return;
    setInteraction(prev => ({ ...prev, currentDayIdx: dayIdx, currentHour: hour }));
  };

  const handleContextMenu = (e: React.MouseEvent, dayIdx: number, hour: number) => {
    if (placementMode) return; // Ignore during placement
    e.preventDefault();
    e.stopPropagation();
    const cell = grid[dayIdx][hour];
    if (!cell) return;
    
    const { s, e: endSpan } = getBlockSpan(dayIdx, hour, cell.id);
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      dayIdx,
      startHour: s,
      endHour: endSpan,
      block: cell,
      showColors: false
    });
  };

  // Validate bounds (Overlap and Range)
  const isPlacementValid = (dayIdx: number, startH: number, endH: number, ignoreSelfName?: string) => {
    if (startH < VISIBLE_START || endH >= VISIBLE_END) return false;
    for (let h = startH; h <= endH; h++) {
      if (h >= 0 && h < 24) {
        const cell = grid[dayIdx][h];
        if (cell && (!ignoreSelfName || cell.activity !== ignoreSelfName)) {
          return false;
        }
      }
    }
    return true;
  };

  const getPreviewBounds = () => {
    if (interaction.mode === 'none' || interaction.currentDayIdx === null || interaction.currentHour === null || interaction.startHour === null || interaction.endHour === null) {
      return null;
    }
    
    let previewDay = interaction.currentDayIdx;
    let previewStart = interaction.startHour;
    let previewEnd = interaction.endHour;

    if (interaction.mode === 'moving') {
      const duration = interaction.endHour - interaction.startHour;
      previewStart = interaction.currentHour - (interaction.grabOffset || 0);
      previewEnd = previewStart + duration;
    } else if (interaction.mode === 'resizing-top') {
      previewDay = interaction.dayIdx!;
      previewStart = Math.min(interaction.currentHour, interaction.endHour);
    } else if (interaction.mode === 'resizing-bottom') {
      previewDay = interaction.dayIdx!;
      previewEnd = Math.max(interaction.currentHour, interaction.startHour);
    }
    
    const isValid = isPlacementValid(previewDay, previewStart, previewEnd, interaction.activityName || undefined);
    return { previewDay, previewStart, previewEnd, isValid };
  };

  const handleMouseUp = () => {
    if (interaction.mode === 'none') return;
    
    const bounds = getPreviewBounds();
    if (bounds && bounds.isValid) {
      const { previewDay, previewStart, previewEnd } = bounds;
      const newGrid = grid.map(dayArr => [...dayArr]);
      
      // We grab the cell ID from the old location to preserve it
      const oldCellId = grid[interaction.dayIdx!][interaction.startHour!]?.id;
      
      // Remove old
      if (interaction.dayIdx !== null && interaction.startHour !== null && interaction.endHour !== null) {
        for (let h = interaction.startHour; h <= interaction.endHour; h++) {
          if (newGrid[interaction.dayIdx][h]?.id === oldCellId) {
             newGrid[interaction.dayIdx][h] = null;
          }
        }
      }
      
      // Place new
      const cellData = grid[interaction.dayIdx!][interaction.startHour!];
      
      // If it didn't move, it's a simple click -> show selection popover
      if (previewDay === interaction.dayIdx && previewStart === interaction.startHour && previewEnd === interaction.endHour && cellData) {
        setSelectedActivity({
          dayIdx: interaction.dayIdx!,
          startHour: interaction.startHour!,
          endHour: interaction.endHour!,
          block: cellData
        });
      } else {
        if (cellData) {
          for (let h = previewStart; h <= previewEnd; h++) {
             newGrid[previewDay][h] = { ...cellData };
          }
        }
        setGrid(newGrid);
      }
    } else if (bounds && !bounds.isValid) {
      setError('Activity cannot extend beyond the timetable or overlap other activities.');
      setTimeout(() => setError(null), 3000);
    }
    
    setInteraction({ mode: 'none', dayIdx: null, activityName: null, startHour: null, endHour: null, grabOffset: null, currentDayIdx: null, currentHour: null });
  };

  // --- Placement Mode (Duplicate) ---
  const handlePlacementClick = () => {
    if (!placementMode || placementMode.currentDayIdx === null || placementMode.currentStartHour === null) return;
    
    const startH = placementMode.currentStartHour;
    const endH = startH + placementMode.duration - 1;
    
    if (isPlacementValid(placementMode.currentDayIdx, startH, endH)) {
      const newGrid = grid.map(dayArr => [...dayArr]);
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9));
      
      for (let h = startH; h <= endH; h++) {
        newGrid[placementMode.currentDayIdx][h] = { ...placementMode.block, id: newId };
      }
      
      setGrid(newGrid);
      setPlacementMode(null);
    } else {
      setError('Not enough consecutive free time for this activity.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // --- Context Menu Actions ---
  const triggerContextEdit = () => {
    if (!contextMenu) return;
    setModalMode('edit');
    setModalDay(contextMenu.dayIdx);
    setModalStart(contextMenu.startHour);
    setModalEnd(contextMenu.endHour);
    setModalActivity(contextMenu.block.activity);
    setModalCategory(contextMenu.block.category);
    setModalSchedulingType(contextMenu.block.schedulingType || 'FIXED');
    setModalNote(contextMenu.block.note || '');
    setModalOpen(true);
  };
  
  const triggerContextDelete = () => {
    if (!contextMenu) return;
    setConfirmDelete({
      dayIdx: contextMenu.dayIdx,
      startHour: contextMenu.startHour,
      endHour: contextMenu.endHour,
      activity: contextMenu.block.activity
    });
  };
  
  const triggerContextDuplicate = () => {
    if (!contextMenu) return;
    setPlacementMode({
      block: { ...contextMenu.block }, // copy block
      duration: contextMenu.endHour - contextMenu.startHour + 1,
      currentDayIdx: null,
      currentStartHour: null
    });
  };

  const [colorConfirmDialog, setColorConfirmDialog] = useState<{
    dayIdx: number;
    startHour: number;
    endHour: number;
    block: NonNullable<CellData>;
    newColor: string;
  } | null>(null);

  const applyColorOverride = (colorClass: string) => {
    if (!contextMenu) return;
    setColorConfirmDialog({
      dayIdx: contextMenu.dayIdx,
      startHour: contextMenu.startHour,
      endHour: contextMenu.endHour,
      block: contextMenu.block,
      newColor: colorClass
    });
  };

  const handleApplyColorOnlyThis = () => {
    if (!colorConfirmDialog) return;
    const newGrid = grid.map(dayArr => [...dayArr]);
    for (let h = colorConfirmDialog.startHour; h <= colorConfirmDialog.endHour; h++) {
      if (newGrid[colorConfirmDialog.dayIdx][h]?.id === colorConfirmDialog.block.id) {
        newGrid[colorConfirmDialog.dayIdx][h]!.colorOverride = colorConfirmDialog.newColor;
      }
    }
    setGrid(newGrid);
    setColorConfirmDialog(null);
  };

  const handleApplyColorAll = () => {
    if (!colorConfirmDialog) return;
    const { activity } = colorConfirmDialog.block;
    const newColor = colorConfirmDialog.newColor;
    
    // Update global profile styles
    setProfile(prev => {
      const existingStyles = prev.activityStyles || {};
      return {
        ...prev,
        activityStyles: {
          ...existingStyles,
          [activity]: { color: newColor }
        }
      };
    });

    // Remove local overrides for this activity name
    const newGrid = grid.map(dayArr => [...dayArr]);
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (newGrid[d][h]?.activity === activity) {
           newGrid[d][h]!.colorOverride = undefined;
        }
      }
    }
    setGrid(newGrid);
    setColorConfirmDialog(null);
  };

  // --- Modals Actions ---
  const saveModalActivity = () => {
    if (modalDay === null || modalStart === null || modalEnd === null) return;
    if (modalActivity.trim() === '') return; // Don't allow empty, force delete instead
    
    const newGrid = [...grid];
    const category = modalMode === 'create' ? inferCategory(modalActivity) : modalCategory;
    const existingId = modalMode === 'edit' ? grid[modalDay][modalStart]?.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9));
    const existingColor = modalMode === 'edit' ? grid[modalDay][modalStart]?.colorOverride : undefined;
    const existingPinned = modalMode === 'edit' ? grid[modalDay][modalStart]?.isPinned : false;
    
    if (modalMode === 'edit') {
       for (let h = modalStart; h <= modalEnd; h++) {
         newGrid[modalDay][h] = null;
       }
    }
    
    for (let h = modalStart; h <= modalEnd; h++) {
      newGrid[modalDay][h] = { 
        id: existingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)), 
        activity: modalActivity.trim(), 
        category,
        schedulingType: modalSchedulingType,
        note: modalNote.trim() || undefined,
        colorOverride: existingColor,
        isPinned: existingPinned
      };
    }
    
    setGrid(newGrid);
    setModalOpen(false);
  };
  
  const executeDelete = () => {
    if (!confirmDelete) return;
    const newGrid = [...grid];
    for (let h = confirmDelete.startHour; h <= confirmDelete.endHour; h++) {
      newGrid[confirmDelete.dayIdx][h] = null;
    }
    setGrid(newGrid);
    setConfirmDelete(null);
  };

  // --- Save to Firestore ---
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    
    const weeklySchedule: Record<string, ScheduleBlock[]> = {};
    
    DAYS.forEach((day, dIdx) => {
      weeklySchedule[day] = [];
      let currentBlock: ScheduleBlock | null = null;
      let currentId: string | null = null;
      
      for (let h = 0; h <= 24; h++) {
        const cell = h < 24 ? grid[dIdx][h] : null;
        
        if (cell) {
          if (!currentBlock || currentId !== cell.id) {
            if (currentBlock) {
              weeklySchedule[day].push(currentBlock);
            }
            currentId = cell.id;
            currentBlock = {
              id: cell.id,
              start: `${h.toString().padStart(2, '0')}:00`,
              end: `${(h + 1).toString().padStart(2, '0')}:00`,
              activity: cell.activity,
              category: cell.category,
              schedulingType: cell.schedulingType || 'FIXED',
              note: cell.note,
              colorOverride: cell.colorOverride,
              isPinned: cell.isPinned
            };
          } else if (currentId === cell.id) {
            currentBlock.end = `${(h + 1).toString().padStart(2, '0')}:00`;
          }
        } else {
          if (currentBlock) {
            weeklySchedule[day].push(currentBlock);
            currentBlock = null;
            currentId = null;
          }
        }
      }
    });
    
    const payload = { ...profile, weeklySchedule };
    console.log('[DEBUG Save] Sending payload:', payload);
    
    try {
      const response = await fetch(`http://localhost:5000/api/profile/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save');
      }
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-400">Loading...</div>;
  }

  const preview = getPreviewBounds();

  return (
    <div 
      className="min-h-screen bg-gray-50/50 p-4 md:p-8 font-sans selection:bg-indigo-100"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => {
        if (placementMode) handlePlacementClick();
      }}
    >
      <div className={`max-w-7xl mx-auto space-y-8 ${placementMode ? 'cursor-crosshair' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                <Settings size={20} />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-200"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100 shadow-sm">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* General Information Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="font-bold text-gray-900 border-b pb-2">General Profile</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select
                  value={profile.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                >
                  <option value="Student">Student</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Entrepreneur">Entrepreneur</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Daily Work Hours</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={profile.maxDailyWorkHours}
                  onChange={(e) => handleChange('maxDailyWorkHours', Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Focus Duration</label>
                <select
                  value={profile.preferredFocusDuration}
                  onChange={(e) => handleChange('preferredFocusDuration', Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                >
                  <option value={25}>25 mins (Pomodoro)</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins (Standard)</option>
                  <option value={90}>90 mins (Deep Work)</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="font-bold text-gray-900 border-b pb-2">Daily Routine</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Wake-up</label>
                  <input
                    type="time"
                    value={profile.wakeUpTime}
                    onChange={(e) => handleChange('wakeUpTime', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep</label>
                  <input
                    type="time"
                    value={profile.sleepTime}
                    onChange={(e) => handleChange('sleepTime', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2">Preferences</h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={profile.planningPreferences.allowWeekendScheduling}
                  onChange={(e) => handlePreferenceChange('allowWeekendScheduling', e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Allow Weekend Scheduling</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={profile.planningPreferences.allowEveningSessions}
                  onChange={(e) => handlePreferenceChange('allowEveningSessions', e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Allow Evening Sessions</span>
              </label>
            </div>
          </div>

          {/* Weekly Timetable Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm overflow-x-auto relative">
              {placementMode && (
                <div className="absolute top-4 right-8 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-pulse">
                  <Copy size={16} /> Placement Mode (Esc to cancel)
                </div>
              )}
              
              <div className="flex items-center justify-between mb-6 min-w-[700px]">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Weekly Timetable</h2>
                  <p className="text-gray-500 text-sm mt-1">Double-click to add. Drag to move. Right-click for options.</p>
                </div>
              </div>

              <div className="min-w-[700px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                {/* Header Row */}
                <div className="flex border-b border-gray-200 bg-white">
                  <div className="w-20 shrink-0 border-r border-gray-200 bg-gray-50/50"></div>
                  {DAYS.map(day => (
                    <div key={day} className="flex-1 py-3 text-center font-bold text-gray-600 text-sm border-r border-gray-200 last:border-0">
                      {day.substring(0, 3)}
                    </div>
                  ))}
                </div>

                {/* Time Rows */}
                <div className="flex flex-col bg-white select-none relative">
                  {HOURS.map(hour => (
                    <div key={hour} className="flex border-b border-gray-100 last:border-0 relative h-16">
                      {/* Time Label */}
                      <div className="w-20 shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-400">
                        {hour.toString().padStart(2, '0')}:00
                      </div>

                      {/* Day Cells */}
                      {DAYS.map((_, dayIdx) => {
                        const cellData = grid[dayIdx][hour];
                        const isToday = new Date().getDay() === (dayIdx === 6 ? 0 : dayIdx + 1);
                        
                        const isBeingInteracted = interaction.mode !== 'none' && cellData?.id === interaction.activityName /* stored id in activityName field for overlap checks */ && interaction.dayIdx === dayIdx;
                        
                        // Handle Drag Preview Rendering
                        let isPreviewCell = false;
                        let previewStart = false;
                        if (preview && preview.isValid && preview.previewDay === dayIdx && hour >= preview.previewStart && hour <= preview.previewEnd) {
                           isPreviewCell = true;
                           previewStart = hour === preview.previewStart;
                        }

                        // Handle Placement Mode Rendering
                        let isPlacementCell = false;
                        let placementStart = false;
                        let validPlacement = false;
                        if (placementMode && placementMode.currentDayIdx === dayIdx && placementMode.currentStartHour !== null) {
                           const sH = placementMode.currentStartHour;
                           const eH = sH + placementMode.duration - 1;
                           if (hour >= sH && hour <= eH) {
                             isPlacementCell = true;
                             placementStart = hour === sH;
                             validPlacement = isPlacementValid(dayIdx, sH, eH);
                           }
                        }

                        // Should we render the label?
                        const isStartOfBlock = cellData && (hour === VISIBLE_START || grid[dayIdx][hour - 1]?.id !== cellData.id);

                        return (
                          <div 
                            key={`${dayIdx}-${hour}`}
                            className={`flex-1 border-r border-gray-100 last:border-0 relative transition-colors
                              ${isPreviewCell && !preview.isValid ? 'bg-red-50' : 'hover:bg-gray-50/80'}
                              ${!cellData && !placementMode && isToday ? 'bg-indigo-50/30' : ''}
                              ${!cellData && !placementMode ? 'cursor-pointer' : ''}
                            `}
                            onDoubleClick={() => handleDoubleClick(dayIdx, hour)}
                            onMouseEnter={() => handleMouseEnter(dayIdx, hour)}
                            onContextMenu={(e) => handleContextMenu(e, dayIdx, hour)}
                          >
                            {/* The actual committed block */}
                            {cellData && !isBeingInteracted && !isPlacementCell && isStartOfBlock && (
                              <div 
                                className={`absolute inset-x-0 mx-1 border-l-4 z-10 flex flex-col justify-start rounded-md shadow-sm overflow-hidden
                                  ${resolveBlockColor(cellData.activity, cellData.category, cellData.colorOverride, profile.activityStyles)}
                                  ${getSchedulingStyle(cellData.schedulingType)}
                                `}
                                style={{ 
                                  top: 0, 
                                  height: `${(getBlockSpan(dayIdx, hour, cellData.id).e - getBlockSpan(dayIdx, hour, cellData.id).s + 1) * 64}px`,
                                  cursor: 'grab' 
                                }}
                                title={`${cellData.activity}\n${cellData.category}\n${getSchedulingName(cellData.schedulingType)}\nDouble-click to edit • Right-click for more options`}
                                onMouseDown={(e) => {
                                  setInteraction(prev => ({...prev, activityName: cellData.id})); 
                                  handleMouseDown(e, dayIdx, hour, 'moving');
                                }}
                              >
                                <div 
                                  className="absolute top-0 inset-x-0 h-2 cursor-ns-resize z-20"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setInteraction(prev => ({...prev, activityName: cellData.id})); 
                                    handleMouseDown(e, dayIdx, hour, 'resizing-top');
                                  }}
                                />
                                
                                <div className="px-2 pt-1.5 flex flex-col justify-start">
                                  <span className="text-sm font-bold truncate block leading-tight">{cellData.activity}</span>
                                  <span className="text-xs font-medium opacity-75 mt-0.5">
                                    {getBlockSpan(dayIdx, hour, cellData.id).s.toString().padStart(2, '0')}:00 - {(getBlockSpan(dayIdx, hour, cellData.id).e + 1).toString().padStart(2, '0')}:00
                                  </span>
                                </div>
                                
                                <div className="absolute bottom-1 inset-x-0 flex justify-center pointer-events-none opacity-40">
                                  <div className="w-8 h-1 rounded-full bg-current"></div>
                                </div>
                                <div 
                                  className="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize z-20"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setInteraction(prev => ({...prev, activityName: cellData.id})); 
                                    handleMouseDown(e, dayIdx, hour, 'resizing-bottom');
                                  }}
                                />
                              </div>
                            )}


                            {/* Drag / Resize Preview Block */}
                            {isPreviewCell && previewStart && (
                              <div 
                                className={`absolute inset-x-0 mx-1 border-l-4 z-20 flex flex-col justify-start opacity-70 shadow-lg pointer-events-none rounded-md overflow-hidden
                                  ${interaction.activityName ? resolveBlockColor(grid[interaction.dayIdx!][interaction.startHour!]!.activity, grid[interaction.dayIdx!][interaction.startHour!]!.category, grid[interaction.dayIdx!][interaction.startHour!]!.colorOverride, profile.activityStyles) : 'bg-indigo-100 border-indigo-300 text-indigo-800'}
                                  ${interaction.activityName ? getSchedulingStyle(grid[interaction.dayIdx!][interaction.startHour!]!.schedulingType) : 'border-solid'}
                                `}
                                style={{ top: 0, height: `${(preview.previewEnd - preview.previewStart + 1) * 64}px` }}
                              >
                                {interaction.dayIdx !== null && interaction.startHour !== null && (
                                  <div className="px-2 pt-1.5 flex flex-col justify-start">
                                    <span className="text-sm font-bold truncate block leading-tight">{grid[interaction.dayIdx][interaction.startHour]?.activity}</span>
                                    <span className="text-xs font-medium opacity-80 mt-0.5">
                                      {preview.previewStart.toString().padStart(2, '0')}:00 - {(preview.previewEnd + 1).toString().padStart(2, '0')}:00
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Placement Mode Block */}
                            {isPlacementCell && placementMode && placementStart && (
                              <div 
                                className={`absolute inset-x-0 mx-1 border-l-4 z-20 flex flex-col justify-start shadow-xl pointer-events-none rounded-md overflow-hidden
                                  ${validPlacement ? resolveBlockColor(placementMode.block.activity, placementMode.block.category, placementMode.block.colorOverride, profile.activityStyles) : 'bg-red-100 border-red-400 text-red-900 opacity-80'}
                                  ${getSchedulingStyle(placementMode.block.schedulingType)}
                                `}
                                style={{ top: 0, height: `${placementMode.duration * 64}px` }}
                              >
                                <div className="px-2 pt-1.5 flex flex-col justify-start">
                                  <span className="text-sm font-bold truncate block leading-tight">{placementMode.block.activity}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Blocked cursor indicator */}
                            {interaction.mode !== 'none' && preview && !preview.isValid && interaction.currentDayIdx === dayIdx && hour === interaction.currentHour && (
                               <div className="absolute inset-0 bg-red-100/50 z-30 pointer-events-none flex items-center justify-center">
                                 <AlertCircle size={16} className="text-red-500 opacity-50" />
                               </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] bg-white border border-gray-200 shadow-xl rounded-xl w-48 overflow-hidden font-medium text-sm text-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.showColors ? (
              <div className="p-3">
                <div className="flex items-center justify-between mb-3 text-gray-500 text-xs font-bold">
                  <span>COLORS</span>
                  <button onClick={() => setContextMenu({...contextMenu, showColors: false})}><ArrowLeft size={12}/></button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map(colorClass => {
                    const bgOnly = colorClass.split(' ')[0];
                    return (
                      <button 
                        key={colorClass} 
                        className={`w-6 h-6 rounded-full border border-black/10 ${bgOnly} hover:scale-110 transition-transform`}
                        onClick={() => { applyColorOverride(colorClass); setContextMenu(null); }}
                      />
                    )
                  })}
                  <button 
                    className="w-6 h-6 rounded-full border border-dashed border-gray-400 bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    title="Reset to default"
                    onClick={() => { applyColorOverride(''); setContextMenu(null); }}
                  >
                    <X size={12} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-1">
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  onClick={() => { setContextMenu(null); triggerContextEdit(); }}
                >
                  <Edit2 size={16} /> Edit Activity
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  onClick={() => { setContextMenu(null); triggerContextEdit(); }}
                >
                  <StickyNote size={16} /> Add Note
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  onClick={() => setContextMenu({...contextMenu, showColors: true})}
                >
                  <Palette size={16} /> Change Color
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  onClick={() => { setContextMenu(null); triggerContextDuplicate(); }}
                >
                  <Copy size={16} /> Duplicate
                </button>
                <div className="h-px bg-gray-200 my-1"></div>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                  onClick={() => { setContextMenu(null); triggerContextDelete(); }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 text-center space-y-6">
             <div className="mx-auto bg-red-100 text-red-600 w-12 h-12 rounded-full flex items-center justify-center">
               <Trash2 size={24} />
             </div>
             <div>
               <h3 className="font-bold text-gray-900 text-lg mb-1">Delete this activity?</h3>
               <p className="text-gray-500 text-sm">Are you sure you want to delete <span className="font-bold text-gray-700">{confirmDelete.activity}</span>?</p>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setConfirmDelete(null)}
                 className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={executeDelete}
                 className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors"
               >
                 Delete
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Color Confirmation Modal */}
      <AnimatePresence>
        {colorConfirmDialog && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100"
            >
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-xl mb-2">Change Activity Color</h3>
                <p className="text-gray-500 text-sm">How would you like to apply this color?</p>
              </div>
              
              <div className="space-y-3 mb-8">
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-100 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <div className="mt-0.5">
                    <input 
                      type="radio" 
                      name="colorApplyScope" 
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-600" 
                      defaultChecked 
                      id="colorApplyLocal"
                    />
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900 text-sm group-hover:text-indigo-900">Only this activity</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Applies only to the selected timetable block.</span>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-100 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <div className="mt-0.5">
                    <input 
                      type="radio" 
                      name="colorApplyScope" 
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-600" 
                      id="colorApplyGlobal"
                    />
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900 text-sm group-hover:text-indigo-900">All "{colorConfirmDialog.block.activity}" activities</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Applies to every activity whose name exactly matches.</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setColorConfirmDialog(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const isGlobal = (document.getElementById('colorApplyGlobal') as HTMLInputElement).checked;
                    if (isGlobal) {
                      handleApplyColorAll();
                    } else {
                      handleApplyColorOnlyThis();
                    }
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Selected Activity Info Panel */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-gray-200 shadow-2xl rounded-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`h-2 w-full ${resolveBlockColor(selectedActivity.block.activity, selectedActivity.block.category, selectedActivity.block.colorOverride, profile.activityStyles).split(' ')[0]}`}></div>
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedActivity.block.activity}</h3>
                    <span className="text-sm font-medium text-gray-500 mt-1 block">{selectedActivity.block.category}</span>
                  </div>
                  <button onClick={() => setSelectedActivity(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 border border-gray-100">
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                    <span className="text-gray-400">Day</span>
                    <span>{DAYS[selectedActivity.dayIdx]}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                    <span className="text-gray-400">Time</span>
                    <span>{selectedActivity.startHour.toString().padStart(2, '0')}:00 - {(selectedActivity.endHour + 1).toString().padStart(2, '0')}:00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                    <span className="text-gray-400">Duration</span>
                    <span>{selectedActivity.endHour - selectedActivity.startHour + 1} hr</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setModalMode('edit');
                      setModalDay(selectedActivity.dayIdx);
                      setModalStart(selectedActivity.startHour);
                      setModalEnd(selectedActivity.endHour);
                      setModalActivity(selectedActivity.block.activity);
                      setModalCategory(selectedActivity.block.category);
                      setModalNote(selectedActivity.block.note || '');
                      setSelectedActivity(null);
                      setModalOpen(true);
                    }}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmDelete({
                        dayIdx: selectedActivity.dayIdx,
                        startHour: selectedActivity.startHour,
                        endHour: selectedActivity.endHour,
                        activity: selectedActivity.block.activity
                      });
                      setSelectedActivity(null);
                    }}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popover Modal for Edit/Create */}
      {modalOpen && modalDay !== null && modalStart !== null && modalEnd !== null && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {modalMode === 'edit' ? 'Edit Activity' : 'Add Activity'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 text-sm font-medium text-indigo-600 bg-indigo-50 p-2 rounded-lg">
              {DAYS[modalDay]} • {modalStart.toString().padStart(2, '0')}:00 - {(modalEnd + 1).toString().padStart(2, '0')}:00
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Name</label>
            <input
              type="text"
              autoFocus
              value={modalActivity}
              onChange={(e) => setModalActivity(e.target.value)}
              placeholder="e.g. Java, Gym, Work"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mb-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveModalActivity();
              }}
            />

            <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduling Type</label>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-200 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                <div className="mt-0.5">
                  <input 
                    type="radio" 
                    name="modalSchedulingType" 
                    value="FIXED"
                    checked={modalSchedulingType === 'FIXED'}
                    onChange={() => setModalSchedulingType('FIXED')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-600" 
                  />
                </div>
                <div>
                  <span className="block font-bold text-gray-900 text-sm group-hover:text-indigo-900">Fixed Commitment</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Buddy AI will never schedule tasks here. Cannot be moved automatically.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-200 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                <div className="mt-0.5">
                  <input 
                    type="radio" 
                    name="modalSchedulingType" 
                    value="FLEXIBLE"
                    checked={modalSchedulingType === 'FLEXIBLE'}
                    onChange={() => setModalSchedulingType('FLEXIBLE')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-600" 
                  />
                </div>
                <div>
                  <span className="block font-bold text-gray-900 text-sm group-hover:text-indigo-900">Flexible Commitment</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Reserved by default, but Buddy AI may recommend moving it later.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-200 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                <div className="mt-0.5">
                  <input 
                    type="radio" 
                    name="modalSchedulingType" 
                    value="FOCUS_BLOCK"
                    checked={modalSchedulingType === 'FOCUS_BLOCK'}
                    onChange={() => setModalSchedulingType('FOCUS_BLOCK')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-600" 
                  />
                </div>
                <div>
                  <span className="block font-bold text-gray-900 text-sm group-hover:text-indigo-900">Focus Block</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Intentional planning window. Buddy AI will schedule tasks inside these blocks.</span>
                </div>
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Note (Optional)</label>
            <input
              type="text"
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              placeholder="e.g. Bring laptop charger"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mb-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveModalActivity();
              }}
            />

            <div className="flex items-center gap-3">
              <button 
                onClick={saveModalActivity}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2.5 rounded-xl transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl font-medium flex items-center gap-3 z-[200]"
          >
            <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            Profile saved successfully!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Availability;
