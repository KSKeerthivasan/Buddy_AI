type ComplexityLevel = 'low' | 'medium' | 'high';

const RULES: Record<string, Record<ComplexityLevel, number>> = {
  'theory assignment': { low: 1, medium: 3, high: 5 },
  'coding assignment': { low: 3, medium: 8, high: 16 },
  'mini project': { low: 10, medium: 24, high: 40 },
  'presentation': { low: 2, medium: 5, high: 8 },
  'research project': { low: 6, medium: 15, high: 30 }
};

const DEFAULT_HOURS = 2; // Fallback value if type/complexity is unknown

/**
 * Checks if a task is a micro task based on its title or description.
 */
const isMicroTask = (title: string = '', description: string = ''): boolean => {
  const combined = `${title} ${description}`.toLowerCase();
  const microKeywords = [
    'pay bills', 'send email', 'call client', 'upload assignment',
    'reply to', 'quick review', 'fill form', 'print', 'submit'
  ];
  return microKeywords.some(keyword => combined.includes(keyword));
};

/**
 * Estimates the required hours for a task based on its type and complexity.
 */
export const estimateHours = (taskType: string, complexity: string, title?: string, description?: string): number => {
  if (isMicroTask(title, description)) {
    // Return 15 minutes (0.25 hours) for micro tasks
    return 0.25;
  }

  const normalizedTaskType = taskType.toLowerCase().trim();
  const normalizedComplexity = complexity.toLowerCase().trim() as ComplexityLevel;

  const typeRules = RULES[normalizedTaskType];
  
  if (typeRules && typeRules[normalizedComplexity] !== undefined) {
    return typeRules[normalizedComplexity];
  }

  return DEFAULT_HOURS;
};
