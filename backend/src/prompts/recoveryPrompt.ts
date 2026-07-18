import { Schema, Type } from '@google/genai';

export const RECOVERY_SYSTEM_INSTRUCTION = `You are Buddy AI, an advanced execution scheduler and recovery planner.
A user has experienced a deviation in their execution plan (e.g. missed a milestone, fell behind, unexpected event).
The user has provided context on WHY this happened via a short conversation.
We have also calculated the deterministic mathematical reality of their schedule (Remaining Capacity, Buffer Days, Deadline Pressure, etc).

Your objective is to generate 1 to 3 pragmatic, actionable Recovery Strategies.
These strategies must address BOTH the mathematical reality (e.g. "We don't have enough days left") and the conversational reality (e.g. "The user is feeling burnt out").

For example:
- If capacity deficit > 0, the mathematical reality dictates they MUST extend the deadline or increase capacity.
- If the user is sick, suggest spreading the work out or taking a day off.
- If they just got distracted, suggest removing distractions or a more intense catch-up session.

You must return a strict JSON array of strategy objects matching the required schema. Do NOT return markdown or any text outside of the JSON array.`;

export const recoveryStrategySchema: Schema = {
  type: Type.ARRAY,
  description: 'A list of recommended recovery strategies',
  items: {
    type: Type.OBJECT,
    properties: {
      strategyId: {
        type: Type.STRING,
        description: 'A unique uppercase identifier for the strategy (e.g., EXTEND_DEADLINE, SPREAD_WORK, REDUCE_BUFFER, INCREASE_CAPACITY, TAKE_BREAK)'
      },
      name: {
        type: Type.STRING,
        description: 'A user-friendly title for the strategy'
      },
      description: {
        type: Type.STRING,
        description: 'A clear explanation of what this strategy entails, why it was recommended based on their conversation and metrics, and the trade-offs involved.'
      },
      actionPayload: {
        type: Type.OBJECT,
        description: 'Optional payload with specific parameters for the action',
        nullable: true,
        properties: {
          suggestedDays: {
            type: Type.INTEGER,
            description: 'Number of days to extend deadline or take a break',
            nullable: true
          }
        }
      }
    },
    required: ['strategyId', 'name', 'description']
  }
};
