/**
 * Calculates the required hours per day to complete a task.
 * 
 * @param estimatedHours - Total estimated hours required for the task.
 * @param availableDays - Number of days available to complete the task.
 * @returns The required hours per day, rounded to one decimal place. Always >= 0.
 */
export const calculateWorkload = (estimatedHours: number, availableDays: number): number => {
  if (estimatedHours <= 0 || availableDays <= 0) {
    return 0;
  }

  const hoursPerDay = estimatedHours / availableDays;
  
  // Round to one decimal place and ensure it's not less than 0
  return Math.max(0, Math.round(hoursPerDay * 10) / 10);
};
