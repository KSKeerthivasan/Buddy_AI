import { RiskLevel } from './types';

/**
 * Calculates the risk level based on the required hours per day.
 * 
 * @param hoursPerDay - The calculated required hours per day.
 * @returns The RiskLevel ('LOW', 'MEDIUM', or 'HIGH').
 */
export const calculateRisk = (hoursPerDay: number): RiskLevel => {
  if (hoursPerDay <= 2) {
    return 'LOW';
  } else if (hoursPerDay <= 5) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
};
