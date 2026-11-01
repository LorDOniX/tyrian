import * as THREE from 'three';
import type { Boss } from './boss.ts';
import type { SpriteEffects } from './sprite-effects.ts';
import { dreadnoughtFrame } from './dreadnought-boss.ts';

export function createDreadnoughtBossModel(scene: THREE.Scene, sprites: SpriteEffects) {
  const root = new THREE.Group();
  const body = sprites.create('dreadnoughtBoss');
  body.renderOrder = 4;
  // Pancíř pod spritem vyplní původní průhledný střed v obou variantách trupu.
  const armor = new THREE.Group();
  const armorGeometry = new THREE.PlaneGeometry(1, 1);
  const armorMaterials = ['#28231d', '#725737', '#453823', '#a88047', '#783b29'].map(color =>
    new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, toneMapped: false }));
  function panel(x: number, y: number, width: number, height: number, material: number) {
    const part = new THREE.Mesh(armorGeometry, armorMaterials[material]!);
    part.position.set(x, y, -0.1);
    part.scale.set(width, height, 1);
    part.renderOrder = 3;
    armor.add(part);
  }
  panel(0, 1.05, 1.85, 2.5, 0);
  panel(0, 1.05, 1.6, 2.25, 1);
  panel(0, 1.05, 0.2, 2.25, 4);
  for (const y of [0.4, 1.05, 1.7]) panel(0, y, 1.6, 0.07, 2);
  for (const x of [-0.62, 0.62]) {
    for (const y of [0.15, 1.95]) panel(x, y, 0.12, 0.12, 3);
  }
  root.add(armor);
  const lightGeometry = new THREE.CircleGeometry(0.18, 16);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#fb923c', depthTest: false, depthWrite: false });
  const lights = [[-2.7, -0.9], [2.7, -0.9], [0, -2]].map(([x, y]) => {
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(x!, y!, 0.1);
    light.renderOrder = 7;
    root.add(light);
    return light;
  });
  const ringGeometry = new THREE.RingGeometry(4.5, 4.55, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#c4b5fd', side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  const shield = new THREE.Mesh(ringGeometry, ringMaterial);
  shield.renderOrder = 8;
  root.add(body, shield);
  scene.add(root);
  function render(boss: Boss | null, time: number, destructionLeft: number) {
    root.visible = boss?.variant === 'dreadnought';
    if (!boss || boss.variant !== 'dreadnought') return;
    const destroyed = boss.mode === 'destroyed';
    root.visible = !destroyed || destructionLeft > 0.1;
    root.position.set(boss.x, boss.y, 0);
    root.scale.setScalar(destroyed ? Math.min(1, Math.max(0, destructionLeft)) : 1);
    sprites.animate(body, 'dreadnoughtBoss', dreadnoughtFrame(boss));
    body.visible = destroyed || boss.hitLeft === 0 || Math.floor(time * 40) % 2 === 0;
    armor.visible = body.visible;
    armorMaterials[1]!.color.set(dreadnoughtFrame(boss) ? '#514332' : '#725737');
    lightMaterial.color.set(boss.phase === 2 ? '#f43f5e' : '#fbbf24');
    lights.forEach((light, i) => {
      const ready = boss.mode === 'firing' || boss.mode === 'transitioning' ||
        (boss.mode === 'charging' && Math.floor(time * 14) % 2 === 0);
      light.visible = !destroyed && ready && (boss.mode === 'transitioning' || (boss.attack === 'pincer' ? i < 2 : i === 2));
      light.scale.setScalar(1 + Math.sin(time * 20) * 0.25);
    });
    shield.visible = boss.mode === 'entering';
  }
  function dispose() {
    scene.remove(root);
    armorGeometry.dispose(); armorMaterials.forEach(material => material.dispose());
    lightGeometry.dispose(); lightMaterial.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
  }
  return { render, dispose };
}
