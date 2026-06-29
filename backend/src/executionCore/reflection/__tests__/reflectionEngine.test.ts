import { describe, it, expect } from '@jest/globals';
import { validateReflection, shouldAllowEdit, requiresReflection, ReflectionEngineError } from '../reflectionEngine';
import { Reflection } from '../reflectionTypes';

describe('Reflection Engine', () => {
  it('validates a correct YES reflection', () => {
    expect(() => validateReflection({ completionResult: 'YES', notes: 'Great session' })).not.toThrow();
  });

  it('rejects a NO reflection without a primary reason', () => {
    expect(() => validateReflection({ completionResult: 'NO', notes: 'Was interrupted' }))
      .toThrow(ReflectionEngineError);
  });

  it('accepts a PARTIALLY reflection with a primary reason', () => {
    expect(() => validateReflection({ completionResult: 'PARTIALLY', primaryReason: 'Unexpected interruption' }))
      .not.toThrow();
  });

  it('rejects notes over 500 characters', () => {
    const longNotes = 'a'.repeat(501);
    expect(() => validateReflection({ completionResult: 'YES', notes: longNotes }))
      .toThrow('Notes must be a maximum of 500 characters.');
  });

  it('correctly determines edit window', () => {
    const reflection: Reflection = {
      userId: '1',
      taskId: '1',
      sessionId: '1',
      completionResult: 'YES',
      submittedAt: new Date('2026-07-01T10:00:00Z').toISOString()
    };

    // 10 minutes later -> allowed
    expect(shouldAllowEdit(reflection, new Date('2026-07-01T10:10:00Z'))).toBe(true);

    // 16 minutes later -> rejected
    expect(shouldAllowEdit(reflection, new Date('2026-07-01T10:16:00Z'))).toBe(false);
  });

  it('correctly identifies when reflection is strongly required', () => {
    expect(requiresReflection('CANCELLED')).toBe(true);
    expect(requiresReflection('FAILED')).toBe(true);
    expect(requiresReflection('SKIPPED')).toBe(true);
    expect(requiresReflection('COMPLETED')).toBe(false);
    expect(requiresReflection('PARTIALLY_COMPLETED')).toBe(false);
  });
});
