import { createDreadnoughtBossModel } from './dreadnought-boss-model.ts';
import { maxShield } from './upgrades.ts';
import { DEFAULT_PLAYER_SHIP, playerShipPose } from './player-ships.ts';
import { PICKUP_SCALE, playerVolley } from './bonuses.ts';
import type { PlayerShipId } from './player-ships.ts';
import { createFortressBossModel } from './fortress-boss-model.ts';
import { createConvoyBossModel } from './convoy-boss-model.ts';
import { ENEMY_TYPES, enemyCanCharge, enemySpritePose, enemyCircles, bastionMuzzleY } from './enemies.ts';
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
  const dreadnoughtBossModel = createDreadnoughtBossModel(scene, sprites);
  const fortressBossModel = createFortressBossModel(scene, sprites);
  const convoyBossModel = createConvoyBossModel(scene, sprites);

  // Hráč používá stejné sdílené sprite geometrie jako ostatní lodě.
  const ship = new THREE.Group();
  const hull = sprites.create(DEFAULT_PLAYER_SHIP);
  hull.renderOrder = 9;
  ship.add(hull);
  const gunGeometry = new THREE.PlaneGeometry(0.1, 0.4);
  const gunMaterial = new THREE.MeshBasicMaterial({ color: '#9fb4bd', depthTest: false, depthWrite: false });
  const guns = Array.from({ length: 5 }, () => {
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.renderOrder = 10;
    ship.add(gun);
    return gun;
  });
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true,
    opacity: 0.2, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const playerShield = new THREE.Mesh(new THREE.RingGeometry(1.03, 1.08, 48), shieldMaterial);
  playerShield.scale.y = 1.2;
  playerShield.renderOrder = 8;
  ship.add(playerShield);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: '#fb923c' }));
  flame.rotation.z = Math.PI;
  flame.position.y = -1.05;
  ship.add(flame);
  const boostCore = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: '#e0faff' }));
  boostCore.rotation.z = Math.PI;
  boostCore.position.z = 0.05;
  boostCore.visible = false;
  ship.add(boostCore);
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
  let lastLevel = -1;
  function render(state: GameState, debug: boolean, showTerrain: boolean, playerShip: PlayerShipId = DEFAULT_PLAYER_SHIP) {
    if (state.time < lastTime || state.levelIndex !== lastLevel) {
      for (const models of [bulletModels, enemyModels, groundModels, wreckModels, effectModels, pickupModels, debugModels]) {
        models.forEach(model => scene.remove(model));
        models.clear();
      }
    }
    lastTime = state.time;
    lastLevel = state.levelIndex;
    ship.position.set(state.player.x, state.player.y, 0);
    sprites.animate(hull, playerShip, playerShipPose(playerShip, state.tilt));
    const volley = playerVolley(state.weaponLeft > 0, state.upgrades.weapon);
    guns.forEach((gun, i) => {
      gun.visible = i < volley.length;
      if (volley[i]) gun.position.set(volley[i]!.offsetX, 0.9, 0.1);
    });
    const departing = state.missionStage === 'departing';
    ship.visible = state.status !== 'gameOver' && !(departing && state.status === 'victory') &&
      (state.invulnerabilityLeft === 0 || Math.floor(state.time * 12) % 2 === 0);
    playerShield.visible = !departing && (state.shield > 0 || state.shieldHitLeft > 0);
    shieldMaterial.opacity = state.shieldHitLeft > 0 ? 0.9 : 0.08 + state.shield / maxShield(state.upgrades) * 0.2;
    shieldMaterial.color.set(state.shield === 0 ? '#fb7185' : '#67e8f9');
    const boost = departing ? Math.min(1, (state.departure?.elapsed ?? 0) / 0.5) : 0;
    const exhaustLength = (0.85 + Math.sin(state.time * 25) * 0.15) * (1 + boost * 4);
    flame.scale.set(1 + boost * 0.4, exhaustLength, 1 + boost * 0.4);
    flame.position.y = -0.7 - 0.35 * exhaustLength;
    flame.material.color.set(departing ? '#38bdf8' : '#fb923c');
    boostCore.visible = departing;
    boostCore.scale.y = exhaustLength * 0.75;
    boostCore.position.y = -0.7 - 0.35 * boostCore.scale.y;
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
      icon.rotation.z = ['airship', 'wraith', 'bastion', 'rotor'].includes(enemy.kind) ? 0 : Math.PI; // Starší malé lodě míří v předloze vzhůru, nové trupy a vzducholoď dolů.
      icon.renderOrder = 6;
      model.add(icon);
      if (enemy.kind === 'bastion') {
        const front = sprites.create('bastionShip');
        front.name = 'front';
        front.renderOrder = 6;
        model.add(front);
      }
      if (enemy.kind !== 'scout') {
        for (const [index, x] of (enemy.kind === 'airship' ? [-1.8, 1.8] : [0]).entries()) {
          const muzzle = new THREE.Mesh(coreGeometry, chargingMaterial);
          muzzle.name = index === 0 ? 'muzzle' : 'muzzle-right';
          muzzle.position.set(x, -0.8, 0.4);
          muzzle.renderOrder = 7;
          model.add(muzzle);
        }
      }
      if (enemy.drop) {
        const halo = new THREE.Mesh(debugGeometry, enemy.drop === 'spread' ? spreadHalo : repairHalo);
        if (enemy.kind === 'bastion') halo.scale.set(1.15, 2.4, 1);
        else halo.scale.setScalar(1.05);
        halo.renderOrder = 5;
        model.add(halo);
      }
      return model;
    }, (model, enemy) => {
      place(model, enemy);
      const icon = model.getObjectByName('icon')!;
      if (enemy.kind === 'bastion') {
        for (const part of enemy.parts ?? []) {
          const piece = part.frame === 0 ? icon : model.getObjectByName('front')!;
          sprites.animate(piece, 'bastionShip', part.frame);
          piece.position.y = part.offsetY;
          piece.visible = part.hp > 0 && (part.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0);
        }
        model.getObjectByName('muzzle')!.position.y = bastionMuzzleY(enemy) - enemy.y;
      } else {
        const bank = enemySpritePose(enemy);
        sprites.animate(icon, ENEMY_TYPES[enemy.kind].clip, bank);
        icon.visible = enemy.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0;
      }
      // Kapičky drží jeden snímek; plynulé otočení nenaruší změna směru kličkování.
      if (enemy.kind === 'weaver') icon.rotation.z = Math.PI + (enemy.age ?? 0) * 2.5;
      if (enemy.kind === 'rotor') icon.rotation.z = (enemy.age ?? 0) * 3;
      if (enemy.kind === 'wraith') icon.rotation.z = Math.sin((enemy.age ?? 0) * 2.4) * 0.12;
      for (const name of ['muzzle', 'muzzle-right']) {
        const muzzle = model.getObjectByName(name);
        if (!muzzle) continue;
        const interval = ENEMY_TYPES[enemy.kind].interval;
        const preparation = Math.min(0.5, interval);
        const charging = enemyCanCharge(enemy) && enemy.shotLeft <= preparation;
        muzzle.visible = charging;
        muzzle.scale.setScalar(1 + (1 - Math.max(0, enemy.shotLeft) / preparation) * 1.8);
      }
    });
    sync(state.groundTargets, groundModels, () => {
      const model = new THREE.Group();
      const base = sprites.create('groundCannonBase');
      sprites.animate(base, 'groundCannonBase', 0);
      base.position.z = -3.8;
      base.renderOrder = 2;
      const pivot = new THREE.Group();
      pivot.name = 'pivot';
      const head = sprites.create('groundCannon');
      head.name = 'head';
      head.rotation.z = Math.PI;
      // Střed otočné části zdrojového spritu je šest pixelů nad středem buňky.
      head.position.set(0, 0.375, -3.1);
      head.renderOrder = 3;
      const flash = new THREE.Mesh(coreGeometry, chargingMaterial);
      flash.name = 'charge';
      flash.position.set(0, 1.05, -3);
      flash.renderOrder = 4;
      pivot.add(head, flash);
      model.add(base, pivot);
      return model;
    }, (model, target) => {
      place(model, target);
      model.visible = target.hitLeft === 0 || Math.floor(state.time * 40) % 2 === 0;
      const pivot = model.getObjectByName('pivot')!;
      pivot.rotation.z = Math.atan2(state.player.y - target.y, state.player.x - target.x) - Math.PI / 2;
      sprites.animate(pivot.getObjectByName('head')!, 'groundCannon', target.shotLeft <= 0.4 ? 1 : 0);
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
      model.scale.setScalar(PICKUP_SCALE * (1 + Math.sin(state.time * 6) * 0.06));
    });
    sync(state.effects, effectModels, effect => sprites.create(effect.kind), (model, effect) => {
      sprites.animate(model, effect.kind, effect.age, effect.scale);
      model.position.set(effect.x, effect.y, 1.5);
      model.renderOrder = 10;
    });
    const bossDebug = state.boss && state.boss.mode !== 'destroyed'
      ? bossCircles(state.boss).map((circle, index) => ({ ...circle, id: -100 - index })) : [];
    sync(debug ? [state.player, ...state.enemies.flatMap(enemy => (enemy.kind === 'airship' || enemy.kind === 'bastion')
        ? enemyCircles(enemy).map((circle, i) => ({ ...circle, id: -1000 - enemy.id * 4 - i })) : [enemy]), ...state.groundTargets, ...state.bullets, ...state.pickups, ...bossDebug] : [], debugModels,
      () => new THREE.Mesh(debugGeometry, debugMaterial), (model, body) => {
        model.position.set(body.x, body.y, 2);
        model.scale.setScalar(body.radius);
        model.renderOrder = 30;
      });
    bossModel.render(state.boss?.variant === 'commander' ? state.boss : null, state.time, state.stageTimer);
    dreadnoughtBossModel.render(state.boss, state.time, state.stageTimer);
    fortressBossModel.render(state.boss, state.time, state.stageTimer);
    convoyBossModel.render(state.boss, state.time, state.stageTimer);
    terrain.render(state.scrollDistance, state.player.x, state.player.y, showTerrain, ship.visible, state.levelIndex);
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
    dreadnoughtBossModel.dispose();
    fortressBossModel.dispose();
    convoyBossModel.dispose();
    // Sprity vlastní svůj sdílený materiál, geometrii a texturu.
    for (const models of [bulletModels, enemyModels, groundModels, effectModels, pickupModels]) {
      models.forEach(model => scene.remove(model));
      models.clear();
    }
    ship.remove(hull);
    sprites.dispose();
    // Evidence zahrnuje i sdílené prostředky modelů odstraněných během hry.
    const geometries = new Set<THREE.BufferGeometry>([
      markerGeometry, debugGeometry, coreGeometry, turretBaseGeometry,
    ]);
    const materials = new Set<THREE.Material>([
      markerMaterial, spreadHalo, repairHalo, debugMaterial, chargingMaterial, wreckMaterial,
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
