import * as THREE from 'three';

const CONFIGS = {
  2: { type: 'timing', goal: 8, accent: 0xff6a45, secondary: 0x54e0d6, shape: 'ball', speed: 1.8, threshold: 0.92 },
  3: { type: 'puzzle', goal: 9, accent: 0xff5b3d, secondary: 0xd9ff43 },
  4: { type: 'stack', goal: 10, accent: 0xd9ff43, secondary: 0xff5b3d },
  5: { type: 'steer', goal: 10, accent: 0x62e1ff, secondary: 0xffc34d, shape: 'ship', axes: 1 },
  6: { type: 'toggle', goal: 10, accent: 0xff513b, secondary: 0x35d8d1, states: 2, shape: 'magnet' },
  7: { type: 'steer', goal: 10, accent: 0xf4f0df, secondary: 0x74c8ff, shape: 'plane', axes: 2 },
  8: { type: 'shadow', goal: 8, accent: 0xffd05a, secondary: 0x8b7cff },
  9: { type: 'aim', goal: 12, accent: 0xff5b3d, secondary: 0xf4f0df, shape: 'bowling' },
  10: { type: 'steer', goal: 10, accent: 0xff4f91, secondary: 0x44e3d0, shape: 'tunnel', axes: 1 },
  11: { type: 'blast', goal: 20, accent: 0xff5b3d, secondary: 0xd9ff43 },
  12: { type: 'toggle', goal: 10, accent: 0xd9ff43, secondary: 0x7b78ff, states: 2, shape: 'gravity' },
  13: { type: 'aim', goal: 6, accent: 0xe9edf1, secondary: 0x9dff76, shape: 'golf' },
  14: { type: 'toggle', goal: 10, accent: 0xff5b3d, secondary: 0x35d8d1, states: 3, shape: 'color' },
  15: { type: 'hold', goal: 10, accent: 0x55dff2, secondary: 0xffd45e },
  16: { type: 'spring', goal: 8, accent: 0xd9ff43, secondary: 0xff75a8 },
  17: { type: 'reflect', goal: 8, accent: 0xffd85a, secondary: 0x63e0d8 }
};

export function createDailyGame(day, ui) {
  const config = CONFIGS[day];
  const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b0f);
  scene.fog = new THREE.FogExp2(0x090b0f, 0.055);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 2.7, 11.5);
  camera.lookAt(0, 0, -2.8);

  scene.add(new THREE.HemisphereLight(0xdffcf4, 0x14101d, 1.8));
  const key = new THREE.DirectionalLight(config.accent, 3.5);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const rim = new THREE.PointLight(config.secondary, 18, 20, 2);
  rim.position.set(5, 1, -4);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  addBackdrop(world, config);
  const feedbackBurst = createFeedbackBurst(world);
  let audioContext = null;
  let toastTimer = 0;
  let paused = Boolean(window.play31Paused);
  const bestScoreKey = `play31-day${String(day).padStart(2, '0')}-best`;
  let bestScore = Number(localStorage.getItem(bestScoreKey) || 0);

  const clock = new THREE.Clock();
  const state = {
    started: false,
    score: 0,
    lives: 3,
    elapsed: 0,
    roundTime: 0,
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    holding: false,
    cooldown: 0,
    gameOverPending: false,
    completed: false,
    combo: 0,
    shake: 0
  };

  const game = setupGame(day, config, world, scene, state, camera);

  function updateHud() {
    ui.scoreElement.textContent = String(state.score).padStart(3, '0');
    ui.goalElement.textContent = `${Math.min(state.score, config.goal)} / ${config.goal}`;
    ui.livesElement.textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '●' : '○').join(' ');
  }

  function showToast(text, success = true) {
    if (!ui.toast) return;
    window.clearTimeout(toastTimer);
    ui.toast.textContent = text;
    ui.toast.classList.toggle('miss', !success);
    ui.toast.classList.add('show');
    toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), 620);
  }

  function playTone(success) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = success ? 'sine' : 'sawtooth';
      oscillator.frequency.setValueAtTime(success ? 420 + state.combo * 28 : 150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(success ? 680 : 90, audioContext.currentTime + 0.1);
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.14);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch {
      // Audio feedback is optional in restricted embedded browsers.
    }
  }

  function flashResult(success) {
    ui.powerFill.style.transition = 'none';
    ui.powerFill.style.width = '100%';
    ui.powerFill.style.background = success ? '#d9ff43' : '#ff5b3d';
    window.setTimeout(() => {
      ui.powerFill.style.transition = '';
      ui.powerFill.style.width = '0%';
      ui.powerFill.style.background = '';
    }, 260);
  }

  function hit(points = 1) {
    if (!state.started) return;
    state.combo += 1;
    const comboBonus = state.combo > 0 && state.combo % 4 === 0 ? 1 : 0;
    const awarded = points + comboBonus;
    state.score += awarded;
    state.shake = 0.16;
    feedbackBurst.emit(true);
    playTone(true);
    navigator.vibrate?.(18);
    showToast(`${state.combo >= 3 ? `连击 ×${state.combo} · ` : ''}+${awarded}`, true);
    flashResult(true);
    updateHud();
    if (state.score >= config.goal) {
      state.completed = true;
      state.gameOverPending = true;
      state.cooldown = Math.max(state.cooldown, 0.9);
      showToast('挑战完成', true);
    }
  }

  function miss() {
    if (!state.started || state.cooldown > 0) return;
    state.lives -= 1;
    state.combo = 0;
    state.shake = 0.28;
    state.cooldown = 0.45;
    feedbackBurst.emit(false);
    playTone(false);
    navigator.vibrate?.([35, 35, 35]);
    showToast('失误 · 再来', false);
    flashResult(false);
    updateHud();
    if (state.lives <= 0) state.gameOverPending = true;
  }

  function endGame() {
    state.started = false;
    state.holding = false;
    state.pointerDown = false;
    ui.launchButton.classList.remove('charging');
    bestScore = Math.max(bestScore, state.score);
    localStorage.setItem(bestScoreKey, String(bestScore));
    ui.finalScore.textContent = String(state.score);
    const summary = state.completed
      ? '挑战完成，你已经掌握这个小世界的规则。'
      : state.score >= 4 ? '手感不错，再挑战一次更高分。' : '再试一次，先观察场景运动的节奏。';
    ui.resultCopy.textContent = `${summary} · 最佳 ${bestScore}`;
    ui.resultPanel.hidden = false;
    ui.onRoundEnd?.(state.score);
  }

  function startRound() {
    state.started = true;
    state.score = 0;
    state.lives = 3;
    state.elapsed = 0;
    state.roundTime = 0;
    state.cooldown = 0;
    state.gameOverPending = false;
    state.completed = false;
    state.combo = 0;
    state.shake = 0;
    state.holding = false;
    state.pointerDown = false;
    ui.startScreen.hidden = true;
    ui.resultPanel.hidden = true;
    ui.powerFill.style.width = '0%';
    game.reset?.();
    updateHud();
    ui.onRoundStart?.();
  }

  function normalizedPointer(event) {
    const rect = ui.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    };
  }

  function pointerDown(event) {
    if (!state.started) return;
    const point = normalizedPointer(event);
    state.pointerDown = true;
    state.pointerX = point.x;
    state.pointerY = point.y;
    if (event.pointerId !== undefined && ui.canvas.setPointerCapture) {
      try {
        ui.canvas.setPointerCapture(event.pointerId);
      } catch {
        // Some embedded WebViews expose PointerEvent without pointer capture support.
      }
    }
    game.pointerDown?.(point, event);
  }

  function pointerMove(event) {
    if (!state.started) return;
    const point = normalizedPointer(event);
    state.pointerX = point.x;
    state.pointerY = point.y;
    game.pointerMove?.(point, event);
  }

  function pointerUp(event) {
    if (!state.started) return;
    const point = normalizedPointer(event);
    state.pointerDown = false;
    game.pointerUp?.(point, event);
  }

  function controlDown(event) {
    if (!state.started) return;
    event.preventDefault();
    state.holding = true;
    ui.launchButton.classList.add('charging');
    game.controlDown?.();
  }

  function controlUp(event) {
    if (!state.started) return;
    event?.preventDefault();
    const wasHolding = state.holding;
    state.holding = false;
    ui.launchButton.classList.remove('charging');
    if (wasHolding) game.controlUp?.();
  }

  function resize() {
    const width = ui.canvas.clientWidth;
    const height = ui.canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 60 : 48;
    camera.position.z = width < 700 ? 13.7 : 11.5;
    camera.updateProjectionMatrix();
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.033);
    state.elapsed += delta;
    if (state.started && !paused) {
      state.roundTime += delta;
      game.update(delta, state.elapsed, { hit, miss });
      feedbackBurst.update(delta);
      if (state.cooldown > 0) state.cooldown -= delta;
      if (state.gameOverPending && state.cooldown <= 0) endGame();
    } else if (!state.started) {
      game.idle?.(delta, state.elapsed);
      feedbackBurst.update(delta);
    }
    world.rotation.y = Math.sin(state.elapsed * 0.18) * 0.025;
    camera.position.x = state.shake > 0 ? Math.sin(state.elapsed * 95) * state.shake : 0;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - delta * 1.5);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  ui.startButton.addEventListener('click', startRound);
  ui.restartButton.addEventListener('click', startRound);
  ui.canvas.addEventListener('pointerdown', pointerDown);
  ui.canvas.addEventListener('pointermove', pointerMove);
  ui.canvas.addEventListener('pointerup', pointerUp);
  ui.canvas.addEventListener('pointercancel', pointerUp);
  ui.launchButton.addEventListener('pointerdown', controlDown);
  window.addEventListener('pointerup', controlUp);
  window.addEventListener('pointercancel', controlUp);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat) controlDown(event);
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') controlUp(event);
  });
  window.addEventListener('resize', resize);
  window.addEventListener('play31:pause', (event) => {
    paused = Boolean(event.detail);
    if (paused) {
      state.holding = false;
      ui.launchButton.classList.remove('charging');
    }
  });

  updateHud();
  resize();
  animate();
}

function addBackdrop(world, config) {
  const grid = new THREE.GridHelper(34, 34, config.secondary, 0x202828);
  grid.position.set(0, -3.6, -5);
  grid.material.transparent = true;
  grid.material.opacity = 0.26;
  world.add(grid);

  const positions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    const seed = (offset) => {
      const v = Math.sin((i + offset) * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    positions[i * 3] = (seed(1) - 0.5) * 30;
    positions[i * 3 + 1] = (seed(8) - 0.35) * 16;
    positions[i * 3 + 2] = -seed(15) * 32;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  world.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xb5c9c1, size: 0.04, transparent: true, opacity: 0.6 })));
}

function setupGame(day, config, world, scene, state, camera) {
  if (config.type === 'timing') return setupTiming(day, config, world, state);
  if (config.type === 'stack') return setupStack(config, world, state);
  if (config.type === 'blast') return setupBlast(config, world, state);
  if (config.type === 'spring') return setupSpring(config, world, state);
  if (config.type === 'reflect') return setupReflect(config, world, state);
  if (config.type === 'steer') return setupSteer(day, config, world, state);
  if (config.type === 'toggle') return setupToggle(day, config, world, state);
  if (config.type === 'aim') return setupAim(day, config, world, state);
  if (config.type === 'hold') return setupHold(config, world, state);
  if (config.type === 'puzzle') return setupPuzzle(config, world, state, camera);
  return setupShadow(config, world, scene, state);
}

function createFeedbackBurst(world) {
  const count = 34;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xd9ff43,
    size: 0.13,
    transparent: true,
    opacity: 0,
    depthWrite: false
  }));
  points.position.set(0, -0.15, -2.2);
  world.add(points);
  const velocities = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const speed = 1.4 + (index % 7) * 0.22;
    return new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, ((index % 5) - 2) * 0.35);
  });
  let life = 0;
  return {
    emit(success) {
      positions.fill(0);
      geometry.attributes.position.needsUpdate = true;
      points.material.color.setHex(success ? 0xd9ff43 : 0xff5b3d);
      points.material.opacity = 1;
      life = 0.58;
    },
    update(delta) {
      if (life <= 0) return;
      life -= delta;
      velocities.forEach((velocity, index) => {
        positions[index * 3] += velocity.x * delta;
        positions[index * 3 + 1] += velocity.y * delta;
        positions[index * 3 + 2] += velocity.z * delta;
      });
      geometry.attributes.position.needsUpdate = true;
      points.material.opacity = Math.max(0, life / 0.58);
    }
  };
}

function material(color, emissive = color) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.65, metalness: 0.35, roughness: 0.32 });
}

function setupStack(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const blockHeight = 0.48;
  const blockDepth = 1.55;
  const baseY = -2.15;
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, blockHeight, blockDepth), material(config.secondary));
  base.position.set(0, baseY, -3.2);
  group.add(base);
  const placedBlocks = [];
  const mover = new THREE.Mesh(new THREE.BoxGeometry(1, blockHeight, blockDepth), material(config.accent));
  group.add(mover);
  const perfectRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.035, 8, 42),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  perfectRing.rotation.x = Math.PI / 2;
  group.add(perfectRing);
  let width = 3.4;
  let topX = 0;
  let level = 0;
  let phase = 0;
  let callbacks = null;

  function positionMover() {
    mover.scale.x = width;
    mover.position.y = baseY + (level + 1) * blockHeight;
    mover.position.z = -3.2;
  }

  function drop() {
    if (!callbacks || !state.started || state.cooldown > 0) return;
    const overlap = width - Math.abs(mover.position.x - topX);
    if (overlap <= 0.22) {
      callbacks.miss();
      phase += Math.PI * 0.7;
      return;
    }
    const placedWidth = overlap;
    const placedX = (mover.position.x + topX) / 2;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(placedWidth, blockHeight, blockDepth),
      material(level % 2 ? config.secondary : config.accent)
    );
    block.position.set(placedX, mover.position.y, -3.2);
    group.add(block);
    placedBlocks.push(block);
    const precision = overlap / width;
    topX = placedX;
    width = placedWidth;
    level += 1;
    perfectRing.position.set(placedX, block.position.y + 0.3, -3.2);
    perfectRing.material.opacity = precision > 0.9 ? 0.9 : 0;
    callbacks.hit(precision > 0.94 ? 2 : 1);
    phase += 1.35;
    positionMover();
  }

  return {
    reset() {
      placedBlocks.forEach((block) => group.remove(block));
      placedBlocks.length = 0;
      width = 3.4;
      topX = 0;
      level = 0;
      phase = 0;
      perfectRing.material.opacity = 0;
      positionMover();
    },
    controlDown: drop,
    pointerDown: drop,
    update(delta, elapsed, cb) {
      callbacks = cb;
      const travel = Math.max(1.15, 3.45 - width / 2);
      mover.position.x = topX + Math.sin(elapsed * (1.45 + level * 0.07) + phase) * travel;
      mover.rotation.y = Math.sin(elapsed * 0.8) * 0.04;
      perfectRing.material.opacity = Math.max(0, perfectRing.material.opacity - delta * 1.5);
      perfectRing.scale.addScalar(delta * 0.9);
      if (perfectRing.material.opacity <= 0) perfectRing.scale.setScalar(1);
    },
    idle(delta, elapsed) {
      mover.position.x = Math.sin(elapsed * 1.45) * 2.4;
      mover.rotation.y += delta * 0.15;
    }
  };
}

function setupBlast(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const columns = 5;
  const rows = 4;
  const colors = [config.accent, config.secondary, 0x35d8d1];
  const cells = [];
  let seed = 0;
  let callbacks = null;

  function rebuild() {
    cells.forEach((cell) => group.remove(cell.mesh));
    cells.length = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const colorIndex = (Math.floor(column / 2) + Math.floor(row / 2) + seed) % colors.length;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.82), material(colors[colorIndex]));
        mesh.position.set((column - 2) * 1.02, (row - 1.5) * 0.86 - 0.25, -3.4);
        mesh.userData.home = mesh.position.clone();
        group.add(mesh);
        cells.push({ mesh, column, row, colorIndex, active: true });
      }
    }
    seed += 1;
  }

  function clusterFrom(start) {
    const cluster = [];
    const queue = [start];
    const seen = new Set();
    while (queue.length) {
      const cell = queue.shift();
      const key = `${cell.column}:${cell.row}`;
      if (seen.has(key) || !cell.active || cell.colorIndex !== start.colorIndex) continue;
      seen.add(key);
      cluster.push(cell);
      cells.forEach((candidate) => {
        if (!candidate.active) return;
        const distance = Math.abs(candidate.column - cell.column) + Math.abs(candidate.row - cell.row);
        if (distance === 1 && candidate.colorIndex === start.colorIndex) queue.push(candidate);
      });
    }
    return cluster;
  }

  function blastAt(point) {
    if (!callbacks || !state.started || state.cooldown > 0) return;
    const column = Math.max(0, Math.min(columns - 1, Math.floor(((point.x + 1) / 2) * columns)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(((point.y + 0.55) / 1.1) * rows)));
    const cell = cells.find((item) => item.active && item.column === column && item.row === row);
    if (!cell) return;
    const cluster = clusterFrom(cell);
    if (cluster.length < 2) {
      cell.mesh.rotation.z += 0.35;
      callbacks.miss();
      return;
    }
    cluster.forEach((item, index) => {
      item.active = false;
      item.mesh.scale.setScalar(0.06);
      item.mesh.position.z += 0.4 + index * 0.02;
    });
    callbacks.hit(cluster.length);
    const remaining = cells.filter((item) => item.active).length;
    if (remaining < 5 && !state.gameOverPending) window.setTimeout(rebuild, 520);
  }

  return {
    reset: rebuild,
    pointerDown: blastAt,
    controlDown() {
      const center = cells.find((cell) => cell.active && cell.column === 2 && cell.row === 2);
      if (center) blastAt({ x: 0, y: 0.15 });
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      cells.forEach((cell, index) => {
        if (!cell.active) return;
        cell.mesh.rotation.x = Math.sin(elapsed * 0.7 + index) * 0.04;
        cell.mesh.rotation.y += delta * 0.12;
      });
    },
    idle(delta, elapsed) {
      cells.forEach((cell, index) => {
        cell.mesh.position.z = cell.mesh.userData.home.z + Math.sin(elapsed * 1.2 + index * 0.4) * 0.08;
      });
    }
  };
}

function setupSpring(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const cityMaterial = new THREE.MeshStandardMaterial({ color: 0x222b2d, metalness: 0.15, roughness: 0.8 });
  for (let i = 0; i < 12; i += 1) {
    const height = 1.2 + (i % 4) * 0.75;
    const building = new THREE.Mesh(new THREE.BoxGeometry(1.05, height, 1.05), cityMaterial);
    building.position.set(((i % 6) - 2.5) * 1.5, -3 + height / 2, -5.8 - Math.floor(i / 6) * 2.2);
    group.add(building);
  }
  const currentPlatform = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 12), material(config.secondary));
  const nextPlatform = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.28, 12), material(config.accent));
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 8, 22), material(config.secondary));
  spring.rotation.x = Math.PI / 2;
  const player = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), material(config.accent));
  group.add(currentPlatform, nextPlatform, spring, player);
  let currentX = 0;
  let currentY = -1.75;
  let nextY = -0.65;
  let phase = 0.4;
  let jumping = false;
  let jumpProgress = 0;
  let startX = 0;
  let startY = 0;
  let landingX = 0;
  let callbacks = null;

  function layout() {
    currentPlatform.position.set(currentX, currentY, -3.4);
    spring.position.set(currentX, currentY + 0.2, -3.4);
    if (!jumping) player.position.set(currentX, currentY + 0.55, -3.4);
    nextPlatform.position.y = nextY;
    nextPlatform.position.z = -3.4;
  }

  function jump() {
    if (!callbacks || jumping || !state.started || state.cooldown > 0) return;
    jumping = true;
    jumpProgress = 0;
    startX = player.position.x;
    startY = player.position.y;
    landingX = nextPlatform.position.x;
  }

  return {
    reset() {
      currentX = 0;
      currentY = -1.75;
      nextY = -0.65;
      phase = 0.4;
      jumping = false;
      jumpProgress = 0;
      layout();
    },
    controlDown: jump,
    pointerDown: jump,
    update(delta, elapsed, cb) {
      callbacks = cb;
      nextPlatform.position.x = Math.sin(elapsed * (1.25 + state.score * 0.03) + phase) * 2.45;
      nextPlatform.rotation.y += delta * 0.55;
      spring.scale.y = 1 + Math.sin(elapsed * 6) * 0.18;
      if (!jumping) return;
      jumpProgress = Math.min(1, jumpProgress + delta / 1.05);
      player.position.x = THREE.MathUtils.lerp(startX, landingX, jumpProgress);
      player.position.y = THREE.MathUtils.lerp(startY, nextY + 0.55, jumpProgress) + Math.sin(jumpProgress * Math.PI) * 2.05;
      player.rotation.x += delta * 5;
      if (jumpProgress >= 1) {
        jumping = false;
        const distance = Math.abs(player.position.x - nextPlatform.position.x);
        if (distance < 0.86) {
          currentX = nextPlatform.position.x;
          currentY = nextY;
          nextY = Math.min(2.7, nextY + 0.52);
          phase += 1.7;
          callbacks.hit(distance < 0.28 ? 2 : 1);
        } else {
          callbacks.miss();
        }
        layout();
      }
    },
    idle(delta, elapsed) {
      nextPlatform.position.x = Math.sin(elapsed * 1.25 + phase) * 2.45;
      player.position.y = currentY + 0.55 + Math.sin(elapsed * 2.8) * 0.08;
      player.rotation.y += delta;
    }
  };
}

function setupReflect(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const depth = -3.5;

  const source = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), material(config.accent));
  source.position.set(-4.1, -0.15, depth);
  const sourceHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.05, 8, 42),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.72 })
  );
  sourceHalo.position.copy(source.position);
  group.add(source, sourceHalo);

  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(0, -0.15, depth);
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.16, 0.82),
    new THREE.MeshPhysicalMaterial({ color: 0xdff8ff, metalness: 0.92, roughness: 0.08, clearcoat: 1 })
  );
  const mirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 8, 48), material(config.secondary));
  mirrorGroup.add(mirror, mirrorFrame);
  group.add(mirrorGroup);

  const targetGroup = new THREE.Group();
  targetGroup.position.set(3.65, 0, depth);
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 14), material(config.secondary));
  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.08, 10, 48),
    new THREE.MeshBasicMaterial({ color: config.secondary })
  );
  const lockRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.035, 8, 52),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.28 })
  );
  targetGroup.add(target, targetRing, lockRing);
  group.add(targetGroup);

  const incomingBeam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([source.position, mirrorGroup.position]),
    new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.85 })
  );
  const outgoingBeam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([mirrorGroup.position, new THREE.Vector3(4.8, 0, depth)]),
    new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.2 })
  );
  group.add(incomingBeam, outgoingBeam);

  const orbitGuide = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.018, 6, 72),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.22 })
  );
  orbitGuide.position.set(3.65, 0, depth - 0.15);
  orbitGuide.scale.x = 0.22;
  group.add(orbitGuide);

  let angle = 0;
  let targetPhase = 0;
  let lockTime = 0;
  let searchTime = 0;
  let callbacks = null;

  function setAim(point) {
    angle = THREE.MathUtils.clamp(point.y * 0.72, -0.68, 0.68);
  }

  function updateBeam() {
    const end = new THREE.Vector3(4.8, Math.tan(angle) * 4.8 - 0.15, depth);
    outgoingBeam.geometry.setFromPoints([mirrorGroup.position, end]);
    outgoingBeam.geometry.attributes.position.needsUpdate = true;
    mirrorGroup.rotation.z = angle * 0.52;
  }

  return {
    reset() {
      angle = 0;
      targetPhase = 0;
      lockTime = 0;
      searchTime = 0;
      updateBeam();
      outgoingBeam.material.opacity = 0.2;
    },
    pointerDown: setAim,
    pointerMove(point) {
      if (state.pointerDown) setAim(point);
    },
    pointerUp() {
      outgoingBeam.material.opacity = 0.2;
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      const speed = 0.38 + state.score * 0.035;
      const targetY = Math.sin(elapsed * speed + targetPhase) * 2.05;
      targetGroup.position.y = targetY;
      targetGroup.rotation.z += delta * (0.65 + state.score * 0.04);
      sourceHalo.rotation.z -= delta * 0.8;
      mirrorFrame.rotation.z += delta * 0.25;
      updateBeam();

      const beamYAtTarget = Math.tan(angle) * 3.65 - 0.15;
      const distance = Math.abs(beamYAtTarget - targetY);
      const tolerance = Math.max(0.32, 0.58 - state.score * 0.025);
      const lockNeeded = 0.62 + state.score * 0.025;
      const active = state.pointerDown;
      outgoingBeam.material.opacity = active ? 0.95 : 0.2;

      if (active && distance < tolerance) {
        lockTime += delta;
        searchTime = Math.max(0, searchTime - delta * 0.7);
        targetRing.material.color.setHex(config.accent);
        target.material.emissiveIntensity = 1.8;
        if (lockTime >= lockNeeded) {
          callbacks.hit(1);
          targetPhase += 1.75 + state.score * 0.12;
          lockTime = 0;
          searchTime = 0;
        }
      } else {
        lockTime = Math.max(0, lockTime - delta * 0.75);
        searchTime += delta * (active ? 1 : 0.38);
        targetRing.material.color.setHex(config.secondary);
        target.material.emissiveIntensity = 0.65;
      }

      const progress = Math.min(1, lockTime / lockNeeded);
      lockRing.material.opacity = 0.22 + progress * 0.78;
      lockRing.scale.setScalar(1 + (1 - progress) * 0.28);
      uiPower(progress);

      if (searchTime > Math.max(4.8, 7.8 - state.score * 0.25)) {
        callbacks.miss();
        targetPhase += 1.15;
        searchTime = 0;
        lockTime = 0;
      }
    },
    idle(delta, elapsed) {
      angle = Math.sin(elapsed * 0.45) * 0.22;
      targetGroup.position.y = Math.sin(elapsed * 0.38) * 2.05;
      targetGroup.rotation.z += delta * 0.55;
      sourceHalo.rotation.z -= delta * 0.8;
      updateBeam();
    }
  };

  function uiPower(progress) {
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
  }
}

function setupTiming(day, config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const target = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.18, config.shape === 'spring' ? 12 : 48),
    material(config.secondary)
  );
  target.position.set(0, -1.65, -3.1);
  group.add(target);

  let moverGeometry = new THREE.SphereGeometry(0.42, 24, 16);
  if (config.shape === 'box' || config.shape === 'blast') moverGeometry = new THREE.BoxGeometry(1.4, 0.55, 1.1);
  if (config.shape === 'spring') moverGeometry = new THREE.CylinderGeometry(0.42, 0.7, 0.7, 10);
  const mover = new THREE.Mesh(moverGeometry, material(config.accent));
  mover.position.set(0, 0.15, -3.1);
  group.add(mover);

  let cargo = null;
  if (config.shape === 'ball') {
    cargo = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.82, 0.9), material(config.accent));
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.86, 0.94), material(config.secondary));
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), material(config.secondary));
    arrow.position.y = -0.78;
    arrow.rotation.z = Math.PI;
    cargo.position.set(0, 2.05, -3.1);
    cargo.add(crate, strap, arrow);
    group.add(cargo);
  }

  const guide = new THREE.Mesh(
    new THREE.TorusGeometry(config.threshold, 0.035, 8, 64),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.55 })
  );
  guide.rotation.x = Math.PI / 2;
  guide.position.copy(target.position).add(new THREE.Vector3(0, 0.2, 0));
  group.add(guide);

  const blocks = [];
  if (config.shape === 'box') {
    for (let i = 0; i < 4; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.25), material(i % 2 ? config.accent : config.secondary));
      block.position.set(0, -2.1 + i * 0.5, -3.1);
      blocks.push(block);
      group.add(block);
    }
  }
  if (config.shape === 'blast') {
    for (let x = -2; x <= 2; x += 1) {
      for (let y = 0; y < 3; y += 1) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), material((x + y) % 2 ? config.accent : config.secondary));
        cube.position.set(x * 0.62, -1.55 + y * 0.62, -3.5);
        blocks.push(cube);
        group.add(cube);
      }
    }
  }

  let phase = 0;
  let bounce = 0;
  const attempt = (hit, miss) => {
    if (!state.started || state.cooldown > 0) return;
    const distance = Math.abs(mover.position.x - target.position.x);
    bounce = 0.55;
    if (distance < config.threshold) {
      hit(distance < config.threshold * 0.35 ? 2 : 1);
      phase += 0.9;
      if (config.shape === 'box') {
        target.position.y = Math.min(0.1, target.position.y + 0.18);
        mover.position.y = Math.min(1.8, mover.position.y + 0.2);
      }
      if (config.shape === 'blast') blocks.forEach((block, index) => {
        block.rotation.x += index * 0.17;
        block.scale.multiplyScalar(0.96);
      });
    } else miss();
  };

  let callbacks = null;
  return {
    reset() {
      phase = 0;
      bounce = 0;
      target.position.x = 0;
      mover.position.y = 0.15;
    },
    controlDown() {
      if (callbacks) attempt(callbacks.hit, callbacks.miss);
    },
    pointerDown() {
      if (callbacks) attempt(callbacks.hit, callbacks.miss);
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      mover.position.x = Math.sin(elapsed * config.speed + phase) * 3.15;
      mover.rotation.x += delta * 1.4;
      mover.rotation.y += delta * 2;
      if (bounce > 0) {
        bounce -= delta;
        mover.position.y += Math.sin((0.55 - bounce) * Math.PI / 0.55) * delta * 7;
      }
      guide.rotation.z += delta * 0.5;
      if (cargo) {
        cargo.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
        cargo.children[2].position.y = -0.78 + Math.sin(elapsed * 4) * 0.12;
      }
      if (day === 16) target.scale.y = 1 + Math.sin(elapsed * 5) * 0.18;
    },
    idle(delta, elapsed) {
      mover.position.x = Math.sin(elapsed * config.speed) * 3.15;
      mover.rotation.y += delta;
      if (cargo) cargo.rotation.y += delta * 0.2;
    }
  };
}

function setupSteer(day, config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const playerGeometry = config.shape === 'plane'
    ? new THREE.ConeGeometry(0.46, 1.25, 3)
    : config.shape === 'ship' ? new THREE.IcosahedronGeometry(0.5, 1) : new THREE.OctahedronGeometry(0.5, 0);
  const player = new THREE.Mesh(playerGeometry, material(config.accent));
  player.position.set(0, -0.7, 2.2);
  if (config.shape === 'plane') player.rotation.x = -Math.PI / 2;
  group.add(player);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: config.secondary }));
  halo.position.copy(player.position);
  group.add(halo);

  const gates = [];
  function makeGate(index) {
    const gate = new THREE.Group();
    const frameMaterial = material(index % 2 ? config.secondary : config.accent);
    if (config.shape === 'plane') {
      const cloudGate = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.22, 12, 52), frameMaterial);
      gate.add(cloudGate);
      for (let cloudIndex = 0; cloudIndex < 5; cloudIndex += 1) {
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.38 + (cloudIndex % 2) * 0.16, 14, 10), material(0xe8f4f7));
        cloud.position.set((cloudIndex - 2) * 0.68, cloudIndex % 2 ? 2.2 : -2.15, 0.15);
        gate.add(cloud);
      }
    } else if (config.shape === 'tunnel') {
      const tunnelRing = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.16, 10, 64), frameMaterial);
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.32, 0.32), frameMaterial);
      shutter.rotation.z = index % 2 ? 0.55 : -0.55;
      shutter.position.x = index % 2 ? 2.4 : -2.4;
      gate.add(tunnelRing, shutter);
    } else {
      const left = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.35), frameMaterial);
      const right = left.clone();
      left.position.x = -2.8;
      right.position.x = 2.8;
      gate.add(left, right);
    }
    gate.position.z = -8 - index * 7;
    gate.userData.checked = false;
    gate.userData.offset = Math.sin(index * 2.1) * 1.5;
    group.add(gate);
    gates.push(gate);
  }
  for (let i = 0; i < 4; i += 1) makeGate(i);

  function recycle(gate) {
    const back = Math.min(...gates.map((item) => item.position.z));
    gate.position.z = back - 7;
    gate.userData.offset = Math.sin((state.score + gate.position.z) * 1.31) * 1.55;
    gate.userData.checked = false;
  }

  return {
    reset() {
      player.position.set(0, -0.7, 2.2);
      state.targetX = 0;
      state.targetY = -0.7;
      gates.forEach((gate, index) => {
        gate.position.z = -8 - index * 7;
        gate.userData.checked = false;
      });
    },
    pointerMove(point) {
      state.targetX = point.x * 4.2;
      if (config.axes === 2) state.targetY = point.y * 2.25;
    },
    pointerDown(point) {
      state.targetX = point.x * 4.2;
      if (config.axes === 2) state.targetY = point.y * 2.25;
    },
    update(delta, elapsed, { hit, miss }) {
      player.position.x += (state.targetX - player.position.x) * Math.min(1, delta * 8);
      player.position.y += (state.targetY - player.position.y) * Math.min(1, delta * 8);
      player.rotation.z = -(state.targetX - player.position.x) * 0.12;
      halo.position.copy(player.position);
      halo.rotation.z += delta * 1.5;
      const speed = 4.1 + Math.min(3, state.score * 0.12);
      gates.forEach((gate) => {
        gate.position.z += delta * speed;
        gate.position.x = gate.userData.offset + Math.sin(elapsed * 0.75 + gate.position.z) * 0.45;
        if (!gate.userData.checked && gate.position.z > 1.7) {
          gate.userData.checked = true;
          const safeX = Math.abs(player.position.x - gate.position.x) < 1.55;
          const safeY = config.axes === 1 || Math.abs(player.position.y) < 1.7;
          if (safeX && safeY) hit(1);
          else miss();
        }
        if (gate.position.z > 5) recycle(gate);
      });
    },
    idle(delta, elapsed) {
      player.position.x = Math.sin(elapsed) * 0.35;
      player.rotation.y += delta;
      halo.position.copy(player.position);
      halo.rotation.z += delta;
    }
  };
}

function setupToggle(day, config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const colors = config.states === 3 ? [0xff5b3d, 0xd9ff43, 0x35d8d1] : [config.accent, config.secondary];
  let currentState = 0;
  const player = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 18), material(colors[0]));
  player.position.set(0, config.shape === 'gravity' ? -1.8 : -0.45, 2);
  group.add(player);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.055, 8, 48), new THREE.MeshBasicMaterial({ color: colors[0] }));
  orbit.position.copy(player.position);
  group.add(orbit);
  let gravityArrow = null;
  const stateIndicators = [];
  if (config.shape === 'magnet') {
    const poleA = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.5, 18), material(colors[0]));
    const poleB = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.5, 18), material(colors[1]));
    poleA.rotation.z = Math.PI / 2;
    poleB.rotation.z = Math.PI / 2;
    poleA.position.set(-3.4, -0.45, -2.6);
    poleB.position.set(3.4, -0.45, -2.6);
    group.add(poleA, poleB);
  }
  if (config.shape === 'gravity') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 12), material(0x313b3b));
    const upper = lower.clone();
    lower.position.set(0, -2.35, -3.6);
    upper.position.set(0, 2.35, -3.6);
    group.add(lower, upper);
    gravityArrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.68, 12), material(config.accent));
    gravityArrow.position.set(1.15, player.position.y, 1.9);
    gravityArrow.rotation.z = Math.PI;
    group.add(gravityArrow);
  }
  if (config.shape === 'color') {
    colors.forEach((color, index) => {
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), material(color));
      indicator.position.set((index - 1) * 0.55, 1.75, 1.7);
      indicator.scale.setScalar(index === 0 ? 1.5 : 0.8);
      group.add(indicator);
      stateIndicators.push(indicator);
    });
  }

  const gates = [];
  for (let i = 0; i < 4; i += 1) {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 12, 48), material(colors[i % colors.length]));
    gate.position.set(0, config.shape === 'gravity' ? (i % 2 ? 1.6 : -1.6) : -0.45, -8 - i * 7);
    gate.userData.required = i % colors.length;
    gate.userData.checked = false;
    group.add(gate);
    gates.push(gate);
  }

  function toggle() {
    if (!state.started || state.cooldown > 0) return;
    currentState = (currentState + 1) % config.states;
    player.material.color.setHex(colors[currentState]);
    player.material.emissive.setHex(colors[currentState]);
    orbit.material.color.setHex(colors[currentState]);
    stateIndicators.forEach((indicator, index) => indicator.scale.setScalar(index === currentState ? 1.5 : 0.8));
    if (config.shape === 'gravity') state.targetY = currentState ? 1.65 : -1.65;
    if (gravityArrow) gravityArrow.rotation.z = currentState ? 0 : Math.PI;
  }

  return {
    reset() {
      currentState = 0;
      state.targetY = -1.65;
      player.position.y = config.shape === 'gravity' ? -1.65 : -0.45;
      if (gravityArrow) gravityArrow.rotation.z = Math.PI;
      stateIndicators.forEach((indicator, index) => indicator.scale.setScalar(index === 0 ? 1.5 : 0.8));
      gates.forEach((gate, index) => {
        gate.position.z = -8 - index * 7;
        gate.userData.required = index % colors.length;
        gate.userData.checked = false;
        gate.material.color.setHex(colors[gate.userData.required]);
      });
    },
    controlDown: toggle,
    pointerDown: toggle,
    update(delta, elapsed, { hit, miss }) {
      if (config.shape === 'gravity') player.position.y += (state.targetY - player.position.y) * delta * 7;
      if (gravityArrow) gravityArrow.position.y = player.position.y;
      orbit.position.copy(player.position);
      orbit.rotation.z += delta * (currentState ? -2 : 2);
      const speed = 3.8 + Math.min(2.5, state.score * 0.1);
      gates.forEach((gate) => {
        gate.position.z += delta * speed;
        gate.rotation.z += delta * 0.45;
        if (!gate.userData.checked && gate.position.z > 1.6) {
          gate.userData.checked = true;
          if (currentState === gate.userData.required) hit(1);
          else miss();
        }
        if (gate.position.z > 5) {
          gate.position.z = Math.min(...gates.map((item) => item.position.z)) - 7;
          gate.userData.required = (gate.userData.required + 1 + state.score) % colors.length;
          gate.material.color.setHex(colors[gate.userData.required]);
          gate.material.emissive.setHex(colors[gate.userData.required]);
          gate.position.y = config.shape === 'gravity' ? (gate.userData.required ? 1.65 : -1.65) : -0.45;
          gate.userData.checked = false;
        }
      });
    },
    idle(delta, elapsed) {
      player.position.y += Math.sin(elapsed * 2) * delta * 0.08;
      if (gravityArrow) gravityArrow.position.y = player.position.y;
      orbit.position.copy(player.position);
      orbit.rotation.z += delta;
    }
  };
}

function setupAim(day, config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 18), material(config.accent));
  ball.position.set(0, -1.75, 2.5);
  group.add(ball);
  const target = new THREE.Mesh(
    config.shape === 'golf' ? new THREE.TorusGeometry(0.72, 0.08, 8, 48) : new THREE.CylinderGeometry(1.05, 1.05, 0.18, 32),
    material(config.secondary)
  );
  target.position.set(0, -1.75, -6.2);
  if (config.shape === 'golf') target.rotation.x = Math.PI / 2;
  group.add(target);
  const targetDecor = new THREE.Group();
  targetDecor.position.set(0, 0, -6.2);
  group.add(targetDecor);
  const pins = [];
  if (config.shape === 'bowling') {
    const pinLayout = [[0, 0], [-0.32, -0.38], [0.32, -0.38], [-0.62, -0.78], [0, -0.78], [0.62, -0.78]];
    pinLayout.forEach(([x, z], index) => {
      const pin = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.42, 5, 10), material(index % 2 ? 0xf4f0df : config.secondary));
      pin.position.set(x, -1.35, z);
      pin.userData.home = pin.position.clone();
      targetDecor.add(pin);
      pins.push(pin);
    });
  } else {
    const moon = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshStandardMaterial({ color: 0x5e6466, roughness: 1 }));
    moon.rotation.x = -Math.PI / 2;
    moon.position.set(0, -1.98, -2.5);
    group.add(moon);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 8), material(0xf4f0df));
    pole.position.set(0, -0.72, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.42), material(config.secondary));
    flag.position.set(0.36, 0.18, 0);
    pole.add(flag);
    targetDecor.add(pole);
  }
  const aimLineGeometry = new THREE.BufferGeometry().setFromPoints([ball.position, ball.position.clone().add(new THREE.Vector3(0, 0, -3))]);
  const aimLine = new THREE.Line(aimLineGeometry, new THREE.LineBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.7 }));
  aimLine.visible = false;
  group.add(aimLine);
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let velocity = new THREE.Vector3();
  let rolling = false;
  let crossed = false;
  let callbacks = null;

  function resetBall() {
    ball.position.set(0, -1.75, 2.5);
    velocity.set(0, 0, 0);
    rolling = false;
    crossed = false;
    aimLine.visible = false;
    pins.forEach((pin) => {
      pin.position.copy(pin.userData.home);
      pin.rotation.set(0, 0, 0);
    });
  }

  return {
    reset() {
      resetBall();
      target.position.x = 0;
    },
    pointerDown(point) {
      if (rolling) return;
      dragging = true;
      dragStart = point;
      aimLine.visible = true;
    },
    pointerMove(point) {
      if (!dragging || rolling) return;
      const dx = point.x - dragStart.x;
      const power = Math.min(1, Math.hypot(dx, point.y - dragStart.y));
      const end = ball.position.clone().add(new THREE.Vector3(-dx * 5, 0.03, -2 - power * 3));
      aimLine.geometry.setFromPoints([ball.position, end]);
      aimLine.geometry.attributes.position.needsUpdate = true;
    },
    pointerUp(point) {
      if (!dragging || rolling) return;
      dragging = false;
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      const power = Math.max(0.25, Math.min(1, Math.hypot(dx, dy)));
      velocity.set(-dx * 4.2, config.shape === 'golf' ? 2.2 * power : 0, -5.5 - power * 5);
      rolling = true;
      crossed = false;
      aimLine.visible = false;
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      target.position.x = Math.sin(state.score * 1.73) * 1.7;
      targetDecor.position.x = target.position.x;
      target.rotation.z += delta * 0.3;
      if (!rolling) return;
      if (config.shape === 'golf') {
        velocity.y -= 2.4 * delta;
        ball.position.y += velocity.y * delta;
        if (ball.position.y < -1.75) {
          ball.position.y = -1.75;
          velocity.y *= -0.36;
        }
      }
      ball.position.x += velocity.x * delta;
      ball.position.z += velocity.z * delta;
      velocity.multiplyScalar(1 - delta * 0.34);
      ball.rotation.x -= velocity.z * delta;
      if (!crossed && ball.position.z < target.position.z + 0.2) {
        crossed = true;
        if (Math.abs(ball.position.x - target.position.x) < 1.0) {
          if (config.shape === 'bowling') {
            pins.forEach((pin, index) => {
              pin.rotation.z = (index % 2 ? -1 : 1) * (0.7 + index * 0.12);
              pin.position.x += (index - 2.5) * 0.08;
            });
          }
          callbacks.hit(config.shape === 'bowling' ? 3 : 1);
        } else callbacks.miss();
        window.setTimeout(resetBall, 520);
      }
      if (Math.abs(ball.position.x) > 7) {
        callbacks.miss();
        resetBall();
      }
    },
    idle(delta, elapsed) {
      ball.rotation.y += delta;
      target.position.x = Math.sin(elapsed * 0.5) * 0.6;
    }
  };
}

function setupHold(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.8), material(config.secondary));
  parcel.position.set(0, -0.5, 2.2);
  group.add(parcel);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.84), material(config.accent));
  parcel.add(ribbon);
  const windStreaks = [];
  for (let i = 0; i < 18; i += 1) {
    const streak = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 1.1 + (i % 4) * 0.35),
      new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.35 })
    );
    streak.position.set(((i % 6) - 2.5) * 1.45, -2.4 + Math.floor(i / 6) * 2.1, -4 - (i % 3) * 2.3);
    group.add(streak);
    windStreaks.push(streak);
  }
  const rings = [];
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 12, 52), material(i % 2 ? config.accent : config.secondary));
    ring.position.set(0, Math.sin(i * 1.7) * 1.7, -7 - i * 7);
    ring.userData.checked = false;
    group.add(ring);
    rings.push(ring);
  }
  let verticalVelocity = 0;
  return {
    reset() {
      parcel.position.y = -0.5;
      verticalVelocity = 0;
      rings.forEach((ring, index) => {
        ring.position.z = -7 - index * 7;
        ring.userData.checked = false;
      });
    },
    update(delta, elapsed, { hit, miss }) {
      verticalVelocity += (state.holding ? 4.2 : -3.1) * delta;
      verticalVelocity *= 1 - delta * 1.5;
      parcel.position.y = THREE.MathUtils.clamp(parcel.position.y + verticalVelocity * delta, -2.7, 2.8);
      parcel.rotation.z = -verticalVelocity * 0.08;
      const power = (parcel.position.y + 2.7) / 5.5;
      state.holding && (parcel.rotation.y += delta * 1.8);
      rings.forEach((ring) => {
        ring.position.z += delta * (4 + state.score * 0.08);
        ring.rotation.z += delta * 0.4;
        if (!ring.userData.checked && ring.position.z > 1.7) {
          ring.userData.checked = true;
          if (Math.abs(parcel.position.y - ring.position.y) < 1.05) hit(1);
          else miss();
        }
        if (ring.position.z > 5) {
          ring.position.z = Math.min(...rings.map((item) => item.position.z)) - 7;
          ring.position.y = Math.sin((state.score + ring.position.z) * 1.4) * 1.9;
          ring.userData.checked = false;
        }
      });
      windStreaks.forEach((streak, index) => {
        streak.position.z += delta * (state.holding ? 7 : 3.5);
        if (streak.position.z > 4) streak.position.z = -10 - (index % 4);
      });
      document.querySelector('#power-fill').style.width = `${Math.round(power * 100)}%`;
    },
    idle(delta, elapsed) {
      parcel.position.y = -0.5 + Math.sin(elapsed * 1.5) * 0.22;
      parcel.rotation.y += delta;
      windStreaks.forEach((streak) => { streak.position.z += delta * 1.4; });
    }
  };
}

function setupPuzzle(config, world, state, camera) {
  const group = new THREE.Group();
  world.add(group);
  const mirrors = [];
  const hitAreas = [];
  const desiredPatterns = [[1, 2, 3], [3, 1, 2], [2, 3, 1]];
  const desired = [...desiredPatterns[0]];
  const orientations = [0, 0, 0];
  const locked = [false, false, false];

  const source = new THREE.Group();
  const sourceCore = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), material(config.secondary));
  const sourceRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.045, 8, 40),
    new THREE.MeshBasicMaterial({ color: config.secondary })
  );
  source.position.set(-4.5, 0.65, -3.7);
  source.add(sourceCore, sourceRing);
  group.add(source);

  for (let i = 0; i < 3; i += 1) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x182323, metalness: 0.55, roughness: 0.5 })
    );
    base.rotation.x = Math.PI / 2;
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.12, 0.22),
      new THREE.MeshPhysicalMaterial({
        color: 0xe9fbff,
        emissive: 0xbfeeff,
        emissiveIntensity: 0.35,
        metalness: 0.9,
        roughness: 0.08,
        clearcoat: 1
      })
    );
    mirror.position.z = 0.12;
    const targetGuide = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.055, 0.12),
      new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.48, depthTest: false })
    );
    targetGuide.position.z = 0.2;
    targetGuide.renderOrder = 4;
    const clickHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.055, 8, 42),
      new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.18 })
    );
    clickHalo.position.z = 0.08;
    const hitArea = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitArea.position.z = 0.3;
    hitArea.userData.index = i;
    const holder = new THREE.Group();
    holder.position.set((i - 1) * 2.75, i === 1 ? 0.25 : -0.72, -3.8);
    holder.add(base, mirror, targetGuide, clickHalo, hitArea);
    group.add(holder);
    mirrors.push(holder);
    hitAreas.push(hitArea);
  }

  const receiver = new THREE.Group();
  const receiverCore = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), material(0x39423e));
  const receiverRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.07, 8, 44),
    new THREE.MeshBasicMaterial({ color: 0x39423e })
  );
  receiver.position.set(4.5, 0.65, -3.7);
  receiver.add(receiverCore, receiverRing);
  group.add(receiver);

  const activeArrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), material(config.secondary));
  activeArrow.rotation.z = Math.PI;
  group.add(activeArrow);

  const beamGeometry = new THREE.BufferGeometry();
  const beam = new THREE.Line(
    beamGeometry,
    new THREE.LineBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.92 })
  );
  group.add(beam);

  const raycaster = new THREE.Raycaster();
  let moves = 0;
  let activeIndex = 0;
  let round = 0;
  let roundPause = 0;
  let failedRound = false;
  let callbacks = null;

  function setPower() {
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = `${Math.round((activeIndex / 3) * 100)}%`;
  }

  function resetRound(nextPattern = false) {
    if (nextPattern) round += 1;
    desired.splice(0, desired.length, ...desiredPatterns[round % desiredPatterns.length]);
    orientations.fill(0);
    locked.fill(false);
    moves = 0;
    activeIndex = 0;
    roundPause = 0;
    failedRound = false;
    setPower();
    refresh();
  }

  function refresh() {
    mirrors.forEach((holder, i) => {
      const actualMirror = holder.children[1];
      const targetGuide = holder.children[2];
      const clickHalo = holder.children[3];
      actualMirror.rotation.z = orientations[i] * Math.PI / 4;
      targetGuide.rotation.z = desired[i] * Math.PI / 4;
      targetGuide.material.opacity = locked[i] ? 0 : i === activeIndex ? 0.72 : 0.2;
      actualMirror.material.emissive.setHex(locked[i] ? config.secondary : 0xbfeeff);
      actualMirror.material.emissiveIntensity = locked[i] ? 1.9 : i === activeIndex ? 0.95 : 0.18;
      clickHalo.material.opacity = locked[i] ? 0.3 : i === activeIndex ? 0.92 : 0.12;
      clickHalo.material.color.setHex(locked[i] ? config.accent : config.secondary);
      holder.scale.setScalar(i === activeIndex && roundPause <= 0 ? 1.08 : 1);
    });

    const points = [source.position.clone()];
    for (let i = 0; i < mirrors.length; i += 1) {
      points.push(mirrors[i].position.clone());
      if (!locked[i]) {
        const angle = orientations[i] * Math.PI / 4;
        points.push(mirrors[i].position.clone().add(new THREE.Vector3(Math.cos(angle) * 0.85, Math.sin(angle) * 0.85, 0)));
        break;
      }
    }
    if (locked.every(Boolean)) points.push(receiver.position.clone());
    beam.geometry.setFromPoints(points);
    receiverCore.material.color.setHex(locked.every(Boolean) ? config.secondary : 0x39423e);
    receiverCore.material.emissive.setHex(locked.every(Boolean) ? config.secondary : 0x111111);
    receiverRing.material.color.setHex(locked.every(Boolean) ? config.secondary : 0x39423e);

    const activeMirror = mirrors[Math.min(activeIndex, 2)];
    activeArrow.visible = activeIndex < 3 && roundPause <= 0;
    if (activeArrow.visible) activeArrow.position.copy(activeMirror.position).add(new THREE.Vector3(0, 1.35, 0.15));
    setPower();
  }

  function rotateActive() {
    if (!callbacks || roundPause > 0 || activeIndex >= 3) return;
    orientations[activeIndex] = (orientations[activeIndex] + 1) % 4;
    moves += 1;
    if (orientations[activeIndex] === desired[activeIndex]) {
      locked[activeIndex] = true;
      activeIndex += 1;
      callbacks.hit(1);
      if (activeIndex >= 3) roundPause = 0.85;
    } else if (moves >= 12) {
      failedRound = true;
      roundPause = 0.7;
      callbacks.miss();
    }
    refresh();
  }

  return {
    reset() {
      round = 0;
      resetRound();
    },
    pointerDown(point) {
      raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
      const hit = raycaster.intersectObjects(hitAreas, false)[0];
      if (hit?.object.userData.index === activeIndex) rotateActive();
    },
    controlDown: rotateActive,
    update(delta, elapsed, cb) {
      callbacks = cb;
      sourceRing.rotation.z -= delta * 0.8;
      receiverRing.rotation.z += delta * 0.55;
      if (activeIndex < 3) activeArrow.position.y = mirrors[activeIndex].position.y + 1.35 + Math.sin(elapsed * 5) * 0.08;
      mirrors.forEach((holder, i) => {
        const halo = holder.children[3];
        halo.rotation.z += delta * (i === activeIndex ? 0.8 : 0.2);
        if (i === activeIndex) halo.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.06);
      });
      if (roundPause > 0) {
        roundPause -= delta;
        if (roundPause <= 0 && !state.completed) resetRound(!failedRound);
      }
    },
    idle(delta, elapsed) {
      sourceRing.rotation.z -= delta * 0.8;
      receiverRing.rotation.z += delta * 0.45;
      mirrors.forEach((holder) => {
        holder.children[3].rotation.z += delta * 0.22;
      });
    }
  };
}

function setupShadow(config, world, scene, state) {
  const group = new THREE.Group();
  world.add(group);
  const object = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.22, 80, 12), material(config.secondary));
  object.position.set(-2.05, 0.1, -3.6);
  group.add(object);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.5), new THREE.MeshStandardMaterial({ color: 0xd7d2bd, roughness: 0.9 }));
  screen.position.set(1.15, 0, -6.2);
  group.add(screen);
  const shadow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.28, 12, 48), new THREE.MeshBasicMaterial({ color: 0x242229, transparent: true, opacity: 0.76 }));
  shadow.position.set(1.15, 0, -6.1);
  group.add(shadow);
  const target = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.085, 8, 48), new THREE.MeshBasicMaterial({ color: config.accent }));
  target.position.set(1.15, 0, -6.02);
  target.material.depthTest = false;
  target.renderOrder = 5;
  group.add(target);
  const lightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), material(config.accent));
  group.add(lightMarker);
  const lightBeam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.42 })
  );
  group.add(lightBeam);
  let angle = -1.2;
  let targetAngle = 0.65;
  let holdTime = 0;
  let failTime = 0;

  function setAngle(point) {
    angle = point.x * 1.5;
  }
  return {
    reset() {
      angle = -1.2;
      targetAngle = 0.65;
      holdTime = 0;
      failTime = 0;
    },
    pointerDown: setAngle,
    pointerMove(point) {
      if (state.pointerDown) setAngle(point);
    },
    update(delta, elapsed, { hit, miss }) {
      lightMarker.position.set(Math.sin(angle) * 3.4, 1.85, -2.1 + Math.cos(angle) * 0.8);
      lightBeam.geometry.setFromPoints([lightMarker.position, object.position]);
      object.rotation.y = angle * 0.65;
      shadow.scale.x = 0.72 + Math.abs(Math.sin(angle)) * 0.7;
      shadow.rotation.z = angle * 0.22;
      target.scale.x = 0.72 + Math.abs(Math.sin(targetAngle)) * 0.7;
      target.rotation.z = targetAngle * 0.22;
      const distance = Math.abs(angle - targetAngle);
      if (distance < 0.16) {
        holdTime += delta;
        target.material.opacity = 0.6 + Math.sin(elapsed * 8) * 0.35;
        if (holdTime > 1) {
          hit(2);
          targetAngle = -targetAngle * 0.82 + Math.sin(state.score) * 0.32;
          holdTime = 0;
          failTime = 0;
        }
      } else {
        holdTime = 0;
        failTime += delta;
        if (failTime > 9) {
          miss();
          failTime = 0;
        }
      }
      document.querySelector('#power-fill').style.width = `${Math.round(Math.min(1, holdTime) * 100)}%`;
    },
    idle(delta, elapsed) {
      angle = Math.sin(elapsed * 0.55) * 1.1;
      lightMarker.position.set(Math.sin(angle) * 3.4, 1.85, -2.1 + Math.cos(angle) * 0.8);
      lightBeam.geometry.setFromPoints([lightMarker.position, object.position]);
      object.rotation.y += delta * 0.4;
      shadow.scale.x = 0.72 + Math.abs(Math.sin(angle)) * 0.7;
      target.scale.x = 0.72 + Math.abs(Math.sin(targetAngle)) * 0.7;
      target.rotation.z = targetAngle * 0.22;
    }
  };
}
