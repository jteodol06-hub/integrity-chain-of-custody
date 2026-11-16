import { z } from 'zod';
import { CasePriority, CaseStatus } from '@prisma/client';

export const createCaseSchema = z.object({
  title: z
    .string({ required_error: 'Case title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ required_error: 'Case description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  category: z
    .string({ required_error: 'Incident category is required' })
    .trim()
    .min(2, 'Category must be at least 2 characters'),
  priority: z.nativeEnum(CasePriority).optional().default(CasePriority.MEDIUM),
  status: z.nativeEnum(CaseStatus).optional().default(CaseStatus.OPEN),
  assignedUserIds: z.array(z.string().uuid('Invalid user ID')).optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).max(5000).optional(),
  category: z.string().trim().min(2).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
});

export const assignCaseSchema = z.object({
  userIds: z
    .array(z.string().uuid('Invalid user ID'))
    .min(1, 'At least one user must be specified for assignment'),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type AssignCaseInput = z.infer<typeof assignCaseSchema>;
