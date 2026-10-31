import * as THREE from 'three';
import { SEGMENT_COUNT, SEGMENT_LENGTH, segmentLayout } from './terrain-layout.ts';

export function createTerrain(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const plane = new THREE.PlaneGeometry(18, SEGMENT_LENGTH);
  const box = new THREE.BoxGeometry(1, 1, 1);
  // Osa kužele se otočí do Z: širší základna a menší střecha ukážou šikmé stěny.
  const bevel = new THREE.CylinderGeometry(0.7, 1, 0.65, 4);
  bevel.rotateX(Math.PI / 2);
  bevel.rotateZ(Math.PI / 4);
  const floor = new THREE.MeshStandardMaterial({ color: '#101e2b', roughness: 0.9 });
  const panel = new THREE.MeshStandardMaterial({ color: '#1c3342', roughness: 0.7, metalness: 0.25 });
  const seam = new THREE.MeshBasicMaterial({ color: '#294350' });
  const marking = new THREE.MeshBasicMaterial({ color: '#47605d' });
  const segments = Array.from({ length: SEGMENT_COUNT }, () => {
    const group = new THREE.Group();
    const ground = new THREE.Mesh(plane, floor);
    ground.position.z = -5;
    group.add(ground);
    for (const y of [-8, -4, 0, 4]) {
      const line = new THREE.Mesh(box, seam);
      line.scale.set(18, 0.035, 0.015);
      line.position.set(0, y, -4.98);
      group.add(line);
    }
    for (const x of [-5.5, 5.5]) {
      const line = new THREE.Mesh(box, seam);
      line.scale.set(0.035, 16, 0.015);
      line.position.set(x, 0, -4.98);
      group.add(line);
    }
    const buildings: THREE.Mesh[] = [];
    for (const x of [-7.2, 7.2]) {
      for (const y of [-5, 3]) {
        const building = new THREE.Mesh(bevel, panel);
        building.position.set(x, y, -4.3);
        building.scale.set(1.1, 1.5, 1);
        group.add(building);
        buildings.push(building);
      }
    }
    for (const y of [-6, -2, 2, 6]) {
      const dash = new THREE.Mesh(box, marking);
      dash.position.set(0, y, -4.96);
      dash.scale.set(0.08, 0.8, 0.02);
      group.add(dash);
    }
    root.add(group);
    return { group, buildings };
  });
  const shadowGeometry = new THREE.CircleGeometry(1, 24);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.scale.set(0.85, 0.5, 1);
  root.add(shadow);

  function render(distance: number, x: number, y: number, visible: boolean, shipVisible: boolean, levelIndex = 0) {
    root.visible = visible;
    floor.color.set(levelIndex === 1 ? '#192a3a' : '#101e2b');
    panel.color.set(levelIndex === 1 ? '#4b4261' : '#1c3342');
    marking.color.set(levelIndex === 1 ? '#6c7793' : '#47605d');
    segmentLayout(distance).forEach((layout, slot) => {
      const { group, buildings } = segments[slot]!;
      group.position.y = layout.y;
      buildings.forEach((building, i) => {
        const variant = ((layout.index + i) % 3 + 3) % 3;
        building.position.y = (i % 2 === 0 ? -5 : 3) + variant * 0.4;
        building.scale.z = 0.8 + variant * 0.3;
      });
    });
    shadow.position.set(x + 0.55, y - 0.6, -4.9);
    shadow.visible = shipVisible;
  }
  function dispose() {
    scene.remove(root);
    [plane, box, bevel, shadowGeometry].forEach(geometry => geometry.dispose());
    [floor, panel, seam, marking, shadowMaterial].forEach(material => material.dispose());
  }
  return { render, dispose };
}
