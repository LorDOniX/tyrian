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
function victory(credits = 10000) {
  const state = isolated(); state.status = 'victory'; state.credits = credits; state.score = credits;
  return state;
}

test('shield absorbs six hits before hull; final hull hit ends game and cannot be repaired', () => {
  const state = isolated();
  assert.equal(state.shield, 6);
  assert.equal(state.lives, 3);
  for (let i = 0; i < 6; i++) hit(state);
  assert.equal(state.shield, 0);
  assert.equal(state.lives, 3);
  assert.equal(state.effects.filter(effect => effect.kind === 'shield').length, 6);
  hit(state);
  assert.equal(state.lives, 2);
  hit(state); hit(state);
  assert.equal(state.lives, 0);
  assert.equal(state.status, 'gameOver');
  const shield = state.shield;
  state.pickups.push(createPickup(state.nextId++, 'repair', 0, -7));
  for (let i = 0; i < 100; i++) updateGame(state, { ...idle, fire: true }, 0.05);
  assert.equal(state.lives, 0);
  assert.equal(state.shield, shield);
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
test('shield delay resets on impact and recharge starts only after remaining delay, with cap', () => {
  const state = isolated();
  hit(state);
  for (let i = 0; i < 40; i++) updateGame(state, idle, 0.05);
  assert.equal(state.shield, 5);
  hit(state);
  assert.equal(state.shield, 4);
  assert.equal(state.shieldRegenDelay, 3);
  for (let i = 0; i < 40; i++) updateGame(state, idle, 0.05);
  assert.equal(state.shield, 4);
  state.shieldRegenDelay = 0.02;
  updateGame(state, idle, 0.05);
  assert.ok(Math.abs(state.shield - 4.03) < 1e-10);
  for (let i = 0; i < 100; i++) updateGame(state, idle, 0.05);
  assert.equal(state.shield, 6);
});
test('pause freezes recharge and hit feedback', () => {
  const state = isolated(); hit(state); pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state, frozen);
});
test('shop rejects live, unaffordable and maxed upgrades without spending or changing score', () => {
  const live = isolated(); live.credits = 10000;
  assert.equal(buyUpgrade(live, 'weapon'), false);
  assert.equal(live.credits, 10000);
  const state = victory(2499);
  assert.equal(buyUpgrade(state, 'weapon'), false);
  assert.equal(state.credits, 2499);
  state.credits = 10000;
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 7500);
  assert.equal(upgradeCost(state.upgrades, 'weapon'), 5000);
  assert.equal(buyUpgrade(state, 'weapon'), true);
  assert.equal(state.credits, 2500);
  assert.equal(buyUpgrade(state, 'weapon'), false);
  assert.equal(upgradeCost(state.upgrades, 'weapon'), null);
  assert.equal(state.upgrades.weapon, 2);
  assert.equal(state.score, 2499);
});
test('bought equipment and unspent credits carry to next mission and survive defeat without farming', () => {
  const state = victory();
  buyUpgrade(state, 'weapon'); buyUpgrade(state, 'shield'); buyUpgrade(state, 'hull');
  assert.equal(state.credits, 3000);
  advanceLevel(state);
  assert.equal(state.levelIndex, 1);
  assert.deepEqual(state.upgrades, { weapon: 1, shield: 1, hull: 1 });
  assert.equal(state.shield, 9);
  assert.equal(state.lives, 4);
  assert.equal(state.score, 10000);
  assert.equal(state.checkpointCredits, 3000);
  state.score += 1500; state.credits += 1500;
  state.status = 'gameOver';
  restartGame(state);
  assert.equal(state.score, 10000);
  assert.equal(state.credits, 3000);
  assert.equal(state.shield, 9);
  assert.equal(state.lives, 4);
  assert.deepEqual(state.upgrades, { weapon: 1, shield: 1, hull: 1 });
});
test('last mission purchases remain usable when replaying final mission', () => {
  const state = victory(9000); state.levelIndex = 2;
  buyUpgrade(state, 'weapon'); buyUpgrade(state, 'weapon');
  replayCompletedLevel(state);
  assert.equal(state.levelIndex, 2);
  assert.equal(state.status, 'playing');
  assert.equal(state.credits, 1500);
  assert.equal(state.score, 9000);
  assert.equal(state.upgrades.weapon, 2);
  assert.equal(state.checkpointCredits, 1500);
});
test('all weapon tiers use smaller bullets and stronger permanent patterns; temporary bonus does not stack', () => {
  for (const [rank, count, cooldown] of [[0, 1, 0.22], [1, 2, 0.18], [2, 3, 0.14]]) {
    const state = isolated(); state.upgrades.weapon = rank!;
    updateGame(state, { ...idle, fire: true }, 0.05);
    assert.equal(state.bullets.length, count);
    assert.equal(state.cooldown, cooldown);
    assert.ok(state.bullets.every(b => b.radius === 0.065));
    const temporary = isolated(); temporary.upgrades.weapon = rank!; temporary.weaponLeft = 12;
    updateGame(temporary, { ...idle, fire: true }, 0.05);
    assert.equal(temporary.bullets.length, 3);
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
