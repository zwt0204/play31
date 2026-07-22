import * as THREE from 'three';

const CONFIGS = {
  2: { type: 'timing', goal: 8, accent: 0xff6a45, secondary: 0x54e0d6, shape: 'ball', speed: 1.45, threshold: 1.25 },
  3: { type: 'puzzle', goal: 9, accent: 0xff5b3d, secondary: 0xd9ff43 },
  4: { type: 'stack', goal: 10, accent: 0xd9ff43, secondary: 0xff5b3d },
  5: { type: 'steer', goal: 10, accent: 0x62e1ff, secondary: 0xffc34d, shape: 'ship', axes: 1 },
  6: { type: 'magnet', goal: 10, accent: 0xff513b, secondary: 0x35d8d1 },
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
  17: { type: 'reflect', goal: 8, accent: 0xffd85a, secondary: 0x63e0d8 },
  18: { type: 'gear', goal: 14, accent: 0xffbd3e, secondary: 0x7cff9f },
  19: { type: 'bubble', goal: 12, accent: 0x73e7ff, secondary: 0xff87c8 },
  20: { type: 'canyon', goal: 12, accent: 0xff9a3c, secondary: 0x4de8c2 },
  21: { type: 'zero-g-billiards', goal: 8, accent: 0x62e4ff, secondary: 0xff6f61 },
  22: { type: 'morph', goal: 10, accent: 0x8a7dff, secondary: 0xffc857 },
  23: { type: 'sound-maze', goal: 5, accent: 0x63e0d8, secondary: 0xff6f61 },
  24: { type: 'time-slice', goal: 10, accent: 0x66a3ff, secondary: 0xffc857 },
  25: { type: 'orbit-cleaner', goal: 10, accent: 0x62e4c7, secondary: 0xff6b5d },
  26: { type: 'neon-fishing', goal: 8, accent: 0xff5ca8, secondary: 0x52e3ff },
  27: { type: 'rocket-landing', goal: 6, accent: 0xf4f1df, secondary: 0x7cff9f },
  28: { type: 'clone-race', goal: 12, accent: 0x61e1ff, secondary: 0xff69b4 },
  29: { type: 'cloud-garden', goal: 8, accent: 0x7ee081, secondary: 0xff7aa8 },
  30: { type: 'black-hole', goal: 10, accent: 0xb58cff, secondary: 0xffd166 },
  31: { type: 'fireworks', goal: 12, accent: 0xffd166, secondary: 0x62e4ff }
};

export async function createDailyGame(day, ui) {
  const config = CONFIGS[day];
  const cannon = day === 21 ? await import('cannon-es') : null;
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
  const pressedKeys = new Set();

  const game = setupGame(day, config, world, scene, state, camera, cannon);

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
      game.keyboard?.(delta, pressedKeys);
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
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(event.code)) {
      pressedKeys.add(event.code);
      if (state.started) event.preventDefault();
    }
    if (event.code === 'Space' && !event.repeat) controlDown(event);
  });
  window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.code);
    if (event.code === 'Space') controlUp(event);
  });
  window.addEventListener('resize', resize);
  window.addEventListener('play31:pause', (event) => {
    paused = Boolean(event.detail);
    if (paused) {
      state.holding = false;
      pressedKeys.clear();
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

function setupGame(day, config, world, scene, state, camera, cannon) {
  if (config.type === 'timing') return setupTiming(config, world, state);
  if (config.type === 'stack') return setupStack(config, world, state);
  if (config.type === 'blast') return setupBlast(config, world, state, camera);
  if (config.type === 'spring') return setupSpring(config, world, state);
  if (config.type === 'reflect') return setupReflect(config, world, state);
  if (config.type === 'gear') return setupGear(config, world, state);
  if (config.type === 'bubble') return setupBubble(config, world, state);
  if (config.type === 'canyon') return setupCanyon(config, world, state);
  if (config.type === 'zero-g-billiards') return setupZeroGravityBilliards(config, world, state, camera, cannon);
  if (config.type === 'morph') return setupMorph(config, world, state);
  if (config.type === 'sound-maze') return setupSoundMaze(config, world, state, camera);
  if (config.type === 'time-slice') return setupTimeSlice(config, world, state);
  if (config.type === 'orbit-cleaner') return setupOrbitCleaner(config, world, state);
  if (config.type === 'neon-fishing') return setupNeonFishing(config, world, state);
  if (config.type === 'rocket-landing') return setupRocketLanding(config, world, state);
  if (config.type === 'clone-race') return setupCloneRace(config, world, state);
  if (config.type === 'cloud-garden') return setupCloudGarden(config, world, state, camera);
  if (config.type === 'black-hole') return setupBlackHole(config, world, state);
  if (config.type === 'fireworks') return setupFireworks(config, world, state);
  if (config.type === 'steer') return setupSteer(day, config, world, state);
  if (config.type === 'magnet') return setupMagnet(config, world, state);
  if (config.type === 'toggle') return setupToggle(day, config, world, state);
  if (config.type === 'aim') return setupAim(day, config, world, state, camera);
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

function setupBlast(config, world, state, camera) {
  const group = new THREE.Group();
  world.add(group);
  const columns = 5;
  const rows = 4;
  const colors = [config.accent, config.secondary, 0x35d8d1];
  const cells = [];
  let seed = 0;
  let callbacks = null;
  const raycaster = new THREE.Raycaster();

  function rebuild() {
    cells.forEach((cell) => group.remove(cell.mesh));
    cells.length = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const colorIndex = (Math.floor(column / 2) + Math.floor(row / 2) + seed) % colors.length;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.82), material(colors[colorIndex]));
        mesh.position.set((column - 2) * 1.02, (row - 1.5) * 0.86 - 0.25, -3.4);
        mesh.userData.home = mesh.position.clone();
        const cell = { mesh, column, row, colorIndex, active: true };
        mesh.userData.cell = cell;
        group.add(mesh);
        cells.push(cell);
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

  function blastCell(cell) {
    if (!callbacks || !state.started || state.cooldown > 0) return;
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

  function blastAt(point) {
    if (!callbacks || !state.started || state.cooldown > 0) return;
    raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
    const meshes = cells.filter((cell) => cell.active).map((cell) => cell.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit) blastCell(hit.object.userData.cell);
  }

  return {
    reset: rebuild,
    pointerDown: blastAt,
    controlDown() {
      const center = cells.find((cell) => cell.active && cell.column === 2 && cell.row === 2);
      if (center) blastCell(center);
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

function setupBubble(config, world, state) {
  const group = new THREE.Group();
  group.position.set(0, -0.1, 0);
  world.add(group);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(3.8, 32, 20),
    new THREE.MeshStandardMaterial({ color: 0x182f37, emissive: 0x062027, emissiveIntensity: 0.9, roughness: 0.86, metalness: 0.12 })
  );
  planet.position.set(0, -4.25, -14);
  group.add(planet);
  const planetRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.3, 0.035, 8, 72),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.38, toneMapped: false })
  );
  planetRing.position.copy(planet.position);
  planetRing.rotation.x = 0.72;
  group.add(planetRing);

  const bubbleMaterial = new THREE.MeshPhysicalMaterial({
    color: config.accent,
    emissive: 0x104a5b,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.72,
    roughness: 0.06,
    metalness: 0.08,
    transmission: 0.42,
    thickness: 0.52,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), bubbleMaterial);
  bubble.position.set(0, -0.35, 2.05);
  group.add(bubble);
  const bubbleShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 24, 16),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.24, wireframe: true, toneMapped: false })
  );
  bubbleShell.position.copy(bubble.position);
  group.add(bubbleShell);
  const bubbleCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.8, toneMapped: false })
  );
  bubbleCore.position.set(-0.28, 0.02, 2.8);
  group.add(bubbleCore);
  const bubbleHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.035, 8, 48),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.58, toneMapped: false })
  );
  bubbleHalo.position.copy(bubble.position);
  group.add(bubbleHalo);

  const particles = [];
  for (let index = 0; index < 24; index += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + (index % 3) * 0.012, 8, 6),
      new THREE.MeshBasicMaterial({ color: index % 2 ? config.secondary : config.accent, transparent: true, opacity: 0.5 })
    );
    particle.position.set(((index % 6) - 2.5) * 1.35, (Math.floor(index / 6) - 1.5) * 1.45, -2 - (index % 4) * 4);
    group.add(particle);
    particles.push(particle);
  }

  const targetSizes = [0.78, 1.38, 0.94, 1.52, 0.68, 1.18, 0.86, 1.44, 0.74, 1.3, 0.9, 1.55];
  const gates = [];
  function makeGate(index) {
    const gate = new THREE.Group();
    gate.position.set(0, -0.35, -8 - index * 7);
    const targetSize = targetSizes[index % targetSizes.length];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.12, 12, 56),
      new THREE.MeshStandardMaterial({ color: config.secondary, emissive: config.secondary, emissiveIntensity: 1.25, metalness: 0.45, roughness: 0.2 })
    );
    ring.scale.setScalar(targetSize);
    gate.add(ring);
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf4ffff, transparent: true, opacity: 0.7, toneMapped: false })
    );
    innerRing.scale.setScalar(targetSize);
    innerRing.position.z = 0.05;
    gate.add(innerRing);
    const targetGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 8),
      new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.95, toneMapped: false })
    );
    targetGlow.position.set(-targetSize * 0.62, targetSize * 0.62, 0.12);
    gate.add(targetGlow);
    for (let spikeIndex = 0; spikeIndex < 10; spikeIndex += 1) {
      const angle = (spikeIndex / 10) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.54, 6),
        new THREE.MeshStandardMaterial({ color: 0xff527f, emissive: 0x4c102b, emissiveIntensity: 1.15, metalness: 0.28, roughness: 0.28 })
      );
      spike.position.set(Math.cos(angle) * targetSize * 1.55, Math.sin(angle) * targetSize * 1.55, 0.02);
      spike.rotation.z = angle - Math.PI / 2;
      gate.add(spike);
    }
    const ghost = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.07, wireframe: true, toneMapped: false })
    );
    ghost.scale.setScalar(targetSize);
    ghost.position.z = -0.04;
    gate.add(ghost);
    gate.userData.targetSize = targetSize;
    gate.userData.checked = false;
    gate.userData.hit = false;
    gate.userData.ring = ring;
    gate.userData.ghost = ghost;
    gate.userData.homeIndex = index;
    group.add(gate);
    gates.push(gate);
  }
  for (let index = 0; index < 4; index += 1) makeGate(index);

  let callbacks = null;
  let bubbleSize = 0.98;
  let wobble = 0;

  function resetGate(gate, index, z) {
    const targetSize = targetSizes[(index + state.score) % targetSizes.length];
    gate.position.set(Math.sin(index * 1.7 + state.score) * 0.55, -0.35 + Math.cos(index * 1.3) * 0.22, z);
    gate.userData.targetSize = targetSize;
    gate.userData.checked = false;
    gate.userData.hit = false;
    gate.userData.ring.material.color.setHex(config.secondary);
    gate.userData.ring.material.emissive.setHex(config.secondary);
    gate.userData.ring.material.emissiveIntensity = 1.25;
    gate.userData.ring.scale.setScalar(targetSize);
    gate.userData.ghost.scale.setScalar(targetSize);
  }

  function resetBubble() {
    bubbleSize = 0.98;
    wobble = 0;
    bubble.position.set(0, -0.35, 2.05);
    bubble.scale.setScalar(bubbleSize);
    bubbleShell.scale.setScalar(bubbleSize);
    bubbleHalo.scale.setScalar(bubbleSize);
    gates.forEach((gate, index) => resetGate(gate, index, -8 - index * 7));
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = '46%';
  }

  function resolveGate(gate) {
    if (gate.userData.checked || !callbacks) return;
    gate.userData.checked = true;
    if (state.cooldown > 0) return;
    const delta = Math.abs(bubbleSize - gate.userData.targetSize);
    if (delta <= 0.25) {
      gate.userData.hit = true;
      gate.userData.ring.material.color.setHex(config.accent);
      gate.userData.ring.material.emissive.setHex(config.accent);
      gate.userData.ring.material.emissiveIntensity = 2.6;
      callbacks.hit(delta <= 0.09 ? 2 : 1);
    } else {
      gate.userData.ring.material.color.setHex(0xff527f);
      gate.userData.ring.material.emissive.setHex(0xff173e);
      gate.userData.ring.material.emissiveIntensity = 1.8;
      callbacks.miss();
    }
  }

  function setHolding(holding) {
    if (!state.started) return;
    state.holding = holding;
  }

  return {
    reset: resetBubble,
    controlDown() { setHolding(true); },
    controlUp() { setHolding(false); },
    pointerDown() { setHolding(true); },
    pointerUp() { setHolding(false); },
    update(delta, elapsed, cb) {
      callbacks = cb;
      const targetSize = state.holding ? 1.58 : 0.58;
      bubbleSize += (targetSize - bubbleSize) * Math.min(1, delta * 4.8);
      wobble += delta * (state.holding ? 3.2 : 2.2);
      bubble.position.y = -0.35 + Math.sin(wobble) * 0.05;
      bubble.scale.setScalar(bubbleSize);
      bubbleShell.position.copy(bubble.position);
      bubbleShell.scale.setScalar(bubbleSize * (1.02 + Math.sin(wobble * 1.6) * 0.025));
      bubbleHalo.position.copy(bubble.position);
      bubbleHalo.scale.setScalar(bubbleSize * 1.02);
      bubbleCore.position.set(-bubbleSize * 0.28, bubble.position.y + bubbleSize * 0.22, 2.05 + bubbleSize * 0.72);
      bubble.rotation.y += delta * (state.holding ? 1.2 : 0.55);
      bubbleHalo.rotation.z += delta * 0.9;

      const fill = document.querySelector('#power-fill');
      if (fill) fill.style.width = `${Math.round(((bubbleSize - 0.58) / 1) * 100)}%`;
      const speed = 3.15 + Math.min(1.5, state.score * 0.12);
      gates.forEach((gate, index) => {
        gate.position.z += delta * speed;
        gate.rotation.z += delta * (index % 2 ? -0.35 : 0.26);
        gate.userData.ghost.material.opacity = 0.08 + Math.sin(elapsed * 4 + index) * 0.025;
        if (!gate.userData.checked && gate.position.z > 1.55) resolveGate(gate);
        if (gate.position.z > 4.5) {
          const farthest = Math.min(...gates.map((item) => item.position.z));
          resetGate(gate, index, farthest - (5.8 + (index % 2) * 0.5));
        }
      });
      particles.forEach((particle, index) => {
        particle.position.z += delta * (1.1 + (index % 3) * 0.35);
        particle.position.x += Math.sin(elapsed * 0.8 + index) * delta * 0.08;
        if (particle.position.z > 4) particle.position.z = -18 - (index % 6);
      });
      planet.rotation.y += delta * 0.06;
      planetRing.rotation.z += delta * 0.13;
    },
    idle(delta, elapsed) {
      bubbleSize = 0.98 + Math.sin(elapsed * 1.4) * 0.08;
      bubble.scale.setScalar(bubbleSize);
      bubbleShell.position.copy(bubble.position);
      bubbleShell.scale.setScalar(bubbleSize * 1.02);
      bubbleHalo.position.copy(bubble.position);
      bubbleHalo.scale.setScalar(bubbleSize * 1.02);
      bubble.rotation.y += delta * 0.4;
      bubbleHalo.rotation.z += delta * 0.5;
      gates.forEach((gate, index) => {
        gate.position.z += delta * 1.2;
        gate.rotation.z += delta * (index % 2 ? -0.2 : 0.15);
        if (gate.position.z > 4.5) resetGate(gate, index, -8 - index * 7);
      });
      planet.rotation.y += delta * 0.04;
    }
  };
}

function setupCanyon(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const maxX = 2.35;
  const maxY = 1.85;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.96, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -3.15, -10);
  group.add(floor);

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 48),
    new THREE.MeshStandardMaterial({
      color: config.secondary,
      emissive: config.secondary,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55
    })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -3.08, -10);
  group.add(river);

  const walls = [];
  function addWallSide(segment, side, variant) {
    const height = 2.4 + (variant % 3) * 0.55;
    const width = 1.35 + (variant % 2) * 0.35;
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 2.4),
      material(variant % 2 ? 0xc46a2d : 0x8b4a22, variant % 2 ? 0xff7a2f : 0xb85a1d)
    );
    rock.position.set(side * (3.55 + (variant % 3) * 0.18), -3.15 + height * 0.5, 0);
    rock.rotation.y = side * 0.08;
    rock.rotation.z = side * (0.04 + (variant % 2) * 0.03);
    segment.add(rock);

    const ridge = new THREE.Mesh(
      new THREE.ConeGeometry(0.42 + (variant % 2) * 0.12, 1.1 + (variant % 3) * 0.2, 5),
      material(0xe07a32, 0xff9a3c)
    );
    ridge.position.set(side * (3.2 + (variant % 2) * 0.25), -3.15 + height + 0.35, 0.2);
    ridge.rotation.z = side * -0.18;
    segment.add(ridge);

    if (variant % 2 === 0) {
      const ledge = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.22, 1.2),
        material(0xd27a3a, config.accent)
      );
      ledge.position.set(side * 2.75, -1.1 + (variant % 3) * 0.35, 0.15);
      segment.add(ledge);
    }
  }
  for (let index = 0; index < 8; index += 1) {
    const segment = new THREE.Group();
    addWallSide(segment, -1, index);
    addWallSide(segment, 1, index + 8);
    segment.position.z = -4 - index * 3.4;
    group.add(segment);
    walls.push(segment);
  }

  const craftBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.15, 4),
    material(config.accent, 0xffc06a)
  );
  craftBody.rotation.x = Math.PI / 2;
  const craftWing = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.08, 0.42),
    material(config.secondary, config.secondary)
  );
  craftWing.position.z = 0.12;
  const craftTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.42, 0.28),
    material(0xffe0a8, config.accent)
  );
  craftTail.position.set(0, 0.18, 0.42);
  const craft = new THREE.Group();
  craft.add(craftBody, craftWing, craftTail);
  craft.position.set(0, -0.2, 2.15);
  group.add(craft);

  const craftHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.03, 8, 36),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.9 })
  );
  craftHalo.rotation.x = Math.PI / 2;
  craftHalo.position.copy(craft.position);
  group.add(craftHalo);

  const thruster = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.55, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.85 })
  );
  thruster.rotation.x = -Math.PI / 2;
  thruster.position.set(0, -0.2, 2.72);
  group.add(thruster);

  const rings = [];
  function makeRing(index) {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.09, 12, 48),
      material(config.secondary, config.secondary)
    );
    torus.material.emissiveIntensity = 1.5;
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.025, 8, 40),
      new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.55 })
    );
    const hub = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.34, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff4d2, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.add(torus, inner, hub);
    ring.userData.torus = torus;
    ring.userData.inner = inner;
    ring.userData.hub = hub;
    ring.userData.checked = false;
    group.add(ring);
    rings.push(ring);
    resetRing(ring, index, -7 - index * 6.4);
  }

  function resetRing(ring, index, z) {
    const seed = state.score * 1.7 + index * 2.3 + z * 0.1;
    const x = Math.sin(seed) * 1.65;
    const y = Math.cos(seed * 0.82) * 1.15 - 0.15;
    ring.position.set(x, y, z);
    ring.userData.checked = false;
    ring.userData.hit = false;
    ring.userData.drift = (index % 2 ? 1 : -1) * (0.35 + (index % 3) * 0.12);
    ring.userData.bob = 0.2 + (index % 3) * 0.08;
    ring.userData.torus.material.color.setHex(config.secondary);
    ring.userData.torus.material.emissive.setHex(config.secondary);
    ring.userData.torus.material.emissiveIntensity = 1.5;
    ring.userData.inner.material.color.setHex(config.accent);
    ring.userData.inner.material.opacity = 0.55;
    ring.scale.setScalar(1);
  }

  for (let index = 0; index < 5; index += 1) makeRing(index);

  const dust = [];
  for (let index = 0; index < 28; index += 1) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + (index % 4) * 0.02, 6, 6),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffc27a : 0x9adfcf, transparent: true, opacity: 0.45 })
    );
    mote.position.set((Math.sin(index * 2.1) * 2.8), -2.4 + (index % 5) * 0.55, -4 - (index % 9) * 2.2);
    group.add(mote);
    dust.push(mote);
  }

  let callbacks = null;
  let speedPulse = 0;

  function resolveRing(ring) {
    if (ring.userData.checked || !callbacks) return;
    ring.userData.checked = true;
    if (state.cooldown > 0) return;
    const dx = craft.position.x - ring.position.x;
    const dy = craft.position.y - ring.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1.02) {
      ring.userData.hit = true;
      ring.userData.torus.material.color.setHex(config.accent);
      ring.userData.torus.material.emissive.setHex(config.accent);
      ring.userData.torus.material.emissiveIntensity = 2.8;
      ring.userData.inner.material.color.setHex(0xd9ff43);
      ring.userData.inner.material.opacity = 0.95;
      callbacks.hit(dist <= 0.34 ? 2 : 1);
      speedPulse = 0.35;
    } else {
      ring.userData.torus.material.color.setHex(0xff527f);
      ring.userData.torus.material.emissive.setHex(0xff173e);
      ring.userData.torus.material.emissiveIntensity = 1.9;
      ring.userData.inner.material.opacity = 0.2;
      callbacks.miss();
    }
  }

  function resetCraft() {
    craft.position.set(0, -0.2, 2.15);
    state.targetX = 0;
    state.targetY = -0.2;
    craftHalo.position.copy(craft.position);
    thruster.position.set(0, -0.2, 2.72);
    rings.forEach((ring, index) => resetRing(ring, index, -7 - index * 6.4));
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = '18%';
  }

  return {
    reset: resetCraft,
    pointerMove(point) {
      state.targetX = THREE.MathUtils.clamp(point.x * maxX, -maxX, maxX);
      state.targetY = THREE.MathUtils.clamp(point.y * maxY, -maxY, maxY);
    },
    pointerDown(point) {
      state.targetX = THREE.MathUtils.clamp(point.x * maxX, -maxX, maxX);
      state.targetY = THREE.MathUtils.clamp(point.y * maxY, -maxY, maxY);
    },
    keyboard(delta, keys) {
      const horizontal = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0)
        - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const vertical = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0)
        - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      if (horizontal) state.targetX = THREE.MathUtils.clamp(state.targetX + horizontal * delta * 5.4, -maxX, maxX);
      if (vertical) state.targetY = THREE.MathUtils.clamp(state.targetY + vertical * delta * 4.8, -maxY, maxY);
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      craft.position.x += (state.targetX - craft.position.x) * Math.min(1, delta * 8.5);
      craft.position.y += (state.targetY - craft.position.y) * Math.min(1, delta * 8.5);
      craft.rotation.z = -(state.targetX - craft.position.x) * 0.18;
      craft.rotation.x = (state.targetY - craft.position.y) * 0.1;
      craft.rotation.y = Math.sin(elapsed * 4.5) * 0.04;
      craftHalo.position.copy(craft.position);
      craftHalo.rotation.z += delta * 2.2;
      thruster.position.set(craft.position.x, craft.position.y, craft.position.z + 0.58);
      thruster.scale.y = 0.85 + Math.sin(elapsed * 28) * 0.2 + speedPulse;
      thruster.material.opacity = 0.55 + speedPulse * 0.8;
      speedPulse = Math.max(0, speedPulse - delta * 1.4);

      const speed = 4.35 + Math.min(2.8, state.score * 0.14) + speedPulse * 1.2;
      rings.forEach((ring, index) => {
        ring.position.z += delta * speed;
        ring.position.x += Math.sin(elapsed * 1.1 + index) * delta * ring.userData.drift * 0.35;
        ring.position.y += Math.cos(elapsed * 1.4 + index * 0.7) * delta * ring.userData.bob * 0.4;
        ring.rotation.z += delta * (index % 2 ? -0.7 : 0.55);
        ring.userData.hub.material.opacity = 0.22 + Math.sin(elapsed * 5 + index) * 0.1;
        if (!ring.userData.checked && ring.position.z > 1.75) resolveRing(ring);
        if (ring.position.z > 4.8) {
          const farthest = Math.min(...rings.map((item) => item.position.z));
          resetRing(ring, index, farthest - (5.8 + (index % 2) * 0.45));
        }
        if (ring.userData.hit) {
          ring.scale.setScalar(Math.min(1.35, ring.scale.x + delta * 1.8));
        }
      });

      walls.forEach((segment, index) => {
        segment.position.z += delta * speed * 0.92;
        segment.position.x = Math.sin(elapsed * 0.6 + index) * 0.04;
        if (segment.position.z > 5.5) {
          const farthest = Math.min(...walls.map((item) => item.position.z));
          segment.position.z = farthest - 3.4;
        }
      });

      dust.forEach((mote, index) => {
        mote.position.z += delta * (speed * 0.75 + (index % 3) * 0.4);
        mote.position.x += Math.sin(elapsed * 1.5 + index) * delta * 0.2;
        if (mote.position.z > 4.5) {
          mote.position.z = -18 - (index % 7);
          mote.position.x = Math.sin(index * 3.1 + elapsed) * 2.6;
        }
      });

      river.position.z = -10 + Math.sin(elapsed * 0.4) * 0.2;
      let nearest = null;
      let nearestDist = Infinity;
      rings.forEach((ring) => {
        if (ring.userData.checked) return;
        const ahead = craft.position.z - ring.position.z;
        if (ahead < -0.5 || ahead > 8) return;
        const dist = Math.hypot(craft.position.x - ring.position.x, craft.position.y - ring.position.y) + Math.max(0, -ring.position.z) * 0.08;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = ring;
        }
      });
      if (!nearest) nearest = rings[0];
      const align = nearest
        ? Math.max(0, 1 - Math.hypot(craft.position.x - nearest.position.x, craft.position.y - nearest.position.y) / 2.4)
        : 0;
      const fill = document.querySelector('#power-fill');
      if (fill) fill.style.width = `${Math.round((0.12 + align * 0.88) * 100)}%`;
    },
    idle(delta, elapsed) {
      craft.position.x = Math.sin(elapsed * 0.9) * 0.55;
      craft.position.y = -0.2 + Math.cos(elapsed * 1.1) * 0.25;
      craft.rotation.z = -craft.position.x * 0.12;
      craft.rotation.y += delta * 0.35;
      craftHalo.position.copy(craft.position);
      craftHalo.rotation.z += delta;
      thruster.position.set(craft.position.x, craft.position.y, craft.position.z + 0.58);
      thruster.scale.y = 0.9 + Math.sin(elapsed * 18) * 0.15;
      rings.forEach((ring, index) => {
        ring.position.z += delta * 1.35;
        ring.rotation.z += delta * 0.4;
        if (ring.position.z > 4.8) resetRing(ring, index, -7 - index * 6.4);
      });
      walls.forEach((segment) => {
        segment.position.z += delta * 1.2;
        if (segment.position.z > 5.5) segment.position.z -= 27.2;
      });
    }
  };
}

function setupZeroGravityBilliards(config, world, state, camera, CANNON) {
  const group = new THREE.Group();
  world.add(group);

  const chamberZ = -3.75;
  const arena = { x: 3.52, y: 2.42 };
  const cueRadius = 0.38;
  const targetRadius = 0.34;
  const physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
  physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
  physicsWorld.allowSleep = true;
  physicsWorld.defaultContactMaterial.friction = 0.015;
  physicsWorld.defaultContactMaterial.restitution = 0.94;
  physicsWorld.solver.iterations = 12;

  const chamber = new THREE.Group();
  group.add(chamber);
  const shell = new THREE.Mesh(
    new THREE.PlaneGeometry(8.15, 6.1),
    new THREE.MeshStandardMaterial({
      color: 0x0b131e,
      emissive: 0x07101a,
      emissiveIntensity: 0.72,
      metalness: 0.58,
      roughness: 0.44,
      side: THREE.DoubleSide
    })
  );
  shell.position.set(0, 0, chamberZ - 0.34);
  chamber.add(shell);

  const gridPoints = [];
  for (let x = -3; x <= 3; x += 1) {
    gridPoints.push(new THREE.Vector3(x, -2.52, chamberZ - 0.27), new THREE.Vector3(x, 2.52, chamberZ - 0.27));
  }
  for (let y = -2; y <= 2; y += 1) {
    gridPoints.push(new THREE.Vector3(-3.58, y, chamberZ - 0.27), new THREE.Vector3(3.58, y, chamberZ - 0.27));
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gridPoints),
    new THREE.LineBasicMaterial({ color: 0x295166, transparent: true, opacity: 0.24 })
  );
  chamber.add(grid);

  const frameMaterial = material(0x172a38, 0x18394b);
  const frameSpecs = [
    [8.0, 0.18, 0, 2.65], [8.0, 0.18, 0, -2.65],
    [0.18, 5.3, 3.82, 0], [0.18, 5.3, -3.82, 0]
  ];
  frameSpecs.forEach(([width, height, x, y]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.32), frameMaterial);
    frame.position.set(x, y, chamberZ);
    chamber.add(frame);
  });

  const wallSpecs = [
    [0.14, 2.64, 3.74, 0], [0.14, 2.64, -3.74, 0],
    [3.74, 0.14, 0, 2.58], [3.74, 0.14, 0, -2.58]
  ];
  wallSpecs.forEach(([halfX, halfY, x, y]) => {
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(halfX, halfY, 0.7)) });
    wall.position.set(x, y, 0);
    physicsWorld.addBody(wall);
  });

  const pockets = [
    { x: -3.36, y: 0, color: config.secondary },
    { x: 3.36, y: 0, color: config.accent },
    { x: 0, y: 2.31, color: config.secondary },
    { x: 0, y: -2.31, color: config.accent }
  ].map((spec) => {
    const port = new THREE.Group();
    const aperture = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 32),
      new THREE.MeshBasicMaterial({ color: 0x020508, transparent: true, opacity: 0.92, depthWrite: false })
    );
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.07, 10, 36),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.92, depthWrite: false })
    );
    const scan = new THREE.Mesh(
      new THREE.TorusGeometry(0.63, 0.015, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.24, depthWrite: false })
    );
    port.add(aperture, rim, scan);
    port.position.set(spec.x, spec.y, chamberZ + 0.18);
    port.userData = { ...spec, rim, scan, pulse: 0 };
    chamber.add(port);
    return port;
  });

  const ballMaterial = new CANNON.Material('zero-g-ball');
  const cueBody = new CANNON.Body({
    mass: 1,
    material: ballMaterial,
    shape: new CANNON.Sphere(cueRadius),
    linearDamping: 0.09,
    angularDamping: 0.16,
    allowSleep: true,
    sleepSpeedLimit: 0.08
  });
  physicsWorld.addBody(cueBody);
  const cue = new THREE.Group();
  const cueCore = new THREE.Mesh(
    new THREE.SphereGeometry(cueRadius, 28, 20),
    material(0xf7f2df, 0x9fc5d1)
  );
  const cueOrbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.028, 8, 40),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.88, depthWrite: false })
  );
  const cueCap = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })
  );
  cueCap.position.z = 0.37;
  cue.add(cueCore, cueOrbit, cueCap);
  group.add(cue);

  const targetColors = [0x62e4ff, 0xff6f61, 0xf6cf62, 0xb38cff, 0x7de3b0];
  const targets = targetColors.map((color, index) => {
    const body = new CANNON.Body({
      mass: 0.84,
      material: ballMaterial,
      shape: new CANNON.Sphere(targetRadius),
      linearDamping: 0.08,
      angularDamping: 0.13,
      allowSleep: true,
      sleepSpeedLimit: 0.08
    });
    const mesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(targetRadius, 24, 18), material(color, color));
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(targetRadius * 1.28, 0.018, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, depthWrite: false })
    );
    const badge = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.14, 16),
      new THREE.MeshBasicMaterial({ color: 0xf7f2df, transparent: true, opacity: 0.8, depthWrite: false })
    );
    badge.position.z = targetRadius * 0.96;
    mesh.add(core, halo, badge);
    group.add(mesh);
    return { index, body, mesh, core, halo, active: true };
  });

  const guideMaterial = new THREE.LineDashedMaterial({
    color: config.accent,
    dashSize: 0.16,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });
  const aimGuide = new THREE.Line(new THREE.BufferGeometry(), guideMaterial);
  aimGuide.renderOrder = 8;
  aimGuide.visible = false;
  group.add(aimGuide);
  const impactMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.03, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.96, depthTest: false })
  );
  impactMarker.renderOrder = 9;
  impactMarker.visible = false;
  group.add(impactMarker);
  const pullAnchor = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.18, 18),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.76, depthTest: false })
  );
  pullAnchor.renderOrder = 9;
  pullAnchor.visible = false;
  group.add(pullAnchor);

  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -chamberZ);
  const planeHit = new THREE.Vector3();
  const aimDirection = new THREE.Vector2(0, 1);
  const targetLayouts = [
    [[1.32, 0.88], [1.95, -0.62], [0.68, -1.36], [-1.36, 0.54], [-2.06, -0.92]],
    [[1.94, 1.12], [1.34, -1.18], [-0.02, 0.2], [-1.76, 1.12], [-2.14, -1.36]],
    [[1.86, 0.18], [1.0, -1.42], [-0.45, 1.26], [-1.54, -0.12], [-2.34, -1.18]]
  ];
  let layoutIndex = 0;
  let callbacks = null;
  let isAiming = false;
  let aimPower = 0;
  let inMotion = false;
  let shotTime = 0;
  let capturedThisShot = 0;
  let resetDelay = 0;
  let foulCommitted = false;
  let targetTouched = false;

  function setBodyPosition(body, x, y) {
    body.position.set(x, y, 0);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.force.set(0, 0, 0);
    body.torque.set(0, 0, 0);
    body.wakeUp();
  }

  function syncBall(entry) {
    entry.mesh.position.set(entry.body.position.x, entry.body.position.y, chamberZ + 0.18);
    entry.core.rotation.x += entry.body.angularVelocity.y * 0.012;
    entry.core.rotation.y -= entry.body.angularVelocity.x * 0.012;
    entry.halo.rotation.z += 0.012 + entry.body.velocity.length() * 0.01;
  }

  function syncCue() {
    cue.position.set(cueBody.position.x, cueBody.position.y, chamberZ + 0.2);
    cueCore.rotation.x += cueBody.angularVelocity.y * 0.012;
    cueCore.rotation.y -= cueBody.angularVelocity.x * 0.012;
    cueOrbit.rotation.z += 0.024 + cueBody.velocity.length() * 0.012;
  }

  function restoreTarget(entry, x, y) {
    if (!entry.body.world) physicsWorld.addBody(entry.body);
    entry.active = true;
    entry.mesh.visible = true;
    setBodyPosition(entry.body, x, y);
    entry.halo.material.opacity = 0.58;
  }

  function resetTargets() {
    const layout = targetLayouts[layoutIndex % targetLayouts.length];
    targets.forEach((entry, index) => restoreTarget(entry, layout[index][0], layout[index][1]));
  }

  function placeCue() {
    const candidates = [[-2.45, 1.52], [-2.48, -1.5], [-1.86, 0], [0, 0]];
    const safe = candidates.find(([x, y]) => targets.every((entry) => !entry.active
      || Math.hypot(entry.body.position.x - x, entry.body.position.y - y) > 1.02));
    setBodyPosition(cueBody, ...(safe || candidates[0]));
  }

  function resetAll() {
    layoutIndex = 0;
    resetTargets();
    placeCue();
    isAiming = false;
    inMotion = false;
    shotTime = 0;
    capturedThisShot = 0;
    resetDelay = 0;
    foulCommitted = false;
    targetTouched = false;
    aimGuide.visible = false;
    impactMarker.visible = false;
    pullAnchor.visible = false;
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = '0%';
    syncCue();
    targets.forEach(syncBall);
  }

  function arenaPoint(point) {
    raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
    return raycaster.ray.intersectPlane(interactionPlane, planeHit) ? planeHit.clone() : null;
  }

  function rayToBoundary(origin, direction) {
    const tx = direction.x > 0 ? (arena.x - origin.x) / direction.x : direction.x < 0 ? (-arena.x - origin.x) / direction.x : Infinity;
    const ty = direction.y > 0 ? (arena.y - origin.y) / direction.y : direction.y < 0 ? (-arena.y - origin.y) / direction.y : Infinity;
    const distance = Math.min(tx > 0 ? tx : Infinity, ty > 0 ? ty : Infinity);
    return { distance, hitX: Math.abs(distance - tx) < 0.001, hitY: Math.abs(distance - ty) < 0.001 };
  }

  function updateAim(point) {
    const aimPoint = arenaPoint(point);
    if (!aimPoint) return;
    const origin = new THREE.Vector2(cueBody.position.x, cueBody.position.y);
    const pull = origin.clone().sub(new THREE.Vector2(aimPoint.x, aimPoint.y));
    aimPower = THREE.MathUtils.clamp(pull.length() / 2.35, 0, 1);
    if (pull.lengthSq() > 0.008) aimDirection.copy(pull.normalize());

    const boundary = rayToBoundary(origin, aimDirection);
    let contactDistance = Infinity;
    let contact = null;
    targets.forEach((entry) => {
      if (!entry.active) return;
      const offset = new THREE.Vector2(entry.body.position.x - origin.x, entry.body.position.y - origin.y);
      const along = offset.dot(aimDirection);
      if (along <= 0) return;
      const perpendicularSq = offset.lengthSq() - along * along;
      const radius = cueRadius + targetRadius;
      if (perpendicularSq > radius * radius) return;
      const distance = along - Math.sqrt(radius * radius - perpendicularSq);
      if (distance > 0 && distance < contactDistance) {
        contactDistance = distance;
        contact = entry;
      }
    });

    const start = new THREE.Vector3(origin.x, origin.y, chamberZ + 0.34);
    const points = [start];
    if (contact && contactDistance < boundary.distance) {
      points.push(start.clone().add(new THREE.Vector3(aimDirection.x, aimDirection.y, 0).multiplyScalar(contactDistance)));
      impactMarker.position.copy(points[1]);
      impactMarker.material.color.setHex(0xd9ff43);
    } else {
      const bounce = start.clone().add(new THREE.Vector3(aimDirection.x, aimDirection.y, 0).multiplyScalar(boundary.distance));
      points.push(bounce);
      const reflected = aimDirection.clone();
      if (boundary.hitX) reflected.x *= -1;
      if (boundary.hitY) reflected.y *= -1;
      const nextBoundary = rayToBoundary(new THREE.Vector2(bounce.x, bounce.y), reflected);
      points.push(bounce.clone().add(new THREE.Vector3(reflected.x, reflected.y, 0).multiplyScalar(Math.min(2.15, nextBoundary.distance))));
      impactMarker.position.copy(bounce);
      impactMarker.material.color.setHex(config.secondary);
    }
    aimGuide.geometry.setFromPoints(points);
    aimGuide.computeLineDistances();
    aimGuide.visible = true;
    impactMarker.visible = true;
    impactMarker.scale.setScalar(0.76 + aimPower * 0.58);
    pullAnchor.position.set(aimPoint.x, aimPoint.y, chamberZ + 0.35);
    pullAnchor.visible = true;
    pullAnchor.scale.setScalar(0.86 + aimPower * 0.36);
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = `${Math.round(aimPower * 100)}%`;
  }

  function anyPort(body, radius) {
    return pockets.find((port) => Math.hypot(body.position.x - port.userData.x, body.position.y - port.userData.y) < radius);
  }

  function stopBodies() {
    cueBody.velocity.set(0, 0, 0);
    cueBody.angularVelocity.set(0, 0, 0);
    targets.forEach((entry) => {
      if (!entry.active) return;
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
    });
  }

  function finishShot(foul = false) {
    if (!inMotion) return;
    inMotion = false;
    stopBodies();
    if (foul || capturedThisShot === 0) callbacks?.miss();
    resetDelay = 0.68;
  }

  function captureTarget(entry, port) {
    if (!entry.active) return;
    entry.active = false;
    entry.mesh.visible = false;
    physicsWorld.removeBody(entry.body);
    capturedThisShot += 1;
    port.userData.pulse = 1;
    callbacks?.hit(1);
  }

  function nextShot() {
    if (!targets.some((entry) => entry.active)) {
      layoutIndex += 1;
      resetTargets();
    }
    placeCue();
    capturedThisShot = 0;
    foulCommitted = false;
    targetTouched = false;
  }

  cueBody.addEventListener('collide', (event) => {
    if (targets.some((entry) => entry.active && event.body === entry.body)) targetTouched = true;
  });

  return {
    reset: resetAll,
    pointerDown(point) {
      if (inMotion || resetDelay > 0) return;
      const hit = arenaPoint(point);
      if (!hit || Math.hypot(hit.x - cueBody.position.x, hit.y - cueBody.position.y) > 0.88) return;
      isAiming = true;
      updateAim(point);
    },
    pointerMove(point) {
      if (isAiming) updateAim(point);
    },
    pointerUp() {
      if (!isAiming) return;
      isAiming = false;
      aimGuide.visible = false;
      impactMarker.visible = false;
      pullAnchor.visible = false;
      if (aimPower < 0.09) return;
      const speed = 3.25 + aimPower * 7.65;
      cueBody.velocity.set(aimDirection.x * speed, aimDirection.y * speed, 0);
      cueBody.angularVelocity.set(-aimDirection.y * speed * 0.9, aimDirection.x * speed * 0.9, 0);
      cueBody.wakeUp();
      inMotion = true;
      shotTime = 0;
      capturedThisShot = 0;
      foulCommitted = false;
      targetTouched = false;
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      pockets.forEach((port, index) => {
        port.userData.pulse = Math.max(0, port.userData.pulse - delta * 1.8);
        port.userData.rim.material.opacity = 0.68 + Math.sin(elapsed * 3 + index) * 0.14 + port.userData.pulse * 0.22;
        port.userData.scan.rotation.z += delta * (index % 2 ? -1.2 : 1.2);
        port.userData.scan.scale.setScalar(1 + port.userData.pulse * 0.75);
        port.userData.scan.material.opacity = 0.18 + port.userData.pulse * 0.7;
      });

      if (resetDelay > 0) {
        resetDelay -= delta;
        if (resetDelay <= 0 && state.started && !state.gameOverPending) nextShot();
      }

      if (!inMotion) {
        syncCue();
        targets.forEach(syncBall);
        return;
      }

      shotTime += delta;
      physicsWorld.step(1 / 60, delta, 3);
      cueBody.position.z = 0;
      cueBody.velocity.z = 0;
      targets.forEach((entry) => {
        if (!entry.active) return;
        entry.body.position.z = 0;
        entry.body.velocity.z = 0;
      });

      const cuePort = anyPort(cueBody, 0.53);
      if (cuePort && !foulCommitted) {
        foulCommitted = true;
        cuePort.userData.pulse = 1;
        finishShot(true);
      }

      targets.forEach((entry) => {
        if (!entry.active) return;
        const port = anyPort(entry.body, 0.55);
        if (port) captureTarget(entry, port);
      });

      syncCue();
      targets.forEach(syncBall);
      const highestVelocity = Math.max(
        cueBody.velocity.length(),
        ...targets.filter((entry) => entry.active).map((entry) => entry.body.velocity.length()),
        0
      );
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(Math.min(1, highestVelocity / 10.5) * 100)}%`;
      if (!foulCommitted && ((shotTime > 0.82 && highestVelocity < 0.22) || shotTime > 7.6)) finishShot(false);
    },
    idle(delta, elapsed) {
      cueOrbit.rotation.z += delta * 0.72;
      targets.forEach((entry, index) => {
        entry.halo.rotation.z += delta * (index % 2 ? -0.26 : 0.32);
        entry.mesh.position.z = chamberZ + 0.2 + Math.sin(elapsed * 1.5 + index) * 0.025;
      });
      pockets.forEach((port, index) => {
        port.userData.scan.rotation.z += delta * (index % 2 ? -0.52 : 0.52);
      });
    }
  };
}

function setupMorph(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const playerY = -0.35;
  const formColors = [config.accent, config.secondary, 0xe9e6dc];
  const formNames = ['cube', 'wide', 'tall'];
  const layouts = [
    [-0.26, -0.26, -0.26, 0.26, -0.26, -0.26, -0.26, 0.26, -0.26, 0.26, 0.26, -0.26,
      -0.26, -0.26, 0.26, 0.26, -0.26, 0.26, -0.26, 0.26, 0.26, 0.26, 0.26, 0.26],
    [-0.72, -0.24, 0, -0.24, -0.24, 0, 0.24, -0.24, 0, 0.72, -0.24, 0,
      -0.72, 0.24, 0, -0.24, 0.24, 0, 0.24, 0.24, 0, 0.72, 0.24, 0],
    [-0.24, -0.72, 0, 0.24, -0.72, 0, -0.24, -0.24, 0, 0.24, -0.24, 0,
      -0.24, 0.24, 0, 0.24, 0.24, 0, -0.24, 0.72, 0, 0.24, 0.72, 0]
  ].map((layout) => Array.from({ length: 8 }, (_, index) => new THREE.Vector3(
    layout[index * 3], layout[index * 3 + 1], layout[index * 3 + 2]
  )));
  const openings = [
    { width: 1.38, height: 1.38 },
    { width: 2.3, height: 1.18 },
    { width: 1.18, height: 2.3 }
  ];

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 28),
    new THREE.MeshStandardMaterial({ color: 0x11131a, emissive: 0x10121a, emissiveIntensity: 0.55, roughness: 0.72 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, -2.85, -7.5);
  group.add(runway);
  const rails = [-2.85, -1.9, 1.9, 2.85].map((x, index) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 26),
      new THREE.MeshBasicMaterial({ color: index % 2 ? config.accent : config.secondary, transparent: true, opacity: 0.34 })
    );
    rail.position.set(x, -2.78, -7.5);
    group.add(rail);
    return rail;
  });

  const player = new THREE.Group();
  player.position.set(0, playerY, 2.12);
  group.add(player);
  const voxelGeometry = new THREE.BoxGeometry(0.44, 0.44, 0.44);
  const edgeGeometry = new THREE.EdgesGeometry(voxelGeometry);
  const voxels = Array.from({ length: 8 }, (_, index) => {
    const root = new THREE.Group();
    const core = new THREE.Mesh(
      voxelGeometry,
      new THREE.MeshStandardMaterial({
        color: index % 3 === 0 ? 0xe9e6dc : config.accent,
        emissive: index % 3 === 0 ? 0x5e5a81 : config.accent,
        emissiveIntensity: 0.72,
        metalness: 0.48,
        roughness: 0.24
      })
    );
    const edges = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.46 })
    );
    root.add(core, edges);
    root.position.copy(layouts[0][index]);
    root.userData.target = layouts[0][index].clone();
    root.userData.phase = index * 0.62;
    player.add(root);
    return root;
  });
  const playerHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.025, 8, 44),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.46, depthWrite: false })
  );
  playerHalo.position.z = -0.28;
  player.add(playerHalo);

  const indicators = formNames.map((name, index) => {
    const station = new THREE.Group();
    const dimensions = index === 0 ? [0.42, 0.42] : index === 1 ? [0.72, 0.3] : [0.3, 0.72];
    const icon = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions[0], dimensions[1], 0.08),
      new THREE.MeshBasicMaterial({ color: formColors[index], transparent: true, opacity: index === 0 ? 0.95 : 0.22 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: formColors[index], transparent: true, opacity: index === 0 ? 0.82 : 0.16 })
    );
    station.add(icon, ring);
    station.position.set((index - 1) * 1.35, 2.03, 1.25);
    station.userData = { name, icon, ring };
    group.add(station);
    return station;
  });

  const gates = [];
  function buildGate(index) {
    const gate = new THREE.Group();
    const required = index % 3;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: config.secondary,
      emissive: config.secondary,
      emissiveIntensity: 0.7,
      metalness: 0.42,
      roughness: 0.32
    });
    const outlineMaterial = new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.9 });
    const outerWidth = 6.3;
    const outerHeight = 4.5;

    const rebuild = () => {
      const opening = openings[gate.userData.required];
      gate.userData.panels.forEach((mesh) => gate.remove(mesh));
      const sideWidth = (outerWidth - opening.width) / 2;
      const capHeight = (outerHeight - opening.height) / 2;
      const left = new THREE.Mesh(new THREE.BoxGeometry(sideWidth, outerHeight, 0.3), frameMaterial);
      const right = left.clone();
      const top = new THREE.Mesh(new THREE.BoxGeometry(opening.width, capHeight, 0.3), frameMaterial);
      const bottom = top.clone();
      left.position.x = -(opening.width + sideWidth) / 2;
      right.position.x = (opening.width + sideWidth) / 2;
      top.position.y = (opening.height + capHeight) / 2;
      bottom.position.y = -(opening.height + capHeight) / 2;
      gate.userData.panels = [left, right, top, bottom];
      gate.add(...gate.userData.panels);
      frameMaterial.color.setHex(config.secondary);
      frameMaterial.emissive.setHex(config.secondary);
      outlineMaterial.color.setHex(config.accent);
      const halfWidth = opening.width / 2;
      const halfHeight = opening.height / 2;
      gate.userData.outline.geometry.setFromPoints([
        new THREE.Vector3(-halfWidth, -halfHeight, 0.2), new THREE.Vector3(halfWidth, -halfHeight, 0.2),
        new THREE.Vector3(halfWidth, halfHeight, 0.2), new THREE.Vector3(-halfWidth, halfHeight, 0.2)
      ]);
    };

    const outline = new THREE.LineLoop(new THREE.BufferGeometry(), outlineMaterial);
    gate.userData = { required, checked: false, frameMaterial, outline, panels: [], rebuild };
    gate.add(outline);
    rebuild();
    gate.position.set(0, playerY, -7.4 - index * 6.5);
    group.add(gate);
    gates.push(gate);
  }
  for (let index = 0; index < 4; index += 1) buildGate(index);

  let currentForm = 0;
  let morphAge = 1;
  let morphPulse = 0;
  let previewForm = 0;

  function setForm(nextForm, animate = true) {
    currentForm = nextForm;
    morphAge = animate ? 0 : 1;
    morphPulse = animate ? 1 : 0;
    voxels.forEach((voxel, index) => voxel.userData.target.copy(layouts[currentForm][index]));
    indicators.forEach((indicator, index) => {
      const selected = index === currentForm;
      indicator.userData.icon.material.opacity = selected ? 0.96 : 0.2;
      indicator.userData.ring.material.opacity = selected ? 0.82 : 0.14;
      indicator.scale.setScalar(selected ? 1.12 : 0.84);
    });
    playerHalo.material.color.setHex(formColors[currentForm]);
  }

  function morph() {
    if (!state.started || state.cooldown > 0) return;
    setForm((currentForm + 1) % layouts.length, true);
  }

  function resetGate(gate, index, z) {
    gate.position.set(0, playerY, z);
    gate.userData.required = (index + 1 + state.score) % layouts.length;
    gate.userData.checked = false;
    gate.userData.frameMaterial.emissiveIntensity = 0.7;
    gate.userData.outline.material.opacity = 0.9;
    gate.userData.rebuild();
  }

  function nearestGate() {
    return gates
      .filter((gate) => !gate.userData.checked)
      .sort((a, b) => b.position.z - a.position.z)[0];
  }

  function updateVoxels(delta, elapsed) {
    morphAge += delta;
    morphPulse = Math.max(0, morphPulse - delta * 2.8);
    voxels.forEach((voxel) => {
      voxel.position.lerp(voxel.userData.target, Math.min(1, delta * 13));
      voxel.rotation.x += delta * (0.18 + morphPulse * 3.2);
      voxel.rotation.y += delta * (0.24 + morphPulse * 4.1);
      const breathe = 1 + Math.sin(elapsed * 5 + voxel.userData.phase) * 0.018 + morphPulse * 0.08;
      voxel.scale.setScalar(breathe);
    });
    player.rotation.y = Math.sin(elapsed * 1.5) * 0.1;
    playerHalo.rotation.z += delta * (0.7 + morphPulse * 2.8);
    playerHalo.scale.setScalar(0.94 + Math.sin(elapsed * 3) * 0.035 + morphPulse * 0.16);
  }

  return {
    reset() {
      setForm(0, false);
      previewForm = 0;
      gates.forEach((gate, index) => resetGate(gate, index, -7.4 - index * 6.5));
      const fill = document.querySelector('#power-fill');
      if (fill) fill.style.width = '0%';
    },
    pointerDown: morph,
    controlDown: morph,
    update(delta, elapsed, { hit, miss }) {
      updateVoxels(delta, elapsed);
      const speed = 3.85 + Math.min(3.1, state.score * 0.16);
      gates.forEach((gate, index) => {
        gate.position.z += delta * speed;
        gate.rotation.z = Math.sin(elapsed * 0.45 + index) * 0.018;
        gate.userData.outline.material.opacity = 0.64 + Math.sin(elapsed * 4 + index) * 0.22;
        if (!gate.userData.checked && gate.position.z > 1.62) {
          gate.userData.checked = true;
          if (currentForm === gate.userData.required && morphAge > 0.1) {
            gate.userData.frameMaterial.color.setHex(0xd9ff43);
            gate.userData.frameMaterial.emissive.setHex(0xd9ff43);
            gate.userData.frameMaterial.emissiveIntensity = 1.9;
            gate.userData.outline.material.color.setHex(0xd9ff43);
            hit(1);
          } else {
            gate.userData.frameMaterial.color.setHex(0xff5b3d);
            gate.userData.frameMaterial.emissive.setHex(0xff173e);
            gate.userData.frameMaterial.emissiveIntensity = 1.5;
            gate.userData.outline.material.color.setHex(0xff5b3d);
            miss();
          }
        }
        if (gate.position.z > 5.2) {
          const back = Math.min(...gates.map((item) => item.position.z));
          resetGate(gate, index, back - 6.25);
        }
      });
      const nearest = nearestGate();
      const approach = nearest ? THREE.MathUtils.clamp((nearest.position.z + 7.4) / 9, 0, 1) : 0;
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(approach * 100)}%`;
      rails.forEach((rail, index) => {
        rail.material.opacity = 0.2 + Math.sin(elapsed * 4 - index) * 0.12 + approach * 0.16;
      });
    },
    idle(delta, elapsed) {
      const nextPreview = Math.floor(elapsed / 1.6) % layouts.length;
      if (nextPreview !== previewForm) {
        previewForm = nextPreview;
        setForm(previewForm, true);
      }
      updateVoxels(delta, elapsed);
      gates.forEach((gate, index) => {
        gate.position.z += delta * 1.1;
        gate.userData.outline.material.opacity = 0.55 + Math.sin(elapsed * 3 + index) * 0.2;
        if (gate.position.z > 5.2) resetGate(gate, index, -7.4 - index * 6.5);
      });
    }
  };
}

function setupSoundMaze(config, world, state, camera) {
  const group = new THREE.Group();
  world.add(group);
  const maze = new THREE.Group();
  group.add(maze);
  const cols = 5;
  const rows = 4;
  const cellWidth = 1.3;
  const cellHeight = 1.15;
  const bounds = { left: -3.25, right: 3.25, bottom: -2.3, top: 2.3 };
  const playerRadius = 0.26;
  const wallEntries = [];
  const verticalGeometry = new THREE.BoxGeometry(0.12, cellHeight + 0.04, 0.26);
  const horizontalGeometry = new THREE.BoxGeometry(cellWidth + 0.04, 0.12, 0.26);

  const chamber = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 5.15),
    new THREE.MeshStandardMaterial({ color: 0x071018, emissive: 0x06141b, emissiveIntensity: 0.72, roughness: 0.8 })
  );
  chamber.position.set(0, 0, -4.15);
  group.add(chamber);
  const floorLines = [];
  for (let index = 0; index <= cols; index += 1) {
    const x = bounds.left + index * cellWidth;
    floorLines.push(new THREE.Vector3(x, bounds.bottom, -4.02), new THREE.Vector3(x, bounds.top, -4.02));
  }
  for (let index = 0; index <= rows; index += 1) {
    const y = bounds.bottom + index * cellHeight;
    floorLines.push(new THREE.Vector3(bounds.left, y, -4.02), new THREE.Vector3(bounds.right, y, -4.02));
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(floorLines),
    new THREE.LineBasicMaterial({ color: 0x19404c, transparent: true, opacity: 0.14 })
  );
  group.add(grid);

  const player = new THREE.Group();
  const playerCore = new THREE.Mesh(
    new THREE.SphereGeometry(playerRadius, 24, 18),
    material(config.accent, config.accent)
  );
  const playerHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.028, 8, 40),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.76, depthWrite: false })
  );
  const playerTail = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.35, 8),
    new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.76, depthWrite: false })
  );
  playerTail.rotation.x = -Math.PI / 2;
  playerTail.position.z = 0.22;
  player.add(playerCore, playerHalo, playerTail);
  group.add(player);

  const beacon = new THREE.Group();
  const beaconCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.62, depthWrite: false })
  );
  const beaconRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.44, depthWrite: false })
  );
  const beaconCross = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.62, 0, 0), new THREE.Vector3(0.62, 0, 0),
      new THREE.Vector3(0, -0.62, 0), new THREE.Vector3(0, 0.62, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.26 })
  );
  beacon.add(beaconCore, beaconRing, beaconCross);
  group.add(beacon);

  const pulseRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    })),
    new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.9, depthTest: false })
  );
  pulseRing.renderOrder = 7;
  group.add(pulseRing);
  const echoDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.9, depthWrite: false })
  );
  echoDot.renderOrder = 8;
  group.add(echoDot);

  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 3.85);
  const pointOnPlane = new THREE.Vector3();
  const target = new THREE.Vector2();
  const playerPosition = new THREE.Vector2();
  const pulseOrigin = new THREE.Vector2();
  let pulseRadius = 0;
  let pulseActive = false;
  let pulseWait = 0;
  let audioContext = null;
  let roundIndex = 0;
  let transition = 0;
  let collisionWait = 0;
  let callbacks = null;
  let keyboardLatched = false;

  function random(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function cellKey(column, row) {
    return `${column},${row}`;
  }

  function openEdge(verticalWalls, horizontalWalls, column, row, nextColumn, nextRow) {
    if (nextColumn > column) verticalWalls.delete(`${column + 1},${row}`);
    else if (nextColumn < column) verticalWalls.delete(`${column},${row}`);
    else if (nextRow > row) horizontalWalls.delete(`${column},${row + 1}`);
    else if (nextRow < row) horizontalWalls.delete(`${column},${row}`);
  }

  function clearMaze() {
    wallEntries.splice(0).forEach((entry) => {
      maze.remove(entry.mesh);
      entry.mesh.material.dispose();
    });
  }

  function generateMaze() {
    clearMaze();
    const verticalWalls = new Set();
    const horizontalWalls = new Set();
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column <= cols; column += 1) verticalWalls.add(`${column},${row}`);
    }
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column < cols; column += 1) horizontalWalls.add(`${column},${row}`);
    }
    const visited = new Set();
    const stack = [[0, 0]];
    const seed = roundIndex * 17.31 + state.score * 3.7;
    visited.add(cellKey(0, 0));
    while (stack.length) {
      const [column, row] = stack[stack.length - 1];
      const neighbors = [[column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]]
        .filter(([nextColumn, nextRow]) => nextColumn >= 0 && nextColumn < cols && nextRow >= 0 && nextRow < rows)
        .filter(([nextColumn, nextRow]) => !visited.has(cellKey(nextColumn, nextRow)))
        .sort((a, b) => random(seed + a[0] * 3.1 + a[1] * 5.7) - random(seed + b[0] * 3.1 + b[1] * 5.7));
      if (!neighbors.length) {
        stack.pop();
        continue;
      }
      const [nextColumn, nextRow] = neighbors[0];
      visited.add(cellKey(nextColumn, nextRow));
      openEdge(verticalWalls, horizontalWalls, column, row, nextColumn, nextRow);
      stack.push([nextColumn, nextRow]);
    }

    const addWall = (vertical, column, row) => {
      const mesh = new THREE.Mesh(
        vertical ? verticalGeometry : horizontalGeometry,
        new THREE.MeshStandardMaterial({
          color: config.accent,
          emissive: config.accent,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.045,
          metalness: 0.3,
          roughness: 0.52,
          depthWrite: false
        })
      );
      const x = vertical ? bounds.left + column * cellWidth : bounds.left + (column + 0.5) * cellWidth;
      const y = vertical ? bounds.bottom + (row + 0.5) * cellHeight : bounds.bottom + row * cellHeight;
      mesh.position.set(x, y, -3.84);
      maze.add(mesh);
      wallEntries.push({
        mesh,
        x,
        y,
        halfX: vertical ? 0.06 : (cellWidth + 0.04) / 2,
        halfY: vertical ? (cellHeight + 0.04) / 2 : 0.06,
        vertical
      });
    };
    verticalWalls.forEach((key) => {
      const [column, row] = key.split(',').map(Number);
      addWall(true, column, row);
    });
    horizontalWalls.forEach((key) => {
      const [column, row] = key.split(',').map(Number);
      addWall(false, column, row);
    });
  }

  function cellPosition(column, row) {
    return new THREE.Vector2(
      bounds.left + (column + 0.5) * cellWidth,
      bounds.bottom + (row + 0.5) * cellHeight
    );
  }

  function setGoal() {
    const goalCell = roundIndex % 2 === 0 ? [cols - 1, rows - 1] : [0, 0];
    const goal = cellPosition(goalCell[0], goalCell[1]);
    beacon.position.set(goal.x, goal.y, -3.58);
  }

  function setStart() {
    const start = roundIndex % 2 === 0 ? cellPosition(0, 0) : cellPosition(cols - 1, rows - 1);
    playerPosition.copy(start);
    target.copy(start);
    player.position.set(start.x, start.y, -3.55);
  }

  function startPulse(withSound = state.started) {
    pulseActive = true;
    pulseRadius = 0.06;
    pulseOrigin.copy(playerPosition);
    pulseRing.position.set(pulseOrigin.x, pulseOrigin.y, -3.47);
    pulseRing.scale.setScalar(pulseRadius);
    echoDot.position.copy(pulseRing.position);
    pulseRing.visible = true;
    echoDot.visible = true;
    if (!withSound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume?.();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(180 + (roundIndex % 4) * 35, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(520, audioContext.currentTime + 0.22);
      gain.gain.setValueAtTime(0.03, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.26);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.27);
    } catch {
      // Audio is optional; the visible echo ring remains the primary cue.
    }
  }

  function wallDistance(entry) {
    const dx = Math.max(Math.abs(pulseOrigin.x - entry.x) - entry.halfX, 0);
    const dy = Math.max(Math.abs(pulseOrigin.y - entry.y) - entry.halfY, 0);
    return Math.hypot(dx, dy);
  }

  function updatePulse(delta, elapsed) {
    if (!pulseActive) {
      pulseWait -= delta;
      if (pulseWait <= 0) startPulse(state.started);
    } else {
      pulseRadius += delta * 5.9;
      pulseRing.scale.setScalar(pulseRadius);
      pulseRing.material.opacity = 0.34 + Math.max(0, 1 - pulseRadius / 7.4) * 0.62;
      echoDot.position.set(pulseOrigin.x, pulseOrigin.y, -3.44);
      echoDot.scale.setScalar(0.72 + Math.sin(elapsed * 12) * 0.14);
      if (pulseRadius > 7.45) {
        pulseActive = false;
        pulseWait = 0.52;
        pulseRing.visible = false;
        echoDot.visible = false;
      }
    }
    wallEntries.forEach((entry, index) => {
      const reveal = pulseActive ? THREE.MathUtils.clamp(1 - Math.abs(wallDistance(entry) - pulseRadius) / 0.52, 0, 1) : 0;
      const fade = 0.038 + reveal * 0.86;
      entry.mesh.material.opacity = fade;
      entry.mesh.material.emissiveIntensity = 0.08 + reveal * 2.4;
      entry.mesh.material.color.setHex(reveal > 0.18 ? config.accent : 0x163a45);
      entry.mesh.material.emissive.setHex(reveal > 0.18 ? config.accent : 0x0d2831);
      if (reveal > 0.72) entry.mesh.rotation.z = Math.sin(elapsed * 2 + index) * 0.008;
    });
  }

  function arenaPoint(point) {
    raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
    return raycaster.ray.intersectPlane(interactionPlane, pointOnPlane) ? pointOnPlane.clone() : null;
  }

  function setTarget(point) {
    const mapped = arenaPoint(point);
    if (!mapped) return;
    target.set(
      THREE.MathUtils.clamp(mapped.x, bounds.left + playerRadius, bounds.right - playerRadius),
      THREE.MathUtils.clamp(mapped.y, bounds.bottom + playerRadius, bounds.top - playerRadius)
    );
  }

  function overlapsWall(x, y) {
    return wallEntries.some((entry) => {
      const dx = Math.max(Math.abs(x - entry.x) - entry.halfX, 0);
      const dy = Math.max(Math.abs(y - entry.y) - entry.halfY, 0);
      return dx * dx + dy * dy < playerRadius * playerRadius;
    });
  }

  function advanceMaze() {
    roundIndex += 1;
    generateMaze();
    setStart();
    setGoal();
    transition = 0;
  }

  return {
    reset() {
      roundIndex = 0;
      transition = 0;
      collisionWait = 0;
      keyboardLatched = false;
      pulseWait = 0;
      pulseActive = false;
      generateMaze();
      setStart();
      setGoal();
      startPulse(true);
      const fill = document.querySelector('#power-fill');
      if (fill) fill.style.width = '0%';
    },
    pointerDown(point) {
      if (!state.started || transition > 0) return;
      setTarget(point);
    },
    pointerMove(point) {
      if (state.pointerDown && transition <= 0) setTarget(point);
    },
    keyboard(delta, keys) {
      if (transition > 0) return;
      const horizontal = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0)
        - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const vertical = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0)
        - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      if (!horizontal && !vertical) {
        keyboardLatched = false;
        return;
      }
      if (keyboardLatched || playerPosition.distanceTo(target) > 0.08) return;
      keyboardLatched = true;
      if (horizontal) {
        target.x = THREE.MathUtils.clamp(target.x + horizontal * cellWidth, bounds.left + cellWidth / 2, bounds.right - cellWidth / 2);
      } else {
        target.y = THREE.MathUtils.clamp(target.y + vertical * cellHeight, bounds.bottom + cellHeight / 2, bounds.top - cellHeight / 2);
      }
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      updatePulse(delta, elapsed);
      collisionWait = Math.max(0, collisionWait - delta);
      const wasTransitioning = transition > 0;
      transition = Math.max(0, transition - delta);
      if (wasTransitioning && transition === 0 && state.started && !state.gameOverPending) {
        advanceMaze();
      } else if (!wasTransitioning && state.started) {
        const desiredX = playerPosition.x + THREE.MathUtils.clamp(target.x - playerPosition.x, -delta * 3.8, delta * 3.8);
        const desiredY = playerPosition.y + THREE.MathUtils.clamp(target.y - playerPosition.y, -delta * 3.8, delta * 3.8);
        let collided = false;
        if (!overlapsWall(desiredX, playerPosition.y)) playerPosition.x = desiredX;
        else collided = true;
        if (!overlapsWall(playerPosition.x, desiredY)) playerPosition.y = desiredY;
        else collided = true;
        if (collided) {
          target.set(playerPosition.x, playerPosition.y);
          if (collisionWait <= 0) {
            collisionWait = 0.76;
            callbacks?.miss();
          }
        }
        player.position.x = playerPosition.x;
        player.position.y = playerPosition.y;
        const goalDistance = Math.hypot(playerPosition.x - beacon.position.x, playerPosition.y - beacon.position.y);
        if (goalDistance < 0.46) {
          callbacks?.hit(1);
          transition = 0.75;
          target.copy(playerPosition);
          beaconRing.scale.setScalar(1.45);
        }
      }
      playerHalo.rotation.z += delta * 1.8;
      playerHalo.scale.setScalar(0.94 + Math.sin(elapsed * 4) * 0.05);
      playerCore.rotation.y += delta * 1.4;
      playerTail.scale.y = 0.85 + Math.sin(elapsed * 7) * 0.12;
      beacon.position.z = -3.58 + Math.sin(elapsed * 2.6) * 0.03;
      beaconRing.rotation.z += delta * 1.2;
      beaconRing.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 5));
      beaconCore.material.opacity = 0.48 + Math.sin(elapsed * 4.2) * 0.12;
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(Math.min(1, pulseRadius / 7.45) * 100)}%`;
    },
    idle(delta, elapsed) {
      updatePulse(delta, elapsed);
      player.position.x = playerPosition.x;
      player.position.y = playerPosition.y + Math.sin(elapsed * 1.2) * 0.06;
      playerHalo.rotation.z += delta;
      beaconRing.rotation.z += delta * 0.8;
      beaconCore.material.opacity = 0.48 + Math.sin(elapsed * 4.2) * 0.12;
    }
  };
}

function setupTimeSlice(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const player = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), material(config.accent, config.accent));
  player.position.set(0, -0.25, 2.15);
  group.add(player);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.028, 8, 40), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.82 }));
  halo.position.copy(player.position);
  group.add(halo);
  const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.05), new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.68 }));
  clockHand.position.set(-2.95, 1.7, -2.8);
  group.add(clockHand);
  const clockRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 8, 36), new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.62 }));
  clockRing.position.copy(clockHand.position);
  group.add(clockRing);

  const gates = [];
  function makeGate(index) {
    const gate = new THREE.Group();
    const left = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.3, 0.28), material(config.accent, config.accent));
    const right = left.clone();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 0.32), material(config.secondary, config.secondary));
    bar.position.y = 2.12;
    gate.add(left, right, bar);
    gate.userData = { phase: index * 1.9 + 0.7, clock: 0, checked: false, left, right };
    gate.position.z = -7.2 - index * 6.1;
    group.add(gate);
    gates.push(gate);
  }
  for (let index = 0; index < 5; index += 1) makeGate(index);

  let slowEnergy = 1;
  function resetGate(gate, index, z) {
    gate.position.z = z;
    gate.userData.clock = 0;
    gate.userData.phase = index * 1.9 + 0.7 + state.score * 0.23;
    gate.userData.checked = false;
  }
  return {
    reset() {
      slowEnergy = 1;
      gates.forEach((gate, index) => resetGate(gate, index, -7.2 - index * 6.1));
      const fill = document.querySelector('#power-fill');
      if (fill) fill.style.width = '100%';
    },
    update(delta, elapsed, { hit, miss }) {
      const freezing = state.holding && slowEnergy > 0.02;
      if (freezing) slowEnergy = Math.max(0, slowEnergy - delta * 0.29);
      else slowEnergy = Math.min(1, slowEnergy + delta * 0.12);
      const slowFactor = freezing ? 0.16 : 1;
      clockHand.rotation.z = elapsed * (freezing ? 0.1 : 0.9);
      clockRing.rotation.z -= delta * (freezing ? 0.18 : 1.4);
      halo.rotation.z += delta * 1.5;
      player.rotation.y += delta * 0.8;
      gates.forEach((gate, index) => {
        gate.position.z += delta * (4.1 + Math.min(2.3, state.score * 0.11));
        gate.userData.clock += delta * 1.45 * slowFactor;
        const openingX = Math.sin(gate.userData.clock + gate.userData.phase) * 1.7;
        gate.userData.left.position.x = openingX - 1.9;
        gate.userData.right.position.x = openingX + 1.9;
        gate.rotation.z = Math.sin(elapsed * 0.6 + index) * 0.022;
        if (!gate.userData.checked && gate.position.z > 1.65) {
          gate.userData.checked = true;
          if (Math.abs(openingX) < 0.42) hit(1);
          else miss();
        }
        if (gate.position.z > 5.2) {
          const back = Math.min(...gates.map((item) => item.position.z));
          resetGate(gate, index, back - 5.9);
        }
      });
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(slowEnergy * 100)}%`;
    },
    idle(delta, elapsed) {
      clockHand.rotation.z = elapsed * 0.65;
      clockRing.rotation.z -= delta * 0.9;
      halo.rotation.z += delta * 0.75;
      gates.forEach((gate, index) => {
        gate.position.z += delta * 1.25;
        const openingX = Math.sin(elapsed * 1.15 + gate.userData.phase) * 1.7;
        gate.userData.left.position.x = openingX - 1.9;
        gate.userData.right.position.x = openingX + 1.9;
        if (gate.position.z > 5.2) resetGate(gate, index, -7.2 - index * 6.1);
      });
    }
  };
}

function setupOrbitCleaner(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.18, 32, 22), material(0x263d46, 0x1c7a76));
  planet.position.set(0, -0.05, -3.8);
  group.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.48 }));
  atmosphere.position.copy(planet.position);
  group.add(atmosphere);
  const orbitRadii = [1.72, 2.48];
  const orbitMeshes = orbitRadii.map((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: index === 0 ? config.accent : config.secondary, transparent: true, opacity: index === 0 ? 0.7 : 0.3 }));
    ring.position.copy(planet.position);
    group.add(ring);
    return ring;
  });
  const cleaner = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), material(config.accent, config.accent));
  const cleanerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.9 }));
  group.add(cleaner, cleanerHalo);
  const debris = Array.from({ length: 14 }, (_, index) => {
    const hazard = index % 5 === 0;
    const mesh = hazard
      ? new THREE.Mesh(new THREE.TetrahedronGeometry(0.22, 0), material(config.secondary, 0xff334b))
      : new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.12), material(index % 2 ? 0xf5d36d : config.accent));
    group.add(mesh);
    return { index, mesh, radius: orbitRadii[index % 2], angle: index * 0.86 + 0.22, speed: 0.34 + (index % 3) * 0.08, hazard, checked: false };
  });
  let lane = 0;
  let playerAngle = 0;
  function toggleLane() {
    if (!state.started || state.cooldown > 0) return;
    lane = (lane + 1) % 2;
    orbitMeshes.forEach((ring, index) => { ring.material.opacity = index === lane ? 0.76 : 0.24; });
  }
  function placePlayer() {
    const radius = orbitRadii[lane];
    cleaner.position.set(Math.cos(playerAngle) * radius, Math.sin(playerAngle) * radius - 0.05, -3.05);
    cleanerHalo.position.copy(cleaner.position);
  }
  return {
    reset() {
      lane = 0;
      playerAngle = 0;
      debris.forEach((item, index) => { item.angle = index * 0.86 + 0.22; item.checked = false; item.mesh.visible = true; });
      orbitMeshes.forEach((ring, index) => { ring.material.opacity = index === 0 ? 0.76 : 0.24; });
      placePlayer();
    },
    controlDown: toggleLane,
    pointerDown: toggleLane,
    update(delta, elapsed, { hit, miss }) {
      playerAngle = (playerAngle + delta * (0.92 + state.score * 0.045)) % (Math.PI * 2);
      debris.forEach((item) => {
        item.angle = (item.angle + delta * item.speed) % (Math.PI * 2);
        const x = Math.cos(item.angle) * item.radius;
        const y = Math.sin(item.angle) * item.radius - 0.05;
        item.mesh.position.set(x, y, -3.05);
        item.mesh.rotation.z += delta * (item.hazard ? -2 : 1.5);
        const difference = Math.atan2(Math.sin(item.angle - playerAngle), Math.cos(item.angle - playerAngle));
        if (!item.checked && Math.abs(difference) < 0.06) {
          item.checked = true;
          if (item.radius === orbitRadii[lane]) {
            if (item.hazard) miss();
            else { item.mesh.visible = false; hit(1); }
          }
        }
        if (item.checked && Math.abs(difference) > 0.2) {
          item.checked = false;
          if (!item.mesh.visible && !item.hazard) {
            item.mesh.visible = true;
            item.angle = (playerAngle + Math.PI * 0.85 + item.index * 0.2) % (Math.PI * 2);
          }
        }
      });
      placePlayer();
      cleaner.rotation.y += delta * 2.4;
      cleanerHalo.rotation.z += delta * 2.1;
      atmosphere.rotation.z -= delta * 0.18;
      planet.rotation.y += delta * 0.08;
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(((playerAngle % (Math.PI * 2)) / (Math.PI * 2)) * 100)}%`;
    },
    idle(delta, elapsed) {
      playerAngle = (playerAngle + delta * 0.35) % (Math.PI * 2);
      placePlayer();
      cleaner.rotation.y += delta;
      cleanerHalo.rotation.z += delta;
      planet.rotation.y += delta * 0.05;
    }
  };
}

function setupNeonFishing(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x081c2c, emissive: 0x062b3a, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.22 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.9, -3.4);
  group.add(water);
  const lineTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7.5), new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.42 }));
  lineTop.position.set(0, 1.82, -3.4);
  group.add(lineTop);
  const lure = new THREE.Group();
  const lureCore = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), material(config.accent, config.accent));
  const lureRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 30), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.8 }));
  lure.add(lureCore, lureRing);
  group.add(lure);
  const fish = Array.from({ length: 5 }, (_, index) => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 10), material(index % 2 ? 0x7cfff0 : 0xff67bc, index % 2 ? config.secondary : config.accent));
    body.scale.set(1.45, 0.58, 0.32);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.32, 4), new THREE.MeshBasicMaterial({ color: body.material.color }));
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.42;
    root.add(body, tail);
    root.userData = { x: -2.9 + index * 1.35, y: -1.0 + (index % 3) * 0.42, speed: 0.5 + index * 0.11, direction: index % 2 ? -1 : 1 };
    group.add(root);
    return root;
  });
  let mode = 'ready';
  let timer = 0;
  let catchX = 0;
  let catchY = 0;
  let callbacks = null;
  function attempt() {
    if (!state.started || state.cooldown > 0 || mode !== 'ready') return;
    catchX = Math.sin(state.elapsed * 1.55) * 2.7;
    catchY = -0.6;
    mode = 'dropping';
    timer = 0;
  }
  return {
    reset() { mode = 'ready'; timer = 0; fish.forEach((item, index) => { item.userData.x = -2.9 + index * 1.35; item.visible = true; }); },
    controlDown: attempt,
    pointerDown: attempt,
    update(delta, elapsed, cb) {
      callbacks = cb;
      fish.forEach((item) => {
        item.userData.x += delta * item.userData.speed * item.userData.direction;
        if (item.userData.x > 3.15) { item.userData.x = 3.15; item.userData.direction = -1; }
        if (item.userData.x < -3.15) { item.userData.x = -3.15; item.userData.direction = 1; }
        item.position.set(item.userData.x, item.userData.y + Math.sin(elapsed * 2 + item.userData.speed) * 0.05, -3.45);
        item.rotation.y = item.userData.speed > 0.8 ? 0.06 : -0.06;
      });
      lure.position.set(Math.sin(elapsed * 1.55) * 2.7, 1.28, -3.2);
      lureRing.rotation.z += delta * 2;
      if (mode === 'dropping') {
        timer += delta;
        const progress = Math.min(1, timer / 0.58);
        lure.position.y = THREE.MathUtils.lerp(1.28, -1.52, progress);
        if (progress >= 1) {
          const targetFish = fish.find((item) => item.visible && Math.abs(item.userData.x - catchX) < 0.58 && Math.abs(item.userData.y - catchY) < 0.7);
          if (targetFish) { targetFish.visible = false; callbacks.hit(1); }
          else callbacks.miss();
          mode = 'retracting';
          timer = 0;
        }
      } else if (mode === 'retracting') {
        timer += delta;
        lure.position.y = THREE.MathUtils.lerp(-1.52, 1.28, Math.min(1, timer / 0.48));
        if (timer >= 0.48) { mode = 'ready'; timer = 0; fish.forEach((item, index) => { if (!item.visible && state.score < 8) { item.visible = true; item.userData.x = -3.1 - index * 0.2; } }); }
      }
      const nearest = fish.reduce((best, item) => Math.abs(item.userData.x - lure.position.x) < Math.abs(best.userData.x - lure.position.x) ? item : best, fish[0]);
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(100 - Math.min(100, Math.abs(nearest.userData.x - lure.position.x) * 28))}%`;
    },
    idle(delta, elapsed) { lure.position.set(Math.sin(elapsed * 1.55) * 2.7, 1.28, -3.2); lureRing.rotation.z += delta; }
  };
}

function setupRocketLanding(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 1.5), material(config.secondary, config.secondary));
  pad.position.set(0, -2.12, -3.7);
  group.add(pad);
  const padLight = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.82 }));
  padLight.rotation.x = Math.PI / 2;
  padLight.position.set(0, -2.0, -3.7);
  group.add(padLight);
  const rocket = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.15, 16), material(config.accent, 0x9cb9bf));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 16), material(0xf0a064, 0xff5b3d));
  nose.position.y = 0.78;
  const finA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.28), material(0xff5b3d));
  const finB = finA.clone();
  finA.position.set(-0.32, -0.38, 0); finB.position.set(0.32, -0.38, 0);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 10), new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.86 }));
  flame.rotation.x = Math.PI;
  flame.position.y = -0.88;
  rocket.add(body, nose, finA, finB, flame);
  group.add(rocket);
  let y = 1.8;
  let velocity = -0.3;
  let fuel = 1;
  let resetTimer = 0;
  let active = true;
  function resetRocket() { y = 1.8; velocity = -0.35 - state.score * 0.01; fuel = 1; resetTimer = 0; active = true; rocket.position.set(0, y, -3.7); rocket.rotation.z = 0; }
  return {
    reset() { resetRocket(); const fill = document.querySelector('#power-fill'); if (fill) fill.style.width = '100%'; },
    update(delta, elapsed, { hit, miss }) {
      if (resetTimer > 0) {
        resetTimer -= delta;
        rocket.position.y = y;
        if (resetTimer <= 0 && state.started && !state.gameOverPending) resetRocket();
        return;
      }
      if (active) {
        const thrusting = state.holding && fuel > 0.01;
        if (thrusting) { velocity += delta * 6.15; fuel = Math.max(0, fuel - delta * 0.27); }
        else fuel = Math.min(1, fuel + delta * 0.09);
        velocity -= delta * (2.38 + state.score * 0.035);
        y += velocity * delta;
        const wind = Math.sin(elapsed * 0.7 + state.score) * 0.004;
        rocket.position.x += wind;
        rocket.position.y = y;
        rocket.position.z = -3.7;
        rocket.rotation.z = THREE.MathUtils.clamp(-velocity * 0.035, -0.18, 0.18);
        flame.scale.y = thrusting ? 1.2 + Math.sin(elapsed * 24) * 0.18 : 0.32;
        if (y <= -1.44) {
          active = false;
          const safe = Math.abs(velocity) < 1.75 && Math.abs(rocket.position.x) < 0.82;
          if (safe) hit(1); else miss();
          resetTimer = 0.72;
        }
      }
      padLight.rotation.z += delta * 0.8;
      padLight.material.opacity = 0.5 + Math.sin(elapsed * 3) * 0.18;
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(fuel * 100)}%`;
    },
    idle(delta, elapsed) { rocket.position.y = 1.82 + Math.sin(elapsed * 1.4) * 0.16; rocket.position.x = Math.sin(elapsed * 0.65) * 0.18; flame.scale.y = 0.6 + Math.sin(elapsed * 14) * 0.12; padLight.rotation.z += delta * 0.45; }
  };
}

function setupCloneRace(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const laneXs = [-1.45, 0, 1.45];
  const track = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 25), new THREE.MeshStandardMaterial({ color: 0x101927, emissive: 0x0a2533, emissiveIntensity: 0.65, roughness: 0.76 }));
  track.rotation.x = -Math.PI / 2;
  track.position.set(0, -2.25, -7);
  group.add(track);
  laneXs.forEach((x) => {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 24), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.24 }));
    lane.position.set(x, -2.17, -7);
    group.add(lane);
  });
  const runnerColors = [0xf4f1df, config.accent, config.secondary];
  const runners = runnerColors.map((color, index) => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), material(color, color));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: index === 0 ? 0.9 : 0.42 }));
    halo.rotation.x = Math.PI / 2;
    root.add(body, halo);
    root.position.set(laneXs[index], -1.72, 2.1);
    root.visible = index === 0;
    group.add(root);
    return { root, body, halo, jump: 0, velocity: 0, events: [], eventIndex: 0 };
  });
  const gates = Array.from({ length: 4 }, (_, index) => {
    const root = new THREE.Group();
    laneXs.forEach((x, laneIndex) => {
      const hurdle = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.28), material(laneIndex === 0 ? config.secondary : config.accent));
      hurdle.position.set(x, -1.55, 0);
      root.add(hurdle);
    });
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.65 }));
    marker.position.set(0, 1.5, 0);
    root.add(marker);
    root.position.z = -6 - index * 4.1;
    root.userData = { checked: false, marker };
    group.add(root);
    return root;
  });
  let lap = 0;
  let lapTime = 0;
  let record = [];
  let patterns = [];

  function jump() {
    if (!state.started || state.cooldown > 0 || runners[0].jump > 0.05) return;
    runners[0].velocity = 4.25;
    record.push(lapTime);
  }
  function triggerGhost(index) {
    const runner = runners[index + 1];
    if (!runner || !runner.visible) return;
    runner.velocity = 4.25;
  }
  function resetLap(save = false) {
    if (save && record.length) patterns = [record.slice(), ...patterns].slice(0, 2);
    lap += save ? 1 : 0;
    lapTime = 0;
    record = [];
    runners.forEach((runner, index) => {
      runner.jump = 0;
      runner.velocity = 0;
      runner.eventIndex = 0;
      runner.events = index === 0 ? [] : patterns[index - 1] || [];
      runner.root.visible = index === 0 || Boolean(patterns[index - 1]);
    });
    gates.forEach((gate, index) => { gate.position.z = -6 - index * 4.1; gate.userData.checked = false; });
  }
  return {
    reset() { lap = 0; patterns = []; resetLap(false); },
    controlDown: jump,
    pointerDown: jump,
    update(delta, elapsed, { hit, miss }) {
      lapTime += delta;
      runners.forEach((runner, index) => {
        if (!runner.root.visible) return;
        if (index > 0 && runner.eventIndex < runner.events.length && lapTime >= runner.events[runner.eventIndex]) {
          triggerGhost(index - 1);
          runner.eventIndex += 1;
        }
        runner.velocity -= delta * 8.7;
        runner.jump = Math.max(0, runner.jump + runner.velocity * delta);
        if (runner.jump <= 0) { runner.jump = 0; runner.velocity = Math.max(0, runner.velocity); }
        runner.root.position.y = -1.72 + runner.jump;
        runner.body.rotation.x += delta * (runner.jump > 0 ? 4 : 1.2);
        runner.halo.rotation.z += delta * (index % 2 ? -1.5 : 1.5);
      });
      const requirement = Math.min(3, lap + 1);
      const speed = 4.45 + Math.min(1.4, lap * 0.35);
      gates.forEach((gate) => {
        gate.position.z += delta * speed;
        gate.userData.marker.scale.setScalar(0.82 + requirement * 0.14 + Math.sin(elapsed * 4) * 0.04);
        if (!gate.userData.checked && gate.position.z > 1.65) {
          gate.userData.checked = true;
          const airborne = runners.filter((runner) => runner.root.visible && runner.jump > 0.3).length;
          if (airborne >= requirement) hit(1); else miss();
        }
      });
      if (gates.every((gate) => gate.position.z > 4.8) && !state.gameOverPending) resetLap(true);
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round(Math.min(1, lapTime / 5.5) * 100)}%`;
    },
    idle(delta, elapsed) {
      runners[0].root.position.y = -1.72 + Math.abs(Math.sin(elapsed * 1.8)) * 0.35;
      runners[0].body.rotation.x += delta * 1.4;
      gates.forEach((gate, index) => { gate.position.z += delta * 1.2; if (gate.position.z > 5) gate.position.z = -6 - index * 4.1; });
    }
  };
}

function setupCloudGarden(config, world, state, camera) {
  const group = new THREE.Group();
  world.add(group);
  const raycaster = new THREE.Raycaster();
  const plots = [];
  const hitAreas = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const index = row * 3 + column;
      const root = new THREE.Group();
      root.position.set((column - 1) * 1.42, (row - 1) * 1.12 - 0.15, -3.65 + Math.sin(index) * 0.08);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), material(0xdceff2, 0x688b95));
      cloud.scale.set(1.2, 0.36, 0.72);
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.12, 20), material(0x344f42, 0x173025));
      soil.rotation.x = Math.PI / 2;
      soil.position.z = 0.22;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 10), material(config.accent, config.accent));
      stem.position.set(0, 0.28, 0.42);
      stem.scale.y = 0;
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), material(config.secondary, config.secondary));
      bloom.position.set(0, 0.62, 0.42);
      bloom.visible = false;
      const hitArea = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hitArea.position.z = 0.55;
      hitArea.userData.index = index;
      root.add(cloud, soil, stem, bloom, hitArea);
      root.userData = { stage: 0, clearAt: 0, stem, bloom, cloud };
      group.add(root);
      plots.push(root);
      hitAreas.push(hitArea);
    }
  }
  function neighbors(index) {
    const row = Math.floor(index / 3);
    const column = index % 3;
    return [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
      .filter(([r, c]) => r >= 0 && r < 3 && c >= 0 && c < 3)
      .map(([r, c]) => r * 3 + c);
  }
  function updatePlant(plot) {
    plot.userData.stem.scale.y = plot.userData.stage / 3;
    plot.userData.bloom.visible = plot.userData.stage >= 3;
  }
  function plant(index) {
    const plot = plots[index];
    if (!plot || plot.userData.stage > 0 || state.cooldown > 0) { if (state.started) plot && (plot.scale.setScalar(0.86)); return false; }
    plot.userData.stage = 1;
    updatePlant(plot);
    neighbors(index).forEach((neighborIndex) => {
      const neighbor = plots[neighborIndex];
      if (neighbor.userData.stage > 0 && neighbor.userData.stage < 3) {
        neighbor.userData.stage += 1;
        if (neighbor.userData.stage >= 3) {
          neighbor.userData.clearAt = state.elapsed + 0.72;
          neighbor.userData.bloom.visible = true;
        }
        updatePlant(neighbor);
      }
    });
    return true;
  }
  let callbacks = null;
  return {
    reset() { plots.forEach((plot) => { plot.userData.stage = 0; plot.userData.clearAt = 0; updatePlant(plot); }); plots[4].userData.stage = 1; updatePlant(plots[4]); },
    pointerDown(point) {
      raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
      const hit = raycaster.intersectObjects(hitAreas, false)[0];
      if (!hit) return;
      if (!plant(hit.object.userData.index)) callbacks?.miss();
    },
    update(delta, elapsed, cb) {
      callbacks = cb;
      plots.forEach((plot, index) => {
        plot.position.z += Math.sin(elapsed * 1.2 + index) * delta * 0.015;
        plot.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 8));
        plot.userData.bloom.rotation.y += delta * 1.2;
        if (plot.userData.clearAt > 0 && elapsed >= plot.userData.clearAt) {
          plot.userData.clearAt = 0;
          plot.userData.stage = 0;
          updatePlant(plot);
          callbacks.hit(1);
        }
      });
      const occupied = plots.filter((plot) => plot.userData.stage > 0).length;
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = `${Math.round((occupied / 9) * 100)}%`;
    },
    idle(delta, elapsed) { plots.forEach((plot, index) => { plot.position.y += Math.sin(elapsed * 1.1 + index) * delta * 0.025; plot.userData.bloom.rotation.y += delta; }); }
  };
}

function setupBlackHole(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  core.position.set(0, -0.1, -3.6);
  group.add(core);
  const diskA = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 12, 64), new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.72, depthWrite: false }));
  const diskB = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.055, 8, 64), new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.58, depthWrite: false }));
  diskA.position.copy(core.position); diskB.position.copy(core.position);
  diskA.rotation.x = 0.45; diskB.rotation.x = -0.38;
  group.add(diskA, diskB);
  const items = Array.from({ length: 12 }, (_, index) => {
    const hazard = index % 4 === 0;
    const mesh = hazard
      ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), material(0xff4f5e, 0xff173e))
      : new THREE.Mesh(index % 2 ? new THREE.SphereGeometry(0.2, 16, 10) : new THREE.BoxGeometry(0.3, 0.22, 0.18), material(index % 3 ? 0x7ee6a8 : 0xffd166));
    group.add(mesh);
    return { index, mesh, hazard, angle: index * 1.73, radius: 3.2 + (index % 4) * 0.8, speed: 0.52 + (index % 3) * 0.1 };
  });
  let open = false;
  function toggle() { if (!state.started || state.cooldown > 0) return; open = !open; }
  function recycle(item) { item.radius = 4.3 + (item.index % 4) * 0.65; item.angle += 1.8 + state.score * 0.13; item.mesh.visible = true; }
  return {
    reset() { open = false; items.forEach((item) => recycle(item)); },
    controlDown: toggle,
    pointerDown: toggle,
    update(delta, elapsed, { hit, miss }) {
      const horizon = open ? 1.08 : 0.48;
      core.scale.lerp(new THREE.Vector3(horizon, horizon, horizon), Math.min(1, delta * 8));
      diskA.scale.lerp(new THREE.Vector3(open ? 1.25 : 0.88, open ? 1.25 : 0.88, 1), Math.min(1, delta * 6));
      diskA.rotation.z += delta * (open ? 2.2 : 0.75);
      diskB.rotation.z -= delta * (open ? 1.4 : 0.48);
      items.forEach((item) => {
        item.radius -= delta * item.speed * (open ? 1.28 : 0.86);
        item.angle += delta * (0.32 + 0.75 / Math.max(0.7, item.radius));
        item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius - 0.1, -3.5);
        item.mesh.rotation.x += delta * 1.4;
        item.mesh.rotation.y += delta * 1.1;
        if (item.radius < horizon) {
          if (open) { if (item.hazard) miss(); else hit(1); }
          recycle(item);
        } else if (!open && item.radius < 0.62) recycle(item);
      });
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = open ? '100%' : '22%';
    },
    idle(delta, elapsed) { diskA.rotation.z += delta * 0.7; diskB.rotation.z -= delta * 0.45; core.scale.setScalar(0.95 + Math.sin(elapsed * 2) * 0.04); }
  };
}

function setupFireworks(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const skyline = Array.from({ length: 13 }, (_, index) => {
    const height = 0.45 + (index % 5) * 0.22;
    const building = new THREE.Mesh(new THREE.BoxGeometry(0.62, height, 0.5), new THREE.MeshStandardMaterial({ color: 0x111727, emissive: index % 2 ? 0x25213d : 0x123246, emissiveIntensity: 0.55 }));
    building.position.set((index - 6) * 0.68, -2.42 + height / 2, -4.2 - (index % 3) * 0.18);
    group.add(building);
    return building;
  });
  const rocket = new THREE.Group();
  const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.48, 10), material(config.secondary, config.secondary));
  const rocketFlame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 8), new THREE.MeshBasicMaterial({ color: 0xff6b5d, transparent: true, opacity: 0.88 }));
  rocketFlame.rotation.x = Math.PI;
  rocketFlame.position.y = -0.38;
  rocket.add(rocketBody, rocketFlame);
  group.add(rocket);
  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.62 }));
  targetRing.position.z = -3.55;
  targetRing.visible = false;
  group.add(targetRing);
  const particleCount = 72;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: config.accent, size: 0.11, transparent: true, opacity: 0, depthWrite: false }));
  group.add(particles);
  const velocities = Array.from({ length: particleCount }, () => new THREE.Vector3());
  let particleLife = 0;
  let mode = 'ready';
  let charge = 0;
  let rocketY = -2.0;
  let velocity = 0;
  let targetY = 1.2;
  let resetTimer = 0;
  function burst(success) {
    particles.position.set(rocket.position.x, rocket.position.y, -3.55);
    particles.material.color.setHex(success ? [config.accent, config.secondary, 0xff6b9d, 0x7dffb3][state.score % 4] : 0xff5b3d);
    particles.material.opacity = 1;
    particleLife = 1.35;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2;
      const spoke = 1.5 + (index % 9) * 0.16;
      velocities[index].set(Math.cos(angle) * spoke, Math.sin(angle) * spoke, ((index % 5) - 2) * 0.16);
      particlePositions[index * 3] = 0;
      particlePositions[index * 3 + 1] = 0;
      particlePositions[index * 3 + 2] = 0;
    }
    particleGeometry.attributes.position.needsUpdate = true;
  }
  function press() {
    if (!state.started || state.cooldown > 0) return;
    if (mode === 'ready') { mode = 'charging'; charge = 0; }
    else if (mode === 'flying') {
      const distance = Math.abs(rocketY - targetY);
      if (distance < 0.68) burst(true);
      else burst(false);
      if (distance < 0.68) callbacks?.hit(distance < 0.22 ? 2 : 1); else callbacks?.miss();
      mode = 'waiting'; resetTimer = 0.72; rocket.visible = false; targetRing.visible = false;
    }
  }
  function release() {
    if (mode !== 'charging') return;
    mode = 'flying';
    rocketY = -2.0;
    velocity = 4.5 + charge * 3.7;
    targetY = 0.25 + ((state.score * 1.37 + charge * 2.1) % 1.9);
    rocket.position.set(0, rocketY, -3.55);
    rocket.visible = true;
    targetRing.position.y = targetY;
    targetRing.visible = true;
  }
  let callbacks = null;
  return {
    reset() { mode = 'ready'; charge = 0; resetTimer = 0; rocket.visible = true; rocket.position.set(0, -2.0, -3.55); targetRing.visible = false; },
    pointerDown: press,
    pointerUp: release,
    update(delta, elapsed, cb) {
      callbacks = cb;
      if (mode === 'charging') {
        charge = Math.min(1, charge + delta * 0.72);
        rocket.scale.y = 0.92 + charge * 0.22;
      } else if (mode === 'flying') {
        velocity -= delta * 2.65;
        rocketY += velocity * delta;
        rocket.position.y = rocketY;
        rocketFlame.scale.y = 0.8 + Math.sin(elapsed * 28) * 0.18;
        targetRing.rotation.z += delta * 1.2;
        if (velocity < -1.2 || rocketY > 3.25) { burst(false); callbacks.miss(); mode = 'waiting'; resetTimer = 0.72; rocket.visible = false; targetRing.visible = false; }
      } else if (mode === 'waiting') {
        resetTimer -= delta;
        if (resetTimer <= 0 && state.started && !state.gameOverPending) { mode = 'ready'; charge = 0; rocket.visible = true; rocket.position.set(0, -2.0, -3.55); }
      }
      if (particleLife > 0) {
        particleLife -= delta;
        for (let index = 0; index < particleCount; index += 1) {
          particlePositions[index * 3] += velocities[index].x * delta;
          particlePositions[index * 3 + 1] += velocities[index].y * delta;
          particlePositions[index * 3 + 2] += velocities[index].z * delta;
          velocities[index].y -= delta * 0.95;
          velocities[index].multiplyScalar(1 - delta * 0.32);
        }
        particleGeometry.attributes.position.needsUpdate = true;
        particles.material.opacity = Math.max(0, particleLife / 1.35);
      }
      const fill = document.querySelector('#power-fill');
      if (fill && state.cooldown <= 0) fill.style.width = mode === 'charging' ? `${Math.round(charge * 100)}%` : mode === 'flying' ? `${Math.round(Math.max(0, 1 - Math.abs(rocketY - targetY) / 3) * 100)}%` : '0%';
      skyline.forEach((building, index) => { building.material.emissiveIntensity = 0.45 + Math.sin(elapsed * 2 + index) * 0.12; });
    },
    idle(delta, elapsed) { rocket.position.y = -1.9 + Math.sin(elapsed * 1.4) * 0.08; targetRing.visible = false; skyline.forEach((building, index) => { building.material.emissiveIntensity = 0.45 + Math.sin(elapsed * 2 + index) * 0.12; }); particles.rotation.z += delta * 0.08; }
  };
}


function setupGear(config, world, state) {
  const machine = new THREE.Group();
  machine.position.set(-0.12, -0.08, -3.7);
  machine.rotation.x = -0.08;
  world.add(machine);

  const specs = [
    { x: -2.35, y: 0.5, radius: 1.18, teeth: 14, direction: 1, ratio: 1.08 },
    { x: 0, y: -0.58, radius: 1.5, teeth: 18, direction: -1, ratio: 0.84 },
    { x: 2.55, y: 0.52, radius: 1.06, teeth: 12, direction: 1, ratio: 1.18 }
  ];

  function buildGear(spec, index) {
    const station = new THREE.Group();
    station.position.set(spec.x, spec.y, 0);
    machine.add(station);

    const gearRoot = new THREE.Group();
    station.add(gearRoot);
    const gearMaterial = new THREE.MeshStandardMaterial({
      color: index === 1 ? 0x384246 : 0x2d373a,
      emissive: 0x12191b,
      emissiveIntensity: 0.45,
      metalness: 0.82,
      roughness: 0.27
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x718084,
      emissive: config.accent,
      emissiveIntensity: 0.08,
      metalness: 0.9,
      roughness: 0.2
    });

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.radius * 0.76, spec.radius * 0.76, 0.38, spec.teeth * 2),
      gearMaterial
    );
    disc.rotation.x = Math.PI / 2;
    gearRoot.add(disc);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius * 0.54, 0.11, 10, spec.teeth * 2),
      edgeMaterial
    );
    innerRing.position.z = 0.21;
    gearRoot.add(innerRing);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.radius * 0.2, spec.radius * 0.2, 0.52, 24),
      gearMaterial
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.04;
    gearRoot.add(hub);

    for (let toothIndex = 0; toothIndex < spec.teeth; toothIndex += 1) {
      const angle = (toothIndex / spec.teeth) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.42, 0.34),
        toothIndex % 3 === 0 ? edgeMaterial : gearMaterial
      );
      tooth.position.set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0);
      tooth.rotation.z = angle;
      gearRoot.add(tooth);
    }

    const spokeMaterial = edgeMaterial.clone();
    spokeMaterial.emissiveIntensity = 0.04;
    for (let spokeIndex = 0; spokeIndex < 4; spokeIndex += 1) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(spec.radius * 1.12, 0.12, 0.22),
        spokeMaterial
      );
      spoke.rotation.z = (spokeIndex / 4) * Math.PI;
      spoke.position.z = 0.22;
      gearRoot.add(spoke);
    }

    const markerPivot = new THREE.Group();
    const marker = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 1),
      new THREE.MeshStandardMaterial({
        color: config.accent,
        emissive: config.accent,
        emissiveIntensity: 2.4,
        metalness: 0.22,
        roughness: 0.18
      })
    );
    marker.position.set(0, spec.radius + 0.2, 0.48);
    markerPivot.add(marker);
    station.add(markerPivot);

    const arc = Math.PI * 0.38;
    const gate = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius + 0.2, 0.085, 8, 20, arc),
      new THREE.MeshBasicMaterial({
        color: config.secondary,
        transparent: true,
        opacity: 0.18,
        depthTest: false,
        toneMapped: false
      })
    );
    gate.rotation.z = Math.PI / 2 - arc / 2;
    gate.position.z = 0.42;
    gate.renderOrder = 7;
    station.add(gate);

    const activeHalo = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius + 0.46, 0.035, 8, 56),
      new THREE.MeshBasicMaterial({
        color: config.accent,
        transparent: true,
        opacity: 0.08,
        depthTest: false,
        toneMapped: false
      })
    );
    activeHalo.position.z = 0.35;
    activeHalo.renderOrder = 6;
    station.add(activeHalo);

    const impactRing = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius + 0.28, 0.06, 8, 52),
      new THREE.MeshBasicMaterial({
        color: config.secondary,
        transparent: true,
        opacity: 0,
        depthTest: false,
        toneMapped: false
      })
    );
    impactRing.position.z = 0.52;
    impactRing.renderOrder = 8;
    station.add(impactRing);

    return {
      ...spec,
      station,
      gearRoot,
      gearMaterial,
      edgeMaterial,
      markerPivot,
      marker,
      gate,
      activeHalo,
      impactRing,
      impactLife: 0
    };
  }

  const gears = specs.map(buildGear);
  const sequence = [1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 2];
  let sequenceIndex = 0;
  let activeIndex = sequence[0];
  let noteDirection = gears[activeIndex].direction;
  let noteAngle = -noteDirection * 1.72;
  let callbacks = null;

  function prepareNote(next = true) {
    if (next) sequenceIndex = (sequenceIndex + 1) % sequence.length;
    activeIndex = sequence[sequenceIndex];
    noteDirection = gears[activeIndex].direction;
    noteAngle = -noteDirection * 1.72;
    gears.forEach((gear, index) => {
      const active = index === activeIndex;
      gear.marker.visible = active;
      gear.gate.material.opacity = active ? 0.96 : 0.12;
      gear.activeHalo.material.opacity = active ? 0.48 : 0.05;
      gear.gearMaterial.emissive.setHex(active ? config.accent : 0x12191b);
      gear.gearMaterial.emissiveIntensity = active ? 0.34 : 0.45;
      gear.edgeMaterial.emissiveIntensity = active ? 0.62 : 0.08;
      gear.station.scale.setScalar(active ? 1.04 : 1);
    });
    gears[activeIndex].markerPivot.rotation.z = noteAngle;
  }

  function flashGear(success) {
    const gear = gears[activeIndex];
    gear.impactLife = 0.42;
    gear.impactRing.material.color.setHex(success ? config.secondary : 0xff5b3d);
    gear.impactRing.material.opacity = 1;
    gear.impactRing.scale.setScalar(0.82);
  }

  function strike() {
    if (!callbacks || !state.started || state.cooldown > 0 || state.gameOverPending) return;
    const alignment = Math.abs(noteAngle);
    const hitWindow = Math.max(0.25, 0.36 - state.score * 0.006);
    if (alignment <= hitWindow) {
      const perfect = alignment <= 0.095;
      flashGear(true);
      callbacks.hit(perfect ? 2 : 1);
    } else {
      flashGear(false);
      callbacks.miss();
    }
    prepareNote();
  }

  function setProgress() {
    const progress = Math.max(0, 1 - Math.abs(noteAngle) / 1.72);
    const fill = document.querySelector('#power-fill');
    if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
    return progress;
  }

  return {
    reset() {
      sequenceIndex = 0;
      gears.forEach((gear) => {
        gear.gearRoot.rotation.z = 0;
        gear.impactLife = 0;
        gear.impactRing.material.opacity = 0;
      });
      prepareNote(false);
      setProgress();
    },
    controlDown: strike,
    pointerDown: strike,
    update(delta, elapsed, cb) {
      callbacks = cb;
      const tempo = 1.62 + Math.min(state.score, config.goal) * 0.045;
      gears.forEach((gear, index) => {
        gear.gearRoot.rotation.z += gear.direction * gear.ratio * tempo * delta;
        gear.marker.rotation.z -= delta * 2.8;
        if (gear.impactLife > 0) {
          gear.impactLife -= delta;
          const life = Math.max(0, gear.impactLife / 0.42);
          gear.impactRing.material.opacity = life;
          gear.impactRing.scale.setScalar(0.82 + (1 - life) * 0.48);
        }
        if (index !== activeIndex) gear.activeHalo.rotation.z -= delta * 0.18;
      });

      noteAngle += noteDirection * tempo * delta;
      const activeGear = gears[activeIndex];
      activeGear.markerPivot.rotation.z = noteAngle;
      const progress = setProgress();
      activeGear.activeHalo.rotation.z += delta * 0.65;
      activeGear.activeHalo.scale.setScalar(1 + progress * 0.055 + Math.sin(elapsed * 8) * 0.012);
      activeGear.activeHalo.material.opacity = 0.34 + progress * 0.58;
      activeGear.gate.scale.setScalar(1 + progress * 0.06);
      activeGear.marker.scale.setScalar(0.9 + progress * 0.45);

      const hitWindow = Math.max(0.25, 0.36 - state.score * 0.006);
      if (noteDirection * noteAngle > hitWindow * 1.28 && state.cooldown <= 0 && !state.gameOverPending) {
        flashGear(false);
        callbacks.miss();
        prepareNote();
      }
    },
    idle(delta, elapsed) {
      gears.forEach((gear, index) => {
        gear.gearRoot.rotation.z += gear.direction * gear.ratio * delta * 0.72;
        gear.activeHalo.rotation.z += delta * (index === activeIndex ? 0.5 : 0.12);
      });
      const activeGear = gears[activeIndex];
      activeGear.activeHalo.material.opacity = 0.35 + Math.sin(elapsed * 2.4) * 0.16;
      activeGear.marker.rotation.z -= delta * 2.2;
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
  let keyboardActive = false;
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
      keyboardActive = false;
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
    keyboard(delta, keys) {
      const direction = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0)
        - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      keyboardActive = direction !== 0;
      if (direction) angle = THREE.MathUtils.clamp(angle + direction * delta * 1.15, -0.68, 0.68);
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
      const active = state.pointerDown || keyboardActive;
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

function setupTiming(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const paddle = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.18, 48),
    material(config.secondary)
  );
  paddle.position.set(0, -1.65, -3.1);
  group.add(paddle);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), material(config.accent));
  ball.position.set(0, 0.15, -3.1);
  group.add(ball);

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.04, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
  );
  rail.position.set(0, 0.15, -3.25);
  group.add(rail);

  const cargo = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.82, 0.9), material(config.accent));
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.86, 0.94), material(config.secondary));
  const cargoRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.05, 8, 44),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.5 })
  );
  cargo.position.set(0, 2.05, -3.1);
  cargo.add(crate, strap, cargoRing);
  group.add(cargo);

  const guide = new THREE.Mesh(
    new THREE.TorusGeometry(config.threshold, 0.035, 8, 64),
    new THREE.MeshBasicMaterial({ color: config.secondary, transparent: true, opacity: 0.55 })
  );
  guide.rotation.x = Math.PI / 2;
  guide.position.copy(paddle.position).add(new THREE.Vector3(0, 0.2, 0));
  group.add(guide);

  const dropGuide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([ball.position, paddle.position]),
    new THREE.LineDashedMaterial({ color: config.secondary, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.48 })
  );
  dropGuide.computeLineDistances();
  group.add(dropGuide);

  let phase = 0;
  let mode = 'ready';
  let motionTime = 0;
  let releaseX = 0;
  let releaseDistance = 0;
  let resultSent = false;
  const readyY = 0.15;
  const contactY = -1.13;
  const cargoHitY = 1.22;

  function setDropGuide() {
    dropGuide.geometry.setFromPoints([
      new THREE.Vector3(ball.position.x, ball.position.y - 0.48, ball.position.z),
      new THREE.Vector3(ball.position.x, paddle.position.y + 0.22, ball.position.z)
    ]);
    dropGuide.computeLineDistances();
  }

  function attempt() {
    if (!state.started || state.cooldown > 0 || mode !== 'ready') return;
    releaseX = ball.position.x;
    releaseDistance = Math.abs(releaseX - paddle.position.x);
    motionTime = 0;
    resultSent = false;
    mode = 'falling';
    dropGuide.visible = false;
  }

  function returnToRail() {
    mode = 'ready';
    motionTime = 0;
    resultSent = false;
    ball.visible = true;
    ball.position.y = readyY;
    cargo.scale.setScalar(1);
    paddle.scale.set(1, 1, 1);
    dropGuide.visible = true;
  }

  let callbacks = null;
  return {
    reset() {
      phase = 0;
      ball.position.set(0, readyY, -3.1);
      returnToRail();
    },
    controlDown: attempt,
    pointerDown: attempt,
    update(delta, elapsed, cb) {
      callbacks = cb;
      ball.rotation.x += delta * 1.4;
      ball.rotation.y += delta * 2;
      cargo.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
      cargoRing.rotation.z += delta * 0.7;
      guide.rotation.z += delta * 0.5;

      if (mode === 'ready') {
        ball.position.x = Math.sin(elapsed * config.speed + phase) * 3.15;
        ball.position.y = readyY;
        const alignment = Math.max(0, 1 - Math.abs(ball.position.x) / 2.2);
        guide.material.opacity = 0.28 + alignment * 0.62;
        guide.scale.setScalar(0.96 + alignment * 0.08);
        dropGuide.material.color.setHex(Math.abs(ball.position.x) < config.threshold ? config.secondary : config.accent);
        dropGuide.material.opacity = Math.abs(ball.position.x) < config.threshold ? 0.78 : 0.3;
        setDropGuide();
        document.querySelector('#power-fill').style.width = `${Math.round(alignment * 100)}%`;
      } else if (mode === 'falling') {
        motionTime += delta;
        const progress = Math.min(1, motionTime / 0.38);
        ball.position.x = releaseX;
        ball.position.y = THREE.MathUtils.lerp(readyY, contactY, progress * progress);
        if (progress >= 1) {
          motionTime = 0;
          if (releaseDistance < config.threshold) {
            mode = 'rebounding';
            paddle.scale.set(1.12, 0.55, 1.12);
          } else {
            mode = 'missing';
          }
        }
      } else if (mode === 'rebounding') {
        motionTime += delta;
        const progress = Math.min(1, motionTime / 0.58);
        const eased = 1 - (1 - progress) ** 2;
        ball.position.x = THREE.MathUtils.lerp(releaseX, 0, eased);
        ball.position.y = THREE.MathUtils.lerp(contactY, cargoHitY, eased);
        paddle.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 10));
        if (progress >= 1 && !resultSent) {
          resultSent = true;
          cargo.scale.setScalar(1.16);
          callbacks.hit(releaseDistance < config.threshold * 0.35 ? 2 : 1);
          phase += 0.9;
          motionTime = 0;
          mode = 'resetting';
        }
      } else if (mode === 'missing') {
        motionTime += delta;
        const progress = Math.min(1, motionTime / 0.42);
        ball.position.x = releaseX + Math.sign(releaseX || 1) * progress * 0.35;
        ball.position.y = contactY - progress * progress * 1.25;
        if (progress > 0.28 && !resultSent) {
          resultSent = true;
          callbacks.miss();
        }
        if (progress >= 1) {
          motionTime = 0;
          mode = 'resetting';
        }
      } else if (mode === 'resetting') {
        motionTime += delta;
        cargo.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 9));
        if (motionTime >= 0.34) returnToRail();
      }
    },
    idle(delta, elapsed) {
      ball.visible = true;
      ball.position.x = Math.sin(elapsed * config.speed) * 3.15;
      ball.position.y = readyY;
      ball.rotation.y += delta;
      cargo.rotation.y += delta * 0.2;
      cargoRing.rotation.z += delta * 0.55;
      dropGuide.visible = true;
      setDropGuide();
    }
  };
}

function setupSteer(day, config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const maxX = 2.7;
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
      state.targetX = point.x * maxX;
      if (config.axes === 2) state.targetY = point.y * 2.25;
    },
    pointerDown(point) {
      state.targetX = point.x * maxX;
      if (config.axes === 2) state.targetY = point.y * 2.25;
    },
    keyboard(delta, keys) {
      const horizontal = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0)
        - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const vertical = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0)
        - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      if (horizontal) state.targetX = THREE.MathUtils.clamp(state.targetX + horizontal * delta * 5.2, -maxX, maxX);
      if (config.axes === 2 && vertical) state.targetY = THREE.MathUtils.clamp(state.targetY + vertical * delta * 4.4, -2.25, 2.25);
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

function setupMagnet(config, world, state) {
  const group = new THREE.Group();
  world.add(group);
  const colors = [config.accent, config.secondary];

  const leftMagnet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.7, 20), material(colors[0]));
  const rightMagnet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.7, 20), material(colors[1]));
  leftMagnet.rotation.z = Math.PI / 2;
  rightMagnet.rotation.z = Math.PI / 2;
  leftMagnet.position.set(-3.65, -0.4, -2.9);
  rightMagnet.position.set(3.65, -0.4, -2.9);
  group.add(leftMagnet, rightMagnet);

  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 14), material(0x30383a));
  const rightRail = leftRail.clone();
  leftRail.position.set(-3.25, -0.4, -3.5);
  rightRail.position.set(3.25, -0.4, -3.5);
  group.add(leftRail, rightRail);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.54, 28, 18), material(colors[0]));
  ball.position.set(0, -0.4, 2);
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.07, 8, 48),
    new THREE.MeshBasicMaterial({ color: colors[0] })
  );
  orbit.position.copy(ball.position);
  const forceArrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 12), material(colors[0]));
  forceArrow.position.copy(ball.position).add(new THREE.Vector3(0, 0.95, 0));
  group.add(ball, orbit, forceArrow);

  const indicators = colors.map((color, index) => {
    const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), material(color));
    indicator.position.set((index ? 0.3 : -0.3), 1.65, 1.7);
    indicator.scale.setScalar(index === 0 ? 1.5 : 0.8);
    group.add(indicator);
    return indicator;
  });

  const forceLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: config.secondary, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.42 })
  );
  group.add(forceLines);

  const gates = [];
  for (let i = 0; i < 4; i += 1) {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 12, 52), material(0xd9ff43));
    gate.position.set(i % 2 ? 1.8 : -1.8, -0.4, -8 - i * 7);
    gate.userData.checked = false;
    group.add(gate);
    gates.push(gate);
  }

  let polarity = 0;
  let velocityX = 0;
  let callbacks = null;

  function direction() {
    return polarity === 0 ? 1 : -1;
  }

  function refreshPolarity() {
    const color = colors[polarity];
    ball.material.color.setHex(color);
    ball.material.emissive.setHex(color);
    orbit.material.color.setHex(color);
    forceArrow.material.color.setHex(color);
    forceArrow.material.emissive.setHex(color);
    forceArrow.rotation.z = direction() > 0 ? -Math.PI / 2 : Math.PI / 2;
    indicators.forEach((indicator, index) => indicator.scale.setScalar(index === polarity ? 1.5 : 0.8));
  }

  function toggle() {
    if (!state.started || state.cooldown > 0) return;
    polarity = (polarity + 1) % 2;
    refreshPolarity();
  }

  function updateForceLines() {
    forceLines.geometry.setFromPoints([
      leftMagnet.position, ball.position,
      ball.position, rightMagnet.position
    ]);
    forceLines.computeLineDistances();
  }

  return {
    reset() {
      polarity = 0;
      velocityX = 0;
      ball.position.set(0, -0.4, 2);
      gates.forEach((gate, index) => {
        gate.position.set(index % 2 ? 1.8 : -1.8, -0.4, -8 - index * 7);
        gate.userData.checked = false;
      });
      refreshPolarity();
      updateForceLines();
    },
    controlDown: toggle,
    pointerDown: toggle,
    update(delta, elapsed, cb) {
      callbacks = cb;
      velocityX += direction() * delta * (4.2 + Math.min(1.8, state.score * 0.08));
      velocityX *= Math.max(0, 1 - delta * 1.35);
      ball.position.x += velocityX * delta;
      if (Math.abs(ball.position.x) > 3.05) {
        ball.position.x = Math.sign(ball.position.x) * 3.02;
        velocityX = -Math.sign(ball.position.x) * 1.6;
      }
      ball.rotation.y += delta * velocityX * 1.4;
      orbit.position.copy(ball.position);
      orbit.rotation.z += delta * direction() * 2.1;
      forceArrow.position.copy(ball.position).add(new THREE.Vector3(0, 0.95, 0));
      updateForceLines();

      const speed = 3.7 + Math.min(2.6, state.score * 0.1);
      gates.forEach((gate) => {
        gate.position.z += delta * speed;
        gate.rotation.z += delta * 0.6;
        if (!gate.userData.checked && gate.position.z > 1.55) {
          gate.userData.checked = true;
          if (Math.abs(ball.position.x - gate.position.x) < 1.3) callbacks.hit(1);
          else callbacks.miss();
          ball.position.x = 0;
          velocityX = 0;
          polarity = 0;
          refreshPolarity();
        }
        if (gate.position.z > 5) {
          gate.position.z = Math.min(...gates.map((item) => item.position.z)) - 7;
          gate.position.x = Math.sin((state.score + gate.position.z) * 1.37) > 0 ? 1.8 : -1.8;
          gate.userData.checked = false;
        }
      });
      document.querySelector('#power-fill').style.width = `${Math.round(((ball.position.x + 3.05) / 6.1) * 100)}%`;
    },
    idle(delta, elapsed) {
      ball.position.x = Math.sin(elapsed * 0.8) * 0.7;
      ball.position.y = -0.4 + Math.sin(elapsed * 2) * 0.08;
      orbit.position.copy(ball.position);
      orbit.rotation.z += delta;
      forceArrow.position.copy(ball.position).add(new THREE.Vector3(0, 0.95, 0));
      updateForceLines();
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

function setupAim(day, config, world, state, camera) {
  const group = new THREE.Group();
  world.add(group);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 18), material(config.accent));
  ball.position.set(0, -1.75, 2.5);
  const ballHitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 16, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  ball.add(ballHitArea);
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
    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(5.3, 0.12, 13.5),
      new THREE.MeshStandardMaterial({ color: 0x59676a, emissive: 0x172224, emissiveIntensity: 0.28, roughness: 0.72 })
    );
    lane.position.set(0, -1.98, -2.1);
    const leftGutter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 13.5), material(config.secondary));
    const rightGutter = leftGutter.clone();
    leftGutter.position.set(-2.72, -1.88, -2.1);
    rightGutter.position.set(2.72, -1.88, -2.1);
    group.add(lane, leftGutter, rightGutter);
    const pinLayout = [[0, 0], [-0.32, -0.38], [0.32, -0.38], [-0.62, -0.78], [0, -0.78], [0.62, -0.78]];
    pinLayout.forEach(([x, z], index) => {
      const pin = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.58, 6, 12), material(0xf8f4df, 0x6b6b62));
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 20), material(config.accent));
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = 0.13;
      pin.add(stripe);
      pin.position.set(x * 1.28, -1.33, z * 1.28);
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
  let shotPower = 0;
  let callbacks = null;
  const raycaster = new THREE.Raycaster();

  function resetBall() {
    ball.position.set(0, -1.75, 2.5);
    velocity.set(0, 0, 0);
    rolling = false;
    crossed = false;
    shotPower = 0;
    aimLine.visible = false;
    document.querySelector('#power-fill').style.width = '0%';
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
      raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
      if (!raycaster.intersectObject(ballHitArea, false).length) return;
      dragging = true;
      dragStart = point;
      aimLine.visible = true;
    },
    pointerMove(point) {
      if (!dragging || rolling) return;
      const dx = point.x - dragStart.x;
      const power = Math.min(1, Math.hypot(dx, point.y - dragStart.y));
      shotPower = power;
      const end = ball.position.clone().add(new THREE.Vector3(-dx * 5, 0.03, -2 - power * 3));
      aimLine.geometry.setFromPoints([ball.position, end]);
      aimLine.geometry.attributes.position.needsUpdate = true;
      document.querySelector('#power-fill').style.width = `${Math.round(power * 100)}%`;
    },
    pointerUp(point) {
      if (!dragging || rolling) return;
      dragging = false;
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      const power = Math.max(0.25, Math.min(1, Math.hypot(dx, dy)));
      shotPower = power;
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
        const distance = Math.abs(ball.position.x - target.position.x);
        if (config.shape === 'bowling') {
          const knocked = distance < 1.4
            ? Math.max(1, Math.min(pins.length, Math.round((1.4 - distance) * 3.2 + shotPower * 3.2)))
            : 0;
          if (knocked > 0) {
            const localBallX = ball.position.x - target.position.x;
            [...pins]
              .sort((a, b) => Math.abs(a.userData.home.x - localBallX) - Math.abs(b.userData.home.x - localBallX))
              .slice(0, knocked)
              .forEach((pin, index) => {
                pin.rotation.z = (pin.userData.home.x < localBallX ? -1 : 1) * (0.9 + index * 0.1);
                pin.position.x += (pin.userData.home.x - localBallX) * 0.25;
              });
            callbacks.hit(Math.max(1, Math.ceil(knocked / 2)));
          } else callbacks.miss();
        } else if (distance < 0.76 && ball.position.y < -1.05) {
          callbacks.hit(1);
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
  const object = new THREE.Mesh(new THREE.TorusKnotGeometry(0.72, 0.22, 88, 14), material(config.secondary));
  object.position.set(-2.05, 0.05, -3.5);
  group.add(object);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.35, 3.55),
    new THREE.MeshStandardMaterial({ color: 0xc9c5ad, roughness: 0.94, metalness: 0.02 })
  );
  screen.position.set(1.2, 0, -6.2);
  group.add(screen);

  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.68, toneMapped: false });
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 0.06), frameMaterial);
  const frameBottom = frameTop.clone();
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.65, 0.06), frameMaterial);
  const frameRight = frameLeft.clone();
  frameTop.position.set(1.2, 1.8, -6.1);
  frameBottom.position.set(1.2, -1.8, -6.1);
  frameLeft.position.set(-1.02, 0, -6.1);
  frameRight.position.set(3.42, 0, -6.1);
  group.add(frameTop, frameBottom, frameLeft, frameRight);

  const shadow = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.27, 16, 64),
    new THREE.MeshBasicMaterial({ color: 0x17191b, transparent: true, opacity: 0.86, depthTest: false, depthWrite: false })
  );
  shadow.position.set(1.2, 0, -5.94);
  shadow.renderOrder = 7;
  group.add(shadow);

  const target = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.095, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd9ff43,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    })
  );
  target.position.set(1.2, 0, -5.88);
  target.renderOrder = 9;
  group.add(target);

  const lockRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.47, 0.035, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x7cff9f, transparent: true, opacity: 0.12, depthTest: false, toneMapped: false })
  );
  lockRing.position.set(1.2, 0, -5.84);
  lockRing.renderOrder = 10;
  group.add(lockRing);

  const lightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), material(config.accent));
  const lightHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.045, 8, 42),
    new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.72 })
  );
  group.add(lightMarker);
  group.add(lightHalo);
  const lightBeam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: config.accent, transparent: true, opacity: 0.68, toneMapped: false })
  );
  const projectionBeam = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.48, toneMapped: false })
  );
  group.add(lightBeam, projectionBeam);
  let angle = -1.2;
  let targetAngle = 0.65;
  let holdTime = 0;
  let failTime = 0;

  function setAngle(point) {
    angle = point.x * 1.5;
  }

  function updateLightPath() {
    lightMarker.position.set(Math.sin(angle) * 3.4, 1.85, -2.1 + Math.cos(angle) * 0.8);
    lightHalo.position.copy(lightMarker.position);
    lightBeam.geometry.setFromPoints([lightMarker.position, object.position]);
    projectionBeam.geometry.setFromPoints([
      object.position, new THREE.Vector3(0.35, 1.05, -5.96),
      object.position, new THREE.Vector3(1.2, 0, -5.96),
      object.position, new THREE.Vector3(2.05, -1.05, -5.96)
    ]);
  }

  return {
    reset() {
      angle = -1.2;
      targetAngle = 0.65;
      holdTime = 0;
      failTime = 0;
      target.material.color.setHex(0xd9ff43);
      shadow.material.color.setHex(0x17191b);
      updateLightPath();
    },
    pointerDown: setAngle,
    pointerMove(point) {
      if (state.pointerDown) setAngle(point);
    },
    keyboard(delta, keys) {
      const direction = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0)
        - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      if (direction) angle = THREE.MathUtils.clamp(angle + direction * delta * 1.25, -1.5, 1.5);
    },
    update(delta, elapsed, { hit, miss }) {
      updateLightPath();
      object.rotation.x += delta * 0.12;
      object.rotation.y += delta * 0.22;
      lightHalo.rotation.z -= delta * 0.8;
      shadow.scale.x = 0.72 + Math.abs(Math.sin(angle)) * 0.7;
      shadow.rotation.z = angle * 0.22;
      target.scale.x = 0.72 + Math.abs(Math.sin(targetAngle)) * 0.7;
      target.rotation.z = targetAngle * 0.22;
      lockRing.scale.copy(target.scale).multiplyScalar(1.06);
      lockRing.rotation.z = target.rotation.z;
      const distance = Math.abs(angle - targetAngle);
      if (distance < 0.16) {
        holdTime += delta;
        failTime = Math.max(0, failTime - delta * 1.5);
        shadow.material.color.setHex(0x45e58a);
        target.material.color.setHex(0x7cff9f);
        target.material.opacity = 0.72 + Math.sin(elapsed * 9) * 0.18;
        if (holdTime > 1) {
          hit(2);
          let nextAngle = -targetAngle * 0.82 + Math.sin(state.score) * 0.32;
          if (Math.abs(nextAngle - angle) < 0.34) nextAngle = THREE.MathUtils.clamp(nextAngle + (nextAngle > 0 ? -0.58 : 0.58), -1.15, 1.15);
          targetAngle = nextAngle;
          holdTime = 0;
          failTime = 0;
        }
      } else {
        holdTime = Math.max(0, holdTime - delta * 1.8);
        failTime += delta;
        shadow.material.color.setHex(0x17191b);
        target.material.color.setHex(0xd9ff43);
        target.material.opacity = 0.96;
        if (failTime > 9) {
          miss();
          failTime = 0;
        }
      }
      const progress = Math.min(1, holdTime);
      lockRing.material.opacity = 0.12 + progress * 0.88;
      lockRing.scale.multiplyScalar(1 + (1 - progress) * 0.08);
      projectionBeam.material.opacity = distance < 0.16 ? 0.72 : 0.48;
      document.querySelector('#power-fill').style.width = `${Math.round(Math.min(1, holdTime) * 100)}%`;
    },
    idle(delta, elapsed) {
      angle = Math.sin(elapsed * 0.55) * 1.1;
      updateLightPath();
      lightHalo.rotation.z -= delta * 0.8;
      object.rotation.x += delta * 0.12;
      object.rotation.y += delta * 0.22;
      shadow.scale.x = 0.72 + Math.abs(Math.sin(angle)) * 0.7;
      shadow.rotation.z = angle * 0.22;
      target.scale.x = 0.72 + Math.abs(Math.sin(targetAngle)) * 0.7;
      target.rotation.z = targetAngle * 0.22;
      lockRing.scale.copy(target.scale).multiplyScalar(1.12);
      lockRing.rotation.z = target.rotation.z;
    }
  };
}
