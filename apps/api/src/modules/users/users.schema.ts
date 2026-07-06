import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { COMPANY_ASSIGNABLE_ROLES } from './users.roles';

const assignableRoleEnum = z.enum(
  COMPANY_ASSIGNABLE_ROLES as [UserRole, ...UserRole[]],
);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  );

export const createUserSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z
      .string()
      .email('Please enter a valid email address')
      .transform((v) => v.toLowerCase().trim()),
    password: passwordSchema,
    role: assignableRoleEnum,
    driverId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.DRIVER && !data.driverId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a driver profile to link for driver login accounts',
        path: ['driverId'],
      });
    }
    if (data.role !== UserRole.DRIVER && data.driverId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Driver profile can only be linked for driver accounts',
        path: ['driverId'],
      });
    }
  });

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    role: assignableRoleEnum.optional(),
    isActive: z.boolean().optional(),
    password: passwordSchema.optional(),
    driverId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role && data.role !== UserRole.DRIVER && data.driverId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Driver profile can only be linked for driver accounts',
        path: ['driverId'],
      });
    }
  });

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
