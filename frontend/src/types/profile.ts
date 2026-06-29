export type Persona = 'Student' | 'Working Professional' | 'Freelancer' | 'Entrepreneur' | 'Other';
export type PrimaryGoal = 'Placement' | 'Higher Studies' | 'Startup' | 'MBA' | 'Research' | 'Skill Development' | 'Financial Growth' | 'Personal Productivity' | 'Other';
export type WeekendRoutine = 'Same as Weekdays' | 'Different';
export type SessionLength = 25 | 45 | 60 | 90;
export type BreakStyle = 'Pomodoro' | '52/17' | '90/20' | 'Custom';
export type WeekendPlanning = 'Allow Work' | 'Light Work' | 'No Work';

export interface BasicProfile {
  name: string;
  email: string;
  persona: Persona;
  timezone: string;
  language: string;
}

export interface PurposeProfile {
  primaryGoal: PrimaryGoal;
  customGoal?: string;
}

export interface RoutineProfile {
  wakeUpTime: string; // HH:mm
  sleepTime: string; // HH:mm
  morningPrepMins: number; // 0-240
  commuteMins: number; // 0-240
  lunchMins: number; // 0-180
  dinnerMins: number; // 0-180
  weekendRoutine: WeekendRoutine;
  weekendWakeUpTime?: string;
  weekendSleepTime?: string;
}

export interface PlanningPreferences {
  maxDailyWorkHours: number; // 1-16
  preferredSessionLength: SessionLength;
  preferredBreakStyle: BreakStyle;
  weekendPlanning: WeekendPlanning;
}

export interface UserProfileV2 {
  isOnboarded: boolean;
  basic: BasicProfile;
  purpose: PurposeProfile;
  routine: RoutineProfile;
  planning: PlanningPreferences;
  
  // Legacy fields (for backwards compatibility, managed by backend)
  wakeUpTime?: string;
  sleepTime?: string;
  maxDailyWorkHours?: number;
  weeklySchedule?: any;
  activityStyles?: any;
}
