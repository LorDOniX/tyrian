import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, advanceLevel, restartGame, pauseGame } from '../src/game.ts';
import { createBoss, updateBoss, bossCircles } from '../src/boss.ts';
import { dreadnoughtFrame } from '../src/dreadnought-boss.ts';
import { createEnemy, updateEnemy, enemyVolley, enemySpritePose, ENEMY_TYPES } from '../src/enemies.ts';
import { getLevel, hasNextLevel } from '../src/level.ts';
import { UPGRADE_INFO } from '../src/upgrades.ts';
import { startLevel, startAtBoss } from '../src/start-mode.ts';
import { TYRIAN_BACKGROUND, keyedFrame } from '../scripts/sprite-pixels.ts';
const idle = { x: 0, y: 0, fire: false };
function ready() {
  const boss = createBoss(1, 'dreadnought');
  updateBoss(boss, 3, { x: 0, y: -7 });
  boss.timer = 0;
  return boss;
}

test('all upgrade prices are doubled, and fourth mission has denser new waves', () => {
  assert.deepEqual(UPGRADE_INFO.weapon.costs, [5000, 10000, 15000, 20000]);
  assert.deepEqual(UPGRADE_INFO.shield.costs, [4000, 8000]);
  assert.deepEqual(UPGRADE_INFO.hull.costs, [5000, 10000]);
  const level = getLevel(3);
  assert.equal(level.bossVariant, 'dreadnought');
  assert.ok(level.events.length > getLevel(2).events.length);
  assert.ok(level.groundTargets.length > getLevel(2).groundTargets.length);
  for (const kind of ['wraith', 'bastion', 'rotor']) assert.ok(level.events.some(event => event.kind === kind));
  assert.ok(level.events.every((event, i) => event.at < level.duration && (i === 0 || event.at >= level.events[i - 1]!.at)));
  for (const mode of ['level4', 'boss4']) {
    assert.equal(startLevel(true, mode), 3);
    assert.equal(startLevel(false, mode), 0);
  }
  assert.equal(startAtBoss(true, 'boss4'), true);
  assert.equal(startAtBoss(false, 'boss4'), false);
});
test('third victory carries purchased equipment and money into fourth; campaign ends after fourth', () => {
  const state = createGame(false, 2, { weapon: 1, hull: 1, shield: 1 });
  state.status = 'victory'; state.score = 24000; state.credits = 3000;
  advanceLevel(state);
  assert.equal(state.levelIndex, 3);
  assert.equal(state.credits, 3000);
  assert.equal(state.lives, 4);
  assert.equal(state.shield, 9);
  assert.equal(state.upgrades.weapon, 1);
  state.score += 500; state.credits += 500;
  restartGame(state);
  assert.equal(state.score, 24000);
  assert.equal(state.credits, 3000);
  state.status = 'victory';
  const final = structuredClone(state);
  advanceLevel(state);
  assert.deepEqual(state, final);
  assert.equal(hasNextLevel(3), false);
});
test('new enemies fire finite volleys with normalized speeds and eventually leave', () => {
  for (const [kind, count, speed] of [['wraith', 9, 7], ['bastion', 20, 6.3], ['rotor', 18, 5.5]] as const) {
    const enemy = createEnemy(1, kind, 0, 14);
    const shots = [];
    for (let i = 0; i < 800; i++) {
      if (updateEnemy(enemy, 0.05)) shots.push(...enemyVolley(enemy, { x: 0, y: -7 }));
      assert.ok(Math.abs(enemy.x) <= 7.5);
    }
    assert.equal(shots.length, count);
    assert.equal(enemy.shots, ENEMY_TYPES[kind].volleys);
    assert.ok(shots.every(s => Math.abs(Math.hypot(s.vx, s.vy) - speed) < 1e-10));
    assert.ok(enemy.y < -14);
  }
  const bastion = createEnemy(1, 'bastion', 0, 7);
  assert.equal(enemySpritePose(bastion), 0);
  assert.deepEqual(bastion.parts!.map(part => part.hp), [4, 3]);
  assert.deepEqual(bastion.parts!.map(part => part.frame), [0, 1]);
});
test('new enemy death cancels pending fire, gives one reward and pause freezes rotation age', () => {
  for (const kind of ['wraith', 'bastion', 'rotor'] as const) {
    const state = createGame(false, 3);
    state.nextEvent = getLevel(3).events.length; state.nextGround = getLevel(3).groundTargets.length;
    const enemy = createEnemy(state.nextId++, kind, 0, 6.5);
    Object.assign(enemy, { hp: 1, phase: 'charging', shotLeft: 0 });
    if (kind === 'bastion') {
      enemy.parts![0]!.hp = 1;
      enemy.parts![1]!.hp = 0;
    }
    state.enemies.push(enemy);
    state.bullets.push({ id: state.nextId++, x: 0, y: kind === 'bastion' ? 7.3 : 6, previousX: 0, previousY: 6,
      owner: 'player', vx: 0, vy: 22, radius: 0.065, speed: 22 });
    pauseGame(state);
    const frozen = structuredClone(state);
    updateGame(state, idle, 0.05);
    assert.deepEqual(state, frozen);
    state.status = 'playing';
    updateGame(state, idle, 0.05);
    assert.equal(state.enemies.length, 0);
    assert.equal(state.score, ENEMY_TYPES[kind].score);
    assert.equal(state.credits, state.score);
    assert.ok(state.bullets.every(b => b.owner === 'player'));
  }
});
test('dreadnought has entry shield, 150 hp, nine hull circles and a solid central armor plate', () => {
  const state = createGame(true, 3);
  state.missionStage = 'boss'; state.boss = ready(); state.nextId = 2;
  state.boss.timer = 5;
  assert.equal(state.boss.hp, 150);
  assert.equal(bossCircles(state.boss).length, 9);
  for (const x of [0, 2.1]) {
    state.bullets = [{ id: state.nextId++, x, y: 6.1, previousX: x, previousY: 6.1,
      owner: 'player', vx: 0, vy: 22, radius: 0.065, speed: 22 }];
    updateGame(state, idle, 0.05);
    assert.equal(state.boss.hp, x === 0 ? 149 : 148);
  }
  state.boss.mode = 'entering'; state.boss.y = 8;
  state.bullets = [{ id: state.nextId++, x: 0, y: 6.1, previousX: 0, previousY: 6.1,
    owner: 'player', vx: 0, vy: 22, radius: 0.065, speed: 22 }];
  updateGame(state, idle, 0.05);
  assert.equal(state.boss.hp, 148);
});
test('three dreadnought attacks have spaced bursts, finite normalized shots and locked pincer target', () => {
  for (const [attack, total] of [['pincer', 8], ['lattice', 14], ['helix', 24]] as const) {
    const boss = ready(); boss.attack = attack;
    const first = updateBoss(boss, 0.01, { x: -5, y: -7 });
    assert.equal(first.length, attack === 'pincer' ? 2 : attack === 'lattice' ? 7 : 8);
    assert.deepEqual(updateBoss(boss, 0.05, { x: 5, y: -7 }), []);
    const rest = [];
    for (let i = 0; i < 15; i++) rest.push(...updateBoss(boss, 0.05, { x: 5, y: -7 }));
    assert.equal(first.length + rest.length, total);
    assert.ok([...first, ...rest].every(s => Math.abs(Math.hypot(s.vx, s.vy) - (attack === 'helix' ? 5.2 : 6.4)) < 1e-9));
    if (attack === 'pincer') assert.equal(boss.targetX, -5);
  }
});
test('damaged sprite changes at half hp; stronger phase waits for current salvo and rest', () => {
  const boss = ready();
  updateBoss(boss, 0.01, { x: 0, y: -7 });
  assert.equal(dreadnoughtFrame(boss), 0);
  boss.hp = 75;
  assert.equal(dreadnoughtFrame(boss), 1);
  for (let i = 0; i < 15; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.phase, 1);
  assert.equal(boss.attackSpeed, 6.4);
  for (let i = 0; i < 45; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.phase, 2);
  assert.equal(boss.attackSpeed, 7.4);
  assert.ok(Math.abs(boss.x) <= 3);
});
test('lethal dreadnought hit cancels firing, clears hazards and credits reward only once', () => {
  const state = createGame(true, 3);
  state.missionStage = 'boss'; state.boss = ready(); state.nextId = 2;
  state.boss.hp = 1; state.lives = 1; state.shield = 0;
  state.bullets.push({ id: state.nextId++, x: 0, y: 4, previousX: 0, previousY: 4,
    owner: 'player', vx: 0, vy: 22, radius: 0.065, speed: 22 },
  { id: state.nextId++, x: 0, y: -7, previousX: 0, previousY: -7,
    owner: 'enemy', vx: 0, vy: 0, radius: 0.22, speed: 0 });
  updateGame(state, idle, 0.05);
  assert.equal(state.boss.hp, 0);
  assert.equal(state.lives, 1);
  assert.equal(state.score, 10000);
  assert.equal(state.credits, 10000);
  assert.equal(state.missionStage, 'bossDestroyed');
  assert.ok(state.bullets.every(b => b.owner === 'player'));
  for (let i = 0; i < 77; i++) updateGame(state, idle, 0.05);
  assert.equal(state.status, 'victory');
  assert.equal(state.credits, 10000);
});
test('full fourth mission reaches boss, departure and final victory with ordinary base firing', () => {
  const state = createGame(false, 3);
  state.invulnerabilityLeft = 300;
  let sawBoss = false, sawDeparture = false;
  for (let i = 0; i < 5400 && state.status === 'playing'; i++) {
    const dx = (state.boss?.x ?? 0) - state.player.x;
    updateGame(state, { x: Math.abs(dx) < 0.15 ? 0 : Math.sign(dx), y: 0, fire: true }, 0.05);
    sawBoss ||= state.missionStage === 'boss';
    sawDeparture ||= state.missionStage === 'departing';
  }
  assert.equal(state.status, 'victory');
  assert.equal(state.boss!.variant, 'dreadnought');
  assert.equal(state.boss!.hp, 0);
  assert.ok(sawBoss && sawDeparture);
  assert.equal(state.enemies.length + state.groundTargets.length, 0);
  assert.equal(state.credits, state.score);
});
test('fixed background key preserves occupied source corner instead of erasing brown boss pixels', () => {
  const pixels = keyedFrame({ width: 2, height: 1, data: new Uint8Array([84, 60, 24, 255, 191, 220, 191, 255]) },
    { x: 0, y: 0, width: 2, height: 1 }, TYRIAN_BACKGROUND);
  assert.deepEqual([...pixels], [84, 60, 24, 255, 0, 0, 0, 0]);
});
