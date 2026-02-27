export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateProfile = (data: any): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!data.age || typeof data.age !== 'number') {
    errors.push('Age is required and must be a number');
  } else if (data.age < 18 || data.age > 120) {
    errors.push('Age must be between 18 and 120');
  }

  if (!data.gender || !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Gender is required and must be male, female, or other');
  }

  if (!data.place || typeof data.place !== 'string' || data.place.trim().length === 0) {
    errors.push('Place is required');
  }

  if (!data.skills || !Array.isArray(data.skills) || data.skills.length === 0) {
    errors.push('At least one skill is required');
  }

  if (!data.profession || typeof data.profession !== 'string' || data.profession.trim().length === 0) {
    errors.push('Profession is required');
  }

  if (!data.photo && (!data.photos || data.photos.length === 0)) {
    errors.push('At least one photo is required');
  }

  if (!data.bio || typeof data.bio !== 'string' || data.bio.trim().length === 0) {
    errors.push('Bio is required');
  } else if (data.bio.length > 500) {
    errors.push('Bio must not exceed 500 characters');
  }

  // Optional fields validation
  if (data.websiteUrl && !isValidUrl(data.websiteUrl)) {
    errors.push('Invalid website URL format');
  }

  if (data.photos && Array.isArray(data.photos) && data.photos.length > 5) {
    errors.push('Maximum 5 photos allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateGig = (data: any): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters');
  } else if (data.title.length > 200) {
    errors.push('Title must not exceed 200 characters');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
    errors.push('Description is required and must be at least 10 characters');
  } else if (data.description.length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  if (!data.skillsRequired || !Array.isArray(data.skillsRequired) || data.skillsRequired.length === 0) {
    errors.push('At least one skill is required');
  } else if (data.skillsRequired.length > 20) {
    errors.push('Maximum 20 skills allowed');
  }

  const validTypes = ['job', 'startup', 'project', 'hackathon'];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push('Type must be one of: job, startup, project, hackathon');
  }

  const validPaymentStatuses = ['paid', 'unpaid'];
  if (!data.paymentStatus || !validPaymentStatuses.includes(data.paymentStatus)) {
    errors.push('Payment status must be either paid or unpaid');
  }

  // Optional fields validation
  if (data.coverLetter && data.coverLetter.length > 2000) {
    errors.push('Cover letter must not exceed 2000 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

