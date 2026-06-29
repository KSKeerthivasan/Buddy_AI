export interface RoutineBlock {
  title: string;
  category: string;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  type: 'ROUTINE' | 'COMMITMENT';
}

export interface WorkingWindow {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface RoutineDay {
  date: string; // "YYYY-MM-DD"
  wakeUpTime: string;
  sleepTime: string;
  workingWindow: WorkingWindow;
  routineBlocks: RoutineBlock[];
  commitmentBlocks: RoutineBlock[];
}
