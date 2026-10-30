import * as THREE from 'three';
import type { Boss } from './boss.ts';

export function createBossModel(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const hullGeometry = new THREE.SphereGeometry(1, 16, 12);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const shieldGeometry = new THREE.RingGeometry(2.85, 2.9, 64);
  const hullMaterial = new THREE.MeshStandardMaterial({ color: '#735b9d', metalness: 0.6, roughness: 0.35 });
  const armorMaterial = new THREE.MeshStandardMaterial({ color: '#b7c9dc', metalness: 0.5, roughness: 0.4 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#172841', metalness: 0.5, roughness: 0.3 });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#ffe09a' });
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9', side: THREE.DoubleSide });
  const hitMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const hull = new THREE.Mesh<THREE.SphereGeometry, THREE.Material>(hullGeometry, hullMaterial);
  hull.scale.set(1.15, 1.4, 0.65);
  root.add(hull);
  const bridge = new THREE.Mesh(hullGeometry, darkMaterial);
  bridge.scale.set(0.45, 0.7, 0.3);
  bridge.position.set(0, 0.3, 0.6);
  root.add(bridge);
  const crossbar = new THREE.Mesh(box, armorMaterial);
  crossbar.scale.set(4.3, 0.45, 0.3);
  crossbar.position.y = 0.25;
  root.add(crossbar);
  const gondolas: THREE.Mesh[] = [];
  const lights: THREE.Mesh[] = [];
  for (const x of [-1.65, 0, 1.65]) {
    if (x !== 0) {
      const gondola = new THREE.Mesh(hullGeometry, armorMaterial);
      gondola.scale.set(0.8, 1.05, 0.5);
      gondola.position.set(x, -0.15, 0);
      root.add(gondola);
      gondolas.push(gondola);
    }
    const barrel = new THREE.Mesh(box, darkMaterial);
    barrel.scale.set(0.25, 0.65, 0.25);
    barrel.position.set(x, x === 0 ? -1.1 : -0.85, 0.35);
    root.add(barrel);
    const light = new THREE.Mesh(hullGeometry, lightMaterial);
    light.position.set(x, x === 0 ? -1.3 : -1.1, 0.6);
    lights.push(light);
    root.add(light);
  }
  const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
  shield.scale.y = 0.75;
  shield.position.z = 1;
  root.add(shield);

  function render(boss: Boss | null, time: number, destructionLeft: number) {
    root.visible = boss !== null;
    if (!boss) return;
    root.position.set(boss.x, boss.y, 0);
    const destroyed = boss.mode === 'destroyed';
    root.scale.setScalar(destroyed ? Math.max(0, destructionLeft) : 1);
    root.visible = !destroyed || destructionLeft > 0.15;
    hull.material = boss.hitLeft > 0 ? hitMaterial : hullMaterial;
    hullMaterial.color.set(boss.phase === 2 ? '#b54b79' : '#735b9d');
    gondolas.forEach((mesh, i) => { mesh.rotation.y = Math.sin(time * 2 + i) * 0.08; });
    shield.visible = boss.mode === 'entering';
    shield.rotation.z = time * 0.4;
    const charging = boss.mode === 'charging' || boss.mode === 'transitioning';
    lights.forEach((light, i) => {
      light.visible = !destroyed && (charging || boss.mode === 'firing') &&
        (boss.mode === 'transitioning' || (boss.attack === 'aimed' ? i === 0 : true));
      light.scale.setScalar(0.12 + (charging ? 0.1 * (1 + Math.sin(time * 18)) : 0.08));
    });
  }
  function dispose() {
    scene.remove(root);
    [hullGeometry, box, shieldGeometry].forEach(geometry => geometry.dispose());
    [hullMaterial, armorMaterial, darkMaterial, lightMaterial, shieldMaterial, hitMaterial].forEach(material => material.dispose());
  }
  return { render, dispose };
}
