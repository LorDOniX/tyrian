import * as THREE from 'three';

import { WORLD_WIDTH, WORLD_HEIGHT } from './game.ts';
import type { GameState, Body } from './game.ts';

export function createScene(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050b18');

  // Rovnoběžné promítání: vzdálenější předměty se nezmenšují.
  const camera = new THREE.OrthographicCamera(-9, 9, 12, -12, 0.1, 100);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight('#aacaff', 1.5));
  const light = new THREE.DirectionalLight('#ffffff', 3);
  light.position.set(-5, 8, 10);
  scene.add(light);

  // Skutečné 3D objemy, sestavené do jedné lodi.
  const ship = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.4, roughness: 0.35 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#d8eaff', metalness: 0.5, roughness: 0.4 });
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.7, 4), hullMaterial);
  ship.add(hull);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.2), wingMaterial);
  wings.position.y = -0.35;
  ship.add(wings);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8),
    new THREE.MeshStandardMaterial({ color: '#082f49', emissive: '#0e7490', emissiveIntensity: 0.6 }));
  cockpit.position.set(0, 0, 0.4);
  ship.add(cockpit);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: '#fb923c' }));
  flame.rotation.z = Math.PI;
  flame.position.y = -1.05;
  ship.add(flame);
  ship.position.set(0, -7, 0);
  scene.add(ship);

  // Dvě vrstvy hvězd: rychlost vytváří dojem hloubky i bez perspektivy.
  const starLayers = [0.45, 1].map((speed, layer) => {
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * WORLD_WIDTH;
      positions[i + 1] = (Math.random() - 0.5) * WORLD_HEIGHT;
      positions[i + 2] = -8 + layer * 3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: layer ? '#cdeaff' : '#49658f', size: layer ? 2.5 : 1.5, sizeAttenuation: false,
    }));
    scene.add(stars);
    return { stars, positions, speed };
  });

  const bulletGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9' });
  const enemyGeometry = new THREE.BoxGeometry(1.1, 1.1, 0.5);
  const enemyMaterial = new THREE.MeshStandardMaterial({ color: '#fb4563', metalness: 0.3, roughness: 0.4 });
  const effectGeometry = new THREE.RingGeometry(0.7, 1, 24);
  const effectMaterial = new THREE.MeshBasicMaterial({ color: '#ffb454', side: THREE.DoubleSide });
  const debugGeometry = new THREE.RingGeometry(0.97, 1, 32);
  const debugMaterial = new THREE.MeshBasicMaterial({ color: '#a3ff8f', depthTest: false });
  const bulletModels = new Map<number, THREE.Object3D>();
  const enemyModels = new Map<number, THREE.Object3D>();
  const effectModels = new Map<number, THREE.Object3D>();
  const debugModels = new Map<number, THREE.Object3D>();

  function sync<T extends { id: number }>(items: T[], models: Map<number, THREE.Object3D>,
    create: () => THREE.Object3D, update: (model: THREE.Object3D, item: T) => void) {
    const ids = new Set(items.map(item => item.id));
    for (const [id, model] of models) {
      if (!ids.has(id)) { scene.remove(model); models.delete(id); }
    }
    for (const item of items) {
      let model = models.get(item.id);
      if (!model) { model = create(); models.set(item.id, model); scene.add(model); }
      update(model, item);
    }
  }

  // Pevná herní plocha 18 × 24. Okraje okna se vyplní pozadím (letterbox).
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    renderer.setViewport((width - WORLD_WIDTH * scale) / 2, (height - WORLD_HEIGHT * scale) / 2,
      WORLD_WIDTH * scale, WORLD_HEIGHT * scale);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function render(state: GameState, dt: number, debug: boolean) {
    ship.position.set(state.player.x, state.player.y, 0);
    ship.rotation.y = state.tilt;
    ship.visible = state.status !== 'gameOver' &&
      (state.invulnerabilityLeft === 0 || Math.floor(state.time * 12) % 2 === 0);
    flame.scale.y = 0.85 + Math.sin(state.time * 25) * 0.15;
    const place = (model: THREE.Object3D, body: Body) => { model.position.set(body.x, body.y, 0); };
    sync(state.bullets, bulletModels, () => new THREE.Mesh(bulletGeometry, bulletMaterial), place);
    sync(state.enemies, enemyModels, () => {
      const model = new THREE.Group();
      model.add(new THREE.Mesh(enemyGeometry, enemyMaterial));
      const wings = new THREE.Mesh(enemyGeometry, wingMaterial);
      wings.scale.set(1.4, 0.25, 0.4);
      wings.position.set(0, 0.2, 0);
      model.add(wings);
      return model;
    }, place);
    sync(state.effects, effectModels, () => new THREE.Mesh(effectGeometry, effectMaterial), (model, effect) => {
      model.position.set(effect.x, effect.y, 1);
      model.scale.setScalar(0.1 + effect.age * 4);
    });
    sync(debug ? [state.player, ...state.enemies, ...state.bullets] : [], debugModels,
      () => new THREE.Mesh(debugGeometry, debugMaterial), (model, body) => {
        model.position.set(body.x, body.y, 2);
        model.scale.setScalar(body.radius);
      });
    for (const { stars, positions, speed } of starLayers) {
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] = positions[i]! - 4 * speed * dt;
        if (positions[i]! < -WORLD_HEIGHT / 2) positions[i] = positions[i]! + WORLD_HEIGHT;
      }
      stars.geometry.attributes.position!.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    observer.disconnect();
    // Evidence zahrnuje i sdílené prostředky modelů odstraněných během hry.
    const geometries = new Set<THREE.BufferGeometry>([
      bulletGeometry, enemyGeometry, effectGeometry, debugGeometry,
    ]);
    const materials = new Set<THREE.Material>([
      bulletMaterial, enemyMaterial, effectMaterial, debugMaterial,
    ]);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    [bulletModels, enemyModels, effectModels, debugModels].forEach(models => models.clear());
  }
  return { render, dispose };
}
