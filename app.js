const palettes = {
  mist: {
    name: "櫻霧粉",
    accent: "#df6b9b",
    background: ["#fff6f8", "#fff1e6", "#f8fbff"],
    petals: ["#ffc7da", "#ff8eb5", "#ffe6ee", "#ffd5b8"],
    glow: "rgba(255, 159, 196, 0.24)"
  },
  sunset: {
    name: "晚霞桃",
    accent: "#d06356",
    background: ["#fff7f2", "#ffe7d8", "#fff2ef"],
    petals: ["#ffb997", "#ff7a8f", "#ffd9c7", "#ffd166"],
    glow: "rgba(255, 153, 111, 0.25)"
  },
  lilac: {
    name: "藤霜紫",
    accent: "#8f68c7",
    background: ["#faf6ff", "#f5ecff", "#f8f8ff"],
    petals: ["#d9c4ff", "#bc8cff", "#f7e9ff", "#9cb1ff"],
    glow: "rgba(174, 133, 255, 0.25)"
  },
  jade: {
    name: "春玉綠",
    accent: "#50a38b",
    background: ["#f4fff8", "#e5f7ef", "#f7fffd"],
    petals: ["#96e7c7", "#d8ffe9", "#c6f2df", "#ffd7e8"],
    glow: "rgba(120, 213, 182, 0.24)"
  }
};

const modes = {
  drift: {
    name: "雪舞長尾",
    emission: 1,
    flow: 0.55,
    sway: 0.42,
    fade: 0.0095,
    spread: 0.65,
    sparkle: false
  },
  comet: {
    name: "彗尾光流",
    emission: 1.45,
    flow: 0.25,
    sway: 0.18,
    fade: 0.008,
    spread: 0.38,
    sparkle: true
  },
  bloom: {
    name: "繁櫻盛放",
    emission: 1.7,
    flow: 0.7,
    sway: 0.35,
    fade: 0.011,
    spread: 1.05,
    sparkle: true
  },
  ribbon: {
    name: "絲帶輕曳",
    emission: 0.85,
    flow: 0.32,
    sway: 0.16,
    fade: 0.0075,
    spread: 0.24,
    sparkle: false
  }
};

const shapes = {
  petal: "經典花瓣",
  blossom: "五瓣櫻花",
  heart: "花心愛瓣",
  snow: "落雪晶片"
};

const STORAGE_KEY = "sakura-tail-preferences";

const state = {
  paletteKey: "mist",
  modeKey: "drift",
  shapeKey: "petal",
  density: 6,
  tailLength: 72,
  wind: 28,
  particles: [],
  pointer: {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    speed: 0,
    active: false,
    type: "等待互動"
  },
  dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
  deferredInstallPrompt: null
};

const canvas = document.getElementById("sakuraCanvas");
const ctx = canvas.getContext("2d");
const installButton = document.getElementById("installButton");
const burstButton = document.getElementById("burstButton");
const installHint = document.getElementById("installHint");
const modeBadge = document.getElementById("modeBadge");
const paletteBadge = document.getElementById("paletteBadge");
const deviceBadge = document.getElementById("deviceBadge");

const paletteSelect = document.getElementById("paletteSelect");
const modeSelect = document.getElementById("modeSelect");
const shapeSelect = document.getElementById("shapeSelect");

const densityRange = document.getElementById("densityRange");
const lengthRange = document.getElementById("lengthRange");
const windRange = document.getElementById("windRange");

const densityValue = document.getElementById("densityValue");
const lengthValue = document.getElementById("lengthValue");
const windValue = document.getElementById("windValue");

const chipButtons = [...document.querySelectorAll(".palette-chip")];

loadPreferences();

function populateSelect(select, options) {
  Object.entries(options).forEach(([value, option]) => {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = typeof option === "string" ? option : option.name;
    select.appendChild(element);
  });
}

populateSelect(paletteSelect, palettes);
populateSelect(modeSelect, modes);
populateSelect(shapeSelect, shapes);

paletteSelect.value = state.paletteKey;
modeSelect.value = state.modeKey;
shapeSelect.value = state.shapeKey;
densityRange.value = `${state.density}`;
lengthRange.value = `${state.tailLength}`;
windRange.value = `${state.wind}`;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * state.dpr);
  canvas.height = Math.floor(rect.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function loadPreferences() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.paletteKey && palettes[parsed.paletteKey]) {
      state.paletteKey = parsed.paletteKey;
    }
    if (parsed.modeKey && modes[parsed.modeKey]) {
      state.modeKey = parsed.modeKey;
    }
    if (parsed.shapeKey && shapes[parsed.shapeKey]) {
      state.shapeKey = parsed.shapeKey;
    }

    state.density = clampValue(parsed.density, 2, 16, state.density);
    state.tailLength = clampValue(parsed.tailLength, 32, 160, state.tailLength);
    state.wind = clampValue(parsed.wind, 0, 60, state.wind);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persistPreferences() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      paletteKey: state.paletteKey,
      modeKey: state.modeKey,
      shapeKey: state.shapeKey,
      density: state.density,
      tailLength: state.tailLength,
      wind: state.wind
    }));
  } catch {
    // Ignore storage failures so the canvas experience always stays usable.
  }
}

function clampValue(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numeric));
}

function updateTheme() {
  const palette = palettes[state.paletteKey];
  document.documentElement.style.setProperty("--accent", palette.accent);
  document.documentElement.style.setProperty("--accent-strong", shadeColor(palette.accent, -18));
  document.documentElement.style.setProperty("--bg-top", palette.background[0]);
  document.documentElement.style.setProperty("--bg-mid", palette.background[1]);
  document.documentElement.style.setProperty("--bg-bottom", palette.background[2]);
  paletteBadge.textContent = palette.name;

  chipButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.palette === state.paletteKey);
  });
}

function shadeColor(hex, amount) {
  const clean = hex.replace("#", "");
  const num = Number.parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function syncBadges() {
  modeBadge.textContent = modes[state.modeKey].name;
  deviceBadge.textContent = state.pointer.type;
  densityValue.textContent = `${state.density}`;
  lengthValue.textContent = `${state.tailLength}`;
  windValue.textContent = `${state.wind}`;
}

function spawnParticle(x, y, velocityScale = 1) {
  const palette = palettes[state.paletteKey];
  const mode = modes[state.modeKey];
  const colors = palette.petals;
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.4 + Math.random() * 1.8 + state.pointer.speed * 0.035) * velocityScale;
  const size = 4 + Math.random() * 10;
  const life = state.tailLength * (0.45 + Math.random() * 0.6);

  state.particles.push({
    x,
    y,
    vx: Math.cos(angle) * speed * mode.spread + (Math.random() - 0.5) * 1.1,
    vy: Math.sin(angle) * speed * mode.spread - (0.5 + Math.random() * 0.8),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.08,
    size,
    life,
    maxLife: life,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: state.shapeKey,
    sparkle: mode.sparkle && Math.random() > 0.55
  });

  if (state.particles.length > 1400) {
    state.particles.shift();
  }
}

function emitTrail(x, y, force = 1) {
  const mode = modes[state.modeKey];
  const count = Math.max(1, Math.round(state.density * mode.emission * force));
  for (let index = 0; index < count; index += 1) {
    const jitter = 7 + state.pointer.speed * 0.08;
    spawnParticle(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      force
    );
  }
}

function burstAt(x, y, strength = 1.6) {
  const total = Math.round(state.density * 10 * strength);
  for (let index = 0; index < total; index += 1) {
    spawnParticle(x, y, 1.4 + Math.random() * strength);
  }
}

function drawPetal(particle, alpha) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.scale(1, 0.86 + Math.sin(particle.rotation) * 0.06);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;

  const size = particle.size;
  switch (particle.shape) {
    case "blossom":
      for (let index = 0; index < 5; index += 1) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * index) / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(size * 0.18, -size * 0.22, size * 0.82, -size * 0.3, 0, -size);
        ctx.bezierCurveTo(-size * 0.82, -size * 0.3, -size * 0.18, -size * 0.22, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(255, 244, 171, 0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "heart":
      ctx.beginPath();
      ctx.moveTo(0, size * 0.3);
      ctx.bezierCurveTo(size, -size * 0.3, size * 0.72, -size, 0, -size * 0.28);
      ctx.bezierCurveTo(-size * 0.72, -size, -size, -size * 0.3, 0, size * 0.3);
      ctx.fill();
      break;
    case "snow":
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(1.1, size * 0.12);
      for (let branch = 0; branch < 6; branch += 1) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size);
        ctx.moveTo(0, -size * 0.48);
        ctx.lineTo(size * 0.22, -size * 0.7);
        ctx.moveTo(0, -size * 0.48);
        ctx.lineTo(-size * 0.22, -size * 0.7);
        ctx.stroke();
      }
      break;
    default:
      ctx.beginPath();
      ctx.moveTo(0, size * 0.82);
      ctx.bezierCurveTo(size * 0.86, size * 0.1, size * 0.7, -size * 0.86, 0, -size);
      ctx.bezierCurveTo(-size * 0.7, -size * 0.86, -size * 0.86, size * 0.1, 0, size * 0.82);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.ellipse(-size * 0.12, -size * 0.34, size * 0.14, size * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  if (particle.sparkle) {
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, particle.size * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBackgroundGlow() {
  const palette = palettes[state.paletteKey];
  const gradient = ctx.createRadialGradient(
    canvas.clientWidth * 0.35,
    canvas.clientHeight * 0.24,
    10,
    canvas.clientWidth * 0.35,
    canvas.clientHeight * 0.24,
    canvas.clientWidth * 0.6
  );
  gradient.addColorStop(0, palette.glow);
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function animate() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawBackgroundGlow();

  const mode = modes[state.modeKey];
  const wind = (state.wind / 60) * 0.35;
  const gravity = 0.015 + mode.flow * 0.018;

  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    particle.life -= 1;

    if (particle.life <= 0) {
      state.particles.splice(index, 1);
      continue;
    }

    const age = 1 - particle.life / particle.maxLife;
    particle.vx += Math.sin((performance.now() * 0.0015) + particle.y * 0.012) * mode.sway * 0.02;
    particle.vx += wind * 0.02;
    particle.vy += gravity;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.rotationSpeed;

    const alpha = Math.max(0, 1 - age * (1.35 + mode.fade * 30));
    drawPetal(particle, alpha);
  }

  if (state.pointer.active) {
    const shimmer = 0.14 + Math.min(0.25, state.pointer.speed * 0.003);
    ctx.save();
    ctx.globalAlpha = shimmer;
    ctx.fillStyle = palettes[state.paletteKey].accent;
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, 18 + Math.sin(performance.now() * 0.01) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(animate);
}

function setPointer(x, y, type, emit = true) {
  const previousX = state.pointer.x;
  const previousY = state.pointer.y;
  state.pointer.speed = state.pointer.active ? Math.hypot(x - previousX, y - previousY) : 0;
  state.pointer.lastX = previousX;
  state.pointer.lastY = previousY;
  state.pointer.x = x;
  state.pointer.y = y;
  state.pointer.type = type;
  state.pointer.active = true;
  syncBadges();

  if (emit) {
    const force = Math.max(0.6, Math.min(2.1, state.pointer.speed / 18));
    emitTrail(x, y, force);
  }
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  setPointer(x, y, pointerLabel(event.pointerType));
}

canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  handlePointerMove(event);
  burstAt(state.pointer.x, state.pointer.y, 1.2);
});
canvas.addEventListener("pointerenter", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.pointer.lastX = event.clientX - rect.left;
  state.pointer.lastY = event.clientY - rect.top;
});
canvas.addEventListener("pointerleave", () => {
  state.pointer.active = false;
  state.pointer.type = "等待互動";
  syncBadges();
});
canvas.addEventListener("pointerup", () => {
  state.pointer.active = false;
  state.pointer.type = "等待互動";
  syncBadges();
});
canvas.addEventListener("pointercancel", () => {
  state.pointer.active = false;
  state.pointer.type = "等待互動";
  syncBadges();
});

burstButton.addEventListener("click", () => {
  const centerX = canvas.clientWidth / 2;
  const centerY = canvas.clientHeight / 2;
  burstAt(centerX, centerY, 1.9);

  window.setTimeout(() => burstAt(centerX * 0.72, centerY * 0.84, 1.3), 140);
  window.setTimeout(() => burstAt(centerX * 1.18, centerY * 0.66, 1.3), 240);
});

paletteSelect.addEventListener("change", (event) => {
  state.paletteKey = event.target.value;
  updateTheme();
  persistPreferences();
});

modeSelect.addEventListener("change", (event) => {
  state.modeKey = event.target.value;
  syncBadges();
  persistPreferences();
});

shapeSelect.addEventListener("change", (event) => {
  state.shapeKey = event.target.value;
  persistPreferences();
});

densityRange.addEventListener("input", (event) => {
  state.density = Number(event.target.value);
  syncBadges();
  persistPreferences();
});

lengthRange.addEventListener("input", (event) => {
  state.tailLength = Number(event.target.value);
  syncBadges();
  persistPreferences();
});

windRange.addEventListener("input", (event) => {
  state.wind = Number(event.target.value);
  syncBadges();
  persistPreferences();
});

chipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.paletteKey = button.dataset.palette;
    paletteSelect.value = state.paletteKey;
    updateTheme();
    persistPreferences();
  });
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  installButton.hidden = false;
  installButton.disabled = false;
  installHint.textContent = "這個裝置支援快速安裝，按一下就能加到主畫面。";
});

window.addEventListener("appinstalled", () => {
  installHint.textContent = "已安裝完成，之後可直接從主畫面打開櫻花鼠尾。";
  installButton.disabled = true;
});

installButton.addEventListener("click", async () => {
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    const result = await state.deferredInstallPrompt.userChoice;
    installHint.textContent =
      result.outcome === "accepted"
        ? "安裝邀請已接受，主畫面上就能直接開啟。"
        : "你先取消了安裝；之後還是可以再按一次。";
    state.deferredInstallPrompt = null;
    installButton.disabled = result.outcome === "accepted";
    return;
  }

  if (isIos()) {
    installHint.textContent = "iPhone / iPad 請用 Safari 的分享按鈕，選「加入主畫面」。";
    return;
  }

  installHint.textContent = "若看不到安裝視窗，請用瀏覽器選單中的「安裝應用程式」或「加入主畫面」。";
});

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function pointerLabel(pointerType) {
  if (pointerType === "touch") {
    return "指尖滑行";
  }

  if (pointerType === "pen") {
    return "筆尖流光";
  }

  return "滑鼠舞動";
}

function seedIntroTrail() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const points = [
    [width * 0.18, height * 0.42],
    [width * 0.34, height * 0.35],
    [width * 0.52, height * 0.5],
    [width * 0.68, height * 0.41],
    [width * 0.82, height * 0.58]
  ];

  points.forEach(([x, y], index) => {
    window.setTimeout(() => burstAt(x, y, 1.2), index * 160);
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("sw.js").catch(() => {
    installHint.textContent = "離線快取暫時無法啟用，但互動功能仍可正常使用。";
  });
}

function primeInstallHint() {
  installHint.textContent = isIos()
    ? "iPhone / iPad 可用 Safari 的分享選單加入主畫面。"
    : "可先直接遊玩；若瀏覽器支援，安裝鍵會呼叫安裝視窗。";
}

updateTheme();
syncBadges();
resizeCanvas();
seedIntroTrail();
animate();
primeInstallHint();
registerServiceWorker();
