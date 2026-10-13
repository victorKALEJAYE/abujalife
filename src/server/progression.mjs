// Server adapter for life progression. Rules live in src/shared/progression.mjs.
import { GameError } from './errors.mjs';
import { PROGRESSION_ACTIONS, PROGRESSION_MONEY_ACTIONS, ProgressionError, applyProgressionAction, recordProgression, shiftPay } from '../shared/progression.mjs';

export { PROGRESSION_ACTIONS, PROGRESSION_MONEY_ACTIONS, shiftPay };
/** Runs inside a store's existing atomic economy operation. */
export function applyServerProgressionAction(profile, action, payload, { now }) {
  try { return applyProgressionAction(profile, action, payload, { now }); }
  catch (error) { if (error instanceof ProgressionError) throw new GameError(error.message, error.status, error.code); throw error; }
}
/** Records skills, feelings and story progress; surfaces level-ups and finished stories on the action result. */
export function recordServerProgression(profile, { kind, payload, extra, now }) {
  const milestones = recordProgression(profile, { kind, payload, extra, now });
  if (milestones && extra && typeof extra === 'object' && (milestones.levelUps.length || milestones.storiesDone.length)) extra.milestones = milestones;
}
