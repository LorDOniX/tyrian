import { ENEMY_TYPES, enemyCanCharge } from './enemies.ts';
import { createSpriteEffects } from './sprite-effects.ts';
import { bossCircles } from './boss.ts';
import { createBossModel } from './boss-model.ts';
import * as THREE from 'three';
import { createTerrain } from './terrain.ts';

import { WORLD_WIDTH, WORLD_HEIGHT, TURRET_EXTENT } from './game.ts';
import type { GameState, Body } from './game.ts';

export async function createScene(container: HTMLElement) {
  const sprites = await createSpriteEffects();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050b18');

  // Rovnoběžné promítání: vzdálenější předměty se nezmenšují.
  const camera = new THREE.OrthographicCamera(-9, 9, 12, -12, 0.1, 100);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (error) { sprites.dispose(); throw error; }
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

  const coreGeometry = new THREE.SphereGeometry(0.1, 8, 6);
  const muzzleGeometry = new THREE.BoxGeometry(0.25, 0.65, 0.25);
  const chargingMaterial = new THREE.MeshBasicMaterial({ color: '#ffef8a', transparent: true, depthTest: false, depthWrite: false });
  const debugGeometry = new THREE.RingGeometry(0.97, 1, 32);
  const debugMaterial = new THREE.MeshBasicMaterial({ color: '#a3ff8f', depthTest: false, depthWrite: false, transparent: true });
  const pickupModels = new Map<number, THREE.Object3D>();
  const markerGeometry = new THREE.PlaneGeometry(1, 1);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false });
  const spreadHalo = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, depthTest: false, depthWrite: false });
  const repairHalo = new THREE.MeshBasicMaterial({ color: '#86efac', transparent: true, depthTest: false, depthWrite: false });
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
      for (const models of [bulletModels, enemyModels, groundModels, wreckModels, effectModels, pickupModels, debugModels]) {
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
    sync(state.bullets, bulletModels, bullet => sprites.create(bullet.owner === 'player' ? 'playerShot' : 'enemyShot'),
      (model, bullet) => {
        sprites.animate(model, bullet.owner === 'player' ? 'playerShot' : 'enemyShot', state.time);
        place(model, bullet);
        model.position.z = 2;
        model.renderOrder = 20; // Projektily zůstanou nad explozemi a 3D modely.
        model.rotation.z = Math.atan2(bullet.vy, bullet.vx) - Math.PI / 2;
      });
    sync(state.enemies, enemyModels, (enemy) => {
      const model = new THREE.Group();
      const icon = sprites.create(ENEMY_TYPES[enemy.kind].clip);
      icon.name = 'icon';
      icon.rotation.z = Math.PI; // Tyrian předlohy míří vzhůru, nepřátelé letí dolů.
      icon.renderOrder = 6;
      model.add(icon);
      if (enemy.kind !== 'scout') {
        const muzzle = new THREE.Mesh(coreGeometry, chargingMaterial);
        muzzle.name = 'muzzle';
        muzzle.position.set(0, -0.8, 0.4);
        muzzle.renderOrder = 7;
        model.add(muzzle);
      }
      if (enemy.drop) {
        const halo = new THREE.Mesh(debugGeometry, enemy.drop === 'spread' ? spreadHalo : repairHalo);
        halo.scale.setScalar(1.05);
        halo.renderOrder = 5;
        model.add(halo);
      }
      return model;
    }, (model, enemy) => {
      place(model, enemy);
      const icon = model.getObjectByName('icon')!;
      const bank = Math.abs(enemy.x - enemy.previousX) < 0.002 ? 1 : enemy.x > enemy.previousX ? 2 : 0;
      sprites.animate(icon, ENEMY_TYPES[enemy.kind].clip, bank);
      // Záblesk zásahu skrývá pouze trup, nikoli signál chystaného útoku.
      icon.visible = enemy.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0;
      const muzzle = model.getObjectByName('muzzle');
      if (muzzle) {
        const interval = ENEMY_TYPES[enemy.kind].interval;
        const preparation = Math.min(0.5, interval);
        const charging = enemyCanCharge(enemy) && enemy.shotLeft <= preparation;
        muzzle.visible = charging;
        muzzle.scale.setScalar(1 + (1 - Math.max(0, enemy.shotLeft) / preparation) * 1.8);
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
    sync(state.pickups, pickupModels, pickup => {
      const model = new THREE.Group();
      const icon = sprites.create(pickup.kind === 'spread' ? 'spreadPickup' : 'repairPickup');
      icon.name = 'icon';
      icon.renderOrder = 16;
      model.add(icon);
      if (pickup.kind === 'repair') {
        for (const [width, height] of [[0.48, 0.12], [0.12, 0.48]]) {
          const bar = new THREE.Mesh(markerGeometry, markerMaterial);
          bar.scale.set(width!, height!, 1);
          bar.position.z = 0.1;
          bar.renderOrder = 17;
          model.add(bar);
        }
      } else {
        for (const angle of [-0.4, 0, 0.4]) {
          const bar = new THREE.Mesh(markerGeometry, markerMaterial);
          bar.scale.set(0.08, 0.42, 1);
          bar.position.set(angle * 0.55, -0.05, 0.1);
          bar.rotation.z = -angle;
          bar.renderOrder = 17;
          model.add(bar);
        }
      }
      return model;
    }, (model, pickup) => {
      const icon = model.getObjectByName('icon')!;
      sprites.animate(icon, pickup.kind === 'spread' ? 'spreadPickup' : 'repairPickup', state.time);
      model.position.set(pickup.x, pickup.y, 1.8);
      model.scale.setScalar(1 + Math.sin(state.time * 6) * 0.06);
    });
    sync(state.effects, effectModels, effect => sprites.create(effect.kind), (model, effect) => {
      sprites.animate(model, effect.kind, effect.age, effect.scale);
      model.position.set(effect.x, effect.y, 1.5);
      model.renderOrder = 10;
    });
    const bossDebug = state.boss && state.boss.mode !== 'destroyed'
      ? bossCircles(state.boss).map((circle, index) => ({ ...circle, id: -100 - index })) : [];
    sync(debug ? [state.player, ...state.enemies, ...state.groundTargets, ...state.bullets, ...state.pickups, ...bossDebug] : [], debugModels,
      () => new THREE.Mesh(debugGeometry, debugMaterial), (model, body) => {
        model.position.set(body.x, body.y, 2);
        model.scale.setScalar(body.radius);
        model.renderOrder = 30;
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
    // Sprity vlastní svůj sdílený materiál, geometrii a texturu.
    for (const models of [bulletModels, enemyModels, effectModels, pickupModels]) {
      models.forEach(model => scene.remove(model));
      models.clear();
    }
    sprites.dispose();
    // Evidence zahrnuje i sdílené prostředky modelů odstraněných během hry.
    const geometries = new Set<THREE.BufferGeometry>([
      markerGeometry, debugGeometry, coreGeometry, muzzleGeometry, turretBaseGeometry, turretHeadGeometry,
    ]);
    const materials = new Set<THREE.Material>([
      markerMaterial, spreadHalo, repairHalo, debugMaterial, chargingMaterial, turretMaterial, wreckMaterial,
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
    [bulletModels, enemyModels, groundModels, wreckModels, effectModels, pickupModels, debugModels].forEach(models => models.clear());
  }
  return { render, dispose };
}
