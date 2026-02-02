import { MATCH_STATUS } from '../validation/matches.js';

/**
 * Determine a match's current status based on its start and end times.
 *
 * @param {Date|string|number} startTime - Match start time (Date, ISO string, or epoch ms).
 * @param {Date|string|number} endTime - Match end time (Date, ISO string, or epoch ms).
 * @param {Date} [now=new Date()] - Reference time used to evaluate status.
 * @returns {string|null} One of `MATCH_STATUS.SCHEDULED`, `MATCH_STATUS.LIVE`, or `MATCH_STATUS.FINISHED`; returns `null` if either provided time is invalid.
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

/**
 * Synchronize a match object's status with the computed current match status and persist the change if it differs.
 *
 * If the computed status is invalid (e.g., unable to parse start/end times), the match's status is left unchanged.
 *
 * @param {Object} match - Match object containing `startTime`, `endTime`, and `status`; `status` will be updated when changed.
 * @param {(newStatus: string) => Promise<void>} updateStatus - Async function invoked with the new status to persist the change.
 * @returns {string} The match's status after synchronization.
 */
export async function syncMatchStatus(match, updateStatus) {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }
  return match.status;
}