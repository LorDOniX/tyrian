import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circlesOverlap, sweepHit } from '../src/collision.ts';
import { createGame, updateGame, restartGame, pauseGame, resumeGame } from '../src/game.ts';
import { LEVEL_EVENTS } from '../src/level.ts';
import type { Enemy, Bullet } from '../src/game.ts';

const shot = (id: number, x: number, y: number, radius = 0.09, speed = 22): Bullet =>
  ({ id, x, y, previousX: x, previousY: y, radius, speed, vx: 0, vy: speed, owner: 'player' });

const idle = { x: 0, y: 0, fire: false };
const body = (id: number, x: number, y: number, radius = 0.6, speed = 0): Enemy =>
  ({ id, x, y, previousX: x, previousY: y, radius, speed, kind: 'scout', hp: 1, phase: 'entering', shotLeft: 0.8, shots: 0, hitLeft: 0 });

test('circle contact and near miss', () => {
  assert.equal(circlesOverlap(body(1, 0, 0), body(2, 1.2, 0)), true);
  assert.equal(circlesOverlap(body(1, 0, 0), body(2, 1.201, 0)), false);
});
test('sweep: stationary overlap, miss, tangent and moving target', () => {
  assert.equal(sweepHit(body(1, 0, 0), body(2, 0, 0)), 0);
  assert.equal(sweepHit(body(1, 0, 0), body(2, 3, 0)), null);
  const moving = { ...body(1, 2, 0, 0.5), previousX: -2 };
  assert.equal(sweepHit(moving, body(2, 0, 1, 0.5)), 0.5);
  assert.notEqual(sweepHit(moving, { ...body(2, -2, 0), previousX: 2 }), null);
});
test('fast bullet hits nearest enemy independent of array order, scores once', () => {
  const state = createGame();
  state.enemies = [body(2, 0, 1, 0.1), body(3, 0, 0.5, 0.1)];
  state.bullets = [shot(4, 0, 0, 0.09, 22)];
  updateGame(state, idle, 0.05);
  assert.equal(state.score, 100);
  assert.deepEqual(state.enemies.map(e => e.id), [2]);
  assert.equal(state.bullets.length, 0);
  updateGame(state, idle, 0.05);
  assert.equal(state.score, 100);
});
test('simultaneous contacts cost one life, protection expires', () => {
  const state = createGame();
  state.shield = 0;
  state.enemies = [body(2, 0, -7), body(3, 0, -7)];
  updateGame(state, idle, 0.01);
  assert.equal(state.lives, 2);
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 2);
  for (let i = 0; i < 21; i++) updateGame(state, idle, 0.05);
  assert.equal(state.lives, 2);
  assert.equal(state.shield, 5);
});
test('shot enemy cannot damage player in same step; offscreen cleanup', () => {
  const state = createGame();
  state.enemies = [body(2, 0, -7), body(3, 0, -14)];
  state.bullets = [shot(4, 0, -7, 0.09, 22)];
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 3);
  assert.equal(state.score, 100);
  assert.equal(state.enemies.length, 0);
});
test('game over freezes simulation, restart resets all state', () => {
  const state = createGame();
  state.shield = 0;
  state.lives = 1;
  state.enemies = [body(2, 0, -7)];
  updateGame(state, idle, 0.05);
  assert.equal(state.status, 'gameOver');
  const snapshot = structuredClone(state);
  updateGame(state, { x: 1, y: 1, fire: true }, 0.05);
  assert.deepEqual({ ...state, effects: [] }, { ...snapshot, effects: [] });
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('pause freezes simulation, resume and deterministic spawning', () => {
  const state = createGame();
  pauseGame(state);
  updateGame(state, { x: 1, y: 0, fire: true }, 1);
  assert.equal(state.time, 0);
  assert.equal(state.bullets.length, 0);
  resumeGame(state);
  for (let i = 0; i < 25; i++) updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 3);
  assert.deepEqual(state.enemies.map(enemy => enemy.x), [-4, 0, 4]);
  assert.equal(state.nextEvent, 3);
  assert.ok(LEVEL_EVENTS.length > 3);
});
test('diagonal speed is normalized and movement clamped', () => {
  const state = createGame();
  updateGame(state, { x: 1, y: 1, fire: false }, 0.05);
  assert.ok(Math.abs(Math.hypot(state.player.x, state.player.y + 7) - 0.45) < 1e-10);
  for (let i = 0; i < 100; i++) updateGame(state, { x: 1, y: 1, fire: false }, 0.05);
  assert.equal(state.player.x, 8);
  assert.equal(state.player.y, 10.5);
});
