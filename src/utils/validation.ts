import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Phone number validation schemas
export const phoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((value) => {
    const normalized = formatPhoneNumber(value);
    const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;

    // E.164 international (max 15 digits) - allow as "+<country><number>"
    if (normalized.startsWith('+')) {
      return /^[1-9]\d{7,14}$/.test(digits);
    }

    // Backward compatibility: Israeli mobile/landline without country code
    if (digits.length === 10 && digits.startsWith('05')) {
      return true;
    }
    if (digits.length === 9 && /^0[23489]/.test(digits)) {
      return true;
    }

    // Also allow digits-only international (no "+") for convenience
    return /^[1-9]\d{7,14}$/.test(digits);
  }, 'Phone number must be a valid local or international phone number');

// Form schemas
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type inference
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// Validation helpers
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validatePassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

export const validateUsername = (username: string): boolean => {
  try {
    usernameSchema.parse(username);
    return true;
  } catch {
    return false;
  }
};

// Phone number validation helpers
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // If phone number is empty or just whitespace, it's valid (optional field)
  if (!phoneNumber || phoneNumber.trim() === '') {
    return true;
  }
  
  try {
    phoneNumberSchema.parse(phoneNumber);
    return true;
  } catch {
    return false;
  }
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  const trimmed = phoneNumber.trim();
  if (!trimmed) return phoneNumber;

  // Allow users to type common separators; normalize for storage/validation.
  // - Convert leading "00" to "+"
  // - Keep a single leading "+"
  // - Strip everything else to digits
  const withPlus = trimmed.replace(/^00/, '+');
  if (withPlus.startsWith('+')) {
    const digitsOnly = withPlus.slice(1).replace(/\D/g, '');
    return `+${digitsOnly}`;
  }

  return withPlus.replace(/\D/g, '');
};

export const getPhoneNumberType = (phoneNumber: string): 'mobile' | 'landline' | 'invalid' => {
  const normalized = formatPhoneNumber(phoneNumber);
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  if (digits.length === 10 && digits.startsWith('05')) {
    return 'mobile';
  }

  if (digits.length === 9 && /^0[23489]/.test(digits)) {
    return 'landline';
  }

  // For international numbers, we don't reliably know the type, but it's valid.
  if (validatePhoneNumber(normalized)) {
    return 'mobile';
  }

  return 'invalid';
};

export const getPhoneNumberError = (phoneNumber: string): string | null => {
  // If phone number is empty or just whitespace, it's valid (optional field)
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null;
  }
  
  try {
    phoneNumberSchema.parse(phoneNumber);
    return null;
  } catch {
    return 'validation.invalidPhoneNumber';
  }
}; 