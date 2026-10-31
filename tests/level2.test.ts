import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, advanceLevel, restartGame, pauseGame } from '../src/game.ts';
import type { Bullet } from '../src/game.ts';
import { createEnemy, enemySpritePose, enemyCircles, enemyVolley, updateEnemy } from '../src/enemies.ts';
import { getLevel, LEVEL_EVENTS } from '../src/level.ts';
import { atlasRegion, SPRITE_CLIPS } from '../src/sprite-clips.ts';
import { startLevel } from '../src/start-mode.ts';
const idle = { x: 0, y: 0, fire: false };
const shot = (id: number, x = 0, y = 5.8): Bullet => ({ id, x, y, previousX: x, previousY: y,
  vx: 0, vy: 22, speed: 22, radius: 0.09, owner: 'player' });
function encounter() {
  const state = createGame(false, 1);
  state.nextEvent = getLevel(1).events.length;
  const airship = createEnemy(state.nextId++, 'airship', 0, 6);
  Object.assign(airship, { phase: 'charging', speed: 0, shotLeft: 10 });
  state.enemies.push(airship);
  return { state, airship };
}

test('level two is separate data with four airships and a reachable first encounter', () => {
  const level = getLevel(1);
  assert.equal(getLevel(0).events, LEVEL_EVENTS);
  assert.equal(level.events.filter(event => event.kind === 'airship').length, 4);
  assert.equal(level.events[0]!.kind, 'airship');
  assert.equal(level.boss, false);
  assert.ok(level.events.every((event, i) => event.at < level.duration && (i === 0 || event.at >= level.events[i - 1]!.at)));
  const state = createGame(false, 1);
  for (let i = 0; i < 21; i++) updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0]!.kind, 'airship');
  assert.equal(state.groundTargets.length, 0);
});
test('debug level shortcut is development-only and reset keeps current level', () => {
  assert.equal(startLevel(true, 'level2'), 1);
  assert.equal(startLevel(false, 'level2'), 0);
  assert.equal(startLevel(true, 'boss'), 0);
  const state = createGame(false, 1);
  updateGame(state, { ...idle, fire: true }, 0.05);
  state.lives = 1;
  restartGame(state);
  assert.deepEqual(state, createGame(false, 1));
});
test('advance requires level-one victory, carries score and clears world with fresh lives', () => {
  const state = createGame();
  advanceLevel(state);
  assert.equal(state.levelIndex, 0);
  state.status = 'victory';
  state.score = 3450;
  state.lives = 1;
  state.weaponLeft = 7;
  state.bullets.push(shot(state.nextId++));
  advanceLevel(state);
  assert.equal(state.levelIndex, 1);
  assert.equal(state.checkpointScore, 3450);
  assert.equal(state.score, 3450);
  assert.equal(state.lives, 3);
  assert.equal(state.weaponLeft, 0);
  assert.equal(state.time, 0);
  assert.equal(state.bullets.length, 0);
  state.score += 500;
  state.status = 'gameOver';
  restartGame(state);
  assert.equal(state.score, 3450);
  assert.equal(state.levelIndex, 1);
});
test('first damage swaps airship sprite, overlapping hull circles do not multiply damage', () => {
  const { state, airship } = encounter();
  assert.equal(enemySpritePose(airship), 0);
  assert.equal(enemyCircles(airship).length, 3);
  state.bullets.push(shot(state.nextId++));
  updateGame(state, idle, 0.05);
  assert.equal(airship.hp, 15);
  assert.equal(enemySpritePose(airship), 1);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.score, 0);
  assert.equal(state.effects[0]!.kind, 'impact');
  for (let i = 0; i < 3; i++) updateGame(state, idle, 0.05);
  assert.equal(enemySpritePose(airship), 1);
});
test('airship hull includes nose and tail, does not disappear on player contact', () => {
  for (const y of [3.8, 8.2]) {
    const { state, airship } = encounter();
    state.player.y = y;
    updateGame(state, idle, 0.05);
    assert.equal(state.lives, 2);
    assert.equal(state.enemies.length, 1);
    assert.equal(airship.hp, 16);
    updateGame(state, idle, 0.05);
    assert.equal(state.lives, 2);
  }
});
test('last hit destroys airship with three explosions, single reward and no pending salvo', () => {
  const { state, airship } = encounter();
  airship.hp = 1;
  airship.shotLeft = 0;
  state.bullets.push(shot(state.nextId++), shot(state.nextId++));
  updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.score, 1000);
  assert.equal(state.effects.filter(effect => effect.kind === 'explosion').length, 3);
  assert.equal(state.bullets.filter(bullet => bullet.owner === 'enemy').length, 0);
  updateGame(state, idle, 0.05);
  assert.equal(state.score, 1000);
});
test('airship enters fully, fires three pairs and departs in finite time', () => {
  const airship = createEnemy(1, 'airship', 0, 18);
  const shots = [];
  for (let i = 0; i < 600; i++) {
    if (updateEnemy(airship, 0.05)) shots.push(...enemyVolley(airship, { x: 0, y: -7 }));
  }
  assert.equal(airship.shots, 3);
  assert.equal(shots.length, 6);
  shots.forEach(shot => assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 5) < 1e-10));
  assert.ok(airship.y < -16);
});
test('large atlas regions contain whole variants and do not overlap any other frame', () => {
  const clip = SPRITE_CLIPS.airship;
  assert.equal(clip.frames[0]!.x, 0);
  assert.equal(clip.frames[1]!.x, 96);
  for (const frame of clip.frames) assert.equal(frame.height, 140);
  const regions = Object.values(SPRITE_CLIPS).flatMap(clip => clip.frames.map((_, i) => atlasRegion(clip.start + i)));
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i]!;
      const b = regions[j]!;
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    }
  }
});
test('level-two pause freezes hull state and complete convoy reaches final victory', () => {
  const { state, airship } = encounter();
  airship.hp = 15;
  pauseGame(state);
  const snapshot = structuredClone(state);
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.deepEqual(state, snapshot);
  const run = createGame(false, 1);
  run.invulnerabilityLeft = 200;
  for (let i = 0; i < 1800 && run.status === 'playing'; i++) {
    const target = run.enemies.find(enemy => enemy.kind === 'airship');
    const dx = (target?.x ?? 0) - run.player.x;
    updateGame(run, { x: Math.abs(dx) < 0.15 ? 0 : Math.sign(dx), y: 0, fire: true }, 0.05);
  }
  assert.equal(run.status, 'victory');
  assert.equal(run.boss, null);
  assert.equal(run.nextEvent, getLevel(1).events.length);
  assert.equal(run.enemies.length, 0);
});
