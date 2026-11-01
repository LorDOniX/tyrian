import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, pauseGame, resumeGame, restartGame } from '../src/game.ts';
import type { Bullet, Enemy } from '../src/game.ts';
import { createPickup, playerVolley, SPREAD_DURATION, FULL_REPAIR_SCORE } from '../src/bonuses.ts';
import { LEVEL_EVENTS, GROUND_TARGETS } from '../src/level.ts';
const idle = { x: 0, y: 0, fire: false };
const only = () => {
  const state = createGame();
  state.nextEvent = LEVEL_EVENTS.length;
  state.nextGround = GROUND_TARGETS.length;
  return state;
};
const shot = (id: number, y: number): Bullet => ({ id, x: 0, y, previousX: 0, previousY: y,
  vx: 0, vy: 22, speed: 22, radius: 0.09, owner: 'player' });
const carrier = (id = 100): Enemy => ({ id, x: 0, y: 0, previousX: 0, previousY: 0,
  speed: 0, radius: 0.6, kind: 'scout', hp: 1, phase: 'entering', shotLeft: 10,
  shots: 0, hitLeft: 0, drop: 'spread' });

test('carriers are deterministic level data; ordinary enemies have no reward', () => {
  const drops = LEVEL_EVENTS.filter(event => event.drop);
  assert.equal(drops.length, 5);
  assert.equal(drops.filter(event => event.drop === 'spread').length, 3);
  assert.equal(drops.filter(event => event.drop === 'repair').length, 2);
  assert.equal(drops[0]!.at, 1);
  const state = createGame();
  state.time = 0.99;
  updateGame(state, idle, 0.05);
  assert.equal(state.enemies.filter(enemy => enemy.drop === 'spread').length, 1);
});
test('destroyed carrier drops once, even when two bullets cross in same step', () => {
  const state = only();
  state.enemies = [carrier()];
  state.bullets = [shot(101, -0.8), shot(102, -0.9)];
  updateGame(state, idle, 0.05);
  assert.equal(state.pickups.length, 1);
  assert.equal(state.pickups[0]!.kind, 'spread');
  assert.equal(state.score, 100);
  updateGame(state, idle, 0.05);
  assert.equal(state.pickups.length, 1);
});
test('rammed or offscreen carriers do not drop loot', () => {
  for (const y of [-7, -15]) {
    const state = only();
    state.enemies = [{ ...carrier(), y, previousY: y }];
    updateGame(state, idle, 0.05);
    assert.equal(state.enemies.length, 0);
    assert.equal(state.pickups.length, 0);
  }
});
test('pickup collection sweeps moving player, removes reward once, activates immediately', () => {
  const state = only();
  state.player.x = -2;
  state.player.speed = 80;
  state.pickups = [createPickup(state.nextId++, 'spread', 0, -7)];
  updateGame(state, { x: 1, y: 0, fire: true }, 0.05);
  assert.equal(state.pickups.length, 0);
  assert.equal(state.weaponLeft, SPREAD_DURATION);
  assert.equal(state.bullets.length, 3);
  assert.equal(state.bonusNotice, 'spread');
  updateGame(state, idle, 0.05);
  assert.ok(state.weaponLeft < SPREAD_DURATION);
});
test('repair caps lives and converts full-health collection to points', () => {
  const state = only();
  state.lives = 2;
  state.pickups = [createPickup(state.nextId++, 'repair', 0, -7)];
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 3);
  assert.equal(state.score, 0);
  state.pickups = [createPickup(state.nextId++, 'repair', 0, -7)];
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 3);
  assert.equal(state.score, FULL_REPAIR_SCORE);
  assert.equal(state.bonusNotice, 'repairScore');
  updateGame(state, idle, 0.05);
  assert.equal(state.score, FULL_REPAIR_SCORE);
});
test('repeat spread renews duration without stacking; expiry restores single shot', () => {
  const state = only();
  state.weaponLeft = 4;
  state.pickups = [createPickup(state.nextId++, 'spread', 0, -7), createPickup(state.nextId++, 'spread', 0, -7)];
  updateGame(state, idle, 0.05);
  assert.equal(state.weaponLeft, 12);
  state.weaponLeft = 0.02;
  state.cooldown = 0;
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.equal(state.weaponLeft, 0);
  assert.equal(state.bullets.length, 1);
});
test('spread rays have equal speed, symmetric angles and unchanged cooldown', () => {
  const volley = playerVolley(true);
  assert.equal(volley.length, 3);
  assert.equal(volley[0]!.vx, -volley[2]!.vx);
  assert.equal(volley[1]!.vx, 0);
  volley.forEach(ray => assert.ok(Math.abs(Math.hypot(ray.vx, ray.vy) - 22) < 1e-10));
  const state = only();
  state.weaponLeft = 12;
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.equal(state.bullets.length, 3);
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.equal(state.bullets.length, 3);
});
test('pause freezes bonus flight, weapon and notice; result cannot collect and restart clears all', () => {
  const state = only();
  state.weaponLeft = 3;
  state.pickups = [createPickup(state.nextId++, 'repair', 1, 5)];
  state.bonusNotice = 'spread';
  state.noticeLeft = 1;
  pauseGame(state);
  const snapshot = structuredClone(state);
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.deepEqual(state, snapshot);
  resumeGame(state);
  updateGame(state, idle, 0.05);
  assert.ok(state.weaponLeft < 3);
  assert.ok(state.pickups[0]!.y < 5);
  state.status = 'gameOver';
  state.pickups[0]!.x = 0;
  state.pickups[0]!.y = -7;
  const after = structuredClone(state);
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.deepEqual(state, after);
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('missed rewards disappear, never block boss warning or revive dead player', () => {
  const state = only();
  state.pickups = [createPickup(state.nextId++, 'spread', 0, -13)];
  updateGame(state, idle, 0.05);
  assert.equal(state.pickups.length, 0);
  state.time = 55;
  state.pickups = [createPickup(state.nextId++, 'repair', 0, 4)];
  updateGame(state, idle, 0.05);
  assert.equal(state.missionStage, 'warning');
  state.lives = 0;
  state.pickups = [createPickup(state.nextId++, 'repair', 0, -7)];
  updateGame(state, idle, 0.05);
  assert.equal(state.status, 'gameOver');
  assert.equal(state.lives, 0);
});
test('repair is collected before hostile damage in the same step', () => {
  const state = only();
  state.shield = 0; state.shieldRegenDelay = 100;
  state.lives = 1;
  state.pickups = [createPickup(state.nextId++, 'repair', 0, -7)];
  state.bullets = [{ ...shot(state.nextId++, -6.5), owner: 'enemy', vy: -22 }];
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 1);
  assert.equal(state.status, 'playing');
});
