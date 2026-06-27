type ComplexityLevel = 'low' | 'medium' | 'high';

const RULES: Record<string, Record<ComplexityLevel, number>> = {
  'theory assignment': {
    low: 1,
    medium: 3,
    high: 5
  },
  'coding assignment': {
    low: 3,
    medium: 8,
    high: 16
  },
  'mini project': {
    low: 10,
    medium: 24,
    high: 40
  },
  'presentation': {
    low: 2,
    medium: 5,
    high: 8
  },
  'research project': {
    low: 6,
    medium: 15,
    high: 30
  }
};

const DEFAULT_HOURS = 2; // Fallback value if type/complexity is unknown

/**
 * Estimates the required hours for a task based on its type and complexity.
 */
export const estimateHours = (taskType: string, complexity: string): number => {
  const normalizedTaskType = taskType.toLowerCase().trim();
  const normalizedComplexity = complexity.toLowerCase().trim() as ComplexityLevel;

  const typeRules = RULES[normalizedTaskType];
  
  if (typeRules && typeRules[normalizedComplexity] !== undefined) {
    return typeRules[normalizedComplexity];
  }

  return DEFAULT_HOURS;
};
