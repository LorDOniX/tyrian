import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATLAS, SPRITE_CLIPS, spriteFrame, frameUV, clipDuration } from '../src/sprite-clips.ts';
import { keyedFrame } from '../scripts/sprite-pixels.ts';
import { createGame, updateGame, pauseGame, resumeGame, restartGame } from '../src/game.ts';
import type { Bullet, Enemy } from '../src/game.ts';
const idle = { x: 0, y: 0, fire: false };

function encounter() {
  const state = createGame();
  state.enemies = [{ id: state.nextId++, x: 0, y: 0, previousX: 0, previousY: 0,
    speed: 0, radius: 0.6, kind: 'gunner', hp: 2, phase: 'charging', shotLeft: 10,
    shots: 0, hitLeft: 0 } satisfies Enemy];
  return state;
}
function shot(id: number): Bullet {
  return { id, x: 0, y: -0.8, previousX: 0, previousY: -0.8,
    vx: 0, vy: 22, speed: 22, radius: 0.09, owner: 'player' };
}

test('keying preserves dark outlines and other greens; background is transparent black', () => {
  const data = new Uint8Array([191, 220, 191, 255, 0, 0, 0, 255, 190, 220, 191, 255]);
  const pixels = keyedFrame({ width: 3, height: 1, data }, { x: 0, y: 0, width: 3, height: 1 }, [191, 220, 191]);
  assert.deepEqual([...pixels], [0, 0, 0, 0, 0, 0, 0, 255, 190, 220, 191, 255]);
  assert.throws(() => keyedFrame({ width: 3, height: 1, data }, { x: 2, y: 0, width: 2, height: 1 }, [191, 220, 191]));
});
test('atlas PNG has expected dimensions, alpha channel and non-overlapping frames', () => {
  const png = readFileSync(new URL('../src/assets/tyrian-fx.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), ATLAS.width);
  assert.equal(png.readUInt32BE(20), ATLAS.height);
  assert.equal(png[25], 6); // RGBA
  const indices = new Set<number>();
  for (const clip of Object.values(SPRITE_CLIPS)) {
    for (const [offset, rect] of clip.frames.entries()) {
      const index = clip.start + offset;
      assert.equal(indices.has(index), false);
      indices.add(index);
      const uv = frameUV(index);
      assert.ok(uv.left >= 0 && uv.right <= 1 && uv.bottom >= 0 && uv.top <= 1);
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 228 && rect.y + rect.height <= 224);
    }
  }
});
test('one-shot animation advances by age and ends; projectiles loop', () => {
  assert.equal(spriteFrame('explosion', 0), SPRITE_CLIPS.explosion.start);
  assert.equal(spriteFrame('explosion', 1 / 30), SPRITE_CLIPS.explosion.start + 1);
  assert.equal(spriteFrame('explosion', clipDuration('explosion') - 0.0001), 12);
  assert.equal(spriteFrame('explosion', clipDuration('explosion')), null);
  assert.equal(spriteFrame('playerShot', clipDuration('playerShot')), SPRITE_CLIPS.playerShot.start);
  assert.equal(spriteFrame('impact', -1), SPRITE_CLIPS.impact.start);
  const top = frameUV(0);
  const nextRow = frameUV(16);
  assert.ok(top.top > nextRow.top); // Zdroj je odshora, UV odspodu.
});
test('surviving hit creates one impact at contact, lethal hit creates explosion', () => {
  const state = encounter();
  state.bullets.push(shot(state.nextId++));
  updateGame(state, idle, 0.05);
  assert.equal(state.enemies[0]!.hp, 1);
  assert.equal(state.score, 0);
  assert.equal(state.effects.length, 1);
  assert.equal(state.effects[0]!.kind, 'impact');
  assert.ok(state.effects[0]!.y > -0.8 && state.effects[0]!.y < 0);
  state.bullets.push(shot(state.nextId++));
  updateGame(state, idle, 0.05);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.effects.filter(effect => effect.kind === 'explosion').length, 1);
  assert.equal(state.score, 250);
});
test('pause freezes animation, resume expires it and restart clears every effect', () => {
  const state = encounter();
  state.bullets.push(shot(state.nextId++));
  updateGame(state, idle, 0.05);
  pauseGame(state);
  const snapshot = structuredClone(state.effects);
  updateGame(state, idle, 0.05);
  assert.deepEqual(state.effects, snapshot);
  resumeGame(state);
  for (let i = 0; i < 4; i++) updateGame(state, idle, 0.05);
  assert.equal(state.effects.length, 0);
  restartGame(state);
  assert.deepEqual(state, createGame());
});
test('protected player consumes projectile with shield effect, without losing life', () => {
  const state = createGame();
  state.invulnerabilityLeft = 0.9;
  state.bullets.push({ ...shot(state.nextId++), y: -6.5, previousY: -6.5, owner: 'enemy', vy: -22 });
  updateGame(state, idle, 0.05);
  assert.equal(state.lives, 3);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.effects[0]!.kind, 'shield');
});
test('death effect finishes behind result panel while gameplay remains frozen', () => {
  const state = createGame();
  state.lives = 1;
  state.bullets.push({ ...shot(state.nextId++), y: -6.5, previousY: -6.5, owner: 'enemy', vy: -22 });
  updateGame(state, idle, 0.05);
  assert.equal(state.status, 'gameOver');
  assert.equal(state.effects[0]!.kind, 'explosion');
  const snapshot = structuredClone(state);
  for (let i = 0; i < 12; i++) updateGame(state, { x: 1, y: 1, fire: true }, 0.05);
  assert.equal(state.effects.length, 0);
  assert.deepEqual({ ...state, effects: [] }, { ...snapshot, effects: [] });
});
