import { z } from 'zod';

export const createEvidenceSchema = z.object({
  title: z
    .string({ required_error: 'Evidence title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(5000).optional(),
  category: z
    .string({ required_error: 'Evidence category is required' })
    .trim()
    .min(2, 'Category must be at least 2 characters'),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
