import * as THREE from 'three';
import { cloudLayout } from './cloud-layout.ts';

export function createClouds(scene: THREE.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const context = canvas.getContext('2d')!;
  // Překrývající se měkké laloky, průhledné okraje a neprůhledné jádro.
  for (const [x, y, radius] of [[70, 70, 51], [115, 55, 53], [160, 70, 52], [198, 76, 37]]) {
    const gradient = context.createRadialGradient(x!, y!, 0, x!, y!, radius!);
    gradient.addColorStop(0, 'rgba(225,237,242,1)');
    gradient.addColorStop(0.55, 'rgba(225,237,242,0.98)');
    gradient.addColorStop(1, 'rgba(225,237,242,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false });
  const root = new THREE.Group();
  const clouds = cloudLayout(0).map(() => {
    const mesh = new THREE.Mesh(geometry, material);
    // Nepřátelé 4–7 < mraky 8 < hráč 9 / bonusy 16 / projektily 20.
    mesh.renderOrder = 8;
    root.add(mesh);
    return mesh;
  });
  scene.add(root);
  function render(distance: number, visible: boolean) {
    root.visible = visible;
    if (!visible) return;
    cloudLayout(distance).forEach((cloud, i) => {
      clouds[i]!.position.set(cloud.x, cloud.y, 1);
      clouds[i]!.scale.set(cloud.width, cloud.height, 1);
    });
  }
  function dispose() {
    scene.remove(root);
    geometry.dispose(); material.dispose(); texture.dispose();
  }
  return { render, dispose };
}
