import * as THREE from 'three';
import type { Boss } from './boss.ts';
import type { SpriteEffects } from './sprite-effects.ts';
import { convoyBossFrame } from './convoy-boss.ts';

export function createConvoyBossModel(scene: THREE.Scene, sprites: SpriteEffects) {
  const root = new THREE.Group();
  scene.add(root);
  const body = sprites.create('convoyBoss');
  body.renderOrder = 4;
  const left = sprites.create('convoyLeftGun');
  const right = sprites.create('convoyRightGun');
  left.position.set(-3, -0.7, 0.1);
  right.position.set(3, -0.7, 0.1);
  left.renderOrder = right.renderOrder = 7;
  const shieldGeometry = new THREE.RingGeometry(4.05, 4.1, 64);
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#a5f3fc', transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
  shield.scale.y = 0.55;
  shield.position.z = 0.2;
  shield.renderOrder = 8;
  const coreGeometry = new THREE.SphereGeometry(0.15, 12, 8);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: '#ffdc87', transparent: true, depthTest: false, depthWrite: false });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.set(0, -0.6, 0.2);
  core.renderOrder = 7;
  root.add(body, left, right, shield, core);

  function render(boss: Boss | null, time: number, destructionLeft: number) {
    root.visible = boss?.variant === 'convoy';
    if (!boss || boss.variant !== 'convoy') return;
    const destroyed = boss.mode === 'destroyed';
    root.position.set(boss.x, boss.y, 0);
    root.scale.setScalar(destroyed ? Math.min(1, Math.max(0, destructionLeft)) : 1);
    root.visible = !destroyed || destructionLeft > 0.1;
    sprites.animate(body, 'convoyBoss', convoyBossFrame(boss));
    body.visible = destroyed || boss.hitLeft === 0 || Math.floor(time * 40) % 2 === 0;
    sprites.animate(left, 'convoyLeftGun', 0);
    sprites.animate(right, 'convoyRightGun', 0);
    const charging = boss.mode === 'charging' || boss.mode === 'transitioning';
    const firing = boss.mode === 'firing';
    const gunAttack = boss.attack === 'crossfire' || boss.attack === 'barrage';
    left.visible = right.visible = !destroyed && (firing || (charging && (Math.floor(time * 12) % 2 === 0))) && gunAttack;
    core.visible = !destroyed && (boss.mode === 'transitioning' || (boss.attack === 'pulse' && (charging || firing)));
    core.scale.setScalar(1 + Math.sin(time * 18) * 0.4);
    shield.visible = boss.mode === 'entering';
  }
  function dispose() {
    scene.remove(root);
    // Texturu a geometrie sprite snímků vlastní společný atlas.
    shieldGeometry.dispose();
    shieldMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
  }
  return { render, dispose };
}
