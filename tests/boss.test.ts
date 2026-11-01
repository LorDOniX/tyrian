import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoss, bossCircles, updateBoss } from '../src/boss.ts';
import { createGame, updateGame, pauseGame, resumeGame, restartGame } from '../src/game.ts';
import type { Bullet } from '../src/game.ts';
import { startAtBoss } from '../src/start-mode.ts';
const idle = { x: 0, y: 0, fire: false };
function combat() {
  const state = createGame(true);
  state.missionStage = 'boss';
  state.boss = createBoss(state.nextId++);
  Object.assign(state.boss, { y: 7, previousY: 7, mode: 'charging', timer: 0.8 });
  return state;
}
function bullet(id: number, x: number, y: number, owner: Bullet['owner'] = 'player'): Bullet {
  return { id, x, y, previousX: x, previousY: y, radius: 0.09,
    owner, vx: 0, vy: owner === 'player' ? 22 : -22, speed: 22 };
}

test('dev shortcut only applies to development boss mode, restart returns to waves', () => {
  assert.equal(startAtBoss(true, 'boss'), true);
  assert.equal(startAtBoss(false, 'boss'), false);
  assert.equal(startAtBoss(true, 'development'), false);
  const state = createGame(true);
  assert.equal(state.missionStage, 'warning');
  assert.equal(state.bullets.length + state.enemies.length + state.groundTargets.length, 0);
  assert.equal(state.lives, 3);
  for (let i = 0; i < 31; i++) updateGame(state, idle, 0.05);
  assert.equal(state.missionStage, 'boss');
  const id = state.boss!.id;
  updateGame(state, idle, 0.05);
  assert.equal(state.boss!.id, id);
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('entry shield consumes shots, prevents contact and deals no damage', () => {
  const state = combat();
  Object.assign(state.boss!, { mode: 'entering', y: 9, previousY: 9 });
  state.player.y = 9;
  state.bullets.push(bullet(state.nextId++, 0, 8));
  updateGame(state, idle, 0.05);
  assert.equal(state.boss!.hp, 60);
  assert.equal(state.lives, 3);
  assert.equal(state.bullets.length, 0);
});
test('overlapping boss circles consume a bullet and subtract exactly one hp', () => {
  const state = combat();
  state.bullets.push(bullet(state.nextId++, 0.9, 6.5));
  updateGame(state, idle, 0.05);
  assert.equal(state.boss!.hp, 59);
  assert.equal(state.bullets.length, 0);
  assert.equal(bossCircles(state.boss!).length, 3);
});
test('aimed salvo locks direction, fires exactly three times with spacing', () => {
  const boss = createBoss(1);
  Object.assign(boss, { y: 7, previousY: 7, mode: 'charging', timer: 0.05 });
  const first = updateBoss(boss, 0.05, { x: -1.65, y: -7 });
  assert.equal(first.length, 1);
  assert.equal(first[0]!.vx, 0);
  assert.equal(first[0]!.vy, -5);
  assert.equal(updateBoss(boss, 0.17, { x: 8, y: 0 }).length, 0);
  const second = updateBoss(boss, 0.01, { x: 8, y: 0 });
  assert.equal(second.length, 1);
  assert.equal(second[0]!.vx, 0);
  assert.equal(updateBoss(boss, 0.18, { x: 8, y: 0 }).length, 1);
  assert.equal(boss.mode, 'resting');
  assert.equal(boss.attack, 'fan');
});
test('zero-distance aim remains finite; fan is symmetric and normalized', () => {
  const boss = createBoss(1);
  Object.assign(boss, { y: 7, previousY: 7, mode: 'charging', timer: 0 });
  const aimed = updateBoss(boss, 0.01, { x: -1.65, y: 5.9 });
  assert.ok(aimed.every(shot => Number.isFinite(shot.vx) && Number.isFinite(shot.vy)));
  Object.assign(boss, { mode: 'charging', attack: 'fan', timer: 0 });
  const fan = updateBoss(boss, 0.01, { x: 8, y: -7 });
  assert.equal(fan.length, 5);
  fan.forEach(shot => assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 5) < 1e-10));
  assert.equal(fan[0]!.vx, -fan[4]!.vx);
  assert.equal(fan[0]!.vy, fan[4]!.vy);
  assert.equal(fan[2]!.vx, 0);
});
test('phase two waits for current salvo and switches once, retaining attack speed', () => {
  const boss = createBoss(1);
  Object.assign(boss, { y: 7, previousY: 7, mode: 'charging', timer: 0, hp: 29 });
  const first = updateBoss(boss, 0.01, { x: 0, y: -7 });
  assert.ok(Math.abs(Math.hypot(first[0]!.vx, first[0]!.vy) - 5) < 1e-10);
  const second = updateBoss(boss, 0.18, { x: 5, y: -7 });
  assert.ok(Math.abs(Math.hypot(second[0]!.vx, second[0]!.vy) - 5) < 1e-10);
  updateBoss(boss, 0.18, { x: 5, y: -7 });
  assert.equal(boss.phase, 1);
  for (let i = 0; i < 25; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.phase, 2);
  assert.equal(boss.mode, 'transitioning');
  for (let i = 0; i < 17; i++) updateBoss(boss, 0.05, { x: 0, y: -7 });
  assert.equal(boss.attackSpeed, 6);
  assert.equal(boss.mode, 'charging');
});
test('boss contact costs one life with protection, boss does not vanish', () => {
  const state = combat();
  state.player.y = 7;
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 2);
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 2);
  assert.equal(state.boss!.hp, 60);
});
test('boss death clears simultaneous hazards before player damage and cancels pending shot', () => {
  const state = combat();
  state.boss!.hp = 1;
  state.boss!.timer = 0;
  state.lives = 1;
  state.bullets.push(bullet(state.nextId++, 0, 5.5), bullet(state.nextId++, 0, -6.5, 'enemy'));
  updateGame(state, idle, 0.05);
  assert.equal(state.boss!.mode, 'destroyed');
  assert.equal(state.missionStage, 'bossDestroyed');
  assert.equal(state.lives, 1);
  assert.equal(state.score, 2000);
  assert.equal(state.bullets.filter(shot => shot.owner === 'enemy').length, 0);
  for (let i = 0; i < 66; i++) updateGame(state, idle, 0.05);
  assert.equal(state.status, 'victory');
  assert.equal(state.score, 2000);
  pauseGame(state);
  assert.equal(state.status, 'victory');
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('pause freezes every boss mode and destruction, defeated player cannot win', () => {
  for (const mode of ['entering', 'charging', 'firing', 'resting', 'transitioning', 'destroyed'] as const) {
    const state = combat();
    state.boss!.mode = mode;
    if (mode === 'destroyed') { state.missionStage = 'bossDestroyed'; state.stageTimer = 1; }
    pauseGame(state);
    const snapshot = structuredClone(state);
    updateGame(state, { x: 1, y: 1, fire: true }, 0.05);
    assert.deepEqual(state, snapshot);
    resumeGame(state);
    assert.equal(state.status, 'playing');
  }
  const state = combat();
  state.lives = 0;
  state.boss!.hp = 1;
  state.bullets.push(bullet(state.nextId++, 0, 5.5));
  updateGame(state, idle, 0.05);
  assert.equal(state.status, 'gameOver');
});
test('full mission reaches victory after waves and boss with normal firing', () => {
  const state = createGame();
  state.invulnerabilityLeft = 200;
  for (let i = 0; i < 3200 && state.status === 'playing'; i++) {
    // Testuje dostupnost cíle, skutečné střely a úplné napojení mise.
    const desiredX = state.boss?.x ?? 0;
    const dx = desiredX - state.player.x;
    updateGame(state, { x: Math.abs(dx) < 0.1 ? 0 : Math.sign(dx), y: 0, fire: true }, 0.05);
  }
  assert.equal(state.status, 'victory');
  assert.equal(state.boss!.hp, 0);
  assert.ok(state.score >= 2000);
});

test('rest movement reaches its destination and stays within the viewport', () => {
  const boss = createBoss(1);
  Object.assign(boss, { x: 3, y: 7, previousY: 7, mode: 'resting',
    restStartX: 3, restTarget: -3, timer: 1.2, restDuration: 1.2 });
  for (let i = 0; i < 24; i++) {
    updateBoss(boss, 0.05, { x: 0, y: -7 });
    assert.ok(boss.x >= -3 && boss.x <= 3);
  }
  assert.ok(Math.abs(boss.x + 3) < 1e-9);
  assert.equal(boss.mode, 'charging');
});
