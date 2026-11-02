import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, advanceLevel, pauseGame } from '../src/game.ts';
import { createBoss, updateBoss, bossCircles } from '../src/boss.ts';
import { createEnemy, updateEnemy, enemyVolley } from '../src/enemies.ts';
import { getLevel, hasNextLevel } from '../src/level.ts';
import { startLevel, startAtBoss } from '../src/start-mode.ts';
import { cloudLayout } from '../src/cloud-layout.ts';
const idle = { x: 0, y: 0, fire: false };

test('fifth mission has ordered new aircraft waves and guarded debug starts', () => {
  const level = getLevel(4);
  assert.equal(level.bossVariant, 'sky');
  assert.equal(level.groundTargets.length, 0);
  for (const kind of ['falcon', 'emerald']) assert.ok(level.events.some(event => event.kind === kind));
  assert.ok(level.events.every((event, i) => event.at < level.duration && (!i || event.at >= level.events[i - 1]!.at)));
  for (const mode of ['level5', 'boss5']) {
    assert.equal(startLevel(true, mode), 4);
    assert.equal(startLevel(false, mode), 0);
  }
  assert.equal(startAtBoss(true, 'boss5'), true);
  assert.equal(startAtBoss(false, 'boss5'), false);
});
test('new aircraft fire finite aimed and fan volleys then leave', () => {
  for (const [kind, count] of [['falcon', 9], ['emerald', 12]] as const) {
    const enemy = createEnemy(1, kind, 0, 14);
    const shots = [];
    for (let i = 0; i < 800; i++) if (updateEnemy(enemy, 0.05)) shots.push(...enemyVolley(enemy, { x: -3, y: -7 }));
    assert.equal(shots.length, count);
    assert.ok(enemy.y < -14);
    assert.ok(shots.every(shot => Number.isFinite(shot.vx) && shot.vy < 0));
  }
});
test('sky boss has entry protection, three attacks, two phases and finite projectiles', () => {
  for (const attack of ['pincer', 'lattice', 'helix'] as const) {
    const boss = createBoss(1, 'sky');
    assert.equal(boss.hp, 180);
    assert.equal(bossCircles(boss).length, 4);
    assert.deepEqual(updateBoss(boss, 0.05, { x: 0, y: -7 }), []);
    Object.assign(boss, { y: 6.5, mode: 'charging', timer: 0, attack });
    const shots = updateBoss(boss, 0.01, { x: -4, y: -7 });
    assert.equal(shots.length, attack === 'pincer' ? 2 : attack === 'lattice' ? 7 : 8);
    boss.hp = 90;
    for (let i = 0; i < 100; i++) shots.push(...updateBoss(boss, 0.05, { x: 4, y: -7 }));
    assert.equal(boss.phase, 2);
    assert.ok(shots.every(shot => Number.isFinite(shot.vx) && Number.isFinite(shot.vy)));
  }
});
test('clouds move with scrolling, wrap continuously offscreen and freeze with paused game', () => {
  const a = cloudLayout(0), b = cloudLayout(1);
  a.forEach((cloud, i) => assert.ok(Math.abs(b[i]!.y - cloud.y + 1.12) < 1e-9));
  const state = createGame(false, 4);
  updateGame(state, idle, 0.05);
  pauseGame(state);
  const frozen = cloudLayout(state.scrollDistance);
  updateGame(state, idle, 10);
  assert.deepEqual(cloudLayout(state.scrollDistance), frozen);
  for (let distance = 0; distance < 500; distance++) {
    assert.ok(cloudLayout(distance).every(cloud => cloud.y >= -18 && cloud.y < 24));
  }
});
test('complete fifth mission rewards boss once, departs and ends campaign preserving purchases', () => {
  const state = createGame(false, 3, { weapon: 1, shield: 1, hull: 1 });
  state.status = 'victory'; state.score = 30000; state.credits = 12000;
  advanceLevel(state);
  assert.equal(state.levelIndex, 4);
  assert.equal(state.credits, 12000);
  assert.equal(state.upgrades.weapon, 1);
  state.invulnerabilityLeft = 400;
  let departure = false;
  for (let i = 0; i < 6500 && state.status === 'playing'; i++) {
    const dx = (state.boss?.x ?? 0) - state.player.x;
    updateGame(state, { x: Math.abs(dx) < 0.15 ? 0 : Math.sign(dx), y: 0, fire: true }, 0.05);
    departure ||= state.missionStage === 'departing';
  }
  assert.equal(state.status, 'victory');
  assert.equal(state.boss!.variant, 'sky');
  assert.equal(state.boss!.hp, 0);
  assert.ok(departure);
  assert.ok(state.credits >= 24500);
  assert.equal(hasNextLevel(4), false);
  const final = structuredClone(state);
  advanceLevel(state);
  assert.deepEqual(state, final);
});
