import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnemy, updateEnemy, enemyVolley, ENEMY_TYPES } from '../src/enemies.ts';
import type { EnemyKind } from '../src/enemies.ts';
import { createGame, updateGame, pauseGame, restartGame } from '../src/game.ts';
import { LEVEL_EVENTS, GROUND_TARGETS } from '../src/level.ts';
import { ATLAS, SPRITE_CLIPS, atlasRegion } from '../src/sprite-clips.ts';
const idle = { x: 0, y: 0, fire: false };
const player = { x: 0, y: -7 };
function ready(kind: EnemyKind) {
  const enemy = createEnemy(100, kind, 0, 7);
  enemy.phase = 'charging';
  enemy.shotLeft = 0;
  return enemy;
}

test('expanded waves contain fifty ships, all five types and original bonus carriers', () => {
  assert.equal(LEVEL_EVENTS.length, 50);
  assert.equal(new Set(LEVEL_EVENTS.map(event => event.kind)).size, 5);
  assert.equal(LEVEL_EVENTS.filter(event => event.drop).length, 5);
  assert.ok(LEVEL_EVENTS.every((event, i) => event.at < 55 && (i === 0 || event.at >= LEVEL_EVENTS[i - 1]!.at)));
});
test('every type has complete Tyrian poses with matching atlas capacity', () => {
  const starts = new Set<number>();
  for (const kind of Object.keys(ENEMY_TYPES) as EnemyKind[]) {
    const enemy = createEnemy(1, kind, 2, 13);
    assert.equal(enemy.hp, ENEMY_TYPES[kind].hp);
    assert.equal(enemy.radius, ENEMY_TYPES[kind].radius);
    const clip = SPRITE_CLIPS[ENEMY_TYPES[kind].clip];
    const newSheet = ['wraith', 'bastion', 'rotor'].includes(kind);
    assert.equal(clip.frames.length, kind === 'airship' || kind === 'bastion' ? 2 : newSheet ? 1 : 3);
    assert.equal(starts.has(clip.start), false);
    starts.add(clip.start);
    for (const frame of clip.frames) {
      assert.equal(frame.width, kind === 'airship' ? 96 : kind === 'wraith' ? 48 : 24);
      assert.equal(frame.height, kind === 'airship' ? 140 : 28);
      assert.equal(frame.source, kind === 'airship' ? 'newshi.shp.000000.png' : newSheet ? 'newsh2.shp.000000.png' : 'newsh$.shp.000000.png');
      const region = atlasRegion(clip.start);
      assert.ok(frame.width + 4 <= region.width && frame.height + 2 <= region.height);
    }
  }
  // Větší atlas nesmí změnit vizuální rozměr starších projektilů a efektů.
  const shot = SPRITE_CLIPS.playerShot;
  assert.equal(shot.frames[0]!.width / ATLAS.cell * shot.size * ATLAS.cell / shot.referenceCell,
    shot.frames[0]!.width / 16 * shot.size);
});
test('interceptors weave inside the viewport, descend and fire two parallel pairs', () => {
  const enemy = createEnemy(1, 'interceptor', 6, 13);
  const shots = [];
  for (let i = 0; i < 200; i++) {
    if (updateEnemy(enemy, 0.05)) shots.push(...enemyVolley(enemy, player));
    assert.ok(enemy.x >= -7.5 && enemy.x <= 7.5);
  }
  assert.equal(shots.length, 4);
  assert.equal(enemy.shots, 2);
  assert.ok(enemy.y < -12);
  assert.ok(shots.every(shot => shot.vx === 0 && shot.vy === -7));
  assert.ok(Math.abs(shots[1]!.x - shots[0]!.x - 0.6) < 1e-10);
  assert.notEqual(enemy.x, enemy.originX);
});
test('spreader emits three symmetric normalized rays, waits and eventually leaves', () => {
  const enemy = ready('spreader');
  const fan = enemyVolley(enemy, player);
  assert.equal(fan.length, 3);
  assert.equal(fan[0]!.vx, -fan[2]!.vx);
  assert.equal(fan[1]!.vx, 0);
  fan.forEach(shot => assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 5.5) < 1e-10));
  assert.equal(enemyVolley(enemy, player).length, 0);
  assert.equal(enemy.phase, 'charging');
  for (let i = 0; i < 26; i++) if (updateEnemy(enemy, 0.05)) enemyVolley(enemy, player);
  assert.equal(enemy.shots, 2);
  assert.equal(enemy.phase, 'leaving');
});
test('pulsar emits eight radial rays without increasing projectile speed', () => {
  const enemy = ready('pulsar');
  const ring = enemyVolley(enemy, player);
  assert.equal(ring.length, 8);
  for (let i = 0; i < ring.length; i++) {
    const shot = ring[i]!;
    const opposite = ring[(i + 4) % 8]!;
    assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 4.5) < 1e-10);
    assert.ok(Math.abs(shot.vx + opposite.vx) < 1e-10);
    assert.ok(Math.abs(shot.vy + opposite.vy) < 1e-10);
  }
});
test('gunner still aims safely and scouts never shoot; entering ships do not attack', () => {
  const gunner = ready('gunner');
  const aimed = enemyVolley(gunner, { x: 0, y: 6.2 });
  assert.deepEqual(aimed, [{ x: 0, y: 6.2, vx: 0, vy: -6 }]);
  assert.equal(enemyVolley(ready('scout'), player).length, 0);
  for (const kind of Object.keys(ENEMY_TYPES) as EnemyKind[]) {
    const enemy = createEnemy(1, kind, 0, 15);
    enemy.shotLeft = 0;
    assert.equal(updateEnemy(enemy, 0.05), false);
    assert.equal(enemyVolley(enemy, player).length, 0);
  }
});
test('destroying new types cancels pending volleys and awards their score once', () => {
  for (const kind of ['interceptor', 'spreader', 'pulsar'] as const) {
    const state = createGame();
    state.nextEvent = LEVEL_EVENTS.length;
    state.nextGround = GROUND_TARGETS.length;
    const enemy = ready(kind);
    enemy.hp = 1;
    state.enemies = [enemy];
    state.bullets = [{ id: 200, x: 0, y: 6.5, previousX: 0, previousY: 6.5,
      radius: 0.09, speed: 22, owner: 'player', vx: 0, vy: 22 }];
    updateGame(state, idle, 0.05);
    assert.equal(state.enemies.length, 0);
    assert.equal(state.bullets.filter(bullet => bullet.owner === 'enemy').length, 0);
    assert.equal(state.score, ENEMY_TYPES[kind].score);
    updateGame(state, idle, 0.05);
    assert.equal(state.score, ENEMY_TYPES[kind].score);
  }
});
test('pause freezes weave and charge timers; restart clears the larger fleet', () => {
  const state = createGame();
  state.enemies = [ready('interceptor'), ready('pulsar')];
  pauseGame(state);
  const snapshot = structuredClone(state);
  updateGame(state, { x: 1, y: 0, fire: true }, 0.05);
  assert.deepEqual(state, snapshot);
  restartGame(state);
  assert.deepEqual(state, createGame());
});
