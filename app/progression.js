// My progress: skills, the career ladder, feelings with their causes and the
// Abuja Stories. Presentation only: the server records progress from real
// actions, decides promotions and pays every story reward through the ledger.
import { apiFetch } from './api-client.js';
import { showGameToast as toast } from './game-toast.js';
import { progressionView, SKILL_MAX_LEVEL } from '../src/shared/progression.mjs';

const sheetRoot = document.querySelector('#sheet-root');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const naira = value => `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
const short = value => value >= 1_000_000 ? `₦${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M` : value >= 1000 ? `₦${Math.round(value / 1000)}k` : naira(value);
const signed = value => `${value > 0 ? '+' : ''}${value}`;
const TABS = [['feelings', 'Feelings'], ['career', 'Career'], ['skills', 'Skills'], ['stories', 'Stories']];
let profile = null, view = null, tab = 'feelings', busy = false, clockOffset = 0, snapshot = null;
const now = () => Date.now() + clockOffset;

async function load() {
  const response = await apiFetch('/api/bootstrap', { timeoutMs: 12000 }), body = await response.json().catch(() => ({}));
  if (!response.ok || !body.profile) throw new Error(body.error || 'Sign in to see your progress.');
  if (Number.isFinite(body.serverTime)) clockOffset = body.serverTime - Date.now();
  accept(body.profile, { quiet: true });
}
async function act(action, payload = {}) {
  const response = await apiFetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, payload }), timeoutMs: 15000 });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'That did not work. Please try again.'), { code: body.code });
  if (body.profile) dispatchEvent(new CustomEvent('abujalife:profile', { detail: { profile: body.profile } }));
  return body;
}

/* Milestones are spotted by comparing successive profiles, so they show up
   whichever screen performed the action. */
function marks(p) {
  const life = p?.lifeProgress || {};
  return { levels: { ...(life.levels || {}) }, ranks: Object.fromEntries(Object.entries(life.careers || {}).map(([id, row]) => [id, row.rank || 0])),
    stories: Object.fromEntries(Object.entries(life.stories || {}).map(([id, row]) => [id, row.completedAt || 0])) };
}
function announce(before, after, next) {
  if (!before) return;
  for (const [skill, level] of Object.entries(after.levels)) if (level > (before.levels[skill] || 0) && level > 1) toast(`📈 ${skill} is now level ${level}`);
  for (const [id, rank] of Object.entries(after.ranks)) if (rank > (before.ranks[id] ?? 0)) { const career = next.career?.jobId === id ? next.career : null; toast(`🎉 Promoted${career ? ` to ${career.title}` : ''}! Pay is up.`); }
  for (const [id, done] of Object.entries(after.stories)) if (done && !before.stories[id]) { const story = next.stories.find(s => s.id === id); toast(`📖 Story finished: ${story?.title || id}. Collect your reward in My progress.`); }
}
function accept(nextProfile, { quiet = false } = {}) {
  profile = nextProfile; view = progressionView(profile, now());
  const next = marks(profile); if (!quiet) announce(snapshot, next, view); snapshot = next;
  refreshChip(); if (sheetRoot?.querySelector('.abj-progress')) paint();
}

/* ------------------------------------------------------------------ markup */
function bar(percent, cls = '') { return `<div class="progress-bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${Math.max(0, Math.min(100, percent))}%"></i></div>`; }
function feelingsMarkup() {
  const rows = view.feelings;
  return `<div class="progress-mood mood-${esc(view.mood.id)}"><span aria-hidden="true">${view.mood.icon}</span><div><small>OVERALL MOOD</small><strong>${esc(view.mood.label)}</strong><p>${view.mood.workBonus ? `${signed(view.mood.workBonus)}% performance at work` : 'No effect on work right now'}</p></div><b>${signed(view.score)}</b></div>
${rows.length ? `<div class="progress-feelings">${rows.map(row => `<article class="${row.value >= 0 ? 'good' : 'bad'}"><span aria-hidden="true">${row.icon}</span><div><strong>${esc(row.label)}</strong><p>${esc(row.cause)}</p></div><b>${signed(row.value)}</b>${row.until ? `<small>${timeLeft(row.until)}</small>` : ''}</article>`).join('')}</div>` : '<p class="muted">Nothing is bothering you, and nothing special has happened yet today.</p>'}
<p class="muted progress-note">Feelings come from your needs, your home and what you have done recently. Happy residents work better.</p>`;
}
function timeLeft(until) { const minutes = Math.max(1, Math.round((until - now()) / 60000)); return minutes >= 60 ? `${Math.round(minutes / 60)}h left` : `${minutes}m left`; }
function careerMarkup() {
  const career = view.career;
  if (!career) return '<div class="progress-empty"><span aria-hidden="true">💼</span><strong>No job yet</strong><p>Pick a job in My life → Work. Every job has five ranks, and each promotion raises your pay.</p></div>';
  const next = career.next;
  return `<div class="progress-career"><small>${esc(career.skill.toUpperCase())} CAREER · RANK ${career.rank} OF ${career.ranks}</small><strong>${esc(career.title)}</strong><p>${career.shifts} shifts · ${career.perfect} perfect · pay ×${career.payMultiplier.toFixed(2)}</p></div>
<ol class="progress-ladder">${career.ladder.map(rung => `<li class="${rung.reached ? 'reached' : ''} ${rung.rank === career.rank ? 'current' : ''}"><b>${rung.rank}</b><span>${esc(rung.title)}</span><small>×${rung.payMultiplier.toFixed(2)} pay</small></li>`).join('')}</ol>
${next ? `<h3 class="progress-heading">Next: ${esc(next.title)}</h3><div class="progress-reqs">${next.requirements.map(req => `<div class="${req.met ? 'met' : ''}"><span aria-hidden="true">${req.met ? '✓' : '○'}</span><p>${esc(req.label)}</p><b>${Math.min(req.have, req.need)}/${req.need}</b></div>`).join('')}</div>
<button type="button" class="primary progress-promote" data-progress-promote ${next.eligible && !busy ? '' : 'disabled'}>${next.eligible ? `Accept promotion · pay ×${next.payMultiplier.toFixed(2)}` : 'Meet every requirement to be promoted'}</button>` : '<p class="progress-top">🏆 You have reached the top of this career.</p>'}`;
}
function skillsMarkup() {
  return `<div class="progress-skills">${view.skills.map(skill => `<article class="${skill.level ? '' : 'untrained'}"><span aria-hidden="true">${skill.icon}</span><div><strong>${esc(skill.id)}</strong><p>${esc(skill.blurb)}</p>${bar(skill.percent)}</div><b>${skill.level ? `Lv ${skill.level}` : '—'}</b><small>${skill.level >= SKILL_MAX_LEVEL ? 'Mastered' : skill.level ? `${skill.remaining} XP to Lv ${skill.level + 1}` : 'Not started'}</small></article>`).join('')}</div>
<p class="muted progress-note">Skills grow from real things you do: shifts raise your job skill, the gym builds Fitness, meet-ups and nights out build Charisma, and cooking at home builds Cooking.</p>`;
}
function storiesMarkup() {
  return `<div class="progress-stories">${view.stories.map(story => {
    const finished = story.steps.filter(step => step.done).length;
    return `<article class="${story.claimed ? 'claimed' : story.done ? 'ready' : story.locked ? 'locked' : ''}"><header><span aria-hidden="true">${story.locked ? '🔒' : story.icon}</span><div><strong>${esc(story.title)}</strong><p>${esc(story.locked ? `Finish “${story.requires}” to unlock.` : story.blurb)}</p></div><div class="progress-reward"><b>${short(story.naira)}</b><small>+${story.rep} Rep</small></div></header>
${bar(Math.round(finished / story.steps.length * 100))}
<ol>${story.steps.map(step => `<li class="${step.done ? 'done' : step.current ? 'current' : ''}"><span aria-hidden="true">${step.done ? '✓' : step.current ? '➜' : '·'}</span><div><strong>${esc(step.title)}${step.goal > 1 ? ` (${step.progress}/${step.goal})` : ''}</strong><small>${esc(step.hint)}</small></div></li>`).join('')}</ol>
${story.claimed ? '<em>Reward collected</em>' : story.done ? `<button type="button" class="primary" data-progress-claim="${esc(story.id)}" ${busy ? 'disabled' : ''}>Collect ${short(story.naira)} + ${story.rep} Rep</button>` : ''}</article>`;
  }).join('')}</div>`;
}
function markup() {
  const body = { feelings: feelingsMarkup, career: careerMarkup, skills: skillsMarkup, stories: storiesMarkup }[tab]();
  const ready = view.stories.filter(story => story.done && !story.claimed).length + (view.career?.next?.eligible ? 1 : 0);
  return `<div class="sheet-backdrop"><section class="sheet game-sheet-wide abj-progress" role="dialog" aria-modal="true" aria-labelledby="progress-title"><button class="sheet-close icon-button" data-progress-close aria-label="Close my progress">×</button>
<span class="eyebrow">YOUR LIFE IN ABUJA</span><h2 id="progress-title">My progress</h2>
<div class="progress-tabs" role="tablist">${TABS.map(([id, label]) => `<button type="button" role="tab" aria-selected="${tab === id}" data-progress-tab="${id}">${label}${(id === 'stories' && view.stories.some(s => s.done && !s.claimed)) || (id === 'career' && view.career?.next?.eligible) ? ' •' : ''}</button>`).join('')}</div>
<div class="progress-body" role="tabpanel">${body}</div>${ready && tab === 'feelings' ? '<p class="progress-ready">You have something ready to collect.</p>' : ''}</section></div>`;
}
function paint() {
  if (!view || !sheetRoot) return;
  sheetRoot.innerHTML = markup();
  const close = () => sheetRoot.replaceChildren();
  sheetRoot.querySelector('[data-progress-close]').onclick = close;
  sheetRoot.querySelector('.sheet-backdrop').onclick = event => { if (event.target.classList.contains('sheet-backdrop')) close(); };
  sheetRoot.querySelectorAll('[data-progress-tab]').forEach(button => button.onclick = () => { tab = button.dataset.progressTab; paint(); });
  const run = async (action, payload, done) => { if (busy) return; busy = true; paint(); try { const result = await act(action, payload); done?.(result); } catch (error) { toast(error.message); } finally { busy = false; if (sheetRoot.querySelector('.abj-progress')) paint(); } };
  sheetRoot.querySelector('[data-progress-promote]')?.addEventListener('click', () => void run('career-promote', {}));
  sheetRoot.querySelectorAll('[data-progress-claim]').forEach(button => button.onclick = () => void run('story-claim', { storyId: button.dataset.progressClaim, idempotencyKey: crypto.randomUUID() }, result => toast(`Collected ${naira(result.reward.naira)} + ${result.reward.rep} Rep`)));
}
export async function openProgress(startTab) {
  if (startTab) tab = startTab;
  try { await load(); paint(); } catch (error) { toast(error.message); }
}

/* ------------------------------------------------------------ entry points */
function ensureLifeEntry() {
  const grid = sheetRoot?.querySelector('.life-menu-grid'); if (!grid || grid.querySelector('[data-abj-progress]')) return;
  const button = document.createElement('button'); button.dataset.abjProgress = ''; button.className = 'abj-progress-entry';
  button.innerHTML = '<span aria-hidden="true">📈</span><strong>My progress</strong><small>Feelings · career · skills · stories</small>'; button.onclick = () => void openProgress();
  const hustle = grid.querySelector('[data-abj-hustle]'); hustle ? hustle.after(button) : grid.prepend(button);
}
function chipText() { return view ? `${view.mood.icon} ${view.mood.label}` : '🙂 Mood'; }
function refreshChip() { document.querySelectorAll('.mood-chip').forEach(chip => { const text = chipText(); if (chip.textContent !== text) chip.textContent = text; chip.dataset.mood = view?.mood.id || ''; }); }
function ensureChip() {
  const stage = document.querySelector('.world-stage'); if (!stage || stage.querySelector('.mood-chip')) return;
  const canvas = stage.querySelector('.world-canvas'); if (!canvas || canvas.classList.contains('world-preview')) return;
  const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'mood-chip'; chip.setAttribute('aria-label', 'Open my feelings and progress');
  chip.onclick = () => void openProgress('feelings'); stage.append(chip); refreshChip();
}
if (sheetRoot) new MutationObserver(ensureLifeEntry).observe(sheetRoot, { childList: true });
addEventListener('abujalife:world-mounted', () => { ensureChip(); if (!view) void load().catch(() => {}); });
addEventListener('abujalife:profile', event => { if (event.detail?.profile) accept(event.detail.profile); });
addEventListener('abujalife:action-result', event => { if (event.detail?.profile) accept(event.detail.profile); });
// Feelings expire with time, so the chip is refreshed even when nothing else happens.
setInterval(() => { if (profile) { view = progressionView(profile, now()); refreshChip(); } }, 60_000);
ensureLifeEntry(); ensureChip();
addEventListener('abj:open-progress', event => void openProgress(event.detail?.tab));
