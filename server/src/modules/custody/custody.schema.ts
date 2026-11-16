import { z } from 'zod';

export const transferCustodySchema = z.object({
  newCustodianId: z
    .string({ required_error: 'New custodian ID is required' })
    .uuid('Invalid custodian ID format'),
  reason: z
    .string({ required_error: 'Transfer reason is mandatory for legal chain of custody' })
    .trim()
    .min(5, 'Reason must be at least 5 characters explaining the transfer necessity')
    .max(1000, 'Reason cannot exceed 1000 characters'),
  notes: z.string().trim().max(2000).optional(),
});

export type TransferCustodyInput = z.infer<typeof transferCustodySchema>;
