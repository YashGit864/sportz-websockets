import { z } from 'zod';

// Schemas
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().min(0),
  sequence: z.coerce.number().int().min(0),
  period: z.string().min(1, { message: 'period must be a non-empty string' }),
  event_type: z.string().min(1, { message: 'eventType must be a non-empty string' }),
  actor: z.string().min(1, { message: 'actor must be a non-empty string' }),
  team: z.string().min(1, { message: 'team must be a non-empty string' }),
  message: z.string().min(1, { message: 'message must be a non-empty string' }),
  metadata: z.record(z.string(), z.any()),
  tags: z.array(z.string()),
});
