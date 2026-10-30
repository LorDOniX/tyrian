import * as THREE from 'three';

// Herní souřadnice: X = doprava, Y = nahoru, Z = hloubka směrem ke kameře.
const WORLD_WIDTH = 18;
const WORLD_HEIGHT = 24;
const SHIP_SPEED = 9;
const SCROLL_SPEED = 4;
const BULLET_SPEED = 22;

export function createScene(container: HTMLElement): () => void {
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
      color: layer ? '#cdeaff' : '#49658f', size: layer ? 0.07 : 0.04, sizeAttenuation: false,
    }));
    // U ortografické kamery jsou body v pixelech, proto volíme čitelné velikosti.
    stars.material.size = layer ? 2.5 : 1.5;
    scene.add(stars);
    return { stars, positions, speed };
  });

  const bulletGeometry = new THREE.BoxGeometry(0.12, 0.65, 0.12);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#67e8f9' });
  const bullets: THREE.Mesh[] = [];
  const keys = new Set<string>();
  const gameKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
  const keydown = (event: KeyboardEvent) => {
    if (gameKeys.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  };
  const keyup = (event: KeyboardEvent) => { keys.delete(event.code); };
  const clearKeys = () => { keys.clear(); };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', clearKeys);

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

  let previousTime: number | undefined;
  let cooldown = 0;
  const direction = new THREE.Vector2();
  renderer.setAnimationLoop((time: number) => {
    // Čas v sekundách; po návratu z neaktivní záložky nedovolíme velký skok.
    const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    direction.set(
      Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')),
      Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS')),
    );
    if (direction.lengthSq() > 0) direction.normalize();
    ship.position.x = THREE.MathUtils.clamp(ship.position.x + direction.x * SHIP_SPEED * dt, -8, 8);
    ship.position.y = THREE.MathUtils.clamp(ship.position.y + direction.y * SHIP_SPEED * dt, -10.5, 10.5);
    // Náklon je pouze vizuální: logika pohybu zůstává ve 2D.
    ship.rotation.y = THREE.MathUtils.damp(ship.rotation.y, direction.x * -0.35, 10, dt);
    flame.scale.y = 0.85 + Math.sin(time * 0.025) * 0.15;

    cooldown = Math.max(0, cooldown - dt);
    if (keys.has('Space') && cooldown === 0) {
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      bullet.position.set(ship.position.x, ship.position.y + 1.1, 0);
      scene.add(bullet);
      bullets.push(bullet);
      cooldown = 0.14;
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]!;
      bullet.position.y += BULLET_SPEED * dt;
      if (bullet.position.y > WORLD_HEIGHT / 2 + 1) {
        scene.remove(bullet);
        bullets.splice(i, 1);
      }
    }
    for (const { stars, positions, speed } of starLayers) {
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] = positions[i]! - SCROLL_SPEED * speed * dt;
        if (positions[i]! < -WORLD_HEIGHT / 2) positions[i] = positions[i]! + WORLD_HEIGHT;
      }
      stars.geometry.attributes.position!.needsUpdate = true;
    }
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', clearKeys);
    document.removeEventListener('visibilitychange', clearKeys);
    // Sdílené prostředky uvolníme jen jednou, včetně již odstraněných střel.
    const geometries = new Set<THREE.BufferGeometry>([bulletGeometry]);
    const materials = new Set<THREE.Material>([bulletMaterial]);
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
  };
}
