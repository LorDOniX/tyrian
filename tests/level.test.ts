import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, aimVelocity, restartGame, pauseGame, resumeGame } from '../src/game.ts';
import type { Enemy, Bullet, GameState } from '../src/game.ts';
import { LEVEL_DURATION, LEVEL_EVENTS, GROUND_TARGETS } from '../src/level.ts';
const idle = { x: 0, y: 0, fire: false };
const enemy = (id = 90): Enemy => ({ id, x: 0, y: 7, previousX: 0, previousY: 7,
  radius: 0.75, speed: 4, kind: 'gunner', hp: 2, phase: 'charging', shotLeft: 0.8, shots: 0, hitLeft: 0 });
const bullet = (id: number, x: number, y: number, owner: Bullet['owner'] = 'player'): Bullet => ({
  id, x, y, previousX: x, previousY: y, radius: 0.09, speed: 22, vx: 0, vy: owner === 'player' ? 22 : -22, owner,
});
const step = (state: GameState, count = 1) => {
  for (let i = 0; i < count; i++) updateGame(state, idle, 0.05);
};
const isolated = () => { const s = createGame(); s.nextEvent = LEVEL_EVENTS.length; s.nextGround = GROUND_TARGETS.length; return s; };

test('level events sorted, simultaneous events once, no spawn during pause', () => {
  assert.ok(LEVEL_EVENTS.every((event, i) => i === 0 || LEVEL_EVENTS[i - 1]!.at <= event.at));
  const state = createGame();
  state.time = 0.99;
  step(state);
  assert.equal(state.enemies.length, 3);
  step(state);
  assert.equal(state.enemies.length, 3);
  pauseGame(state);
  const snapshot = structuredClone(state);
  step(state, 100);
  assert.deepEqual(state, snapshot);
});
test('gunner takes two hits, awards 250 once, destroyed gunner does not shoot', () => {
  const state = isolated();
  const gunner = enemy();
  state.enemies = [gunner];
  state.bullets = [bullet(91, 0, 6.5)];
  step(state);
  assert.equal(gunner.hp, 1);
  assert.equal(state.score, 0);
  assert.equal(state.bullets.length, 0);
  gunner.shotLeft = 0;
  state.bullets.push(bullet(92, 0, 6.5));
  step(state);
  assert.equal(state.score, 250);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.bullets.length, 0);
  step(state);
  assert.equal(state.score, 250);
});
test('gunner enters, fires three times, leaves and cannot block completion forever', () => {
  const state = isolated();
  const gunner = enemy();
  gunner.y = gunner.previousY = 13;
  gunner.phase = 'entering';
  state.enemies = [gunner];
  step(state, 29);
  assert.equal(state.bullets.length, 0);
  step(state, 4);
  assert.equal(gunner.phase, 'charging');
  step(state, 52);
  assert.equal(gunner.shots, 3);
  assert.equal(gunner.phase, 'leaving');
  // Přesun hráče neovlivní rychlost již vystřelené střely.
  const projectile = state.bullets.find(b => b.owner === 'enemy')!;
  const { vx, vy } = projectile;
  state.player.x = 8;
  step(state);
  assert.equal(projectile.vx, vx);
  assert.equal(projectile.vy, vy);
  step(state, 130);
  assert.equal(state.enemies.length, 0);
});
test('aim speed normalized, same-point fallback, static direction', () => {
  const velocity = aimVelocity({ x: 1, y: 2 }, { x: 4, y: 6 }, 6);
  assert.ok(Math.abs(Math.hypot(velocity.vx, velocity.vy) - 6) < 1e-10);
  assert.deepEqual(aimVelocity({ x: 0, y: 0 }, { x: 0, y: 0 }, 6), { vx: 0, vy: -6 });
});
test('hostile sweep hits moving player; simultaneous threats cost one life', () => {
  const state = isolated();
  state.enemies = [{ ...enemy(), kind: 'scout', hp: 1, y: -7, speed: 0 }];
  state.bullets = [bullet(91, 0, -6.4, 'enemy'), bullet(92, 0, -6.4, 'enemy')];
  updateGame(state, { x: 1, y: 0, fire: false }, 0.05);
  assert.equal(state.lives, 2);
  assert.equal(state.bullets.length, 0);
  state.bullets = [bullet(93, state.player.x, state.player.y, 'enemy')];
  step(state);
  assert.equal(state.lives, 2);
  assert.equal(state.bullets.length, 0);
});
test('hostile bullets survive shooter death and clean up beyond every edge', () => {
  const state = isolated();
  state.enemies = [{ ...enemy(), hp: 1 }];
  state.bullets = [bullet(91, 0, 6.5), bullet(92, 4, 5, 'enemy')];
  step(state);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.bullets.length, 1);
  for (const [x, y] of [[11, 0], [-11, 0], [0, 15], [0, -15]]) {
    state.bullets = [bullet(93, x!, y!, 'enemy')];
    step(state);
    assert.equal(state.bullets.length, 0);
  }
});
test('pause freezes charging and bullets', () => {
  const state = isolated();
  state.enemies = [enemy()];
  state.bullets = [bullet(91, 0, 5, 'enemy')];
  pauseGame(state);
  const snapshot = structuredClone(state);
  step(state, 50);
  assert.deepEqual(state, snapshot);
  resumeGame(state);
  step(state);
  assert.ok(state.enemies[0]!.shotLeft < 0.8);
});
test('boss warning waits for time, events and threats; player bullets do not block it', () => {
  const state = createGame();
  state.time = LEVEL_DURATION;
  step(state);
  assert.equal(state.status, 'playing');
  state.nextEvent = LEVEL_EVENTS.length;
  state.nextGround = GROUND_TARGETS.length;
  state.enemies = [];
  state.bullets = [bullet(91, 4, 0, 'enemy')];
  step(state);
  assert.equal(state.status, 'playing');
  state.bullets = [bullet(92, 4, 0)];
  step(state);
  assert.equal(state.missionStage, 'warning');
  pauseGame(state);
  assert.equal(state.missionStage, 'warning');
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('defeat wins over completion, restart restores level cursor and hazards', () => {
  const state = isolated();
  state.time = LEVEL_DURATION;
  state.lives = 1;
  state.bullets = [bullet(91, 0, -7, 'enemy')];
  step(state);
  assert.equal(state.status, 'gameOver');
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('all waves resolve and lead to boss warning without immortal threats', () => {
  const state = createGame();
  // Pro test konečnosti úrovně pouze ochráníme hráče, bez změny chování nepřátel.
  state.invulnerabilityLeft = 100;
  state.player.x = 8;
  for (let i = 0; i < 1600 && state.status === 'playing' && state.missionStage === 'waves'; i++) step(state);
  assert.equal(state.missionStage, 'warning');
  assert.equal(state.nextEvent, LEVEL_EVENTS.length);
  assert.equal(state.enemies.length, 0);
  assert.ok(state.time < 75);
});
