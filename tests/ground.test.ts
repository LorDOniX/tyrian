import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, restartGame, pauseGame, resumeGame } from '../src/game.ts';
import type { GameState, GroundTarget, Bullet, Enemy } from '../src/game.ts';
import { GROUND_TARGETS, LEVEL_EVENTS } from '../src/level.ts';
import { segmentLayout, SEGMENT_LENGTH } from '../src/terrain-layout.ts';
const idle = { x: 0, y: 0, fire: false };
const stateOnly = () => {
  const state = createGame();
  state.nextEvent = LEVEL_EVENTS.length;
  state.nextGround = GROUND_TARGETS.length;
  return state;
};
const turret = (y = 5): GroundTarget => ({ id: 100, kind: 'turret', x: 0, y,
  previousX: 0, previousY: y, levelY: y, hp: 2, radius: 0.7, speed: 4, shotLeft: 1.5, hitLeft: 0 });
const shot = (id: number, y: number): Bullet => ({ id, x: 0, y, previousX: 0,
  previousY: y, speed: 22, vx: 0, vy: 22, owner: 'player', radius: 0.09 });
const step = (state: GameState, count = 1) => {
  for (let i = 0; i < count; i++) updateGame(state, idle, 0.05);
};

test('terrain layout covers viewport with contiguous segments at seams and long distances', () => {
  for (const distance of [0, 3.999, 4, 4.001, 19.999, 20, 20.001, 1000]) {
    const layout = segmentLayout(distance);
    assert.equal(layout.length, 3);
    assert.ok(layout[0]!.y - SEGMENT_LENGTH / 2 <= -12);
    assert.ok(layout[2]!.y + SEGMENT_LENGTH / 2 >= 12);
    for (let i = 1; i < layout.length; i++) {
      assert.ok(Math.abs(layout[i]!.y - layout[i - 1]!.y - SEGMENT_LENGTH) < 1e-10);
    }
  }
});
test('distance drives ground positions, pause freezes everything and reset restores start', () => {
  const state = stateOnly();
  state.groundTargets = [turret()];
  step(state, 3);
  assert.ok(Math.abs(state.scrollDistance - 0.6) < 1e-10);
  assert.equal(state.groundTargets[0]!.y, 5 - state.scrollDistance);
  pauseGame(state);
  const snapshot = structuredClone(state);
  step(state, 30);
  assert.deepEqual(state, snapshot);
  resumeGame(state);
  step(state);
  assert.ok(state.scrollDistance > snapshot.scrollDistance);
  restartGame(state);
  assert.deepEqual(state, createGame());
  assert.deepEqual(segmentLayout(state.scrollDistance), segmentLayout(0));
});
test('ground events spawn once on entering range', () => {
  const state = createGame();
  state.scrollDistance = 35.9;
  step(state);
  assert.equal(state.groundTargets.length, 1);
  assert.equal(state.nextGround, 1);
  step(state);
  assert.equal(state.groundTargets.length, 1);
  assert.equal(state.groundTargets[0]!.levelY, 49);
});
test('flying over turret costs no life; visible turret fires after preparation', () => {
  const state = stateOnly();
  const target = turret(-7);
  target.shotLeft = 0.01;
  state.groundTargets = [target];
  step(state);
  assert.equal(state.lives, 3);
  assert.equal(state.bullets.length, 1);
  assert.equal(state.bullets[0]!.owner, 'enemy');
  step(state);
  assert.equal(state.lives, 2);
});
test('offscreen turrets never fire and are removed after passing', () => {
  for (const y of [12, -12, -15]) {
    const state = stateOnly();
    state.groundTargets = [{ ...turret(y), shotLeft: 0 }];
    step(state);
    assert.equal(state.bullets.length, 0);
    if (y === -15) assert.equal(state.groundTargets.length, 0);
  }
});
test('two hits destroy turret once, cancel pending shot and leave scrolling wreck', () => {
  const state = stateOnly();
  const target = turret();
  state.groundTargets = [target];
  state.bullets = [shot(101, 4.2)];
  step(state);
  assert.equal(target.hp, 1);
  assert.equal(state.score, 0);
  target.shotLeft = 0;
  state.bullets.push(shot(102, 4));
  step(state);
  assert.equal(state.groundTargets.length, 0);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.score, 200);
  assert.equal(state.wrecks.length, 1);
  step(state);
  assert.equal(state.wrecks[0]!.y, target.levelY - state.scrollDistance);
  step(state, 110);
  assert.equal(state.wrecks.length, 0);
  assert.equal(state.score, 200);
  assert.equal(state.groundTargets.length, 0);
});
test('nearest target wins across air and ground lists', () => {
  const state = stateOnly();
  state.groundTargets = [{ ...turret(0.4), hp: 1 }];
  const air: Enemy = { id: 200, x: 0, y: 1, previousX: 0, previousY: 1,
    radius: 0.1, speed: 0, kind: 'scout', hp: 1, phase: 'entering', shotLeft: 1, shots: 0, hitLeft: 0 };
  state.enemies = [air];
  state.bullets = [shot(101, -0.5)];
  step(state);
  assert.equal(state.score, 200);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.groundTargets.length, 0);
});
test('boss warning waits for ground events and live targets but ignores wrecks', () => {
  const state = stateOnly();
  state.time = 55;
  state.nextGround = 0;
  step(state);
  assert.equal(state.status, 'playing');
  state.nextGround = GROUND_TARGETS.length;
  state.groundTargets = [turret()];
  step(state);
  assert.equal(state.status, 'playing');
  state.groundTargets = [];
  state.wrecks = [{ id: 100, x: 0, y: 5, levelY: state.scrollDistance + 5 }];
  step(state);
  assert.equal(state.missionStage, 'warning');
  restartGame(state);
  assert.deepEqual(state, createGame());
});
