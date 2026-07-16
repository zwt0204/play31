import * as THREE from 'three';

const ORDER_TYPES = [
  { name: '标准配送', ring: 1.05, speed: 0.34, reward: 100, color: 0xd9ff43 },
  { name: '加急订单', ring: 0.92, speed: 0.52, reward: 145, color: 0xff6a45 },
  { name: '易碎货物', ring: 0.78, speed: 0.4, reward: 185, color: 0x4de1d5 }
];

export function createOrbitGame(ui) {
  const renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b0f);
  scene.fog = new THREE.FogExp2(0x090b0f, 0.035);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 90);
  camera.position.set(0, 2.7, 12.8);
  camera.lookAt(0, -0.1, -4.5);

  scene.add(new THREE.HemisphereLight(0xcff8f0, 0x130f1c, 1.65));
  const sun = new THREE.DirectionalLight(0xf2ffd0, 3.8);
  sun.position.set(-5, 8, 7);
  scene.add(sun);
  const rim = new THREE.PointLight(0xff6548, 26, 24, 2);
  rim.position.set(6, 2, -5);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  addStarfield(world);

  const planetDefinitions = [
    { position: [-2.8, -0.8, -3.5], radius: 0.82, mass: 5.2, color: 0x38d7cf, atmosphere: 0x93fff7 },
    { position: [2.45, 0.45, -6.9], radius: 1.12, mass: 7.6, color: 0xff714d, atmosphere: 0xffb09b },
    { position: [-1.35, 1.55, -10.3], radius: 0.96, mass: 6.4, color: 0x8877ff, atmosphere: 0xbeb5ff }
  ];
  const planets = planetDefinitions.map((definition, index) => createPlanet(definition, index, world));

  const launcher = createLauncher(world);
  const packageGroup = createPackage(world);
  packageGroup.visible = false;

  const goal = createGoal(world);
  const trajectory = createTrajectory(world);
  const trail = createTrail(world);
  const burst = createBurst(world);

  const hero = ui.canvas.closest('.game-hero');
  const missionHud = document.createElement('aside');
  missionHud.className = 'orbit-mission-hud';
  missionHud.innerHTML = `
    <div class="mission-heading"><span id="orbit-order-type">标准配送</span><strong id="orbit-order-count">1 / 5</strong></div>
    <div class="mission-row"><span>剩余时间</span><strong id="orbit-time">75.0s</strong></div>
    <div class="mission-row"><span>连击倍率</span><strong id="orbit-combo">×1</strong></div>
    <div class="fuel-label"><span>推进燃料</span><strong id="orbit-fuel-value">100%</strong></div>
    <div class="fuel-track"><i id="orbit-fuel"></i></div>
    <div class="aim-readout"><span>航向</span><b id="orbit-aim">000°</b><small>拖动画面调整</small></div>
  `;
  hero.append(missionHud);

  const orderTypeElement = missionHud.querySelector('#orbit-order-type');
  const orderCountElement = missionHud.querySelector('#orbit-order-count');
  const timeElement = missionHud.querySelector('#orbit-time');
  const comboElement = missionHud.querySelector('#orbit-combo');
  const fuelValueElement = missionHud.querySelector('#orbit-fuel-value');
  const fuelElement = missionHud.querySelector('#orbit-fuel');
  const aimElement = missionHud.querySelector('#orbit-aim');

  const clock = new THREE.Clock();
  const velocity = new THREE.Vector3();
  const acceleration = new THREE.Vector3();
  const trailHistory = Array.from({ length: 34 }, () => new THREE.Vector3());
  const burstVelocities = Array.from({ length: 36 }, (_, index) => seededVector(index));

  let started = false;
  let flying = false;
  let charging = false;
  let aiming = false;
  let chargeStartedAt = 0;
  let power = 0.46;
  let aimYaw = 0;
  let aimPitch = 0.27;
  let score = 0;
  let lives = 3;
  let fuel = 100;
  let timeLeft = 75;
  let orderIndex = 0;
  let combo = 0;
  let flightTime = 0;
  let resetTimer = 0;
  let finishPending = false;
  let burstLife = 0;
  let bestScore = Number(localStorage.getItem('play31-day01-best') || 0);
  let keyboardAim = 0;

  function currentOrder() {
    return ORDER_TYPES[orderIndex % ORDER_TYPES.length];
  }

  function currentPlanet() {
    return planets[orderIndex % planets.length];
  }

  function updateHud() {
    ui.scoreElement.textContent = String(score).padStart(3, '0');
    ui.goalElement.textContent = `${Math.min(orderIndex, 5)} / 5`;
    ui.livesElement.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? '●' : '○').join(' ');
    orderTypeElement.textContent = currentOrder().name;
    orderTypeElement.style.color = `#${currentOrder().color.toString(16).padStart(6, '0')}`;
    orderCountElement.textContent = `${Math.min(orderIndex + 1, 5)} / 5`;
    timeElement.textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
    comboElement.textContent = `×${Math.max(1, combo)}`;
    fuelValueElement.textContent = `${Math.max(0, Math.round(fuel))}%`;
    fuelElement.style.width = `${Math.max(0, fuel)}%`;
    fuelElement.classList.toggle('danger', fuel < 25);
    aimElement.textContent = `${aimYaw >= 0 ? '+' : '−'}${String(Math.round(Math.abs(THREE.MathUtils.radToDeg(aimYaw)))).padStart(2, '0')}°`;
  }

  function resetPackage() {
    flying = false;
    packageGroup.visible = false;
    trail.visible = false;
    flightTime = 0;
    packageGroup.position.copy(launcher.position).add(new THREE.Vector3(0, 0.9, 0));
    velocity.set(0, 0, 0);
    trailHistory.forEach((point) => point.copy(packageGroup.position));
    updateTrajectory();
  }

  function updateGoal(elapsed) {
    const planet = currentPlanet();
    const order = currentOrder();
    const phase = elapsed * order.speed + orderIndex * 1.31;
    const orbitRadius = planet.userData.radius + 1.95 + (orderIndex % 2) * 0.35;
    goal.position.set(
      planet.position.x + Math.cos(phase) * orbitRadius,
      planet.position.y + Math.sin(phase) * orbitRadius * 0.42,
      planet.position.z + Math.sin(phase * 0.6) * 0.28
    );
    goal.scale.setScalar(order.ring);
    goal.userData.outer.material.color.setHex(order.color);
    goal.userData.outer.material.emissive.setHex(order.color);
    goal.userData.light.color.setHex(order.color);
    goal.rotation.z += 0.008 + orderIndex * 0.001;
    goal.userData.inner.rotation.z -= 0.016;
  }

  function gravityAt(position, target = new THREE.Vector3()) {
    target.set(0, 0, 0);
    planets.forEach((planet) => {
      const delta = planet.position.clone().sub(position);
      const distanceSq = Math.max(0.7, delta.lengthSq());
      const strength = planet.userData.mass * 0.62 / distanceSq;
      target.add(delta.normalize().multiplyScalar(strength));
    });
    return target;
  }

  function launchDirection(target = new THREE.Vector3()) {
    target.set(Math.sin(aimYaw), Math.sin(aimPitch), -Math.cos(aimYaw));
    return target.normalize();
  }

  function updateTrajectory() {
    if (flying) {
      trajectory.visible = false;
      return;
    }
    trajectory.visible = started;
    const positions = trajectory.geometry.attributes.position.array;
    const simulatedPosition = launcher.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const simulatedVelocity = launchDirection().multiplyScalar(6.2 + power * 5.8);
    const simulatedAcceleration = new THREE.Vector3();
    for (let index = 0; index < positions.length / 3; index += 1) {
      positions[index * 3] = simulatedPosition.x;
      positions[index * 3 + 1] = simulatedPosition.y;
      positions[index * 3 + 2] = simulatedPosition.z;
      gravityAt(simulatedPosition, simulatedAcceleration);
      simulatedVelocity.addScaledVector(simulatedAcceleration, 0.075);
      simulatedPosition.addScaledVector(simulatedVelocity, 0.075);
    }
    trajectory.geometry.attributes.position.needsUpdate = true;
  }

  function beginCharge(event) {
    if (!started || flying || resetTimer > 0 || fuel < 8) return;
    event?.preventDefault();
    charging = true;
    chargeStartedAt = performance.now();
    ui.launchButton.classList.add('charging');
  }

  function releaseCharge(event) {
    if (!charging) return;
    event?.preventDefault();
    charging = false;
    ui.launchButton.classList.remove('charging');
    power = Math.max(0.18, Math.min(1, (performance.now() - chargeStartedAt) / 1250));
    const fuelCost = 9 + power * 13;
    if (fuel < fuelCost) {
      power = Math.max(0.18, (fuel - 5) / 13);
    }
    fuel = Math.max(0, fuel - (9 + power * 13));
    packageGroup.position.copy(launcher.position).add(new THREE.Vector3(0, 0.9, 0));
    velocity.copy(launchDirection()).multiplyScalar(6.2 + power * 5.8);
    packageGroup.visible = true;
    trail.visible = true;
    trajectory.visible = false;
    flying = true;
    flightTime = 0;
    updateHud();
  }

  function pointerPosition(event) {
    const rect = ui.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    };
  }

  function updateAim(event) {
    if (!started || flying) return;
    const point = pointerPosition(event);
    aimYaw = THREE.MathUtils.clamp(point.x * 0.62, -0.62, 0.62);
    aimPitch = THREE.MathUtils.clamp(0.18 + (point.y + 0.15) * 0.24, 0.08, 0.48);
    launcher.rotation.y = -aimYaw;
    updateTrajectory();
    updateHud();
  }

  function spawnBurst(position, color) {
    burst.position.copy(position);
    burst.material.color.setHex(color);
    burst.material.opacity = 1;
    burstLife = 0.8;
    burst.geometry.attributes.position.array.fill(0);
    burst.geometry.attributes.position.needsUpdate = true;
  }

  function completeOrder() {
    const order = currentOrder();
    combo += 1;
    const comboMultiplier = 1 + Math.min(3, combo - 1) * 0.35;
    const reward = Math.round((order.reward + fuel * 0.35 + Math.max(0, 7 - flightTime) * 8) * comboMultiplier);
    score += reward;
    fuel = Math.min(100, fuel + 16);
    timeLeft = Math.min(75, timeLeft + (order.name === '加急订单' ? 7 : 4));
    spawnBurst(packageGroup.position, order.color);
    packageGroup.visible = false;
    trail.visible = false;
    flying = false;
    orderIndex += 1;
    resetTimer = 0.85;
    if (orderIndex >= 5) finishPending = true;
    updateHud();
  }

  function failDelivery(reason = '轨道偏离') {
    if (!flying) return;
    flying = false;
    packageGroup.visible = false;
    trail.visible = false;
    lives -= 1;
    combo = 0;
    resetTimer = 0.72;
    spawnBurst(packageGroup.position, 0xff5b3d);
    if (lives <= 0) finishPending = true;
    ui.resultCopy.textContent = reason;
    updateHud();
  }

  function rating() {
    if (orderIndex >= 5 && lives >= 2 && fuel >= 25) return 3;
    if (orderIndex >= 4 || score >= 650) return 2;
    return 1;
  }

  function endGame(reason) {
    started = false;
    flying = false;
    charging = false;
    aiming = false;
    packageGroup.visible = false;
    trail.visible = false;
    trajectory.visible = false;
    ui.launchButton.classList.remove('charging');
    bestScore = Math.max(bestScore, score);
    localStorage.setItem('play31-day01-best', String(bestScore));
    const stars = '★'.repeat(rating()) + '☆'.repeat(3 - rating());
    ui.finalScore.textContent = String(score);
    ui.resultCopy.textContent = `${stars}　${reason} · 最佳 ${bestScore}`;
    ui.resultPanel.hidden = false;
  }

  function startRound() {
    started = true;
    score = 0;
    lives = 3;
    fuel = 100;
    timeLeft = 75;
    orderIndex = 0;
    combo = 0;
    resetTimer = 0;
    finishPending = false;
    power = 0.46;
    aimYaw = 0;
    aimPitch = 0.27;
    ui.startScreen.hidden = true;
    ui.resultPanel.hidden = true;
    resetPackage();
    updateHud();
  }

  function updatePackage(delta) {
    if (!flying) return;
    flightTime += delta;
    gravityAt(packageGroup.position, acceleration);
    velocity.addScaledVector(acceleration, delta);
    packageGroup.position.addScaledVector(velocity, delta);
    packageGroup.rotation.x += delta * 2.4;
    packageGroup.rotation.y += delta * 3.1;
    packageGroup.userData.shell.rotation.z -= delta * 2.2;

    trailHistory.unshift(packageGroup.position.clone());
    trailHistory.pop();
    const positions = trail.geometry.attributes.position.array;
    trailHistory.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });
    trail.geometry.attributes.position.needsUpdate = true;

    if (packageGroup.position.distanceTo(goal.position) < currentOrder().ring * 0.88) {
      completeOrder();
      return;
    }

    for (const planet of planets) {
      const surfaceDistance = packageGroup.position.distanceTo(planet.position) - planet.userData.radius;
      if (surfaceDistance < 0.18) {
        failDelivery('货物撞上了行星');
        return;
      }
    }

    if (flightTime > 8.5 || packageGroup.position.z < -18 || packageGroup.position.y < -6 || Math.abs(packageGroup.position.x) > 12) {
      failDelivery('货物脱离了配送轨道');
    }
  }

  function updateBurst(delta) {
    if (burstLife <= 0) return;
    burstLife -= delta;
    const positions = burst.geometry.attributes.position.array;
    burstVelocities.forEach((velocityItem, index) => {
      positions[index * 3] += velocityItem.x * delta;
      positions[index * 3 + 1] += velocityItem.y * delta;
      positions[index * 3 + 2] += velocityItem.z * delta;
    });
    burst.geometry.attributes.position.needsUpdate = true;
    burst.material.opacity = Math.max(0, burstLife / 0.8);
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.033);
    const elapsed = clock.elapsedTime;

    updateGoal(elapsed);
    planets.forEach((planet, index) => {
      planet.userData.surface.rotation.y += delta * (0.08 + index * 0.025);
      planet.userData.atmosphere.rotation.y -= delta * 0.04;
    });

    if (started) {
      timeLeft -= delta;
      if (charging) {
        power = Math.min(1, (performance.now() - chargeStartedAt) / 1250);
        ui.powerFill.style.width = `${Math.round(power * 100)}%`;
        updateTrajectory();
      } else if (!flying) {
        ui.powerFill.style.width = `${Math.round(power * 100)}%`;
      }
      if (keyboardAim !== 0 && !flying) {
        aimYaw = THREE.MathUtils.clamp(aimYaw + keyboardAim * delta * 0.7, -0.62, 0.62);
        launcher.rotation.y = -aimYaw;
        updateTrajectory();
      }
      updatePackage(delta);
      if (resetTimer > 0) {
        resetTimer -= delta;
        if (resetTimer <= 0) {
          if (finishPending) endGame(orderIndex >= 5 ? '五笔订单全部送达' : '货物耐久耗尽');
          else if (fuel < 8) endGame('推进燃料耗尽');
          else resetPackage();
        }
      }
      if (timeLeft <= 0) endGame('配送时间结束');
      updateHud();
    } else {
      launcher.userData.core.position.y = 0.38 + Math.sin(elapsed * 2.4) * 0.04;
    }

    updateBurst(delta);
    world.rotation.y = Math.sin(elapsed * 0.12) * 0.018;
    camera.position.x = Math.sin(elapsed * 0.1) * 0.12;
    camera.lookAt(0, -0.1, -4.5);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function resize() {
    const width = ui.canvas.clientWidth;
    const height = ui.canvas.clientHeight;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = width / height;
    camera.fov = width < 700 ? 62 : 48;
    camera.position.z = width < 700 ? 14.5 : 12.8;
    camera.updateProjectionMatrix();
  }

  ui.startButton.addEventListener('click', startRound);
  ui.restartButton.addEventListener('click', startRound);
  ui.launchButton.addEventListener('pointerdown', beginCharge);
  window.addEventListener('pointerup', releaseCharge);
  window.addEventListener('pointercancel', releaseCharge);
  ui.canvas.addEventListener('pointerdown', (event) => {
    if (!started || flying) return;
    aiming = true;
    updateAim(event);
  });
  ui.canvas.addEventListener('pointermove', (event) => {
    if (aiming) updateAim(event);
  });
  window.addEventListener('pointerup', () => { aiming = false; });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat) beginCharge(event);
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keyboardAim = -1;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keyboardAim = 1;
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') releaseCharge(event);
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) keyboardAim = 0;
  });
  window.addEventListener('resize', resize);

  updateHud();
  resize();
  updateGoal(0);
  updateTrajectory();
  animate();
}

function createPlanet(definition, index, world) {
  const group = new THREE.Group();
  group.position.fromArray(definition.position);
  group.userData.radius = definition.radius;
  group.userData.mass = definition.mass;

  const surface = new THREE.Mesh(
    new THREE.IcosahedronGeometry(definition.radius, 4),
    new THREE.MeshPhysicalMaterial({
      color: definition.color,
      emissive: definition.color,
      emissiveIntensity: 0.22,
      metalness: 0.18,
      roughness: 0.72,
      clearcoat: 0.34
    })
  );
  const atmosphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(definition.radius * 1.12, 3),
    new THREE.MeshBasicMaterial({ color: definition.atmosphere, transparent: true, opacity: 0.12, wireframe: index === 2 })
  );
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(definition.radius + 2.05, 0.018, 6, 96),
    new THREE.MeshBasicMaterial({ color: definition.atmosphere, transparent: true, opacity: 0.28 })
  );
  orbit.rotation.x = Math.PI / 2;
  orbit.scale.y = 0.42;
  group.add(surface, atmosphere, orbit);
  group.userData.surface = surface;
  group.userData.atmosphere = atmosphere;
  world.add(group);
  return group;
}

function createLauncher(world) {
  const launcher = new THREE.Group();
  launcher.position.set(0, -2.65, 3.15);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1, 0.52, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a302f, metalness: 0.8, roughness: 0.25 })
  );
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 0.7, 20),
    new THREE.MeshStandardMaterial({ color: 0xff6548, emissive: 0xff3218, emissiveIntensity: 2.4 })
  );
  core.position.y = 0.38;
  const sight = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.035, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xd9ff43 })
  );
  sight.position.set(0, 0.92, -0.28);
  sight.rotation.x = Math.PI / 2;
  launcher.add(base, core, sight);
  launcher.userData.core = core;
  world.add(launcher);
  return launcher;
}

function createPackage(world) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.42, 0.48),
    new THREE.MeshPhysicalMaterial({ color: 0xff704f, emissive: 0xff3218, emissiveIntensity: 2.2, metalness: 0.25, roughness: 0.2, clearcoat: 1 })
  );
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 1),
    new THREE.MeshBasicMaterial({ color: 0xffb29f, wireframe: true, transparent: true, opacity: 0.28 })
  );
  group.add(body, shell);
  group.userData.shell = shell;
  world.add(group);
  return group;
}

function createGoal(world) {
  const goal = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xd9ff43, emissive: 0xd9ff43, emissiveIntensity: 2.4, metalness: 0.32, roughness: 0.2 });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 14, 72), material);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 56), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  const light = new THREE.PointLight(0xd9ff43, 12, 8, 2);
  goal.add(outer, inner, light);
  goal.userData.outer = outer;
  goal.userData.inner = inner;
  goal.userData.light = light;
  world.add(goal);
  return goal;
}

function createTrajectory(world) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(52 * 3), 3));
  const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.58, dashSize: 0.18, gapSize: 0.12 }));
  line.computeLineDistances();
  world.add(line);
  return line;
}

function createTrail(world) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(34 * 3), 3));
  const trail = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xff8065, size: 0.09, transparent: true, opacity: 0.76, depthWrite: false }));
  trail.visible = false;
  world.add(trail);
  return trail;
}

function createBurst(world) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36 * 3), 3));
  const burst = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd9ff43, size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
  world.add(burst);
  return burst;
}

function addStarfield(world) {
  const positions = new Float32Array(300 * 3);
  for (let index = 0; index < 300; index += 1) {
    positions[index * 3] = (seed(index) - 0.5) * 34;
    positions[index * 3 + 1] = (seed(index + 500) - 0.3) * 20;
    positions[index * 3 + 2] = -seed(index + 1000) * 38;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  world.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xa8c0b7, size: 0.045, transparent: true, opacity: 0.72 })));
  const grid = new THREE.GridHelper(40, 40, 0x30413e, 0x1a2423);
  grid.position.set(0, -3.75, -6);
  grid.material.transparent = true;
  grid.material.opacity = 0.26;
  world.add(grid);
}

function seed(index) {
  const value = Math.sin(index * 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function seededVector(index) {
  return new THREE.Vector3(
    (seed(index + 1300) - 0.5) * 4.4,
    (seed(index + 1600) - 0.5) * 4.4,
    (seed(index + 1900) - 0.5) * 4.4
  );
}
