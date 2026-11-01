import atlasUrl from './assets/tyrian-fx.png?url';
import { ATLAS, atlasRegion } from './sprite-clips.ts';
import { PLAYER_SHIPS, PLAYER_SHIP_CLIPS, DEFAULT_PLAYER_SHIP, playerShipPose } from './player-ships.ts';
import type { PlayerShipId } from './player-ships.ts';
import { SPREAD_DURATION } from './bonuses.ts';
import { startAtBoss, startLevel } from './start-mode.ts';
import './style.css';
import { getLevel, levelPart, hasNextLevel } from './level.ts';
import { createScene } from './scene';
import { createGame, beginLevelDeparture, advanceLevel, pauseGame, restartGame, resumeGame, updateGame } from './game.ts';

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
let selectedShip: PlayerShipId = DEFAULT_PLAYER_SHIP;
const shipChoice = required<HTMLButtonElement>('#ship-choice');
const shipPicker = required<HTMLDialogElement>('#ship-picker');
const shipOptions = required('#ship-options');
const shipPickerClose = required<HTMLButtonElement>('#ship-picker-close');
const state = createGame(startAtBoss(import.meta.env.DEV, import.meta.env.MODE), startLevel(import.meta.env.DEV, import.meta.env.MODE));
const levelTitle = required('#level-title');
const debugTools = required('#debug-tools');
const debugLevel2 = required<HTMLButtonElement>('#debug-level2');
const debugAirships = required('#debug-airships');
const debugLevel3 = required<HTMLButtonElement>('#debug-level3');
const debugDeparture = required<HTMLButtonElement>('#debug-departure');
const debugBoss3 = required<HTMLButtonElement>('#debug-boss3');
const debugBoss2 = required<HTMLButtonElement>('#debug-boss2');
debugTools.hidden = !import.meta.env.DEV;
function enterLevel2() {
  Object.assign(state, createGame(false, 1));
  debugLevel2.blur();
  continueGame();
}
debugLevel2.addEventListener('click', enterLevel2);
function enterBoss2() {
  Object.assign(state, createGame(true, 1));
  debugBoss2.blur();
  continueGame();
}
debugBoss2.addEventListener('click', enterBoss2);
function enterLevel3() { Object.assign(state, createGame(false, 2)); debugLevel3.blur(); continueGame(); }
function enterBoss3() { Object.assign(state, createGame(true, 2)); debugBoss3.blur(); continueGame(); }
debugLevel3.addEventListener('click', enterLevel3);
debugBoss3.addEventListener('click', enterBoss3);
function previewDeparture() {
  Object.assign(state, createGame(false, state.levelIndex));
  beginLevelDeparture(state);
  debugDeparture.blur();
  continueGame();
}
debugDeparture.addEventListener('click', previewDeparture);
const bonusMessages = { spread: 'Trojstřela na 12 sekund', repair: 'Oprava · +1 život', repairScore: 'Plné životy · +150 bodů' };
const keys = new Set<string>();
const controls = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
let previousTime: number | undefined;
let frame = 0;
let disposed = false;

function continueGame() {
  if (document.hidden) return;
  if (state.status === 'victory' && hasNextLevel(state.levelIndex)) advanceLevel(state);
  else if (state.status === 'gameOver' || state.status === 'victory') restartGame(state);
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
  if (shipPicker.open) return;
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

let resumeAfterPicker = false;
const shipButtons = PLAYER_SHIPS.map(skin => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.ship = skin.id;
  button.setAttribute('aria-pressed', String(skin.id === selectedShip));
  const preview = document.createElement('span');
  preview.className = 'ship-preview';
  preview.setAttribute('aria-hidden', 'true');
  const region = atlasRegion(PLAYER_SHIP_CLIPS[skin.id].start + playerShipPose(skin.id, 0));
  const scale = region.width === 64 ? 1.5 : 2;
  Object.assign(preview.style, { width: `${region.width * scale}px`, height: `${region.height * scale}px`,
    backgroundImage: `url("${atlasUrl}")`, backgroundSize: `${ATLAS.width * scale}px ${ATLAS.height * scale}px`,
    backgroundPosition: `-${region.x * scale}px -${region.y * scale}px` });
  const label = document.createElement('span');
  label.textContent = skin.name;
  button.append(preview, label);
  shipOptions.append(button);
  return button;
});
function openShipPicker() {
  resumeAfterPicker = state.status === 'playing';
  pause();
  shipPicker.showModal();
  shipButtons.find(button => button.dataset.ship === selectedShip)?.focus();
}
function closeShipPicker() { shipPicker.close(); }
function chooseShip(event: Event) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-ship]');
  const skin = PLAYER_SHIPS.find(skin => skin.id === button?.dataset.ship);
  if (!skin) return;
  selectedShip = skin.id;
  shipChoice.textContent = `Loď: ${skin.name}`;
  shipButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ship === selectedShip)));
  closeShipPicker();
}
function finishShipPicker() {
  if (resumeAfterPicker && !document.hidden) resumeGame(state);
  keys.clear();
  previousTime = undefined;
  shipChoice.blur();
}
shipChoice.addEventListener('click', openShipPicker);
shipPickerClose.addEventListener('click', closeShipPicker);
shipOptions.addEventListener('click', chooseShip);
shipPicker.addEventListener('close', finishShipPicker);

function tick(time: number) {
  if (disposed) return;
  const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  updateGame(state, {
    x: Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')),
    y: Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS')),
    fire: keys.has('Space'),
  }, dt);
  if (import.meta.env.DEV) {
    const airships = state.enemies.filter(enemy => enemy.kind === 'airship');
    debugAirships.textContent = state.boss
      ? `${state.boss.variant}: ${state.boss.hp}/${state.boss.maxHp} · ${state.boss.attack} · ${state.boss.mode}`
      : airships.map(enemy => `Vzducholoď #${enemy.id}: ${enemy.hp}/16 · ${enemy.hp < 16 ? 'poškozená' : 'celá'}`).join(' | ');
  }
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
  message.textContent = state.status === 'victory' ? (hasNextLevel(state.levelIndex) ? `Level ${state.levelIndex + 1} dokončen` : 'Kampaň dokončena') : state.status === 'gameOver' ? 'Konec hry' : 'Pauza';
  result.textContent = finished ? `${state.score} bodů · Zbývající životy: ${state.lives}` : 'Hra čeká na pokračování.';
  action.textContent = state.status === 'victory' && hasNextLevel(state.levelIndex) ? 'Další level · Enter'
    : finished ? `Znovu level ${state.levelIndex + 1} · Enter` : 'Pokračovat · Enter';
  levelTitle.textContent = `Level ${state.levelIndex + 1} · ${getLevel(state.levelIndex).name}`;
  progress.value = Math.min(1, state.time / getLevel(state.levelIndex).duration);
  section.textContent = state.status === 'victory' ? `Hotovo · Level ${state.levelIndex + 1}`
    : state.missionStage === 'warning' ? (state.levelIndex === 2 ? 'Varování · Ocelová pevnost' : state.levelIndex === 1 ? 'Varování · Admirál konvoje' : 'Varování · Blíží se velitel')
    : state.missionStage === 'departing' ? 'Mise splněna · Odlet'
    : state.missionStage === 'bossDestroyed' ? 'Cíl zničen'
    : state.missionStage === 'boss' ? (state.boss?.mode === 'entering' ? 'Boss · Přílet pod štítem'
      : state.boss?.mode === 'transitioning' ? 'Boss · Fáze 2' : `Boss · Fáze ${state.boss?.phase ?? 1}`)
    : levelPart(state.time, state.levelIndex);
  bossHud.hidden = !state.boss || state.boss.mode === 'entering' || state.boss.mode === 'destroyed';
  bossHealth.max = state.boss?.maxHp ?? 60;
  bossHealth.value = Math.max(0, state.boss?.hp ?? 0);
  bossLabel.textContent = `${state.boss?.variant === 'fortress' ? 'Ocelová pevnost' : state.boss?.variant === 'convoy' ? 'Admirál konvoje' : 'Velitel'} · ${Math.max(0, state.boss?.hp ?? 0)} / ${state.boss?.maxHp ?? 60}`;
  view.render(state, debugToggle.checked, terrainToggle.checked, selectedShip);
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
    debugLevel2.removeEventListener('click', enterLevel2);
    debugLevel3.removeEventListener('click', enterLevel3);
    debugBoss3.removeEventListener('click', enterBoss3);
    debugDeparture.removeEventListener('click', previewDeparture);
    debugBoss2.removeEventListener('click', enterBoss2);
    shipChoice.removeEventListener('click', openShipPicker);
    shipPickerClose.removeEventListener('click', closeShipPicker);
    shipOptions.removeEventListener('click', chooseShip);
    shipPicker.removeEventListener('close', finishShipPicker);
    shipOptions.replaceChildren();
    if (shipPicker.open) shipPicker.close();
    view.dispose();
  });
}
