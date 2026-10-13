// Life progression: skills, a career ladder per job, feelings with named causes
// and multi-step Abuja Stories. Everything advances only from real,
// server-validated actions (the same events Today's Hustle listens to). Rules
// are shared so the client shows exactly what the server will honour.
import { properties as CATALOGUE_PROPERTIES, jobs as CATALOGUE_JOBS } from './catalogue.mjs';

const HOUR = 3_600_000;
const SAFE = value => Math.max(0, Math.floor(Number(value) || 0));

/* ------------------------------------------------------------------ skills */
// Job skills keep the labels the stores already write into profile.skills.
export const SKILLS = Object.freeze([
  { id: 'Cooking', icon: '🍲', blurb: 'Cook your own meals at home.' },
  { id: 'Fitness', icon: '🏃', blurb: 'Gym sessions, training and long walks.' },
  { id: 'Charisma', icon: '🗣️', blurb: 'Hangouts, meet-ups, networking and nights out.' },
  { id: 'Hospitality', icon: '🍽️', blurb: 'Restaurant host shifts.' },
  { id: 'Technology', icon: '💻', blurb: 'Developer shifts and browsing Banex.' },
  { id: 'Creative', icon: '🎨', blurb: 'Creative shifts, galleries and workshops.' },
  { id: 'Sales', icon: '🤝', blurb: 'Property shifts and business networking.' },
  { id: 'Construction', icon: '🏗️', blurb: 'Site coordinator shifts.' },
  { id: 'Finance', icon: '🏦', blurb: 'Bank shifts and the CBN career exhibits.' },
]);
const SKILL_IDS = new Set(SKILLS.map(skill => skill.id));
// XP needed to reach each level; level 0 means not started.
export const SKILL_LEVELS = Object.freeze([0, 1, 4, 10, 18, 30, 45, 65, 90, 120, 160]);
export const SKILL_MAX_LEVEL = SKILL_LEVELS.length - 1;
export function skillLevel(xp = 0) {
  const value = SAFE(xp);
  let level = 0; for (let index = 1; index < SKILL_LEVELS.length; index++) if (value >= SKILL_LEVELS[index]) level = index;
  const next = level < SKILL_MAX_LEVEL ? SKILL_LEVELS[level + 1] : null, floor = SKILL_LEVELS[level];
  return { xp: value, level, next, remaining: next === null ? 0 : next - value, percent: next === null ? 100 : Math.round((value - floor) / (next - floor) * 100) };
}
const levelOf = (profile, skill) => skillLevel(profile.skills?.[skill]).level;

/* ----------------------------------------------------------------- careers */
// Five ranks per job. Each rank asks for shifts in this job, a level in the
// job's skill and an Abuja Rep level, and raises pay per shift.
export const CAREER_RULES = Object.freeze({
  shifts: Object.freeze([0, 4, 10, 20, 35]),
  skillLevel: Object.freeze([0, 2, 3, 5, 7]),
  repLevel: Object.freeze([1, 1, 2, 3, 5]),
  payMultiplier: Object.freeze([1, 1.15, 1.3, 1.5, 1.8]),
  promotionRep: 50,
});
export const CAREER_TITLES = Object.freeze({
  'restaurant-host': ['Restaurant host', 'Senior host', 'Floor supervisor', 'Restaurant manager', 'General manager'],
  'junior-dev': ['Junior developer', 'Developer', 'Senior developer', 'Tech lead', 'Head of engineering'],
  'media-assistant': ['Creative assistant', 'Designer', 'Senior designer', 'Art director', 'Creative director'],
  'property-agent': ['Property assistant', 'Property agent', 'Senior agent', 'Estate manager', 'Head of property'],
  'site-supervisor': ['Site coordinator', 'Site supervisor', 'Site engineer', 'Project manager', 'Construction director'],
  'bank-teller': ['Bank teller', 'Senior teller', 'Customer service lead', 'Branch operations officer', 'Branch manager'],
});
export const CAREER_RANKS = CAREER_RULES.shifts.length;
// Same thresholds as Today's Hustle REP_LEVELS (kept local to avoid a circular import).
const REP_XP = [0, 100, 250, 500, 900, 1500, 2400, 3600];
const repLevelOf = profile => { const xp = SAFE(profile.rep?.xp); let level = 1; REP_XP.forEach((need, index) => { if (xp >= need) level = index + 1; }); return level; };

/* ---------------------------------------------------------------- feelings */
const FEELING_EVENTS = Object.freeze({
  'great-shift': { label: 'Smashed my shift', icon: '💼', value: 15, hours: 4 },
  'rough-shift': { label: 'Rough day at work', icon: '😮‍💨', value: -8, hours: 3 },
  promoted: { label: 'Got promoted!', icon: '🎉', value: 30, hours: 24 },
  'skill-up': { label: 'Getting better at it', icon: '📈', value: 10, hours: 4 },
  'good-meal': { label: 'Belle full', icon: '🍛', value: 8, hours: 3 },
  fresh: { label: 'Looking fresh', icon: '✨', value: 6, hours: 2 },
  pumped: { label: 'Pumped after training', icon: '💪', value: 10, hours: 3 },
  'night-out': { label: 'Enjoyed a night out', icon: '🪩', value: 15, hours: 8 },
  blessed: { label: 'Feeling blessed', icon: '🙏', value: 10, hours: 6 },
  rested: { label: 'Well rested', icon: '😴', value: 10, hours: 4 },
  'story-done': { label: 'Finished an Abuja Story', icon: '📖', value: 20, hours: 12 },
  sightseer: { label: 'Saw the sights', icon: '📸', value: 8, hours: 4 },
});
export const MOOD_BANDS = Object.freeze([
  { min: 40, id: 'elated', label: 'Elated', icon: '😄', workBonus: 10 },
  { min: 15, id: 'happy', label: 'Happy', icon: '🙂', workBonus: 5 },
  { min: -10, id: 'fine', label: 'Fine', icon: '😐', workBonus: 0 },
  { min: -35, id: 'uncomfortable', label: 'Uncomfortable', icon: '😕', workBonus: -5 },
  { min: -Infinity, id: 'miserable', label: 'Miserable', icon: '😣', workBonus: -10 },
]);
const FEELINGS_KEPT = 12;

function propertyFor(profile) {
  const id = profile.home?.propertyId; if (!id) return null;
  return CATALOGUE_PROPERTIES.find(item => item.id === id) || (profile.origin?.residence?.id === id ? profile.origin.residence : null);
}
/** Every current feeling with its cause, strongest first, plus the overall mood. */
export function feelingsView(profile, now) {
  const rows = [], add = (id, label, icon, value, cause, until = null) => rows.push({ id, label, icon, value, cause, until });
  const n = key => Number(profile[key] ?? 70);
  if (n('hunger') < 15) add('starving', 'Starving', '🥵', -30, 'Food is almost empty. Eat something now.');
  else if (n('hunger') < 35) add('hungry', 'Hungry', '🍽️', -10, 'Food is running low.');
  if (n('energy') < 15) add('exhausted', 'Exhausted', '🥱', -25, 'Energy is almost empty. Sleep or rest.');
  else if (n('energy') < 35) add('tired', 'Tired', '😪', -8, 'Energy is running low.');
  if (n('hygiene') < 20) add('need-bath', 'Need a bath', '🚿', -15, 'Clean is very low. Freshen up.');
  if (n('social') < 20) add('lonely', 'Lonely', '🫥', -12, 'You have not seen people in a while.');
  if (n('fun') < 20) add('bored', 'Bored', '🥱', -10, 'Fun is very low.');
  if (n('stress') > 75) add('stressed', 'Stressed out', '😤', -20, 'Stress is high. Relax, pray or work out.');
  else if (n('stress') < 20) add('calm', 'Calm', '😌', 8, 'Low stress.');
  if (['energy', 'hunger', 'hygiene', 'social', 'fun'].every(key => n(key) >= 70)) add('thriving', 'Feeling great', '🌟', 12, 'Every need is well looked after.');
  const home = propertyFor(profile), tier = Number(home?.tier ?? -1);
  if (tier >= 5) add('living-large', 'Living large', '🏰', 18, `Your ${home.name} is something else.`);
  else if (tier >= 3) add('fine-house', 'Fine house', '🏡', 12, `You love living in ${home.name}.`);
  for (const feeling of profile.lifeProgress?.feelings || []) {
    const rule = FEELING_EVENTS[feeling.id]; if (!rule || !(feeling.until > now)) continue;
    add(feeling.id, rule.label, rule.icon, rule.value, feeling.cause || rule.label, feeling.until);
  }
  rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const score = rows.reduce((sum, row) => sum + row.value, 0), band = MOOD_BANDS.find(row => score >= row.min);
  return { score, mood: { id: band.id, label: band.label, icon: band.icon, workBonus: band.workBonus }, feelings: rows };
}

/* ----------------------------------------------------------------- stories */
const FOOD = /jollof|suya|egusi|meal|food|dining|coffee|popcorn|picnic/;
const NIGHT = /club|dance|vip|drinks|refreshment|stage|magic-city|cage|bear-barn|tokyo/;
const MEET = /meet|community|hangout|social|network/;
const at = venue => e => e.type === 'enter-venue' && e.venueId === venue;
export const STORIES = Object.freeze([
  { id: 'first-week', icon: '🧳', title: 'First week in the capital', blurb: 'Settle in and get to know your new city.', naira: 250_000, rep: 80, steps: [
    { title: 'Freshen up at home', hint: 'Take a shower at home', when: e => e.type === 'shower' },
    { title: 'Cross town', hint: 'Travel to another district', when: e => e.type === 'travel' },
    { title: 'Visit Millennium Park', hint: 'Millennium Park, Maitama', when: at('millennium-park-hub') },
    { title: 'Chop something outside', hint: 'Eat at a restaurant, café or market', when: e => e.type === 'venue-activity' && FOOD.test(e.activityId) },
  ] },
  { id: 'nine-to-five', icon: '💼', title: 'Nine to five', blurb: 'Land a job and work your way up.', naira: 500_000, rep: 150, steps: [
    { title: 'Get a job', hint: 'Choose a job from My life → Work', when: e => e.type === 'take-job' },
    { title: 'Clock in', hint: 'Complete a shift at your workplace', when: e => e.type === 'shift' },
    { title: 'Perfect shift', hint: 'Get every task right in one shift', sameEvent: true, when: e => e.type === 'shift' && e.perfect },
    { title: 'Earn a promotion', hint: 'Meet the next rank\'s requirements and accept the promotion', when: e => e.type === 'promotion' },
  ] },
  { id: 'soul-of-abuja', icon: '🕌', title: 'Soul of the city', blurb: 'See the landmarks every Abuja resident knows.', naira: 350_000, rep: 120, steps: [
    { title: 'Pass the City Gate', hint: 'Abuja City Gate, Kukwaba', when: at('city-gate-plaza') },
    { title: 'See Aso Rock', hint: 'Aso Rock Viewpoint, Central Area', when: at('aso-rock-view') },
    { title: 'Visit a national house of worship', hint: 'National Mosque or National Christian Centre', when: e => e.type === 'enter-venue' && ['national-mosque-hub', 'national-christian-centre-hub'].includes(e.venueId) },
    { title: 'Stand at Eagle Square', hint: 'Eagle Square, Central Area', when: at('eagle-square-hub') },
  ] },
  { id: 'after-dark', icon: '🌙', title: 'Abuja after dark', blurb: 'Look sharp, link up and enjoy the night.', naira: 300_000, rep: 100, requires: 'first-week', steps: [
    { title: 'Get a fresh cut', hint: 'Fresh Studio salon', when: e => e.type === 'venue-activity' && /salon/.test(e.activityId) },
    { title: 'Link up with people', hint: 'Hang out or join a meet-up anywhere', when: e => e.type === 'hangout' || (e.type === 'venue-activity' && MEET.test(e.activityId)) },
    { title: 'Hit the club', hint: 'Dance at Tokyo, Cage, Magic City or Bear Barn', when: e => e.type === 'venue-activity' && NIGHT.test(`${e.activityId} ${e.venueId}`) },
    { title: 'Sleep it off', hint: 'Sleep in your own bed', when: e => e.type === 'sleep' },
  ] },
  { id: 'make-am', icon: '🚕', title: 'Make am', blurb: 'Hustle the streets and build your name.', naira: 400_000, rep: 120, steps: [
    { title: 'First gig', hint: 'Finish any street gig', when: e => e.type === 'gig' },
    { title: 'Three more gigs', hint: 'Finish three more street gigs', goal: 3, when: e => e.type === 'gig' },
    { title: 'Full day\'s hustle', hint: 'Collect the Today\'s Hustle all-three bonus', when: e => e.type === 'hustle-bonus' },
  ] },
]);
const storyById = new Map(STORIES.map(story => [story.id, story]));

/* ------------------------------------------------------------------ state */
export const PROGRESSION_ACTIONS = new Set(['career-promote', 'story-claim']);
export const PROGRESSION_MONEY_ACTIONS = new Set(['story-claim']);
export class ProgressionError extends Error {
  constructor(message, code = 'invalid_progression_action', status = 409) { super(message); this.code = code; this.status = status; }
}
const check = (value, message, code) => { if (!value) throw new ProgressionError(message, code); };
export function ensureProgress(profile) {
  const life = profile.lifeProgress && typeof profile.lifeProgress === 'object' ? profile.lifeProgress : {};
  profile.lifeProgress = {
    v: 1,
    careers: life.careers && typeof life.careers === 'object' ? life.careers : {},
    feelings: Array.isArray(life.feelings) ? life.feelings : [],
    stories: life.stories && typeof life.stories === 'object' ? life.stories : {},
    levels: life.levels && typeof life.levels === 'object' ? life.levels : {},
    // Recent shift ids, so a replayed shift result is never counted twice.
    shiftIds: Array.isArray(life.shiftIds) ? life.shiftIds : [],
  };
  if (!profile.skills || typeof profile.skills !== 'object') profile.skills = {};
  return profile.lifeProgress;
}
const career = (life, jobId) => (life.careers[jobId] ||= { rank: 0, shifts: 0, perfect: 0 });
function feel(life, id, now, cause) {
  const rule = FEELING_EVENTS[id]; if (!rule) return;
  life.feelings = life.feelings.filter(row => row.id !== id && row.until > now);
  life.feelings.push({ id, until: now + rule.hours * HOUR, ...(cause ? { cause } : {}) });
  life.feelings = life.feelings.slice(-FEELINGS_KEPT);
}
const addSkill = (profile, skill, amount = 1) => { if (SKILL_IDS.has(skill)) profile.skills[skill] = SAFE(profile.skills[skill]) + amount; };

/** Pay for a completed shift: base share for correct answers × rank × mood. */
export function shiftPay(profile, job, correct, now) {
  const life = profile.lifeProgress || {}, rank = SAFE(life.careers?.[job.id]?.rank), multiplier = CAREER_RULES.payMultiplier[Math.min(rank, CAREER_RANKS - 1)];
  const mood = feelingsView(profile, now).mood, base = job.pay * (0.4 + 0.6 * correct / job.tasks.length);
  return Math.round(base * multiplier * (100 + mood.workBonus) / 100);
}

/** Normalises a completed action into a progression event, or null. */
export function progressionEvent(profile, { kind, payload = {}, extra = {} }) {
  if (kind === 'gig-complete' && extra.payout) return { type: 'gig', kind: extra.payout.kind };
  if (kind === 'complete-shift' && extra.result) return { type: 'shift', jobId: profile.job, challengeId: String(extra.result.challengeId || ''), correct: extra.result.correct, total: extra.result.total, perfect: extra.result.correct === extra.result.total };
  if (kind === 'venue-action') return { type: 'venue-activity', activityId: String(payload.activityId || ''), venueId: String(payload.venueId || profile.location?.venue || '') };
  if (kind === 'enter-venue') return { type: 'enter-venue', venueId: String(payload.venueId || '') };
  // Arriving straight into a destination counts as entering it.
  if (kind === 'arrive' && profile.location?.kind === 'venue') return { type: 'enter-venue', venueId: String(profile.location.venue || '') };
  if (kind === 'travel' && payload.district) return { type: 'travel', district: String(payload.district) };
  if (kind === 'take-job') return { type: 'take-job', jobId: String(payload.jobId || '') };
  if (kind === 'hustle-claim' && payload.missionId === 'bonus') return { type: 'hustle-bonus' };
  if (['shower', 'exercise', 'cinema', 'hangout', 'eat', 'sleep', 'relax'].includes(kind)) return { type: kind };
  return null;
}

function advanceStories(life, event, now) {
  const done = [];
  for (const story of STORIES) {
    const row = (life.stories[story.id] ||= { step: 0, count: 0, claimed: false });
    if (row.step >= story.steps.length) continue;
    if (story.requires && (life.stories[story.requires]?.step || 0) < storyById.get(story.requires).steps.length) continue;
    // A step marked sameEvent may be finished by the event that finished the step before it.
    for (let first = true; row.step < story.steps.length; first = false) {
      const step = story.steps[row.step]; if ((!first && !step.sameEvent) || !step.when(event)) break;
      row.count += 1; if (row.count < (step.goal || 1)) break;
      row.step += 1; row.count = 0; if (row.step >= story.steps.length) { row.completedAt = now; done.push(story.id); }
    }
  }
  for (const id of done) feel(life, 'story-done', now, `You finished “${storyById.get(id).title}”.`);
  return done;
}

/** Called by both stores and the preview after an action succeeds, inside the same atomic operation. */
export function recordProgression(profile, { kind, payload, extra = {}, now }) {
  const event = progressionEvent(profile, { kind, payload, extra }); if (!event) return null;
  const life = ensureProgress(profile);
  if (event.type === 'shift') {
    if (event.challengeId && life.shiftIds.includes(event.challengeId)) return null;
    if (event.challengeId) life.shiftIds = [...life.shiftIds, event.challengeId].slice(-20);
  }
  // Skills the stores do not already award.
  if (event.type === 'eat') addSkill(profile, 'Cooking');
  if (event.type === 'exercise') addSkill(profile, 'Fitness');
  if (event.type === 'hangout') addSkill(profile, 'Charisma');
  if (event.type === 'venue-activity') {
    const id = event.activityId;
    if (/stadium-train|gym-recovery|walk/.test(id)) addSkill(profile, 'Fitness');
    if (MEET.test(id) || NIGHT.test(`${id} ${event.venueId}`)) addSkill(profile, 'Charisma');
    if (/workshop|exhibition|gallery/.test(id)) addSkill(profile, 'Creative');
    if (/banex/.test(id)) addSkill(profile, 'Technology');
    if (/cbn-career|cbn-exhibit/.test(id)) addSkill(profile, 'Finance');
    if (/wtc-network|icc-conference/.test(id)) addSkill(profile, 'Sales');
  }
  // Feelings from what just happened.
  if (event.type === 'shift') {
    const row = career(life, event.jobId); row.shifts += 1; if (event.perfect) row.perfect += 1;
    if (event.perfect) feel(life, 'great-shift', now); else if (event.correct <= 1) feel(life, 'rough-shift', now);
  }
  if (event.type === 'eat' || (event.type === 'venue-activity' && FOOD.test(event.activityId))) feel(life, 'good-meal', now);
  if (event.type === 'shower' || (event.type === 'venue-activity' && /salon|shower/.test(event.activityId))) feel(life, 'fresh', now);
  if (event.type === 'exercise' || (event.type === 'venue-activity' && /gym|train|workout/.test(event.activityId))) feel(life, 'pumped', now);
  if (event.type === 'venue-activity' && NIGHT.test(`${event.activityId} ${event.venueId}`)) feel(life, 'night-out', now);
  if (event.type === 'venue-activity' && /prayer|reflect|mosque|church|christian/.test(`${event.activityId} ${event.venueId}`)) feel(life, 'blessed', now);
  if (event.type === 'venue-activity' && /photo|view|observe|exhibit|gallery/.test(event.activityId)) feel(life, 'sightseer', now);
  if (event.type === 'sleep') feel(life, 'rested', now);
  // Level-ups are noticed once.
  const levelUps = [];
  for (const skill of SKILL_IDS) {
    const level = levelOf(profile, skill), seen = SAFE(life.levels[skill]);
    if (level > seen) { life.levels[skill] = level; if (seen > 0 || level > 1) levelUps.push({ skill, level }); }
  }
  if (levelUps.length) feel(life, 'skill-up', now, `${levelUps.map(up => `${up.skill} level ${up.level}`).join(', ')}.`);
  const storiesDone = advanceStories(life, event, now);
  return { levelUps, storiesDone };
}

/* ------------------------------------------------------------------- view */
export function careerView(profile, jobId = profile.job) {
  const titles = CAREER_TITLES[jobId]; if (!titles) return null;
  const life = profile.lifeProgress || {}, row = life.careers?.[jobId] || { rank: 0, shifts: 0, perfect: 0 };
  const rank = Math.min(SAFE(row.rank), CAREER_RANKS - 1), nextRank = rank + 1 < CAREER_RANKS ? rank + 1 : null;
  const skill = jobSkill(jobId), skillNow = levelOf(profile, skill), repNow = repLevelOf(profile);
  const requirements = nextRank === null ? [] : [
    { id: 'shifts', label: `${CAREER_RULES.shifts[nextRank]} shifts as ${titles[0].toLowerCase()} or above`, have: SAFE(row.shifts), need: CAREER_RULES.shifts[nextRank] },
    { id: 'skill', label: `${skill} level ${CAREER_RULES.skillLevel[nextRank]}`, have: skillNow, need: CAREER_RULES.skillLevel[nextRank] },
    { id: 'rep', label: `Abuja Rep level ${CAREER_RULES.repLevel[nextRank]}`, have: repNow, need: CAREER_RULES.repLevel[nextRank] },
  ].map(req => ({ ...req, met: req.have >= req.need }));
  return { jobId, skill, rank: rank + 1, ranks: CAREER_RANKS, title: titles[rank], shifts: SAFE(row.shifts), perfect: SAFE(row.perfect), payMultiplier: CAREER_RULES.payMultiplier[rank],
    ladder: titles.map((title, index) => ({ rank: index + 1, title, payMultiplier: CAREER_RULES.payMultiplier[index], reached: index <= rank })),
    next: nextRank === null ? null : { rank: nextRank + 1, title: titles[nextRank], payMultiplier: CAREER_RULES.payMultiplier[nextRank], requirements, eligible: requirements.every(req => req.met) } };
}
const jobSkill = jobId => CATALOGUE_JOBS[jobId]?.skill || 'Hospitality';

export function storiesView(profile) {
  const life = profile.lifeProgress || {};
  return STORIES.map(story => {
    const row = life.stories?.[story.id] || { step: 0, count: 0, claimed: false }, step = Math.min(SAFE(row.step), story.steps.length);
    const locked = Boolean(story.requires && SAFE(life.stories?.[story.requires]?.step) < storyById.get(story.requires).steps.length);
    return { id: story.id, icon: story.icon, title: story.title, blurb: story.blurb, naira: story.naira, rep: story.rep, locked, requires: story.requires ? storyById.get(story.requires).title : null,
      done: step >= story.steps.length, claimed: Boolean(row.claimed),
      steps: story.steps.map((item, index) => ({ title: item.title, hint: item.hint, goal: item.goal || 1, progress: index < step ? (item.goal || 1) : index === step ? SAFE(row.count) : 0, done: index < step, current: index === step && !locked })) };
  });
}
export function progressionView(profile, now) {
  return {
    skills: SKILLS.map(skill => ({ ...skill, ...skillLevel(profile.skills?.[skill.id]) })),
    career: careerView(profile),
    ...feelingsView(profile, now),
    stories: storiesView(profile),
    rules: { maxSkillLevel: SKILL_MAX_LEVEL, careerRanks: CAREER_RANKS },
  };
}

/* ---------------------------------------------------------------- actions */
/** Shared by both stores and the preview inside their existing atomic economy operation. */
export function applyProgressionAction(profile, action, payload = {}, { now }) {
  check(PROGRESSION_ACTIONS.has(action), 'Unknown action.', 'invalid_progression_action');
  const life = ensureProgress(profile);
  if (action === 'career-promote') {
    check(profile.job && CAREER_TITLES[profile.job], 'Get a job before asking for a promotion.', 'career_no_job');
    const view = careerView(profile); check(view.next, 'You are already at the top of this career.', 'career_top');
    const missing = view.next.requirements.filter(req => !req.met);
    check(!missing.length, `Not yet: ${missing.map(req => req.label).join(', ')}.`, 'career_not_ready');
    career(life, profile.job).rank = view.next.rank - 1;
    profile.rep = { xp: SAFE(profile.rep?.xp) + CAREER_RULES.promotionRep };
    feel(life, 'promoted', now, `You are now ${view.next.title}.`);
    // Promotion is itself a story event.
    const storiesDone = advanceStories(life, { type: 'promotion' }, now);
    return { progression: progressionView(profile, now), promotion: { title: view.next.title, rank: view.next.rank, payMultiplier: view.next.payMultiplier, rep: CAREER_RULES.promotionRep }, storiesDone };
  }
  // story-claim
  const story = storyById.get(String(payload.storyId || '')); check(story, 'Choose an Abuja Story.', 'story_unknown');
  const row = life.stories[story.id]; check(row && row.step >= story.steps.length, 'Finish every step of this story first.', 'story_not_done');
  check(!row.claimed, 'You already collected this story\'s reward.', 'story_claimed');
  check(Number.isSafeInteger(profile.wallet + story.naira), 'This reward cannot be represented as exact whole Naira.', 'numeric_limit');
  row.claimed = true; profile.wallet += story.naira; profile.rep = { xp: SAFE(profile.rep?.xp) + story.rep };
  return { progression: progressionView(profile, now), reward: { naira: story.naira, rep: story.rep, label: story.title }, ledgerReason: `Abuja Story · ${story.title}`, ledgerType: 'OTHER_GAME_INCOME' };
}
