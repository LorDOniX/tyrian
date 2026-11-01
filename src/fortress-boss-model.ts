import * as THREE from 'three';
import type { Boss } from './boss.ts';
import type { SpriteEffects } from './sprite-effects.ts';

export function createFortressBossModel(scene: THREE.Scene, sprites: SpriteEffects) {
  const root = new THREE.Group();
  const body = sprites.create('fortressBoss');
  body.renderOrder = 4;
  const geometry = new THREE.CircleGeometry(0.2, 16);
  const material = new THREE.MeshBasicMaterial({ color: '#fb923c', depthTest: false, depthWrite: false });
  const lights = [-2.13, 2.13].map(x => {
    const light = new THREE.Mesh(geometry, material);
    light.position.set(x, -2.5, 0.1);
    light.renderOrder = 7;
    root.add(light);
    return light;
  });
  const ringGeometry = new THREE.RingGeometry(4.8, 4.85, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#93c5fd', depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const shield = new THREE.Mesh(ringGeometry, ringMaterial);
  shield.scale.y = 0.75;
  shield.renderOrder = 8;
  root.add(body, shield);
  scene.add(root);
  function render(boss: Boss | null, time: number, destructionLeft: number) {
    root.visible = boss?.variant === 'fortress';
    if (!boss || boss.variant !== 'fortress') return;
    const destroyed = boss.mode === 'destroyed';
    root.visible = !destroyed || destructionLeft > 0.1;
    root.position.set(boss.x, boss.y, 0);
    root.scale.setScalar(destroyed ? Math.min(1, destructionLeft) : 1);
    sprites.animate(body, 'fortressBoss', 0);
    body.visible = destroyed || boss.hitLeft === 0 || Math.floor(time * 40) % 2 === 0;
    material.color.set(boss.phase === 2 ? '#f43f5e' : '#fb923c');
    for (const light of lights) {
      light.visible = !destroyed && (boss.mode === 'firing' || boss.mode === 'transitioning' ||
        (boss.mode === 'charging' && Math.floor(time * 12) % 2 === 0));
      light.scale.setScalar(1 + Math.sin(time * 15) * 0.25);
    }
    shield.visible = boss.mode === 'entering';
  }
  function dispose() {
    scene.remove(root);
    geometry.dispose(); material.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
  }
  return { render, dispose };
}
