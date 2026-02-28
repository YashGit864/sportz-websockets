import { z } from 'zod';

// Constants
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Helpers
const isoDateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+\-]\d{2}:\d{2})$/;
const isIsoDateTimeString = (val) => isoDateTimeRegex.test(val) && !Number.isNaN(Date.parse(val));

// Schemas
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z
  .object({
    sport: z.string().min(1, { message: 'sport must be a non-empty string' }),
    homeTeam: z.string().min(1, { message: 'homeTeam must be a non-empty string' }),
    awayTeam: z.string().min(1, { message: 'awayTeam must be a non-empty string' }),
    startTime: z
      .string()
      .refine(isIsoDateTimeString, { message: 'startTime must be a valid ISO date string' }),
    endTime: z
      .string()
      .refine(isIsoDateTimeString, { message: 'endTime must be a valid ISO date string' }),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((val, ctx) => {
    // Only compare if both are valid ISO date strings
    if (isIsoDateTimeString(val.startTime) && isIsoDateTimeString(val.endTime)) {
      const start = new Date(val.startTime).getTime();
      const end = new Date(val.endTime).getTime();
      if (!(end > start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'endTime must be after startTime',
          path: ['endTime'],
        });
      }
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});
