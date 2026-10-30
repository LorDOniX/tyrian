import { bossCircles } from './boss.ts';
import { createBossModel } from './boss-model.ts';
import * as THREE from 'three';
import { createTerrain } from './terrain.ts';

import { WORLD_WIDTH, WORLD_HEIGHT, TURRET_EXTENT } from './game.ts';
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

  const terrain = createTerrain(scene);
  const bossModel = createBossModel(scene);

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
    return { stars, positions, original: positions.slice(), speed };
  });

  const bulletGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9' });
  const hostileGeometry = new THREE.SphereGeometry(0.22, 12, 8);
  const hostileMaterial = new THREE.MeshBasicMaterial({ color: '#ff9e35', depthTest: false });
  const coreGeometry = new THREE.SphereGeometry(0.1, 8, 6);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: '#fff9cc', depthTest: false });
  const gunnerMaterial = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.35 });
  const muzzleGeometry = new THREE.BoxGeometry(0.25, 0.65, 0.25);
  const chargingMaterial = new THREE.MeshBasicMaterial({ color: '#ffef8a' });
  const enemyGeometry = new THREE.BoxGeometry(1.1, 1.1, 0.5);
  const enemyMaterial = new THREE.MeshStandardMaterial({ color: '#fb4563', metalness: 0.3, roughness: 0.4 });
  const effectGeometry = new THREE.RingGeometry(0.7, 1, 24);
  const effectMaterial = new THREE.MeshBasicMaterial({ color: '#ffb454', side: THREE.DoubleSide });
  const debugGeometry = new THREE.RingGeometry(0.97, 1, 32);
  const debugMaterial = new THREE.MeshBasicMaterial({ color: '#a3ff8f', depthTest: false });
  const bulletModels = new Map<number, THREE.Object3D>();
  const turretBaseGeometry = new THREE.CylinderGeometry(0.7, 0.95, 0.5, 8);
  turretBaseGeometry.rotateX(Math.PI / 2);
  const turretHeadGeometry = new THREE.SphereGeometry(0.5, 12, 8);
  const turretMaterial = new THREE.MeshStandardMaterial({ color: '#7b9d82', metalness: 0.5, roughness: 0.5 });
  const wreckMaterial = new THREE.MeshStandardMaterial({ color: '#3b3531', roughness: 0.95 });
  const groundModels = new Map<number, THREE.Object3D>();
  const wreckModels = new Map<number, THREE.Object3D>();
  const enemyModels = new Map<number, THREE.Object3D>();
  const effectModels = new Map<number, THREE.Object3D>();
  const debugModels = new Map<number, THREE.Object3D>();

  function sync<T extends { id: number }>(items: T[], models: Map<number, THREE.Object3D>,
    create: (item: T) => THREE.Object3D, update: (model: THREE.Object3D, item: T) => void) {
    const ids = new Set(items.map(item => item.id));
    for (const [id, model] of models) {
      if (!ids.has(id)) { scene.remove(model); models.delete(id); }
    }
    for (const item of items) {
      let model = models.get(item.id);
      if (!model) { model = create(item); models.set(item.id, model); scene.add(model); }
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

  let lastTime = 0;
  function render(state: GameState, debug: boolean, showTerrain: boolean) {
    if (state.time < lastTime) {
      for (const models of [bulletModels, enemyModels, groundModels, wreckModels, effectModels, debugModels]) {
        models.forEach(model => scene.remove(model));
        models.clear();
      }
    }
    lastTime = state.time;
    ship.position.set(state.player.x, state.player.y, 0);
    ship.rotation.y = state.tilt;
    ship.visible = state.status !== 'gameOver' &&
      (state.invulnerabilityLeft === 0 || Math.floor(state.time * 12) % 2 === 0);
    flame.scale.y = 0.85 + Math.sin(state.time * 25) * 0.15;
    const place = (model: THREE.Object3D, body: Body) => { model.position.set(body.x, body.y, 0); };
    sync(state.bullets, bulletModels, (bullet) => {
      if (bullet.owner === 'player') return new THREE.Mesh(bulletGeometry, bulletMaterial);
      const model = new THREE.Group();
      const outer = new THREE.Mesh(hostileGeometry, hostileMaterial);
      outer.renderOrder = 10;
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.z = 0.2;
      core.renderOrder = 11;
      model.add(outer, core);
      return model;
    }, (model, bullet) => {
      place(model, bullet);
      model.position.z = 1.5;
      model.rotation.z = Math.atan2(bullet.vy, bullet.vx) - Math.PI / 2;
    });
    sync(state.enemies, enemyModels, (enemy) => {
      const model = new THREE.Group();
      model.add(new THREE.Mesh(enemyGeometry, enemy.kind === 'gunner' ? gunnerMaterial : enemyMaterial));
      const wings = new THREE.Mesh(enemyGeometry, wingMaterial);
      wings.scale.set(enemy.kind === 'gunner' ? 1.8 : 1.4, 0.25, 0.4);
      wings.position.set(0, 0.2, 0);
      model.add(wings);
      if (enemy.kind === 'gunner') {
        const muzzle = new THREE.Mesh(muzzleGeometry, chargingMaterial);
        muzzle.name = 'muzzle';
        muzzle.position.set(0, -0.65, 0.3);
        model.add(muzzle);
      }
      return model;
    }, (model, enemy) => {
      place(model, enemy);
      model.visible = enemy.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0;
      const muzzle = model.getObjectByName('muzzle');
      if (muzzle) {
        const charging = enemy.phase === 'charging';
        muzzle.scale.setScalar(charging ? 1 + (1 - Math.max(0, enemy.shotLeft) / 0.8) * 0.7 : 0.7);
        muzzle.visible = !charging || Math.floor(state.time * 12) % 2 === 0;
      }
    });
    sync(state.groundTargets, groundModels, () => {
      const model = new THREE.Group();
      const base = new THREE.Mesh(turretBaseGeometry, turretMaterial);
      base.position.z = -3.8;
      const head = new THREE.Mesh(turretHeadGeometry, turretMaterial);
      head.scale.set(1, 1, 0.65);
      head.position.z = -3.3;
      const pivot = new THREE.Group();
      pivot.name = 'pivot';
      const barrel = new THREE.Mesh(muzzleGeometry, turretMaterial);
      barrel.position.set(0, 0.65, -3.1);
      barrel.scale.y = 1.4;
      const flash = new THREE.Mesh(coreGeometry, chargingMaterial);
      flash.name = 'charge';
      flash.position.set(0, 1.05, -3);
      pivot.add(barrel, flash);
      model.add(base, head, pivot);
      return model;
    }, (model, target) => {
      place(model, target);
      model.visible = target.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0;
      const pivot = model.getObjectByName('pivot')!;
      pivot.rotation.z = Math.atan2(state.player.y - target.y, state.player.x - target.x) - Math.PI / 2;
      const charge = pivot.getObjectByName('charge')!;
      charge.visible = target.shotLeft <= 0.4 && target.y + TURRET_EXTENT <= 12 && target.y - TURRET_EXTENT >= -12;
      charge.scale.setScalar(1 + (0.4 - Math.max(0, target.shotLeft)) * 4);
    });
    sync(state.wrecks, wreckModels, () => {
      const model = new THREE.Mesh(turretBaseGeometry, wreckMaterial);
      model.scale.set(1, 1, 0.3);
      model.rotation.z = 0.3;
      return model;
    }, (model, wreck) => { model.position.set(wreck.x, wreck.y, -4); });
    sync(state.effects, effectModels, () => new THREE.Mesh(effectGeometry, effectMaterial), (model, effect) => {
      model.position.set(effect.x, effect.y, 1);
      model.scale.setScalar(0.1 + effect.age * 4);
    });
    const bossDebug = state.boss && state.boss.mode !== 'destroyed'
      ? bossCircles(state.boss).map((circle, index) => ({ ...circle, id: -100 - index })) : [];
    sync(debug ? [state.player, ...state.enemies, ...state.groundTargets, ...state.bullets, ...bossDebug] : [], debugModels,
      () => new THREE.Mesh(debugGeometry, debugMaterial), (model, body) => {
        model.position.set(body.x, body.y, 2);
        model.scale.setScalar(body.radius);
      });
    bossModel.render(state.boss, state.time, state.stageTimer);
    terrain.render(state.scrollDistance, state.player.x, state.player.y, showTerrain, ship.visible);
    for (const { stars, positions, original, speed } of starLayers) {
      stars.visible = !showTerrain;
      for (let i = 1; i < positions.length; i += 3) {
        const shifted = original[i]! + WORLD_HEIGHT / 2 - state.scrollDistance * speed;
        positions[i] = ((shifted % WORLD_HEIGHT) + WORLD_HEIGHT) % WORLD_HEIGHT - WORLD_HEIGHT / 2;
      }
      stars.geometry.attributes.position!.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    observer.disconnect();
    terrain.dispose();
    bossModel.dispose();
    // Evidence zahrnuje i sdílené prostředky modelů odstraněných během hry.
    const geometries = new Set<THREE.BufferGeometry>([
      bulletGeometry, enemyGeometry, effectGeometry, debugGeometry, hostileGeometry, coreGeometry, muzzleGeometry, turretBaseGeometry, turretHeadGeometry,
    ]);
    const materials = new Set<THREE.Material>([
      bulletMaterial, enemyMaterial, effectMaterial, debugMaterial, hostileMaterial, coreMaterial, gunnerMaterial, chargingMaterial, turretMaterial, wreckMaterial,
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
    [bulletModels, enemyModels, groundModels, wreckModels, effectModels, debugModels].forEach(models => models.clear());
  }
  return { render, dispose };
}
