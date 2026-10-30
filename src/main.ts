import { SPREAD_DURATION } from './bonuses.ts';
import { startAtBoss } from './start-mode.ts';
import './style.css';
import { LEVEL_DURATION, levelPart } from './level.ts';
import { createScene } from './scene';
import { createGame, pauseGame, restartGame, resumeGame, updateGame } from './game.ts';

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Chybí ${selector}`);
  return element;
}
const container = required('#app');
container.textContent = 'Načítání grafiky…';
const view = await createScene(container).catch((error: unknown) => {
  container.textContent = 'Grafiku se nepodařilo načíst. Obnov stránku a zkus to znovu.';
  throw error;
});
// Canvas už je připojený; odstraníme pouze zprávu o načítání.
for (const node of Array.from(container.childNodes)) {
  if (node.nodeType === Node.TEXT_NODE) node.remove();
}
const score = required('#score');
const lives = required('#lives');
const progress = required<HTMLProgressElement>('#progress');
const section = required('#section');
const result = required('#result');
const overlay = required('#overlay');
const message = required('#message');
const action = required<HTMLButtonElement>('#action');
const debugToggle = required<HTMLInputElement>('#debug');
const terrainToggle = required<HTMLInputElement>('#terrain');
const weaponLabel = required('#weapon-label');
const weaponTimer = required<HTMLProgressElement>('#weapon-timer');
const bonusNotice = required('#bonus-notice');
const bossHud = required('#boss-hud');
const bossHealth = required<HTMLProgressElement>('#boss-health');
const bossLabel = required('#boss-label');
const state = createGame(startAtBoss(import.meta.env.DEV, import.meta.env.MODE));
const bonusMessages = { spread: 'Trojstřela na 12 sekund', repair: 'Oprava · +1 život', repairScore: 'Plné životy · +150 bodů' };
const keys = new Set<string>();
const controls = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
let previousTime: number | undefined;
let frame = 0;
let disposed = false;

function continueGame() {
  if (document.hidden) return;
  if (state.status === 'gameOver' || state.status === 'victory') restartGame(state);
  else resumeGame(state);
  keys.clear();
  action.blur();
  debugToggle.blur();
  terrainToggle.blur();
  previousTime = undefined;
}
function pause() {
  keys.clear();
  pauseGame(state);
  previousTime = undefined;
}
function keydown(event: KeyboardEvent) {
  const interactive = event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement;
  if (interactive && event.code === 'Space') return;
  if (event.target instanceof HTMLButtonElement && event.code === 'Enter') return;
  if (event.code === 'Enter' && state.status !== 'playing') {
    event.preventDefault();
    if (!event.repeat) continueGame();
    return;
  }
  if (event.code === 'Escape' && !event.repeat) {
    if (state.status === 'playing') pause();
    else if (state.status === 'paused') continueGame();
    return;
  }
  if (controls.has(event.code)) {
    event.preventDefault();
    if (state.status === 'playing') keys.add(event.code);
  }
}
const keyup = (event: KeyboardEvent) => { keys.delete(event.code); };
const visibility = () => { if (document.hidden) pause(); };
window.addEventListener('keydown', keydown);
window.addEventListener('keyup', keyup);
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', visibility);
action.addEventListener('click', continueGame);

function tick(time: number) {
  if (disposed) return;
  const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  updateGame(state, {
    x: Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')),
    y: Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS')),
    fire: keys.has('Space'),
  }, dt);
  score.textContent = String(state.score).padStart(6, '0');
  lives.textContent = String(state.lives);
  weaponLabel.textContent = state.weaponLeft > 0 ? `Trojstřela · ${Math.ceil(state.weaponLeft)} s` : 'Zbraň · Jeden paprsek';
  weaponTimer.hidden = state.weaponLeft === 0;
  weaponTimer.max = SPREAD_DURATION;
  weaponTimer.value = state.weaponLeft;
  const notice = state.bonusNotice ? bonusMessages[state.bonusNotice] : '';
  if (bonusNotice.textContent !== notice) bonusNotice.textContent = notice;
  overlay.hidden = state.status === 'playing';
  const finished = state.status === 'gameOver' || state.status === 'victory';
  message.textContent = state.status === 'victory' ? 'Úroveň dokončena' : state.status === 'gameOver' ? 'Konec hry' : 'Pauza';
  result.textContent = finished ? `${state.score} bodů · Zbývající životy: ${state.lives}` : 'Hra čeká na pokračování.';
  action.textContent = finished ? 'Nová hra · Enter' : 'Pokračovat · Enter';
  progress.value = Math.min(1, state.time / LEVEL_DURATION);
  section.textContent = state.status === 'victory' ? 'Hotovo · Úroveň 1'
    : state.missionStage === 'warning' ? 'Varování · Blíží se velitel'
    : state.missionStage === 'bossDestroyed' ? 'Cíl zničen'
    : state.missionStage === 'boss' ? (state.boss?.mode === 'entering' ? 'Boss · Přílet pod štítem'
      : state.boss?.mode === 'transitioning' ? 'Boss · Fáze 2' : `Boss · Fáze ${state.boss?.phase ?? 1}`)
    : levelPart(state.time);
  bossHud.hidden = !state.boss || state.boss.mode === 'entering' || state.boss.mode === 'destroyed';
  bossHealth.max = state.boss?.maxHp ?? 60;
  bossHealth.value = Math.max(0, state.boss?.hp ?? 0);
  bossLabel.textContent = `Velitel · ${Math.max(0, state.boss?.hp ?? 0)} / ${state.boss?.maxHp ?? 60}`;
  view.render(state, debugToggle.checked, terrainToggle.checked);
  frame = requestAnimationFrame(tick);
}
if (!document.hasFocus() || document.hidden) pause();
frame = requestAnimationFrame(tick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', pause);
    document.removeEventListener('visibilitychange', visibility);
    action.removeEventListener('click', continueGame);
    view.dispose();
  });
}
