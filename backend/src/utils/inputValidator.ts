export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

const isKeyboardMash = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Known mash patterns
  const mashPatterns = ['asdf', 'qwerty', 'dsfsdg', 'testtest', 'qwer'];
  if (mashPatterns.some(pattern => lowerText.includes(pattern))) {
    return true;
  }
  
  // Repeated characters (4 or more of the same char in a row)
  if (/(.)\1{3,}/.test(lowerText)) {
    return true;
  }
  
  // Check if it's just gibberish consonants (long sequence without vowels)
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/.test(lowerText)) {
    return true;
  }
  
  return false;
};

export const validateTaskInput = (title: string, description: string | undefined, deadline: string): ValidationResult => {
  if (!title || title.trim().length < 5) {
    return {
      isValid: false,
      message: 'Please provide a more descriptive task title (at least 5 characters).',
    };
  }

  if (isKeyboardMash(title)) {
    return {
      isValid: false,
      message: 'The task title appears to contain random characters. Please provide a meaningful title.',
    };
  }

  if (description) {
    if (description.trim().length < 10) {
      return {
        isValid: false,
        message: 'The task description is too short. Please add more details to help the AI plan accurately.',
      };
    }
    
    if (isKeyboardMash(description)) {
      return {
        isValid: false,
        message: 'The task description appears to contain random characters. Please provide meaningful content.',
      };
    }
  } else {
    // If we want to strictly require a description based on "The description lacks meaningful content"
    return {
      isValid: false,
      message: 'Please provide a meaningful description so the AI can accurately plan this task.',
    };
  }

  if (!deadline) {
    return {
      isValid: false,
      message: 'A deadline is required to schedule this task.',
    };
  }

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(23, 59, 59, 999); // End of the day
  const now = new Date();

  if (isNaN(deadlineDate.getTime())) {
    return {
      isValid: false,
      message: 'The provided deadline is not a valid date format.',
    };
  }

  if (deadlineDate < now) {
    return {
      isValid: false,
      message: 'The deadline cannot be in the past. Please select a future date.',
    };
  }

  return { isValid: true };
};
