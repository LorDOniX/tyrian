import * as THREE from 'three';
import type { Boss } from './boss.ts';
import type { SpriteEffects } from './sprite-effects.ts';

// Velký trup pod čtyřmi malými loděmi vlevo nahoře v newsh8.
export function createBossModel(scene: THREE.Scene, sprites: SpriteEffects) {
  const root = new THREE.Group();
  const body = sprites.create('commanderBoss');
  body.renderOrder = 4;
  const lightGeometry = new THREE.CircleGeometry(0.14, 16);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#ffe09a', transparent: true, depthTest: false, depthWrite: false });
  const lights = [-1.65, 0, 1.65].map(x => {
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(x, x === 0 ? -1.3 : -1.1, 0.1);
    light.renderOrder = 7;
    root.add(light);
    return light;
  });
  const shieldGeometry = new THREE.RingGeometry(3.05, 3.1, 64);
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9', side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false });
  const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
  shield.scale.y = 0.8;
  shield.renderOrder = 8;
  root.add(body, shield);
  scene.add(root);

  function render(boss: Boss | null, time: number, destructionLeft: number) {
    root.visible = boss?.variant === 'commander';
    if (!boss || boss.variant !== 'commander') return;
    root.position.set(boss.x, boss.y, 0);
    const destroyed = boss.mode === 'destroyed';
    root.scale.setScalar(destroyed ? Math.max(0, Math.min(1, destructionLeft)) : 1);
    root.visible = !destroyed || destructionLeft > 0.15;
    sprites.animate(body, 'commanderBoss', 0);
    body.visible = destroyed || boss.hitLeft === 0 || Math.floor(time * 40) % 2 === 0;
    shield.visible = boss.mode === 'entering';
    const charging = boss.mode === 'charging' || boss.mode === 'transitioning';
    lightMaterial.color.set(boss.phase === 2 ? '#fb7185' : '#ffe09a');
    lights.forEach((light, i) => {
      light.visible = !destroyed && (charging || boss.mode === 'firing') &&
        (boss.mode === 'transitioning' || (boss.attack === 'aimed' ? i === 0 : true));
      light.scale.setScalar(1 + (charging ? 0.5 * (1 + Math.sin(time * 18)) : 0));
    });
  }
  function dispose() {
    scene.remove(root);
    // Sprite snímek i texturu uklízí společný atlas, pouze vlastní signály zde.
    lightGeometry.dispose(); shieldGeometry.dispose();
    lightMaterial.dispose(); shieldMaterial.dispose();
  }
  return { render, dispose };
}
