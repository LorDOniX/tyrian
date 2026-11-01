import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, advanceLevel, restartGame, pauseGame } from '../src/game.ts';
import { createBoss, updateBoss, bossCircles } from '../src/boss.ts';
import { createEnemy, updateEnemy, enemyVolley } from '../src/enemies.ts';
import { getLevel, hasNextLevel } from '../src/level.ts';
import { startAtBoss, startLevel } from '../src/start-mode.ts';
const idle = { x: 0, y: 0, fire: false };

test('campaign advances from second victory with checkpoint, stops after third', () => {
  const state = createGame(false, 1);
  state.status = 'victory'; state.score = 12345;
  advanceLevel(state);
  assert.equal(state.levelIndex, 2);
  assert.equal(state.checkpointScore, 12345);
  assert.equal(state.score, 12345);
  assert.equal(state.lives, 3);
  state.score += 500;
  restartGame(state);
  assert.equal(state.score, 12345);
  assert.equal(state.levelIndex, 2);
  state.status = 'victory';
  const snapshot = structuredClone(state);
  advanceLevel(state);
  assert.deepEqual(state, snapshot);
  assert.equal(hasNextLevel(1), true);
  assert.equal(hasNextLevel(2), false);
});
test('third level has sorted finite waves, new ships, drops and ground targets', () => {
  const level = getLevel(2);
  assert.equal(level.bossVariant, 'fortress');
  assert.ok(level.groundTargets.length > 0);
  for (const kind of ['weaver', 'striker']) assert.ok(level.events.some(event => event.kind === kind));
  for (const drop of ['repair', 'spread']) assert.ok(level.events.some(event => event.drop === drop));
  assert.ok(level.events.every((event, i) => event.at < level.duration && (i === 0 || event.at >= level.events[i - 1]!.at)));
  for (const mode of ['level3', 'boss3']) {
    assert.equal(startLevel(true, mode), 2);
    assert.equal(startLevel(false, mode), 0);
  }
  assert.equal(startAtBoss(true, 'boss3'), true);
  assert.equal(startAtBoss(false, 'boss3'), false);
});
test('new enemies shoot their distinct patterns and leave without blocking completion', () => {
  for (const kind of ['weaver', 'striker'] as const) {
    const enemy = createEnemy(1, kind, 0, 13);
    const shots = [];
    for (let i = 0; i < 600; i++) {
      if (updateEnemy(enemy, 0.05)) shots.push(...enemyVolley(enemy, { x: 3, y: -7 }));
      assert.ok(Math.abs(enemy.x) <= 7.5);
    }
    assert.equal(enemy.shots, 3);
    assert.equal(shots.length, kind === 'weaver' ? 3 : 12);
    assert.ok(shots.every(shot => Math.abs(Math.hypot(shot.vx, shot.vy) - 6) < 1e-9));
    assert.ok(enemy.y < -13);
    if (kind === 'striker') assert.ok(Math.abs(shots.reduce((sum, shot) => sum + shot.vx, 0)) < 1e-9);
  }
});
test('fortress salvos track each new pair, curtain and spiral have finite spaced bursts', () => {
  for (const attack of ['sweep', 'curtain', 'spiral'] as const) {
    const boss = createBoss(1, 'fortress');
    Object.assign(boss, { y: 6, mode: 'charging', timer: 0, attack });
    const first = updateBoss(boss, 0.01, { x: -5, y: -7 });
    assert.equal(first.length, attack === 'sweep' ? 2 : attack === 'curtain' ? 8 : 10);
    assert.deepEqual(updateBoss(boss, 0.05, { x: 5, y: -7 }), []);
    const rest = [];
    for (let i = 0; i < 25; i++) rest.push(...updateBoss(boss, 0.05, { x: 5, y: -7 }));
    assert.equal(first.length + rest.length, attack === 'sweep' ? 8 : attack === 'curtain' ? 16 : 30);
    assert.ok([...first, ...rest].every(shot => Number.isFinite(shot.vx) && Number.isFinite(shot.vy)));
    if (attack === 'sweep') { assert.ok(first[0]!.vx < 0); assert.ok(rest[0]!.vx > 0); }
  }
});
test('fortress phase change waits for salvo and strengthens next cycle', () => {
  const boss = createBoss(1, 'fortress');
  Object.assign(boss, { y: 6, mode: 'charging', timer: 0 });
  updateBoss(boss, 0.01, { x: 0, y: -7 });
  boss.hp = 55;
  for (let i = 0; i < 18; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.phase, 1);
  assert.equal(boss.attackSpeed, 5);
  for (let i = 0; i < 60; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.phase, 2);
  assert.equal(boss.attackSpeed, 6);
});
test('fortress wing hit kills once, cancels salvo and clears lethal hazard before damage', () => {
  const state = createGame(true, 2);
  state.missionStage = 'boss';
  const boss = state.boss = createBoss(state.nextId++, 'fortress');
  Object.assign(boss, { y: 6, mode: 'charging', timer: 0, hp: 1 });
  assert.equal(bossCircles(boss).length, 5);
  const bullet = { x: -2.7, y: 5.8, previousX: -2.7, previousY: 5.8,
    radius: 0.09, speed: 22, vx: 0, vy: 22, owner: 'player' as const };
  state.bullets.push({ ...bullet, id: state.nextId++ }, { ...bullet, id: state.nextId++ },
    { ...bullet, id: state.nextId++, owner: 'enemy', x: 0, y: -7, vx: 0, vy: 0 });
  updateGame(state, idle, 0.05);
  assert.equal(boss.hp, 0);
  assert.equal(state.score, 7500);
  assert.equal(state.lives, 3);
  assert.ok(state.bullets.every(bullet => bullet.owner === 'player'));
  pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state, frozen);
  state.status = 'playing';
  for (let i = 0; i < 31; i++) updateGame(state, idle, 0.05);
  assert.equal(state.status, 'victory');
  assert.equal(state.score, 7500);
});
test('complete third level reaches final victory with normal firing through all waves and boss', () => {
  const run = createGame(false, 2);
  // Izoluje průchod mise od náhodných zásahů hráče; poškození bosse je běžnou střelbou.
  run.invulnerabilityLeft = 250;
  for (let i = 0; i < 4400 && run.status === 'playing'; i++) {
    const target = run.enemies.find(enemy => enemy.kind === 'airship');
    const dx = (run.boss?.x ?? target?.x ?? 0) - run.player.x;
    updateGame(run, { x: Math.abs(dx) < 0.15 ? 0 : Math.sign(dx), y: 0, fire: true }, 0.05);
  }
  assert.equal(run.status, 'victory');
  assert.equal(run.boss!.variant, 'fortress');
  assert.equal(run.boss!.hp, 0);
  assert.equal(run.nextEvent, getLevel(2).events.length);
  assert.equal(run.enemies.length, 0);
  assert.equal(run.groundTargets.length, 0);
});
