import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, pauseGame } from '../src/game.ts';
import type { GameState } from '../src/game.ts';
import { createEnemy, enemyCircles, enemyVolley, bastionMuzzleY } from '../src/enemies.ts';
import { getLevel } from '../src/level.ts';
const idle = { x: 0, y: 0, fire: false };
function encounter() {
  const state = createGame(false, 3);
  state.nextEvent = getLevel(3).events.length;
  state.nextGround = getLevel(3).groundTargets.length;
  const enemy = createEnemy(state.nextId++, 'bastion', 0, 6, 'spread');
  Object.assign(enemy, { phase: 'charging', speed: 0, shotLeft: 10 });
  state.enemies.push(enemy);
  return { state, enemy, rear: enemy.parts![0]!, front: enemy.parts![1]! };
}
function shot(state: GameState, y: number, speed = 22) {
  state.bullets.push({ id: state.nextId++, x: 0, y, previousX: 0, previousY: y,
    owner: 'player', vx: 0, vy: speed, speed, radius: 0.065 });
}

test('bastion is made of rear and front in a contiguous vertical row, with independent health', () => {
  const { enemy, rear, front } = encounter();
  assert.equal(rear.frame, 0); assert.equal(front.frame, 1);
  assert.equal(rear.hp, 4); assert.equal(front.hp, 3);
  assert.equal(enemy.hp, rear.hp + front.hp);
  assert.equal(rear.offsetY - front.offsetY, 2.1);
  assert.equal(enemyCircles(enemy).length, 2);
});
test('front and rear must both be shot off, in either order; reward and pickup are issued only once', () => {
  for (const order of [[1, 0], [0, 1]]) {
    const { state, enemy } = encounter();
    for (let step = 0; step < order.length; step++) {
      const part = enemy.parts![order[step]!]!;
      const other = enemy.parts![order[1 - step]!]!;
      const otherHp = other.hp;
      while (part.hp > 0) {
        shot(state, enemy.y + part.offsetY);
        updateGame(state, idle, 0.01);
        assert.equal(other.hp, otherHp);
      }
      assert.equal(state.effects.filter(effect => effect.kind === 'explosion').length, step + 1);
      if (step === 0) {
        assert.equal(state.enemies.length, 1);
        assert.equal(enemyCircles(enemy).length, 1);
        assert.equal(enemy.hp, otherHp);
        assert.equal(state.score, 0); assert.equal(state.credits, 0);
        assert.equal(state.pickups.length, 0);
      }
    }
    assert.equal(state.enemies.length, 0);
    assert.equal(state.score, 600); assert.equal(state.credits, 600);
    assert.equal(state.pickups.length, 1);
    updateGame(state, idle, 0.01);
    assert.equal(state.score, 600);
    assert.equal(state.pickups.length, 1);
  }
});
test('one fast bullet is consumed by the first living segment and never damages both', () => {
  const { state, enemy, front, rear } = encounter();
  front.hp = 1; enemy.hp = 5;
  shot(state, 2, 200);
  updateGame(state, idle, 0.05);
  assert.equal(front.hp, 0);
  assert.equal(rear.hp, 4);
  assert.equal(enemy.hp, 4);
  assert.equal(state.bullets.length, 0);
});
test('another fast bullet in the same frame passes a just-destroyed front and hits rear', () => {
  const { state, enemy, front, rear } = encounter();
  front.hp = 1; enemy.hp = 5;
  shot(state, 2, 200); shot(state, 2, 200);
  updateGame(state, idle, 0.05);
  assert.equal(front.hp, 0);
  assert.equal(rear.hp, 3);
  assert.equal(enemy.hp, 3);
  assert.equal(state.bullets.length, 0);
  assert.equal(state.score, 0);
});
test('destroyed segment no longer contacts player; contact with surviving segment does not remove ship', () => {
  const { state, enemy, front, rear } = encounter();
  front.hp = 0; enemy.hp = 4;
  state.player.y = enemy.y + front.offsetY;
  updateGame(state, idle, 0.01);
  assert.equal(state.shield, 6);
  state.player.y = enemy.y + rear.offsetY;
  updateGame(state, idle, 0.01);
  assert.equal(state.shield, 5);
  assert.equal(state.enemies.length, 1);
  assert.equal(rear.hp, 4);
});
test('firing transfers from front to rear after front destruction and pause freezes segment feedback', () => {
  const { state, enemy, front, rear } = encounter();
  enemy.shotLeft = 0;
  let shots = enemyVolley(enemy, state.player);
  assert.equal(shots.length, 5);
  assert.ok(shots.every(shot => shot.y === enemy.y + front.offsetY - 0.8));
  front.hp = 0; enemy.hp = 4; enemy.shotLeft = 0;
  shots = enemyVolley(enemy, state.player);
  assert.ok(shots.every(shot => shot.y === enemy.y + rear.offsetY - 0.8));
  assert.equal(bastionMuzzleY(enemy), shots[0]!.y);
  shot(state, enemy.y + rear.offsetY);
  updateGame(state, idle, 0.01);
  assert.equal(rear.hp, 3);
  assert.ok(rear.hitLeft > 0);
  pauseGame(state);
  const frozen = structuredClone(state);
  updateGame(state, { ...idle, fire: true }, 0.05);
  assert.deepEqual(state, frozen);
});
