import { z } from 'zod';

export const setupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  companyName: z.string().min(1, 'Company name is required'),
  dotNumber: z.string().min(1, 'DOT number is required'),
  mcNumber: z.string().min(1, 'MC number is required'),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
});

export type SetupInput = z.infer<typeof setupSchema>;
