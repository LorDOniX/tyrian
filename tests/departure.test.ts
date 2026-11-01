import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, beginLevelDeparture, pauseGame, resumeGame, restartGame, advanceLevel,
  DEPARTURE_DURATION, DEPARTURE_END_Y } from '../src/game.ts';
import { createBoss } from '../src/boss.ts';
const idle = { x: 0, y: 0, fire: false };

test('every level enters departure after boss explosion and shows victory only offscreen', () => {
  for (const index of [0, 1, 2, 3] as const) {
    const state = createGame(true, index);
    state.boss = createBoss(state.nextId++, ['commander', 'convoy', 'fortress', 'dreadnought'][index] as 'commander' | 'convoy' | 'fortress' | 'dreadnought');
    Object.assign(state.boss, { hp: 0, mode: 'destroyed' });
    state.missionStage = 'bossDestroyed'; state.stageTimer = 0.05;
    updateGame(state, idle, 0.05);
    assert.equal(state.missionStage, 'departing');
    assert.equal(state.status, 'playing');
    assert.equal(state.departure!.elapsed, 0);
    for (let i = 0; i < 43; i++) updateGame(state, idle, 0.05);
    assert.equal(state.status, 'playing');
    updateGame(state, idle, 0.05);
    assert.equal(state.status, 'victory');
    assert.equal(state.departure!.elapsed, DEPARTURE_DURATION);
    assert.equal(state.player.y, DEPARTURE_END_Y);
    const finalY = state.player.y;
    updateGame(state, { x: 1, y: -1, fire: true }, 0.05);
    assert.equal(state.player.y, finalY);
  }
});
test('departure accelerates straight upward, ignores controls, shots and contacts', () => {
  const state = createGame();
  state.player.x = 7; state.player.y = -10.5; state.score = 4321;
  state.invulnerabilityLeft = 2;
  beginLevelDeparture(state);
  const distances = [];
  for (let i = 0; i < 20; i++) {
    const y = state.player.y;
    updateGame(state, { x: -1, y: -1, fire: true }, 0.05);
    distances.push(state.player.y - y);
    assert.equal(state.player.x, 7);
    assert.equal(state.bullets.length, 0);
    assert.equal(state.pickups.length, 0);
    assert.equal(state.lives, 3);
    assert.equal(state.score, 4321);
  }
  assert.ok(distances.every((distance, i) => distance > 0 && (i === 0 || distance > distances[i - 1]!)));
  assert.equal(state.invulnerabilityLeft, 0);
  // Stejná trajektorie při odlišné délce kroku.
  const other = createGame(); other.player.y = -10.5;
  beginLevelDeparture(other);
  for (let i = 0; i < 40; i++) updateGame(other, idle, 0.025);
  assert.ok(Math.abs(other.player.y - state.player.y) < 1e-10);
});
test('pause freezes flight, early advance is blocked and restart clears departure', () => {
  const state = createGame();
  state.score = 9876;
  beginLevelDeparture(state);
  updateGame(state, idle, 0.05);
  advanceLevel(state);
  assert.equal(state.levelIndex, 0);
  pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state, frozen);
  resumeGame(state);
  for (let i = 0; i < 44; i++) updateGame(state, idle, 0.05);
  advanceLevel(state);
  assert.equal(state.levelIndex, 1);
  assert.equal(state.score, 9876);
  assert.equal(state.departure, null);
  assert.equal(state.player.y, -7);
  beginLevelDeparture(state);
  restartGame(state);
  assert.equal(state.departure, null);
  assert.equal(state.missionStage, 'waves');
});
