import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { GameStore, jobs } from '../src/server/gameStore.mjs';
import { SKILLS, skillLevel, feelingsView, shiftPay, careerView, progressionView, recordProgression, applyProgressionAction, STORIES, CAREER_RULES } from '../src/shared/progression.mjs';

const rejects = (fn, code) => assert.throws(fn, error => error.code === code);
const healthy = extra => ({ id: 'r1', hunger: 80, energy: 80, hygiene: 80, social: 80, fun: 80, stress: 40, mood: 70, skills: {}, rep: { xp: 0 }, wallet: 0, home: { propertyId: 'garki-studio' }, ...extra });

test('nine skills level up on a fixed XP curve', () => {
  assert.equal(SKILLS.length, 9);
  assert.deepEqual([0, 1, 3, 4, 9, 10, 160, 9999].map(xp => skillLevel(xp).level), [0, 1, 1, 2, 2, 3, 10, 10]);
  assert.equal(skillLevel(4).remaining, 6); assert.equal(skillLevel(160).next, null);
});

test('feelings explain the mood with named causes and change shift pay', () => {
  const now = Date.parse('2026-10-05T10:00:00Z');
  const fine = feelingsView(healthy(), now);
  assert.ok(fine.feelings.some(f => f.id === 'thriving')); assert.equal(fine.mood.id, 'fine');
  const starving = feelingsView(healthy({ hunger: 5, energy: 10, stress: 90 }), now);
  assert.deepEqual(starving.feelings.slice(0, 3).map(f => f.id), ['starving', 'exhausted', 'stressed']);
  assert.equal(starving.mood.id, 'miserable'); assert.equal(starving.mood.workBonus, -10);
  assert.ok(starving.feelings.every(f => typeof f.cause === 'string' && f.cause.length > 0));
  // A luxury home is a lasting good feeling.
  const elsewhere = feelingsView(healthy({ home: { propertyId: 'missing' }, origin: { residence: { id: 'gift', name: 'Maitama villa', tier: 5 } } }), now);
  assert.ok(!elsewhere.feelings.some(f => f.id === 'living-large'), 'only the home you live in counts');
  const gifted = feelingsView(healthy({ home: { propertyId: 'gift' }, origin: { residence: { id: 'gift', name: 'Maitama villa', tier: 5 } } }), now);
  assert.ok(gifted.feelings.some(f => f.id === 'living-large' && f.value === 18));
  // Mood scales the same base pay.
  const job = jobs['bank-teller'];
  assert.equal(shiftPay(healthy({ hunger: 5, energy: 10, stress: 90 }), job, 3, now), Math.round(job.pay * 0.9));
  assert.equal(shiftPay(healthy(), job, 3, now), job.pay);
});

test('event feelings expire and are bounded', () => {
  const now = Date.parse('2026-10-05T10:00:00Z'), p = healthy();
  recordProgression(p, { kind: 'sleep', payload: {}, extra: {}, now });
  assert.ok(feelingsView(p, now + 1000).feelings.some(f => f.id === 'rested'));
  assert.ok(!feelingsView(p, now + 5 * 3_600_000).feelings.some(f => f.id === 'rested'));
  for (let i = 0; i < 40; i++) recordProgression(p, { kind: ['sleep', 'eat', 'shower', 'exercise'][i % 4], payload: {}, extra: {}, now: now + i });
  assert.ok(p.lifeProgress.feelings.length <= 12);
  assert.equal(new Set(p.lifeProgress.feelings.map(f => f.id)).size, p.lifeProgress.feelings.length, 'one entry per feeling');
});

test('stories advance step by step and only in order', () => {
  const now = Date.parse('2026-10-05T10:00:00Z'), p = healthy();
  const step = () => progressionView(p, now).stories.find(s => s.id === 'soul-of-abuja').steps.filter(s => s.done).length;
  recordProgression(p, { kind: 'enter-venue', payload: { venueId: 'eagle-square-hub' }, extra: {}, now });
  assert.equal(step(), 0, 'Eagle Square is the last step, so it does not count first');
  for (const venueId of ['city-gate-plaza', 'aso-rock-view', 'national-mosque-hub']) recordProgression(p, { kind: 'enter-venue', payload: { venueId }, extra: {}, now });
  assert.equal(step(), 3);
  // Arriving straight inside a destination counts as entering it.
  p.location = { kind: 'venue', venue: 'eagle-square-hub' };
  const result = recordProgression(p, { kind: 'arrive', payload: {}, extra: {}, now });
  assert.deepEqual(result.storiesDone, ['soul-of-abuja']);
  assert.ok(feelingsView(p, now).feelings.some(f => f.id === 'story-done'));
  // A locked story ignores events until its prerequisite is finished.
  recordProgression(p, { kind: 'sleep', payload: {}, extra: {}, now });
  assert.equal(progressionView(p, now).stories.find(s => s.id === 'after-dark').locked, true);
  assert.equal(p.lifeProgress.stories['after-dark'].step, 0);
  rejects(() => applyProgressionAction(p, 'story-claim', { storyId: 'after-dark' }, { now }), 'story_not_done');
  const claim = applyProgressionAction(p, 'story-claim', { storyId: 'soul-of-abuja' }, { now });
  assert.equal(p.wallet, STORIES.find(s => s.id === 'soul-of-abuja').naira); assert.equal(claim.reward.rep, 120);
  rejects(() => applyProgressionAction(p, 'story-claim', { storyId: 'soul-of-abuja' }, { now }), 'story_claimed');
});

async function fixture(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'abujalife-progression-'));
  let now = Date.parse('2026-10-05T07:30:00Z'); // Monday 08:30 in Abuja
  const store = new GameStore({ dataDir, clock: () => now, originRandomInt: (min, max) => max === 2 ? 1 : 0 });
  t.after(() => { store.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const id = (await store.register({ username: 'career_resident', password: 'a-test-password' })).residentId;
  const f = { id, store, get now() { return now; }, at(time) { now = Date.parse(time); }, advance(ms) { now += ms; },
    workplace(jobId) { store.action(id, 'take-job', { jobId }); const p = store.profile(id); if (p.location.kind === 'home') store.action(id, 'leave-home'); if (p.district !== jobs[jobId].district) { const { trip } = store.action(id, 'travel', { district: jobs[jobId].district, mode: 'bus' }); now += trip.seconds * 1000; store.action(id, 'arrive', { tripId: trip.id }); } },
    shift(correct = 3) {
      const { challenge } = store.action(id, 'start-shift'); now += 2000; const job = jobs[challenge.jobId];
      const answers = job.tasks.map((task, index) => ({ taskId: task.id, optionId: index < correct ? task.answer : task.options.find(o => o.id !== task.answer).id }));
      const before = store.profile(id), expected = shiftPay(before, job, correct, now);
      const result = store.action(id, 'complete-shift', { challengeId: challenge.id, answers });
      assert.equal(result.result.pay, expected, 'the store pays exactly the shared rule'); return { result, challenge, answers };
    },
    rest() { const p = store.profile(id); p.energy = 90; p.hunger = 90; p.hygiene = 90; p.social = 90; p.fun = 90; p.stress = 40; store.save(p); },
  };
  return f;
}

test('a real career: shifts build skill, promotion needs every requirement, then pay rises', async t => {
  const f = await fixture(t);
  f.workplace('bank-teller');
  let view = careerView(f.store.profile(f.id));
  assert.equal(view.title, 'Bank teller'); assert.equal(view.next.title, 'Senior teller'); assert.equal(view.next.eligible, false);
  rejects(() => f.store.action(f.id, 'career-promote'), 'career_not_ready');
  assert.equal(f.store.profile(f.id).lifeProgress.careers['bank-teller']?.rank ?? 0, 0);

  f.rest(); const first = f.shift(3);
  let p = f.store.profile(f.id);
  assert.equal(p.lifeProgress.careers['bank-teller'].shifts, 1); assert.equal(p.lifeProgress.careers['bank-teller'].perfect, 1);
  assert.ok(feelingsView(p, f.now).feelings.some(x => x.id === 'great-shift'));
  // Replaying the same completed shift never counts it twice.
  f.store.action(f.id, 'complete-shift', { challengeId: first.challenge.id, answers: first.answers });
  assert.equal(f.store.profile(f.id).lifeProgress.careers['bank-teller'].shifts, 1);
  // Story: got a job, clocked in, perfect shift.
  assert.equal(f.store.profile(f.id).lifeProgress.stories['nine-to-five'].step, 3);

  f.advance(4 * 3_600_000); f.rest(); f.shift(3); // afternoon slot
  f.at('2026-10-06T07:30:00Z'); f.rest(); f.shift(3); f.advance(4 * 3_600_000); f.rest(); f.shift(1);
  p = f.store.profile(f.id);
  assert.ok(feelingsView(p, f.now).feelings.some(x => x.id === 'rough-shift'));
  view = careerView(p);
  assert.equal(view.shifts, 4); assert.ok(skillLevel(p.skills.Finance).level >= CAREER_RULES.skillLevel[1]);
  assert.equal(view.next.eligible, true, JSON.stringify(view.next.requirements));

  const repBefore = p.rep?.xp || 0, promoted = f.store.action(f.id, 'career-promote');
  assert.equal(promoted.promotion.title, 'Senior teller'); assert.deepEqual(promoted.storiesDone, ['nine-to-five']);
  p = f.store.profile(f.id);
  assert.equal(p.rep.xp, repBefore + CAREER_RULES.promotionRep); assert.equal(careerView(p).title, 'Senior teller');
  assert.ok(feelingsView(p, f.now).feelings.some(x => x.id === 'promoted'));

  // The story reward is a single idempotent ledger credit.
  const key = crypto.randomUUID(), wallet = p.wallet;
  const claim = f.store.action(f.id, 'story-claim', { storyId: 'nine-to-five', idempotencyKey: key });
  assert.equal(claim.profile.wallet, wallet + 500_000);
  const replay = f.store.action(f.id, 'story-claim', { storyId: 'nine-to-five', idempotencyKey: key });
  assert.equal(replay.replayed, true); assert.equal(f.store.profile(f.id).wallet, wallet + 500_000);
  rejects(() => f.store.action(f.id, 'story-claim', { storyId: 'nine-to-five', idempotencyKey: crypto.randomUUID() }), 'story_claimed');
  rejects(() => f.store.action(f.id, 'story-claim', { storyId: 'nine-to-five' }), 'idempotency_required');

  // Promoted pay: 1.15× for the same work and mood.
  f.at('2026-10-07T07:30:00Z'); f.rest();
  const job = jobs['bank-teller'], { result } = f.shift(3), mood = feelingsView(f.store.profile(f.id), f.now).mood;
  assert.equal(result.result.pay, Math.round(job.pay * 1.15 * (100 + mood.workBonus) / 100));

  // Changing job starts that ladder at the bottom; the old rank is kept.
  f.store.action(f.id, 'take-job', { jobId: 'junior-dev' });
  p = f.store.profile(f.id);
  assert.equal(careerView(p).title, 'Junior developer'); assert.equal(careerView(p, 'bank-teller').title, 'Senior teller');
});

test('progression state survives a store restart and level-ups are reported once', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'abujalife-progression-'));
  let now = Date.parse('2026-10-05T10:00:00Z'); let store = new GameStore({ dataDir, clock: () => now, originRandomInt: (min, max) => max === 2 ? 1 : 0 });
  t.after(() => { store.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const id = (await store.register({ username: 'cook_resident', password: 'a-test-password' })).residentId;
  const p = store.profile(id); if (p.location.kind !== 'home') { store.action(id, 'enter-home'); }
  const reports = [];
  for (let i = 0; i < 5; i++) { const q = store.profile(id); q.hunger = 10; q.wallet = Math.max(q.wallet, 1_000_000); store.save(q); now += 60_000; const r = store.action(id, 'eat'); if (r.milestones) reports.push(...r.milestones.levelUps); }
  assert.equal(store.profile(id).skills.Cooking, 5);
  assert.deepEqual(reports.map(r => `${r.skill}:${r.level}`), ['Cooking:2'], 'level 2 is announced once');
  store.close(); store = new GameStore({ dataDir, clock: () => now });
  const after = store.profile(id);
  assert.equal(after.skills.Cooking, 5); assert.ok(after.lifeProgress.feelings.some(f => f.id === 'good-meal'));
});
