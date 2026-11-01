import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoss, bossCircles, updateBoss } from '../src/boss.ts';
import { convoyBossFrame } from '../src/convoy-boss.ts';
import { createGame, updateGame, pauseGame, restartGame } from '../src/game.ts';
import type { Bullet } from '../src/game.ts';
import { getLevel } from '../src/level.ts';
import { startAtBoss, startLevel } from '../src/start-mode.ts';
import { SPRITE_CLIPS } from '../src/sprite-clips.ts';
const player = { x: 0, y: -7 };
const idle = { x: 0, y: 0, fire: false };
function ready() {
  const boss = createBoss(100, 'convoy');
  Object.assign(boss, { y: 7, previousY: 7, mode: 'charging', timer: 0.05 });
  return boss;
}
const bullet = (id: number, x: number, y: number, owner: Bullet['owner'] = 'player'): Bullet =>
  ({ id, x, y, previousX: x, previousY: y, radius: 0.09, owner, speed: 22, vx: 0, vy: owner === 'player' ? 22 : -22 });

test('new boss is distinct, original commander remains 60 hp and three circles', () => {
  const old = createBoss(1);
  assert.equal(old.variant, 'commander');
  assert.equal(old.maxHp, 60);
  assert.equal(old.attack, 'aimed');
  assert.equal(bossCircles(old).length, 3);
  const boss = ready();
  assert.equal(boss.maxHp, 80);
  assert.equal(bossCircles(boss).length, 5);
  assert.equal(convoyBossFrame(boss), 0);
  boss.hp = 40;
  assert.equal(convoyBossFrame(boss), 1);
  assert.deepEqual(SPRITE_CLIPS.convoyBoss.frames.map(frame => frame.y), [0, 84]);
  assert.ok(SPRITE_CLIPS.convoyBoss.frames.every(frame => frame.source === 'newsht.shp.000000.png' && frame.width === 144 && frame.height === 56));
});
test('boss2 development shortcut skips only the second-level waves', () => {
  assert.equal(startAtBoss(true, 'boss2'), true);
  assert.equal(startLevel(true, 'boss2'), 1);
  assert.equal(startAtBoss(false, 'boss2'), false);
  assert.equal(startLevel(false, 'boss2'), 0);
  assert.equal(startLevel(true, 'boss'), 0);
  const state = createGame(true, 1);
  assert.equal(state.missionStage, 'warning');
  assert.equal(state.time, getLevel(1).duration);
  for (let i = 0; i < 31; i++) updateGame(state, idle, 0.05);
  assert.equal(state.boss!.variant, 'convoy');
  const id = state.boss!.id;
  for (let i = 0; i < 10; i++) updateGame(state, idle, 0.05);
  assert.equal(state.boss!.id, id);
  assert.equal(state.enemies.length, 0);
});
test('convoy must finish before warning; clearing it no longer grants victory', () => {
  const state = createGame(false, 1);
  state.time = getLevel(1).duration;
  state.nextEvent = getLevel(1).events.length;
  state.bullets.push(bullet(state.nextId++, 7, 0, 'enemy'));
  updateGame(state, idle, 0.05);
  assert.equal(state.missionStage, 'waves');
  state.bullets = [];
  updateGame(state, idle, 0.05);
  assert.equal(state.status, 'playing');
  assert.equal(state.missionStage, 'warning');
});
test('crossfire fires three locked pairs separated by 0.22 seconds', () => {
  const boss = ready();
  const first = updateBoss(boss, 0.05, player);
  assert.equal(first.length, 2);
  assert.equal(first[0]!.x, -3);
  assert.equal(first[1]!.x, 3);
  assert.equal(updateBoss(boss, 0.21, { x: 8, y: -2 }).length, 0);
  const second = updateBoss(boss, 0.01, { x: 8, y: -2 });
  assert.equal(second.length, 2);
  assert.equal(first[0]!.vx, second[0]!.vx);
  assert.equal(first[0]!.vy, second[0]!.vy);
  assert.equal(updateBoss(boss, 0.22, player).length, 2);
  assert.equal(boss.mode, 'resting');
  assert.equal(boss.attack, 'barrage');
  first.forEach(shot => assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 5) < 1e-10));
});
test('zero-distance aiming is safe and double fans are symmetric', () => {
  const boss = ready();
  const aimed = updateBoss(boss, 0.05, { x: -3, y: 6.1 });
  assert.equal(aimed[0]!.vx, 0);
  assert.equal(aimed[0]!.vy, -5);
  Object.assign(boss, { mode: 'charging', attack: 'barrage', timer: 0.05, shots: 0 });
  const fan = updateBoss(boss, 0.05, player);
  assert.equal(fan.length, 6);
  fan.forEach(shot => assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 4.7) < 1e-10));
  assert.equal(fan[0]!.vx, -fan[5]!.vx);
  assert.equal(updateBoss(boss, 0.41, player).length, 0);
  assert.equal(updateBoss(boss, 0.01, player).length, 6);
  assert.equal(boss.attack, 'pulse');
  assert.equal(boss.mode, 'resting');
});
test('pulse contains twelve equal-speed spokes, next cycle rotates the gaps', () => {
  const boss = ready();
  boss.attack = 'pulse';
  const ring = updateBoss(boss, 0.05, player);
  assert.equal(ring.length, 12);
  ring.forEach((shot, i) => {
    const opposite = ring[(i + 6) % 12]!;
    assert.ok(Math.abs(shot.vx + opposite.vx) < 1e-10);
    assert.ok(Math.abs(shot.vy + opposite.vy) < 1e-10);
    assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 4.2) < 1e-10);
  });
  Object.assign(boss, { mode: 'charging', attack: 'pulse', timer: 0.05 });
  const rotated = updateBoss(boss, 0.05, player);
  assert.notEqual(ring[0]!.vx, rotated[0]!.vx);
});
test('phase transition keeps the current salvo speed, then enables faster attacks once', () => {
  const boss = ready();
  const first = updateBoss(boss, 0.05, player);
  boss.hp = 40;
  const second = updateBoss(boss, 0.22, player);
  assert.equal(first[0]!.vx, second[0]!.vx);
  assert.equal(boss.phase, 1);
  updateBoss(boss, 0.22, player);
  for (let i = 0; i < 27; i++) updateBoss(boss, 0.05, player);
  assert.equal(boss.phase, 2);
  assert.equal(boss.mode, 'transitioning');
  for (let i = 0; i < 18; i++) updateBoss(boss, 0.05, player);
  assert.equal(boss.attackSpeed, 6);
  assert.equal(boss.mode, 'charging');
  assert.ok(Math.abs(Math.hypot(first[0]!.vx, first[0]!.vy) - 5) < 1e-10);
});
test('wing hit destroys admiral, cancels pending volley and clears lethal bullets before damage', () => {
  const state = createGame(true, 1);
  state.missionStage = 'boss';
  state.boss = ready();
  state.boss.hp = 1;
  state.boss.timer = 0;
  state.lives = 1;
  state.bullets.push(bullet(state.nextId++, 3, 6.5), bullet(state.nextId++, 0, -6.5, 'enemy'));
  updateGame(state, idle, 0.05);
  assert.equal(state.boss.mode, 'destroyed');
  assert.equal(state.score, 5000);
  assert.equal(state.lives, 1);
  assert.equal(state.bullets.filter(shot => shot.owner === 'enemy').length, 0);
  assert.ok(state.effects.filter(effect => effect.kind === 'explosion').length >= 3);
  assert.equal(state.status, 'playing');
  for (let i = 0; i < 76; i++) updateGame(state, idle, 0.05);
  assert.equal(state.status, 'victory');
  assert.equal(state.score, 5000);
  restartGame(state);
  assert.deepEqual(state, createGame(false, 1));
});
test('pause freezes every admiral mode, including destruction and transition', () => {
  for (const mode of ['entering', 'charging', 'firing', 'resting', 'transitioning', 'destroyed'] as const) {
    const state = createGame(true, 1);
    state.boss = ready();
    state.boss.mode = mode;
    state.missionStage = mode === 'destroyed' ? 'bossDestroyed' : 'boss';
    state.stageTimer = 1.5;
    pauseGame(state);
    const snapshot = structuredClone(state);
    updateGame(state, { x: 1, y: 1, fire: true }, 0.05);
    assert.deepEqual(state, snapshot);
  }
});
