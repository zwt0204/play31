import * as THREE from 'three';

export function createOrbitGame(ui) {
  const renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(ui.canvas.clientWidth, ui.canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b0f);
  scene.fog = new THREE.FogExp2(0x090b0f, 0.045);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 2.5, 11.5);
  camera.lookAt(0, 0, -2.5);

  scene.add(new THREE.HemisphereLight(0xb9f8ef, 0x1a1420, 1.7));
  const keyLight = new THREE.DirectionalLight(0xd9ff80, 4.2);
  keyLight.position.set(-3, 7, 6);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xff573b, 22, 18, 2);
  rimLight.position.set(5, 0, -4);
  scene.add(rimLight);

  const world = new THREE.Group();
  scene.add(world);

  const orbitLines = new THREE.Group();
  world.add(orbitLines);
  [2.8, 4.4, 6.2].forEach((radius, index) => {
    const curve = new THREE.EllipseCurve(0, -0.2, radius, radius * 0.32, 0, Math.PI * 2);
    const points = curve.getPoints(128).map((point) => new THREE.Vector3(point.x, point.y, -4 - index * 1.7));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: index === 1 ? 0x657269 : 0x343a3a,
      transparent: true,
      opacity: index === 1 ? 0.48 : 0.26
    });
    orbitLines.add(new THREE.LineLoop(geometry, material));
  });
  orbitLines.rotation.x = 0.22;

  const grid = new THREE.GridHelper(38, 38, 0x2b3838, 0x1b2525);
  grid.position.set(0, -3.7, -5);
  grid.material.transparent = true;
  grid.material.opacity = 0.34;
  world.add(grid);

  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(240 * 3);
  const seeded = (index) => {
    const value = Math.sin(index * 91.731) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let index = 0; index < 240; index += 1) {
    starPositions[index * 3] = (seeded(index) - 0.5) * 32;
    starPositions[index * 3 + 1] = (seeded(index + 400) - 0.3) * 18;
    starPositions[index * 3 + 2] = -seeded(index + 800) * 34;
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({
    color: 0x9fb7ad,
    size: 0.045,
    transparent: true,
    opacity: 0.72
  }));
  world.add(stars);

  const target = new THREE.Group();
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.12, 16, 80),
    new THREE.MeshStandardMaterial({
      color: 0xd9ff43,
      emissive: 0x75910b,
      emissiveIntensity: 2.2,
      metalness: 0.3,
      roughness: 0.22
    })
  );
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.025, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xecff9b, transparent: true, opacity: 0.72 })
  );
  const markerA = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.38, 0.17),
    new THREE.MeshStandardMaterial({ color: 0xff5b3d, emissive: 0xff3016, emissiveIntensity: 1.8 })
  );
  const markerB = markerA.clone();
  markerA.position.y = 1.18;
  markerB.position.y = -1.18;
  target.add(outerRing, innerRing, markerA, markerB);
  target.position.set(0, 0, -4.1);
  world.add(target);

  const targetGlow = new THREE.PointLight(0xc8f737, 10, 8, 2);
  target.add(targetGlow);

  const launcher = new THREE.Group();
  launcher.position.set(0, -2.72, 3.15);
  const launcherBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.9, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x282e2d, metalness: 0.82, roughness: 0.28 })
  );
  launcherBase.rotation.y = Math.PI / 6;
  const launcherCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.62, 24),
    new THREE.MeshStandardMaterial({ color: 0xff5b3d, emissive: 0xd92710, emissiveIntensity: 2 })
  );
  launcherCore.position.y = 0.36;
  launcher.add(launcherBase, launcherCore);
  world.add(launcher);

  const projectile = new THREE.Group();
  const projectileBody = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0xff6244,
      emissive: 0xff3010,
      emissiveIntensity: 3,
      roughness: 0.18,
      metalness: 0.25,
      clearcoat: 1
    })
  );
  const projectileShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshBasicMaterial({ color: 0xff9d83, wireframe: true, transparent: true, opacity: 0.22 })
  );
  projectile.add(projectileBody, projectileShell);
  projectile.position.copy(launcher.position).add(new THREE.Vector3(0, 0.85, 0));
  projectile.visible = false;
  world.add(projectile);

  const trailLength = 22;
  const trailPositions = new Float32Array(trailLength * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trail = new THREE.Points(trailGeometry, new THREE.PointsMaterial({
    color: 0xff775e,
    size: 0.1,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  }));
  trail.visible = false;
  world.add(trail);

  const burstGeometry = new THREE.BufferGeometry();
  const burstPositions = new Float32Array(28 * 3);
  burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
  const burst = new THREE.Points(burstGeometry, new THREE.PointsMaterial({
    color: 0xd9ff43,
    size: 0.12,
    transparent: true,
    opacity: 0,
    depthWrite: false
  }));
  world.add(burst);
  const burstVelocities = Array.from({ length: 28 }, (_, index) => new THREE.Vector3(
    (seeded(index + 1400) - 0.5) * 4,
    (seeded(index + 1600) - 0.5) * 4,
    (seeded(index + 1800) - 0.5) * 4
  ));

  const clock = new THREE.Clock();
  const projectileVelocity = new THREE.Vector3();
  const trailHistory = Array.from({ length: trailLength }, () => projectile.position.clone());
  let started = false;
  let playing = false;
  let charging = false;
  let chargeStartedAt = 0;
  let power = 0;
  let score = 0;
  let lives = 3;
  let targetPhase = 0;
  let targetLane = 0;
  let burstLife = 0;
  let resetTimer = 0;
  let gameOverPending = false;
  let targetSpeed = 0.74;

  function updateHud() {
    ui.scoreElement.textContent = String(score).padStart(3, '0');
    ui.livesElement.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? '●' : '○').join(' ');
  }

  function resetProjectile() {
    playing = false;
    projectile.visible = false;
    trail.visible = false;
    projectile.position.copy(launcher.position).add(new THREE.Vector3(0, 0.85, 0));
    trailHistory.forEach((point) => point.copy(projectile.position));
    power = 0;
    ui.powerFill.style.width = '0%';
  }

  function beginCharge(event) {
    if (!started || playing || resetTimer > 0) return;
    event.preventDefault();
    charging = true;
    chargeStartedAt = performance.now();
    ui.launchButton.classList.add('charging');
  }

  function releaseCharge(event) {
    if (!charging) return;
    event?.preventDefault();
    charging = false;
    ui.launchButton.classList.remove('charging');
    power = Math.max(0.18, Math.min(1, (performance.now() - chargeStartedAt) / 1300));
    projectile.position.copy(launcher.position).add(new THREE.Vector3(0, 0.85, 0));
    projectileVelocity.set(0, 3.4 + power * 3.5, -7.4 - power * 5.5);
    projectile.visible = true;
    trail.visible = true;
    playing = true;
  }

  function startRound() {
    started = true;
    score = 0;
    lives = 3;
    targetSpeed = 0.74;
    targetLane = 0;
    targetPhase = -clock.elapsedTime * targetSpeed;
    resetTimer = 0;
    gameOverPending = false;
    ui.startScreen.hidden = true;
    ui.resultPanel.hidden = true;
    updateHud();
    resetProjectile();
  }

  function endGame() {
    started = false;
    resetProjectile();
    ui.finalScore.textContent = String(score);
    ui.resultCopy.textContent = score >= 5 ? '轨道已被你掌握。明天见。' : score >= 2 ? '节奏不错，再挑战一次更高分。' : '再试一次，观察能量环的运动。';
    ui.resultPanel.hidden = false;
  }

  function createBurst(position) {
    burst.position.copy(position);
    const positions = burst.geometry.attributes.position.array;
    positions.fill(0);
    burst.geometry.attributes.position.needsUpdate = true;
    burst.material.opacity = 1;
    burstLife = 0.72;
  }

  function hitTarget() {
    score += 1;
    targetLane = (targetLane + 1) % 3;
    targetSpeed = Math.min(1.4, targetSpeed + 0.08);
    createBurst(projectile.position);
    updateHud();
    resetTimer = 0.72;
    playing = false;
    projectile.visible = false;
    trail.visible = false;
  }

  function missTarget() {
    lives -= 1;
    updateHud();
    resetTimer = 0.62;
    playing = false;
    projectile.visible = false;
    trail.visible = false;
    gameOverPending = lives <= 0;
  }

  function updateTarget(elapsed) {
    const lanes = [0, 0.82, -0.62];
    const amplitude = [2.15, 1.72, 2.5][targetLane];
    target.position.x = Math.sin(elapsed * targetSpeed + targetPhase) * amplitude;
    target.position.y = lanes[targetLane] + Math.sin(elapsed * targetSpeed * 1.7) * 0.22;
    target.rotation.z = Math.sin(elapsed * 0.55) * 0.18;
    outerRing.rotation.z += 0.008;
    innerRing.rotation.z -= 0.012;
    const pulse = 1 + Math.sin(elapsed * 3.2) * 0.035;
    target.scale.setScalar(pulse);
  }

  function updateProjectile(delta, elapsed) {
    if (!playing) return;
    const previousZ = projectile.position.z;
    projectileVelocity.y -= 5.5 * delta;
    projectile.position.addScaledVector(projectileVelocity, delta);
    projectile.rotation.x += delta * 2.8;
    projectile.rotation.y += delta * 3.6;
    projectileShell.rotation.z -= delta * 2.2;

    trailHistory.unshift(projectile.position.clone());
    trailHistory.pop();
    const positions = trail.geometry.attributes.position.array;
    trailHistory.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });
    trail.geometry.attributes.position.needsUpdate = true;

    if (previousZ > target.position.z && projectile.position.z <= target.position.z) {
      const dx = projectile.position.x - target.position.x;
      const dy = projectile.position.y - target.position.y;
      if (Math.hypot(dx, dy) < 0.88) {
        hitTarget();
        targetPhase = elapsed * -targetSpeed + Math.PI * 0.45;
        return;
      }
    }

    if (projectile.position.z < -10 || projectile.position.y < -5 || projectile.position.y > 9) missTarget();
  }

  function updateBurst(delta) {
    if (burstLife <= 0) return;
    burstLife -= delta;
    const positions = burst.geometry.attributes.position.array;
    burstVelocities.forEach((velocity, index) => {
      positions[index * 3] += velocity.x * delta;
      positions[index * 3 + 1] += velocity.y * delta;
      positions[index * 3 + 2] += velocity.z * delta;
    });
    burst.geometry.attributes.position.needsUpdate = true;
    burst.material.opacity = Math.max(0, burstLife / 0.72);
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.033);
    const elapsed = clock.elapsedTime;
    updateTarget(elapsed);
    updateProjectile(delta, elapsed);
    updateBurst(delta);

    if (charging) {
      power = Math.min(1, (performance.now() - chargeStartedAt) / 1300);
      ui.powerFill.style.width = `${Math.round(power * 100)}%`;
    }

    if (resetTimer > 0) {
      resetTimer -= delta;
      if (resetTimer <= 0) {
        resetTimer = 0;
        if (gameOverPending) endGame();
        else resetProjectile();
      }
    }

    stars.rotation.y = elapsed * 0.006;
    launcherCore.position.y = 0.36 + Math.sin(elapsed * 2.4) * 0.035;
    camera.position.x = Math.sin(elapsed * 0.12) * 0.16;
    camera.lookAt(0, -0.05, -2.6);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function resize() {
    const width = ui.canvas.clientWidth;
    const height = ui.canvas.clientHeight;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = width / height;
    camera.fov = width < 700 ? 58 : 46;
    camera.position.z = width < 700 ? 13.8 : 11.5;
    camera.updateProjectionMatrix();
  }

  ui.startButton.addEventListener('click', startRound);
  ui.restartButton.addEventListener('click', startRound);
  ui.launchButton.addEventListener('pointerdown', beginCharge);
  window.addEventListener('pointerup', releaseCharge);
  window.addEventListener('pointercancel', releaseCharge);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat) beginCharge(event);
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') releaseCharge(event);
  });
  window.addEventListener('resize', resize);

  updateHud();
  resize();
  animate();
}
