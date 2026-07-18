export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Active' | 'Completed' | 'completed' | 'pending' | 'analyzed' | 'approved' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export interface Task {
    id: string;
    title: string;
    description: string;
    deadline: string;
    role?: string;
    status: TaskStatus;
    createdAt: string;
    analysis?: any;
    userId: string;
    totalEstimatedMinutes?: number;
    executionPlan?: {
        sessions: {
            status: string;
            durationMinutes?: number;
        }[];
    };
}
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type CommitmentCategory = 'Education' | 'Work' | 'Health' | 'Personal' | 'Travel' | 'Other';
export interface WeeklyCommitment {
    id: string;
    title: string;
    category: CommitmentCategory;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    location?: string;
    isRecurring: boolean;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
}
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
    wakeUpTime: string;
    sleepTime: string;
    morningPrepMins: number;
    commuteMins: number;
    lunchMins: number;
    dinnerMins: number;
    weekendRoutine: WeekendRoutine;
    weekendWakeUpTime?: string;
    weekendSleepTime?: string;
}
export interface PlanningPreferences {
    maxDailyWorkHours: number;
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
    wakeUpTime?: string;
    sleepTime?: string;
    maxDailyWorkHours?: number;
    weeklySchedule?: any;
    activityStyles?: any;
}
export type ConversationRole = 'user' | 'model' | 'system';
export interface ConversationMessage {
    role: ConversationRole;
    text: string;
    timestamp: string;
}
export interface ConversationContext {
    id?: string;
    taskId: string;
    userId: string;
    triggerEvent: string;
    status: 'ACTIVE' | 'RECOVERY_READY' | 'RESOLVED';
    messages: ConversationMessage[];
    createdAt: string;
    updatedAt: string;
}
