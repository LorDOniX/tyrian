import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, pauseGame, buyUpgrade, advanceLevel, restartGame, replayCompletedLevel } from '../src/game.ts';
import type { GameState } from '../src/game.ts';
import { createEnemy } from '../src/enemies.ts';
import { createPickup } from '../src/bonuses.ts';
import { getLevel } from '../src/level.ts';
import { maxLives, maxShield, upgradeCost } from '../src/upgrades.ts';
const idle = { x: 0, y: 0, fire: false };
function isolated() {
  const state = createGame();
  state.nextEvent = getLevel(0).events.length;
  state.nextGround = getLevel(0).groundTargets.length;
  return state;
}
function projectile(state: GameState) {
  state.bullets.push({ id: state.nextId++, x: state.player.x, y: state.player.y,
    previousX: state.player.x, previousY: state.player.y, radius: 0.22, speed: 0, vx: 0, vy: 0, owner: 'enemy' });
}
function hit(state: GameState) {
  state.invulnerabilityLeft = 0;
  projectile(state);
  updateGame(state, idle, 0.01);
}
function victory(credits = 20000) {
  const state = isolated(); state.status = 'victory'; state.credits = credits; state.score = credits;
  return state;
}

test('each life has a full shield; depletion loses one life, refills shield, final depletion ends game', () => {
  const state = isolated();
  for (let life = 3; life > 0; life--) {
    assert.equal(state.lives, life);
    assert.equal(state.shield, 6);
    for (let i = 0; i < 5; i++) hit(state);
    assert.equal(state.shield, 1);
    assert.equal(state.lives, life);
    hit(state);
    assert.equal(state.lives, life - 1);
    assert.equal(state.shield, life > 1 ? 6 : 0);
  }
  assert.equal(state.status, 'gameOver');
  state.pickups.push(createPickup(state.nextId++, 'repair', 0, -7));
  for (let i = 0; i < 100; i++) updateGame(state, { ...idle, fire: true }, 0.05);
  assert.equal(state.lives, 0);
  assert.equal(state.shield, 0);
  assert.equal(state.status, 'gameOver');
});
test('simultaneous projectiles and airship contact take one shield point with protection', () => {
  const state = isolated();
  const airship = createEnemy(state.nextId++, 'airship', 0, -7);
  Object.assign(airship, { phase: 'charging', shotLeft: 10 });
  state.enemies.push(airship);
  projectile(state); projectile(state);
  updateGame(state, idle, 0.05);
  assert.equal(state.shield, 5);
  assert.equal(state.lives, 3);
  assert.equal(state.bullets.length, 0);
  projectile(state);
  updateGame(state, idle, 0.05);
  assert.equal(state.shield, 5);
  assert.equal(state.lives, 3);
  assert.equal(state.enemies.length, 1);
});
test('shield does not regenerate over time and refills to purchased capacity when a life is lost', () => {
  const state = isolated();
  hit(state);
  for (let i = 0; i < 200; i++) updateGame(state, idle, 0.05);
  assert.equal(state.shield, 5);
  assert.equal(state.lives, 3);
  for (const rank of [0, 1, 2]) {
    state.upgrades.shield = rank;
    state.shield = 1;
    state.lives = 3;
    hit(state);
    assert.equal(state.shield, maxShield(state.upgrades));
    assert.equal(state.lives, 2);
    // Další projektil v ochranné době už obnovený štít neubere.
    projectile(state);
    updateGame(state, idle, 0.05);
    assert.equal(state.shield, maxShield(state.upgrades));
  }
});
test('pause freezes shield and hit feedback', () => {
  const state = isolated(); hit(state); pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state, frozen);
});
test('shop rejects live, unaffordable and maxed upgrades without spending or changing score', () => {
  const live = isolated(); live.credits = 20000;
  assert.equal(buyUpgrade(live, 'weapon'), false);
  assert.equal(live.credits, 20000);
  const state = victory(4999);
  assert.equal(buyUpgrade(state, 'weapon'), false);
  assert.equal(state.credits, 4999);
  state.credits = 20000;
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 15000);
  assert.equal(upgradeCost(state.upgrades, 'weapon'), 10000);
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 5000);
  assert.equal(buyUpgrade(state, 'weapon'), false);
  assert.equal(upgradeCost(state.upgrades, 'weapon'), 15000);
  state.credits = 35000;
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 20000);
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 0);
  state.credits = 100000;
  assert.equal(buyUpgrade(state, 'weapon'), false);
  assert.equal(upgradeCost(state.upgrades, 'weapon'), null);
  assert.equal(state.upgrades.weapon, 4);
  assert.equal(state.score, 4999);
});
test('bought equipment and unspent credits carry to next mission and survive defeat without farming', () => {
  const state = victory();
  buyUpgrade(state, 'weapon'); buyUpgrade(state, 'shield'); buyUpgrade(state, 'hull');
  assert.equal(state.credits, 6000);
  advanceLevel(state);
  assert.equal(state.levelIndex, 1);
  assert.deepEqual(state.upgrades, { weapon: 1, shield: 1, hull: 1 });
  assert.equal(state.shield, 9);
  assert.equal(state.lives, 4);
  assert.equal(state.score, 20000);
  assert.equal(state.checkpointCredits, 6000);
  state.score += 3000; state.credits += 3000;
  state.status = 'gameOver';
  restartGame(state);
  assert.equal(state.score, 20000);
  assert.equal(state.credits, 6000);
  assert.equal(state.shield, 9);
  assert.equal(state.lives, 4);
  assert.deepEqual(state.upgrades, { weapon: 1, shield: 1, hull: 1 });
});
test('last mission purchases remain usable when replaying final mission', () => {
  const state = victory(18000); state.levelIndex = 3;
  buyUpgrade(state, 'weapon'); buyUpgrade(state, 'weapon');
  replayCompletedLevel(state);
  assert.equal(state.levelIndex, 3);
  assert.equal(state.status, 'playing');
  assert.equal(state.credits, 3000);
  assert.equal(state.score, 18000);
  assert.equal(state.upgrades.weapon, 2);
  assert.equal(state.checkpointCredits, 3000);
});
test('all five gun tiers fire parallel symmetric rows; temporary bonus adds one gun up to five', () => {
  for (const [rank, count, cooldown] of [[0, 1, 0.22], [1, 2, 0.22], [2, 3, 0.22], [3, 4, 0.22], [4, 5, 0.22]]) {
    const state = isolated(); state.upgrades.weapon = rank!;
    updateGame(state, { ...idle, fire: true }, 0.05);
    assert.equal(state.bullets.length, count);
    assert.equal(state.cooldown, cooldown);
    assert.ok(state.bullets.every(b => b.radius === 0.065 && b.vx === 0 && b.vy === 22));
    assert.ok(Math.abs(state.bullets.reduce((sum, b) => sum + b.x, 0)) < 1e-9);
    state.bullets.forEach((b, i) => {
      if (i > 0) assert.ok(Math.abs(b.x - state.bullets[i - 1]!.x - 0.32) < 1e-9);
    });
    const temporary = isolated(); temporary.upgrades.weapon = rank!; temporary.weaponLeft = 12;
    updateGame(temporary, { ...idle, fire: true }, 0.05);
    assert.equal(temporary.bullets.length, Math.min(5, count! + 1));
    assert.ok(temporary.bullets.every(b => b.vx === 0));
    temporary.bullets = []; temporary.cooldown = 0; temporary.weaponLeft = 0.01;
    updateGame(temporary, { ...idle, fire: true }, 0.05);
    assert.equal(temporary.weaponLeft, 0);
    assert.equal(temporary.bullets.length, count);
  }
});
test('kill and full-hull repair credit real score once; upgraded hull repairs to purchased maximum', () => {
  const state = isolated();
  state.enemies.push(createEnemy(state.nextId++, 'scout', 0, 0));
  state.bullets.push({ id: state.nextId++, x: 0, y: 0, previousX: 0, previousY: 0,
    vx: 0, vy: 22, speed: 22, radius: 0.065, owner: 'player' });
  updateGame(state, idle, 0.05);
  assert.equal(state.score, 100); assert.equal(state.credits, 100);
  updateGame(state, idle, 0.05);
  assert.equal(state.credits, 100);
  state.upgrades.hull = 2; state.lives = 4;
  state.pickups.push(createPickup(state.nextId++, 'repair', 0, -7));
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, maxLives(state.upgrades));
  assert.equal(state.credits, 100);
  state.pickups.push(createPickup(state.nextId++, 'repair', 0, -7));
  updateGame(state, idle, 0.05);
  assert.equal(state.credits, 250); assert.equal(state.score, 250);
  assert.equal(maxShield({ weapon: 0, hull: 0, shield: 2 }), 12);
});
