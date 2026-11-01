import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, pauseGame } from '../src/game.ts';
import type { GameState, GroundTarget } from '../src/game.ts';
import { groundVolley } from '../src/ground-weapons.ts';
import type { GroundWeapon } from '../src/ground-weapons.ts';
import { createEnemy, updateEnemy, enemyVolley, ENEMY_TYPES } from '../src/enemies.ts';
import { getLevel } from '../src/level.ts';
const idle = { x: 0, y: 0, fire: false };
function isolated() {
  const state = createGame(false, 3);
  state.nextEvent = getLevel(3).events.length;
  state.nextGround = getLevel(3).groundTargets.length;
  return state;
}
function turret(state: GameState, weapon: GroundWeapon): GroundTarget {
  return { id: state.nextId++, kind: 'turret', weapon, x: 0, y: 5, previousX: 0, previousY: 5,
    levelY: 5, hp: 2, radius: 0.7, speed: 4, shotLeft: 0, hitLeft: 0 };
}
function playerShot(state: GameState, y: number) {
  state.bullets.push({ id: state.nextId++, x: 0, y, previousX: 0, previousY: y,
    owner: 'player', vx: 0, vy: 22, speed: 22, radius: 0.065 });
}

test('new ground weapons fire symmetric parallel pairs, normalized even when target overlaps', () => {
  for (const weapon of ['twinSteel', 'twinGold'] as const) {
    for (const target of [{ x: 4, y: -7 }, { x: 0, y: 5 }]) {
      const shots = groundVolley({ x: 0, y: 5 }, target, weapon);
      assert.equal(shots.length, 2);
      const [a, b] = shots;
      assert.equal(a!.vx, b!.vx); assert.equal(a!.vy, b!.vy);
      assert.ok(Math.abs(Math.hypot(a!.vx, a!.vy) - 6) < 1e-10);
      assert.ok(Math.abs(Math.hypot(a!.x - b!.x, a!.y - b!.y) - 0.44) < 1e-10);
      assert.ok(Math.abs((a!.x - b!.x) * a!.vx + (a!.y - b!.y) * a!.vy) < 1e-10);
    }
  }
  assert.equal(groundVolley({ x: 0, y: 5 }, { x: 0, y: -7 }, 'single').length, 1);
});
test('new turret fires a pair after collision processing; its projectiles keep direction and pause freezes it', () => {
  const state = isolated();
  state.groundTargets.push(turret(state, 'twinSteel'));
  updateGame(state, idle, 0.05);
  assert.equal(state.bullets.length, 2);
  assert.ok(state.bullets.every(b => b.owner === 'enemy'));
  const velocities = state.bullets.map(b => [b.vx, b.vy]);
  updateGame(state, { x: 1, y: 0, fire: false }, 0.05);
  assert.deepEqual(state.bullets.map(b => [b.vx, b.vy]), velocities);
  pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state, frozen);
});
test('destroying twin turrets cancels both pending shots and rewards once', () => {
  for (const weapon of ['twinSteel', 'twinGold'] as const) {
    const state = isolated();
    state.groundTargets.push(turret(state, weapon));
    playerShot(state, 4.3); playerShot(state, 4.3);
    updateGame(state, idle, 0.05);
    assert.equal(state.groundTargets.length, 0);
    assert.equal(state.bullets.length, 0);
    assert.equal(state.wrecks.length, 1);
    assert.equal(state.score, 200); assert.equal(state.credits, 200);
  }
});
test('third and fourth levels contain both new turret types and spawn them from sorted map data', () => {
  for (const levelIndex of [2, 3] as const) {
    const level = getLevel(levelIndex);
    assert.ok(level.groundTargets.every((target, i) => i === 0 || target.levelY >= level.groundTargets[i - 1]!.levelY));
    for (const weapon of ['twinSteel', 'twinGold']) assert.ok(level.groundTargets.some(target => target.weapon === weapon));
    const state = createGame(false, levelIndex);
    state.nextEvent = level.events.length; state.invulnerabilityLeft = 100;
    const seen = new Set();
    for (let i = 0; i < 1300 && state.missionStage === 'waves'; i++) {
      updateGame(state, idle, 0.05);
      state.groundTargets.forEach(target => seen.add(target.weapon));
    }
    assert.ok(seen.has('twinSteel') && seen.has('twinGold'));
  }
});
test('rocks require their full hit count, explode, and never award points, money or pickups', () => {
  for (const kind of ['rockSmall', 'rockLarge'] as const) {
    const state = isolated(); state.score = 500; state.credits = 300;
    const rock = createEnemy(state.nextId++, kind, 0, 6, 'spread');
    assert.equal(rock.drop, undefined);
    state.enemies.push(rock);
    for (let i = 0; i < ENEMY_TYPES[kind].hp; i++) {
      playerShot(state, rock.y);
      updateGame(state, idle, 0.01);
      assert.equal(rock.hp, ENEMY_TYPES[kind].hp - i - 1);
    }
    assert.equal(state.enemies.length, 0);
    assert.equal(state.score, 500); assert.equal(state.credits, 300);
    assert.equal(state.pickups.length, 0);
    assert.equal(state.effects.filter(effect => effect.kind === 'explosion').length, 1);
  }
});
test('rock impact damages player; destroying the same rock first prevents impact without reward', () => {
  for (const destroyed of [false, true]) {
    const state = isolated();
    const rock = createEnemy(state.nextId++, 'rockSmall', 0, -7);
    rock.speed = 0; rock.hp = destroyed ? 1 : 2;
    state.enemies.push(rock);
    if (destroyed) playerShot(state, -7);
    updateGame(state, idle, 0.05);
    assert.equal(state.shield, destroyed ? 6 : 5);
    assert.equal(state.lives, 3);
    assert.equal(state.enemies.length, 0);
    assert.equal(state.score, 0); assert.equal(state.credits, 0);
  }
});
test('rocks fall, never shoot and disappear after passing the screen', () => {
  for (const kind of ['rockSmall', 'rockLarge'] as const) {
    const rock = createEnemy(1, kind, 4, 14);
    for (let i = 0; i < 400; i++) {
      assert.equal(updateEnemy(rock, 0.05), false);
      assert.deepEqual(enemyVolley(rock, { x: 4, y: -7 }), []);
    }
    assert.ok(rock.y < -14);
  }
  const state = isolated();
  state.enemies.push(createEnemy(state.nextId++, 'rockLarge', 4, 14));
  for (let i = 0; i < 400; i++) updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.bullets.length, 0);
});
test('remaining rocks postpone boss warning until destroyed or fully offscreen', () => {
  const state = isolated(); state.time = getLevel(3).duration;
  state.enemies.push(createEnemy(state.nextId++, 'rockLarge', 4, -11.9));
  updateGame(state, idle, 0.05);
  assert.equal(state.missionStage, 'waves');
  for (let i = 0; i < 10; i++) updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.missionStage, 'warning');
  assert.equal(state.credits, 0);
});
