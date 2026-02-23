// ============================================================
// KEY QUEST: RISE OF THE GOD
// A Pokémon-style adventure + Haunted Mansion dungeon crawler
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ── Constants ────────────────────────────────────────────────
const TILE = 40;
const COLS = W / TILE;   // 20
const ROWS = H / TILE;   // 15

const RANKS = [
  { name: 'Noob',    color: '#8BC34A', threshold: 0,  moves: ['Slap'] },
  { name: 'Amateur', color: '#FFEB3B', threshold: 10, moves: ['Slap', 'Punch'] },
  { name: 'Pro',     color: '#FF9800', threshold: 20, moves: ['Slap', 'Punch', 'Fireball'] },
  { name: 'Master',  color: '#F44336', threshold: 30, moves: ['Slap', 'Punch', 'Fireball', 'Thunder'] },
  { name: 'Hacker',  color: '#9C27B0', threshold: 40, moves: ['Slap', 'Punch', 'Fireball', 'Thunder', 'Void Strike'] },
  { name: 'God',     color: '#00E5FF', threshold: 50, moves: ['Slap', 'Punch', 'Fireball', 'Thunder', 'Void Strike', 'Divine Wrath'] },
];

const MOVE_DATA = {
  'Slap':         { dmg: 1, color: '#fff' },
  'Punch':        { dmg: 2, color: '#FFA726' },
  'Fireball':     { dmg: 3, color: '#FF5722' },
  'Thunder':      { dmg: 4, color: '#FFEB3B' },
  'Void Strike':  { dmg: 5, color: '#CE93D8' },
  'Divine Wrath': { dmg: 8, color: '#00E5FF' },
};

// ── Game State ───────────────────────────────────────────────
const STATE = {
  TITLE: 0,
  OVERWORLD: 1,
  MANSION_ENTER: 2,
  MANSION: 3,
  COMBAT: 4,
  LEVEL_UP: 5,
  GAME_OVER: 6,
  WIN: 7,
};

let gameState = STATE.TITLE;
let player = null;
let level = 0;          // current level index (0..5)
let totalKeys = 0;      // lifetime keys collected
let heartsCollected = 0;
let maxHearts = 3;
let currentHearts = 3;
let keysThisLevel = 0;
let keysNeeded = 10;
let selectedMove = 0;

// Overworld & mansion maps
let overworldEntities = [];
let mansionEntities = [];
let obstacles = [];
let mansionObstacles = [];
let monsters = [];
let keys = [];
let heartPickups = [];
let currentMonster = null;
let monsterHP = 0;
let monsterMaxHP = 0;
let playerCombatHP = 0;
let combatMessage = '';
let combatTurn = 'player'; // 'player' | 'monster'
let combatAnimTimer = 0;
let flashColor = null;
let flashTimer = 0;
let transitionAlpha = 0;
let transitionDir = 0; // 1 = fading in, -1 = fading out
let transitionCallback = null;
let levelUpTimer = 0;
let overworldMap = [];
let mansionMap = [];
let portalPos = null;
let mansionDoorPos = null;
let particles = [];
let shakeTimer = 0;
let shakeIntensity = 0;

// ── Input ────────────────────────────────────────────────────
const input = { up: false, down: false, left: false, right: false, space: false, enter: false, moves: [false,false,false,false] };
const justPressed = { space: false, enter: false, moves: [false,false,false,false] };
const prevInput = { space: false, enter: false, moves: [false,false,false,false] };

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    input.up = true;
  if (k === 's' || k === 'arrowdown')  input.down = true;
  if (k === 'a' || k === 'arrowleft')  input.left = true;
  if (k === 'd' || k === 'arrowright') input.right = true;
  if (k === ' ') input.space = true;
  if (k === 'enter') input.enter = true;
  if (k === '1') input.moves[0] = true;
  if (k === '2') input.moves[1] = true;
  if (k === '3') input.moves[2] = true;
  if (k === '4') input.moves[3] = true;
  e.preventDefault();
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    input.up = false;
  if (k === 's' || k === 'arrowdown')  input.down = false;
  if (k === 'a' || k === 'arrowleft')  input.left = false;
  if (k === 'd' || k === 'arrowright') input.right = false;
  if (k === ' ') input.space = false;
  if (k === 'enter') input.enter = false;
  if (k === '1') input.moves[0] = false;
  if (k === '2') input.moves[1] = false;
  if (k === '3') input.moves[2] = false;
  if (k === '4') input.moves[3] = false;
});

function updateJustPressed() {
  justPressed.space = input.space && !prevInput.space;
  justPressed.enter = input.enter && !prevInput.enter;
  for (let i = 0; i < 4; i++) justPressed.moves[i] = input.moves[i] && !prevInput.moves[i];
}
function storeInput() {
  prevInput.space = input.space;
  prevInput.enter = input.enter;
  for (let i = 0; i < 4; i++) prevInput.moves[i] = input.moves[i];
}

// ── Helpers ──────────────────────────────────────────────────
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function getRank(totalPts) {
  let r = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalPts >= RANKS[i].threshold) { r = i; break; }
  }
  return r;
}

function startTransition(callback) {
  transitionAlpha = 0;
  transitionDir = 1;
  transitionCallback = callback;
}

function spawnParticle(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30 + rand(0, 20),
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function screenShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeTimer = duration;
}

// ── Map Generation ───────────────────────────────────────────
function generateOverworld() {
  overworldMap = [];
  heartPickups = [];
  // Grass with patches of flowers / water
  for (let r = 0; r < ROWS; r++) {
    overworldMap[r] = [];
    for (let c = 0; c < COLS; c++) {
      let tile = 'grass';
      if (Math.random() < 0.08) tile = 'flower';
      if (Math.random() < 0.03) tile = 'water';
      overworldMap[r][c] = tile;
    }
  }
  // Place trees as obstacles around edges
  overworldEntities = [];
  for (let i = 0; i < 15 + level * 2; i++) {
    let c, r;
    do { c = rand(1, COLS - 2); r = rand(1, ROWS - 2); } while (
      (c === 1 && r === 1) || overworldMap[r][c] === 'water'
    );
    overworldEntities.push({ type: 'tree', x: c, y: r });
    overworldMap[r][c] = 'tree';
  }
  // Hearts to collect (need to fill up 3 hearts)
  let heartsToPlace = 3 + level;
  for (let i = 0; i < heartsToPlace; i++) {
    let c, r;
    do { c = rand(1, COLS - 2); r = rand(1, ROWS - 2); } while (
      overworldMap[r][c] !== 'grass' && overworldMap[r][c] !== 'flower'
    );
    heartPickups.push({ x: c, y: r, collected: false });
  }
  // Mansion portal (top-right area) — clear surrounding tiles so it's reachable
  let px, py;
  do { px = rand(COLS - 5, COLS - 2); py = rand(2, 4); } while (
    overworldMap[py][px] !== 'grass' && overworldMap[py][px] !== 'flower'
  );
  portalPos = { x: px, y: py };
  overworldMap[py][px] = 'portal';
  // Clear a path around the portal so the player can always reach it
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = py + dr;
      const nc = px + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (overworldMap[nr][nc] === 'tree' || overworldMap[nr][nc] === 'water') {
          overworldMap[nr][nc] = 'grass';
          // Also remove from entities list
          overworldEntities = overworldEntities.filter(e => !(e.x === nc && e.y === nr));
        }
      }
    }
  }
  // Also clear a corridor from portal downward so it's accessible
  for (let r = py + 1; r <= py + 3 && r < ROWS; r++) {
    if (overworldMap[r][px] === 'tree' || overworldMap[r][px] === 'water') {
      overworldMap[r][px] = 'grass';
      overworldEntities = overworldEntities.filter(e => !(e.x === px && e.y === r));
    }
  }
  // Clear around hearts so they're reachable too
  heartPickups.forEach(h => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = h.y + dr;
        const nc = h.x + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (overworldMap[nr][nc] === 'tree') {
            // Only clear one adjacent tile per heart (enough for access)
            overworldMap[nr][nc] = 'grass';
            overworldEntities = overworldEntities.filter(e => !(e.x === nc && e.y === nr));
            return; // break out of this heart's loop after clearing one tile
          }
        }
      }
    }
  });
}

function generateMansion() {
  mansionMap = [];
  keys = [];
  monsters = [];
  mansionObstacles = [];
  // Dark floor with walls
  for (let r = 0; r < ROWS; r++) {
    mansionMap[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        mansionMap[r][c] = 'wall';
      } else {
        mansionMap[r][c] = Math.random() < 0.05 ? 'cobweb' : 'floor';
      }
    }
  }
  // Internal walls / obstacles
  for (let i = 0; i < 12 + level * 3; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor'
    );
    mansionMap[r][c] = 'wall';
    mansionObstacles.push({ x: c, y: r });
  }
  // Place 10 keys
  for (let i = 0; i < 10; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor' && mansionMap[r][c] !== 'cobweb'
    );
    keys.push({ x: c, y: r, collected: false });
  }
  // Monsters (scales with level)
  let monsterCount = 3 + level * 2;
  for (let i = 0; i < monsterCount; i++) {
    let c, r;
    do { c = rand(3, COLS - 4); r = rand(3, ROWS - 4); } while (
      mansionMap[r][c] !== 'floor'
    );
    monsters.push({
      x: c, y: r, alive: true,
      hp: 3 + level * 2,
      maxHp: 3 + level * 2,
      name: getMonsterName(level),
      moveTimer: 0,
    });
  }
  // Door back (bottom-left)
  mansionDoorPos = { x: 1, y: ROWS - 2 };
  mansionMap[ROWS - 2][1] = 'door';
}

function getMonsterName(lvl) {
  const names = ['Shadow Rat', 'Ghoul', 'Phantom', 'Wraith', 'Dark Knight', 'Demon Lord'];
  return names[Math.min(lvl, names.length - 1)];
}

// ── Player ───────────────────────────────────────────────────
function createPlayer() {
  player = {
    x: 1, y: ROWS - 2,
    px: 1, py: ROWS - 2,    // pixel positions for smooth movement
    speed: 0.08,
    moveCD: 0,
  };
}

// ── Level Init ───────────────────────────────────────────────
function initLevel() {
  keysThisLevel = 0;
  heartsCollected = 0;
  currentHearts = 0; // Start empty — collect hearts to fill up!
  generateOverworld();
  generateMansion();
  createPlayer();
  gameState = STATE.OVERWORLD;
}

// ── Drawing Helpers ──────────────────────────────────────────
function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

function drawText(text, x, y, color, size, align) {
  ctx.fillStyle = color || '#fff';
  ctx.font = `${size || 16}px 'Segoe UI', sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.fillText(text, x, y);
}

function drawTextBold(text, x, y, color, size, align) {
  ctx.fillStyle = color || '#fff';
  ctx.font = `bold ${size || 16}px 'Segoe UI', sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.fillText(text, x, y);
}

// ── Avatar Drawing (evolves per rank) ────────────────────────
function drawAvatar(cx, cy, size, rankIdx, facing) {
  const rank = RANKS[rankIdx];
  const s = size;
  const half = s / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Body base
  ctx.fillStyle = rank.color;
  ctx.beginPath();
  if (rankIdx <= 1) {
    // Noob / Amateur: simple round body
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
  } else if (rankIdx === 2) {
    // Pro: rounded square with shoulder pads
    roundRect(-half, -half, s, s, 6);
    ctx.fill();
    ctx.fillStyle = '#FF6F00';
    ctx.fillRect(-half - 4, -half + 4, 5, 10);
    ctx.fillRect(half - 1, -half + 4, 5, 10);
  } else if (rankIdx === 3) {
    // Master: diamond-ish shape with aura
    ctx.shadowColor = rank.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (rankIdx === 4) {
    // Hacker: glitchy hexagon
    ctx.shadowColor = '#E040FB';
    ctx.shadowBlur = 18;
    drawHexagon(0, 0, half);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Glitch lines
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const yy = -half + Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(-half, yy);
      ctx.lineTo(half, yy);
      ctx.stroke();
    }
  } else {
    // God: radiant star with glow
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 25;
    drawStar(0, 0, half * 0.5, half, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner glow
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 200);
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Eyes
  ctx.fillStyle = '#fff';
  const eyeOff = rankIdx >= 3 ? 0 : half * 0.25;
  const eyeY = rankIdx >= 3 ? -half * 0.15 : -half * 0.1;
  ctx.beginPath();
  ctx.arc(-eyeOff, eyeY, s * 0.1, 0, Math.PI * 2);
  ctx.arc(eyeOff, eyeY, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-eyeOff + (facing === 'left' ? -1 : facing === 'right' ? 1 : 0), eyeY, s * 0.05, 0, Math.PI * 2);
  ctx.arc(eyeOff + (facing === 'left' ? -1 : facing === 'right' ? 1 : 0), eyeY, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Level indicator ring for high ranks
  if (rankIdx >= 2) {
    ctx.strokeStyle = rank.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 300);
    ctx.beginPath();
    ctx.arc(0, 0, half + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHexagon(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(cx, cy, innerR, outerR, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ── Monster Drawing ──────────────────────────────────────────
function drawMonster(cx, cy, size, lvl) {
  const s = size;
  const half = s / 2;
  ctx.save();
  ctx.translate(cx, cy);

  // Shadowy body
  const monColors = ['#666', '#8B0000', '#4B0082', '#2F4F4F', '#800080', '#B22222'];
  ctx.fillStyle = monColors[Math.min(lvl, monColors.length - 1)];
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 8 + lvl * 2;

  // Spiky shape
  ctx.beginPath();
  const spikes = 5 + lvl;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? half : half * 0.55;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const px = r * Math.cos(a);
    const py = r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Evil eyes
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(-half * 0.25, -half * 0.1, s * 0.1, 0, Math.PI * 2);
  ctx.arc(half * 0.25, -half * 0.1, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(-half * 0.25, -half * 0.1, s * 0.04, 0, Math.PI * 2);
  ctx.arc(half * 0.25, -half * 0.1, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Scene: Title ─────────────────────────────────────────────
function drawTitle() {
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0033');
  grad.addColorStop(1, '#0d001a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floating particles
  const t = Date.now() / 1000;
  for (let i = 0; i < 30; i++) {
    const px = (i * 73 + t * 20) % W;
    const py = (i * 47 + Math.sin(t + i) * 30) % H;
    ctx.fillStyle = `rgba(${100 + i * 5}, ${50 + i * 3}, ${200}, ${0.3 + 0.2 * Math.sin(t + i)})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 + Math.sin(t * 2 + i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title
  ctx.shadowColor = '#9C27B0';
  ctx.shadowBlur = 30;
  drawTextBold('KEY QUEST', W / 2, 180, '#E1BEE7', 60, 'center');
  ctx.shadowBlur = 15;
  drawTextBold('Rise of the God', W / 2, 230, '#CE93D8', 28, 'center');
  ctx.shadowBlur = 0;

  // Animated avatar preview
  const aIdx = Math.floor((Date.now() / 1500) % 6);
  drawAvatar(W / 2, 340, 50, aIdx);
  drawText(RANKS[aIdx].name, W / 2, 390, RANKS[aIdx].color, 18, 'center');

  // Prompt
  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawTextBold('Press ENTER to Start', W / 2, 480, '#fff', 22, 'center');
  ctx.globalAlpha = 1;

  drawText('Collect keys. Fight monsters. Become a God.', W / 2, 530, '#888', 14, 'center');
}

function updateTitle() {
  if (justPressed.enter || justPressed.space) {
    level = 0;
    totalKeys = 0;
    startTransition(() => initLevel());
  }
}

// ── Scene: Overworld ─────────────────────────────────────────
function drawOverworld() {
  // Sky gradient with clouds feel
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#6BB3E0');
  grad.addColorStop(0.4, '#87CEEB');
  grad.addColorStop(1, '#7BC67E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() / 1000;

  // === Pass 1: Ground tiles (with depth shading) ===
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = overworldMap[r][c];
      const tx = c * TILE;
      const ty = r * TILE;
      // Depth shading: tiles further "north" (lower row) are slightly darker, giving perspective
      const depthShade = Math.floor(r * 0.8);

      switch (tile) {
        case 'grass':
        case 'tree':
        case 'portal': {
          // Base grass with variation and depth
          const hue = 120 + ((r + c) % 3) - 1;
          const sat = 50 + ((r + c) % 3) * 5;
          const light = 35 + depthShade + ((r * c) % 5) * 2;
          ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Subtle tile edge highlight (top-left = lighter, bottom-right = darker) for 3D feel
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(tx, ty + TILE - 2, TILE, 2);
          ctx.fillRect(tx + TILE - 2, ty, 2, TILE);
          // Grass blades with variation
          if ((r + c) % 3 === 0) {
            ctx.strokeStyle = `hsl(120, 60%, ${28 + depthShade}%)`;
            ctx.lineWidth = 1;
            const sway = Math.sin(t * 1.5 + c * 0.5 + r * 0.3) * 2;
            ctx.beginPath();
            ctx.moveTo(tx + 10, ty + TILE);
            ctx.lineTo(tx + 12 + sway, ty + TILE - 12);
            ctx.moveTo(tx + 25, ty + TILE);
            ctx.lineTo(tx + 23 + sway * 0.7, ty + TILE - 9);
            ctx.moveTo(tx + 33, ty + TILE - 2);
            ctx.lineTo(tx + 35 + sway * 0.5, ty + TILE - 11);
            ctx.stroke();
          }
          break;
        }
        case 'flower': {
          ctx.fillStyle = `hsl(120, 50%, ${37 + depthShade}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // 3D tile edges
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(tx, ty + TILE - 2, TILE, 2);
          // Stem
          ctx.strokeStyle = '#2E7D32';
          ctx.lineWidth = 2;
          const sway = Math.sin(t * 1.2 + c + r) * 1.5;
          ctx.beginPath();
          ctx.moveTo(tx + TILE / 2, ty + TILE - 5);
          ctx.lineTo(tx + TILE / 2 + sway, ty + TILE / 2 + 3);
          ctx.stroke();
          // Petals (multi-petal flower for depth)
          const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#DA70D6'];
          const fc = flowerColors[(r + c) % flowerColors.length];
          const fcx = tx + TILE / 2 + sway;
          const fcy = ty + TILE / 2;
          ctx.fillStyle = fc;
          for (let p = 0; p < 5; p++) {
            const a = (Math.PI * 2 / 5) * p + t * 0.3;
            ctx.beginPath();
            ctx.ellipse(fcx + Math.cos(a) * 4, fcy + Math.sin(a) * 4, 3.5, 2, a, 0, Math.PI * 2);
            ctx.fill();
          }
          // Center
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(fcx, fcy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'water': {
          const waveLight = 48 + Math.sin(t * 1.5 + r * 0.7 + c * 0.5) * 6;
          ctx.fillStyle = `hsl(210, 70%, ${waveLight}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Depth: darker edges
          ctx.fillStyle = 'rgba(0,0,40,0.15)';
          ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
          // Animated ripples
          ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.1 * Math.sin(t * 2 + c)})`;
          ctx.lineWidth = 1;
          for (let rp = 0; rp < 2; rp++) {
            const rx = tx + 10 + rp * 18;
            const ry = ty + TILE / 2 + Math.sin(t * 2 + c + rp) * 4;
            ctx.beginPath();
            ctx.arc(rx, ry, 5 + rp * 3, 0, Math.PI);
            ctx.stroke();
          }
          // Shine highlight
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tx + 3, ty + 3, 8, 4);
          break;
        }
      }
    }
  }

  // === Pass 2: Trees with shadows (drawn on top for layering/depth) ===
  // First draw all tree shadows
  overworldEntities.forEach(e => {
    if (e.type === 'tree') {
      const tx = e.x * TILE;
      const ty = e.y * TILE;
      // Ground shadow (offset to bottom-right)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(tx + TILE / 2 + 6, ty + TILE - 2, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Then draw all trees (so they layer over shadows of trees behind them)
  overworldEntities.forEach(e => {
    if (e.type === 'tree') {
      const tx = e.x * TILE;
      const ty = e.y * TILE;
      // Trunk with gradient for depth
      const trunkGrad = ctx.createLinearGradient(tx + 14, ty, tx + 26, ty);
      trunkGrad.addColorStop(0, '#4E342E');
      trunkGrad.addColorStop(0.5, '#6D4C41');
      trunkGrad.addColorStop(1, '#3E2723');
      ctx.fillStyle = trunkGrad;
      ctx.fillRect(tx + 14, ty + 16, 12, 24);
      // Canopy layers (back to front for depth)
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath();
      ctx.arc(tx + TILE / 2 + 2, ty + 16, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(tx + TILE / 2, ty + 12, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(tx + TILE / 2 - 4, ty + 9, 10, 0, Math.PI * 2);
      ctx.fill();
      // Canopy highlight (sunlight from top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(tx + TILE / 2 - 6, ty + 7, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Mansion portal with enhanced glow
  if (portalPos) {
    const px = portalPos.x * TILE + TILE / 2;
    const py = portalPos.y * TILE + TILE / 2;
    const pulse = Math.sin(t * 2) * 5;
    const canEnter = currentHearts >= maxHearts;

    // Ground glow ring
    ctx.fillStyle = canEnter ? 'rgba(156, 39, 176, 0.2)' : 'rgba(80, 40, 80, 0.1)';
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Portal swirl
    ctx.fillStyle = canEnter ? 'rgba(75, 0, 130, 0.85)' : 'rgba(50, 30, 60, 0.4)';
    ctx.shadowColor = canEnter ? '#9C27B0' : '#333';
    ctx.shadowBlur = canEnter ? 18 + pulse : 5;
    ctx.beginPath();
    ctx.arc(px, py, 16 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner swirl rings
    if (canEnter) {
      ctx.strokeStyle = 'rgba(206, 147, 216, 0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const sr = 6 + i * 4 + Math.sin(t * 3 + i) * 2;
        ctx.beginPath();
        ctx.arc(px, py, sr, t * 2 + i * 2, t * 2 + i * 2 + Math.PI * 1.2);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Door icon
    ctx.fillStyle = '#311B92';
    ctx.fillRect(px - 6, py - 10, 12, 18);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + 3, py, 2, 0, Math.PI * 2);
    ctx.fill();

    // Status text with hearts progress
    if (!canEnter) {
      drawText(`${currentHearts}/${maxHearts} hearts`, px, py - 24, '#FF5722', 10, 'center');
    } else {
      drawText('Enter!', px, py - 24, '#FFD700', 12, 'center');
    }
  }

  // Heart pickups with glow and shadow
  heartPickups.forEach(h => {
    if (h.collected) return;
    const hx = h.x * TILE + TILE / 2;
    const hy = h.y * TILE + TILE / 2;
    const bob = Math.sin(t * 2.5 + h.x + h.y * 0.7) * 4;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 10;
    drawHeart(hx, hy + bob - 4, 10, '#FF1744');
    ctx.shadowBlur = 0;
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(hx - 3, hy + bob - 9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Player with ground shadow
  const pfx = player.x * TILE + TILE / 2;
  const pfy = player.y * TILE + TILE / 2;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(pfx + 2, pfy + TILE / 2 - 4, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const facing = input.left ? 'left' : input.right ? 'right' : 'down';
  drawAvatar(pfx, pfy, TILE - 4, getRank(totalKeys), facing);
}

function drawHeart(cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx, cy - size * 0.3, cx - size, cy - size * 0.3, cx - size, cy + size * 0.1);
  ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.6, cx + size, cy + size * 0.1);
  ctx.bezierCurveTo(cx + size, cy - size * 0.3, cx, cy - size * 0.3, cx, cy + size * 0.3);
  ctx.fill();
}

function updateOverworld(dt) {
  if (player.moveCD > 0) { player.moveCD -= dt; return; }

  let nx = player.x;
  let ny = player.y;
  if (input.up)    ny--;
  if (input.down)  ny++;
  if (input.left)  nx--;
  if (input.right) nx++;

  if (nx !== player.x || ny !== player.y) {
    // Bounds check
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    const tile = overworldMap[ny][nx];
    if (tile === 'tree' || tile === 'water') return;

    player.x = nx;
    player.y = ny;
    player.moveCD = 0.12;

    // Pick up hearts
    heartPickups.forEach(h => {
      if (!h.collected && h.x === player.x && h.y === player.y) {
        h.collected = true;
        heartsCollected++;
        currentHearts = Math.min(currentHearts + 1, maxHearts);
        spawnParticle(h.x * TILE + TILE / 2, h.y * TILE + TILE / 2, '#FF1744', 10);
      }
    });

    // Portal check
    if (portalPos && player.x === portalPos.x && player.y === portalPos.y) {
      if (currentHearts >= maxHearts) {
        startTransition(() => {
          player.x = 1;
          player.y = ROWS - 2;
          gameState = STATE.MANSION_ENTER;
        });
      }
    }
  }
}

// ── Scene: Mansion Enter ─────────────────────────────────────
function drawMansionEnter() {
  // Dark background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() / 1000;

  // Spooky mansion silhouette
  ctx.fillStyle = '#1a0a1a';
  ctx.beginPath();
  ctx.moveTo(200, 400);
  ctx.lineTo(200, 200);
  ctx.lineTo(250, 150);
  ctx.lineTo(300, 200);
  ctx.lineTo(300, 170);
  ctx.lineTo(350, 120);
  ctx.lineTo(400, 100);
  ctx.lineTo(450, 120);
  ctx.lineTo(500, 170);
  ctx.lineTo(500, 200);
  ctx.lineTo(550, 150);
  ctx.lineTo(600, 200);
  ctx.lineTo(600, 400);
  ctx.closePath();
  ctx.fill();

  // Windows with flickering light
  [[280, 250], [400, 230], [520, 250]].forEach(([wx, wy], i) => {
    ctx.fillStyle = `rgba(255, 165, 0, ${0.3 + 0.3 * Math.sin(t * 3 + i)})`;
    ctx.fillRect(wx - 15, wy - 15, 30, 30);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx - 15, wy - 15, 30, 30);
    ctx.beginPath();
    ctx.moveTo(wx, wy - 15);
    ctx.lineTo(wx, wy + 15);
    ctx.moveTo(wx - 15, wy);
    ctx.lineTo(wx + 15, wy);
    ctx.stroke();
  });

  // Door
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(370, 300, 60, 100);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(420, 355, 4, 0, Math.PI * 2);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#1a1a0a';
  ctx.fillRect(0, 400, W, 200);

  // Text
  ctx.shadowColor = '#F44336';
  ctx.shadowBlur = 10;
  drawTextBold('The Haunted Mansion', W / 2, 80, '#FF5722', 32, 'center');
  ctx.shadowBlur = 0;
  drawText(`Level ${level + 1} — Collect 10 keys & defeat the monsters!`, W / 2, 460, '#888', 16, 'center');

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Press ENTER to go inside...', W / 2, 510, '#FF8A65', 18, 'center');
  ctx.globalAlpha = 1;
}

function updateMansionEnter() {
  if (justPressed.enter || justPressed.space) {
    startTransition(() => {
      player.x = 1;
      player.y = ROWS - 2;
      gameState = STATE.MANSION;
    });
  }
}

// ── Scene: Mansion ───────────────────────────────────────────
function drawMansion() {
  // Dark background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = mansionMap[r][c];
      switch (tile) {
        case 'wall':
          ctx.fillStyle = `hsl(0, 0%, ${10 + ((r + c) % 3) * 2}%)`;
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          // Brick lines
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE / 2 - 1);
          break;
        case 'floor':
          ctx.fillStyle = `hsl(270, 5%, ${15 + ((r + c) % 2) * 3}%)`;
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          break;
        case 'cobweb':
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c * TILE, r * TILE);
          ctx.lineTo(c * TILE + TILE, r * TILE + TILE);
          ctx.moveTo(c * TILE + TILE, r * TILE);
          ctx.lineTo(c * TILE, r * TILE + TILE);
          ctx.stroke();
          break;
        case 'door':
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
          ctx.fillStyle = '#5D4037';
          ctx.fillRect(c * TILE + 8, r * TILE + 2, TILE - 16, TILE - 4);
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(c * TILE + TILE / 2 + 6, r * TILE + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
  }

  // Fog / darkness overlay (vignette around player)
  const pgx = player.x * TILE + TILE / 2;
  const pgy = player.y * TILE + TILE / 2;
  const fogGrad = ctx.createRadialGradient(pgx, pgy, 60, pgx, pgy, 250);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, W, H);

  // Keys
  keys.forEach(k => {
    if (k.collected) return;
    const kx = k.x * TILE + TILE / 2;
    const ky = k.y * TILE + TILE / 2;
    const bob = Math.sin(Date.now() / 350 + k.x + k.y) * 3;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    // Key shape
    ctx.beginPath();
    ctx.arc(kx, ky + bob - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(kx - 1.5, ky + bob, 3, 10);
    ctx.fillRect(kx - 1.5, ky + bob + 7, 6, 2);
    ctx.fillRect(kx - 1.5, ky + bob + 4, 5, 2);
    ctx.shadowBlur = 0;
  });

  // Monsters
  monsters.forEach(m => {
    if (!m.alive) return;
    drawMonster(m.x * TILE + TILE / 2, m.y * TILE + TILE / 2, TILE - 6, level);
  });

  // Player
  const facing = input.left ? 'left' : input.right ? 'right' : 'down';
  drawAvatar(player.x * TILE + TILE / 2, player.y * TILE + TILE / 2, TILE - 4, getRank(totalKeys), facing);

  // Keys collected display
  drawText(`Keys: ${keysThisLevel}/10`, W / 2, TILE * 0.7, '#FFD700', 14, 'center');
}

function updateMansion(dt) {
  if (player.moveCD > 0) { player.moveCD -= dt; return; }

  let nx = player.x;
  let ny = player.y;
  if (input.up)    ny--;
  if (input.down)  ny++;
  if (input.left)  nx--;
  if (input.right) nx++;

  if (nx !== player.x || ny !== player.y) {
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    if (mansionMap[ny][nx] === 'wall') return;

    player.x = nx;
    player.y = ny;
    player.moveCD = 0.12;

    // Pick up keys
    keys.forEach(k => {
      if (!k.collected && k.x === player.x && k.y === player.y) {
        k.collected = true;
        keysThisLevel++;
        totalKeys++;
        spawnParticle(k.x * TILE + TILE / 2, k.y * TILE + TILE / 2, '#FFD700', 12);
      }
    });

    // Monster collision → combat
    monsters.forEach(m => {
      if (m.alive && m.x === player.x && m.y === player.y) {
        startCombat(m);
      }
    });

    // Check exit
    if (mansionDoorPos && player.x === mansionDoorPos.x && player.y === mansionDoorPos.y) {
      if (keysThisLevel >= keysNeeded && monsters.every(m => !m.alive)) {
        // Level complete!
        levelUp();
      }
    }
  }

  // Move monsters toward player slowly
  monsters.forEach(m => {
    if (!m.alive) return;
    m.moveTimer += dt;
    if (m.moveTimer > 0.6) {
      m.moveTimer = 0;
      let mx = m.x, my = m.y;
      if (Math.random() < 0.6) {
        // Move toward player
        if (player.x > m.x) mx++;
        else if (player.x < m.x) mx--;
        if (player.y > m.y) my++;
        else if (player.y < m.y) my--;
      } else {
        // Random move
        mx += rand(-1, 1);
        my += rand(-1, 1);
      }
      mx = clamp(mx, 1, COLS - 2);
      my = clamp(my, 1, ROWS - 2);
      if (mansionMap[my][mx] !== 'wall') {
        m.x = mx;
        m.y = my;
      }
      // Check if monster walked into player
      if (m.x === player.x && m.y === player.y) {
        startCombat(m);
      }
    }
  });
}

// ── Combat ───────────────────────────────────────────────────
function startCombat(monster) {
  currentMonster = monster;
  monsterHP = monster.hp;
  monsterMaxHP = monster.maxHp;
  playerCombatHP = currentHearts;
  combatMessage = `A wild ${monster.name} appeared!`;
  combatTurn = 'player';
  combatAnimTimer = 0;
  selectedMove = 0;
  gameState = STATE.COMBAT;
}

function drawCombat() {
  // Dark background with red tint
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0000');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Battle ground
  ctx.fillStyle = '#1a1520';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.5, 350, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // Monster (right side)
  const monX = W * 0.65;
  const monY = H * 0.35;
  if (flashColor && combatTurn === 'monster_hit') {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(combatAnimTimer * 20);
  }
  drawMonster(monX, monY, 80, level);
  ctx.globalAlpha = 1;

  // Monster HP bar
  ctx.fillStyle = '#333';
  ctx.fillRect(monX - 50, monY - 60, 100, 10);
  ctx.fillStyle = '#F44336';
  ctx.fillRect(monX - 50, monY - 60, 100 * (monsterHP / monsterMaxHP), 10);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(monX - 50, monY - 60, 100, 10);
  drawText(currentMonster.name, monX, monY - 70, '#FF8A65', 14, 'center');
  drawText(`${monsterHP}/${monsterMaxHP}`, monX, monY - 45, '#fff', 11, 'center');

  // Player avatar (left side)
  const plX = W * 0.25;
  const plY = H * 0.45;
  if (flashColor && combatTurn === 'player_hit') {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(combatAnimTimer * 20);
  }
  drawAvatar(plX, plY, 70, getRank(totalKeys));
  ctx.globalAlpha = 1;

  // Player hearts
  for (let i = 0; i < maxHearts; i++) {
    const hx = plX - 30 + i * 22;
    const hy = plY - 55;
    drawHeart(hx, hy, 8, i < playerCombatHP ? '#FF1744' : '#333');
  }
  drawText(RANKS[getRank(totalKeys)].name, plX, plY - 70, RANKS[getRank(totalKeys)].color, 14, 'center');

  // Message box
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  roundRect(30, H - 200, W - 60, 80, 10);
  ctx.fill();
  ctx.stroke();
  drawText(combatMessage, W / 2, H - 155, '#fff', 16, 'center');

  // Move selection (only during player turn)
  if (combatTurn === 'player') {
    const rank = getRank(totalKeys);
    const moves = RANKS[rank].moves;
    const boxW = 160;
    const boxH = 40;
    const startX = 50;
    const startY = H - 105;

    drawText('Choose your move:', startX, startY - 8, '#aaa', 13);
    for (let i = 0; i < Math.min(moves.length, 4); i++) {
      const bx = startX + i * (boxW + 10);
      const by = startY;
      const isSelected = i === selectedMove;
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)';
      ctx.strokeStyle = isSelected ? MOVE_DATA[moves[i]].color : '#444';
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      drawText(`${i + 1}. ${moves[i]}`, bx + 10, by + 15, MOVE_DATA[moves[i]].color, 13);
      drawText(`DMG: ${MOVE_DATA[moves[i]].dmg}`, bx + 10, by + 30, '#888', 11);
    }
  }

  // Particles
  drawParticles();
}

function updateCombat(dt) {
  if (combatTurn === 'player') {
    const rank = getRank(totalKeys);
    const moves = RANKS[rank].moves;
    const maxMoves = Math.min(moves.length, 4);

    // Move selection with number keys
    for (let i = 0; i < maxMoves; i++) {
      if (justPressed.moves[i]) selectedMove = i;
    }
    if (input.left && selectedMove > 0) { selectedMove--; input.left = false; }
    if (input.right && selectedMove < maxMoves - 1) { selectedMove++; input.right = false; }

    // Execute attack
    if (justPressed.space || justPressed.enter) {
      const move = moves[selectedMove];
      const dmg = MOVE_DATA[move].dmg;
      monsterHP -= dmg;
      combatMessage = `You used ${move}! Dealt ${dmg} damage!`;
      spawnParticle(W * 0.65, H * 0.35, MOVE_DATA[move].color, 15);
      screenShake(3, 0.2);

      if (monsterHP <= 0) {
        monsterHP = 0;
        combatMessage = `${currentMonster.name} defeated!`;
        combatTurn = 'monster_dying';
        combatAnimTimer = 0;
      } else {
        combatTurn = 'monster_hit';
        combatAnimTimer = 0;
      }
    }
  } else if (combatTurn === 'monster_hit') {
    combatAnimTimer += dt;
    if (combatAnimTimer > 0.5) {
      // Monster attacks back
      const dmg = 1;
      playerCombatHP -= dmg;
      combatMessage = `${currentMonster.name} attacks! You lost a heart!`;
      spawnParticle(W * 0.25, H * 0.45, '#FF0000', 12);
      screenShake(4, 0.25);

      if (playerCombatHP <= 0) {
        playerCombatHP = 0;
        combatTurn = 'player_dying';
        combatAnimTimer = 0;
      } else {
        combatTurn = 'player_hit';
        combatAnimTimer = 0;
      }
    }
  } else if (combatTurn === 'player_hit') {
    combatAnimTimer += dt;
    if (combatAnimTimer > 0.5) {
      combatTurn = 'player';
      combatMessage = 'Your turn! Choose a move.';
    }
  } else if (combatTurn === 'monster_dying') {
    combatAnimTimer += dt;
    if (combatAnimTimer > 1.2) {
      currentMonster.alive = false;
      currentHearts = playerCombatHP;
      startTransition(() => {
        gameState = STATE.MANSION;
        // Check for level complete
        if (keysThisLevel >= keysNeeded && monsters.every(m => !m.alive)) {
          levelUp();
        }
      });
    }
  } else if (combatTurn === 'player_dying') {
    combatAnimTimer += dt;
    if (combatAnimTimer > 1.2) {
      currentHearts = 0;
      gameState = STATE.GAME_OVER;
    }
  }
}

// ── Level Up / Win ───────────────────────────────────────────
function levelUp() {
  const prevRank = getRank(totalKeys - keysThisLevel);
  const newRank = getRank(totalKeys);
  level++;
  if (level >= 6 || totalKeys >= 60) {
    gameState = STATE.WIN;
  } else {
    gameState = STATE.LEVEL_UP;
    levelUpTimer = 0;
  }
}

function drawLevelUp() {
  ctx.fillStyle = '#0a0020';
  ctx.fillRect(0, 0, W, H);

  // Fireworks particles
  const t = Date.now() / 1000;
  for (let i = 0; i < 20; i++) {
    const fx = (i * 97 + t * 50) % W;
    const fy = (i * 53 + Math.sin(t * 2 + i * 0.7) * 100 + 200) % H;
    ctx.fillStyle = `hsl(${(i * 40 + t * 100) % 360}, 80%, 60%)`;
    ctx.beginPath();
    ctx.arc(fx, fy, 3 + Math.sin(t * 3 + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const rank = getRank(totalKeys);
  ctx.shadowColor = RANKS[rank].color;
  ctx.shadowBlur = 20;
  drawTextBold('LEVEL COMPLETE!', W / 2, 120, '#FFD700', 40, 'center');
  ctx.shadowBlur = 0;

  drawAvatar(W / 2, 260, 80, rank);

  drawTextBold(`Rank: ${RANKS[rank].name}`, W / 2, 340, RANKS[rank].color, 28, 'center');
  drawText(`Total Keys: ${totalKeys}`, W / 2, 380, '#FFD700', 18, 'center');

  if (rank < RANKS.length - 1) {
    drawText(`Next rank at ${RANKS[rank + 1].threshold} keys`, W / 2, 410, '#888', 14, 'center');
  }

  drawText(`Entering Level ${level + 1}...`, W / 2, 460, '#aaa', 16, 'center');

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Press ENTER to continue', W / 2, 520, '#fff', 18, 'center');
  ctx.globalAlpha = 1;
}

function updateLevelUp(dt) {
  levelUpTimer += dt;
  if ((justPressed.enter || justPressed.space) && levelUpTimer > 0.5) {
    startTransition(() => initLevel());
  }
}

// ── Game Over ────────────────────────────────────────────────
function drawGameOver() {
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = '#F44336';
  ctx.shadowBlur = 15;
  drawTextBold('YOU DIED', W / 2, 200, '#F44336', 52, 'center');
  ctx.shadowBlur = 0;

  drawText('The monsters proved too strong...', W / 2, 260, '#888', 18, 'center');

  drawText(`Keys Collected: ${totalKeys}`, W / 2, 330, '#FFD700', 20, 'center');
  drawText(`Rank Achieved: ${RANKS[getRank(totalKeys)].name}`, W / 2, 360, RANKS[getRank(totalKeys)].color, 20, 'center');
  drawText(`Level Reached: ${level + 1}`, W / 2, 390, '#aaa', 18, 'center');

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Press ENTER to try again', W / 2, 470, '#FF8A65', 20, 'center');
  ctx.globalAlpha = 1;
}

function updateGameOver() {
  if (justPressed.enter || justPressed.space) {
    startTransition(() => {
      level = 0;
      totalKeys = 0;
      gameState = STATE.TITLE;
    });
  }
}

// ── Win Screen ───────────────────────────────────────────────
function drawWin() {
  const t = Date.now() / 1000;

  // Rainbow background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${(t * 30) % 360}, 40%, 10%)`);
  grad.addColorStop(1, `hsl(${(t * 30 + 180) % 360}, 40%, 10%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 40; i++) {
    const sx = (i * 83 + t * 10) % W;
    const sy = (i * 61 + Math.sin(t + i) * 20) % H;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5 + Math.sin(t + i) * 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 30;
  drawTextBold('YOU ARE A GOD', W / 2, 140, '#00E5FF', 48, 'center');
  ctx.shadowBlur = 0;

  drawAvatar(W / 2, 280, 100, 5);

  drawTextBold('Congratulations!', W / 2, 370, '#FFD700', 28, 'center');
  drawText(`All ${totalKeys} keys collected across all levels`, W / 2, 410, '#aaa', 16, 'center');
  drawText('You have conquered the Haunted Mansions!', W / 2, 440, '#CE93D8', 16, 'center');

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Press ENTER to play again', W / 2, 520, '#fff', 18, 'center');
  ctx.globalAlpha = 1;
}

function updateWin() {
  if (justPressed.enter || justPressed.space) {
    startTransition(() => {
      level = 0;
      totalKeys = 0;
      gameState = STATE.TITLE;
    });
  }
}

// ── Particles ────────────────────────────────────────────────
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  const hudLeft = document.getElementById('hudLeft');
  const hudRight = document.getElementById('hudRight');

  if (gameState === STATE.OVERWORLD || gameState === STATE.MANSION) {
    const rank = getRank(totalKeys);
    let heartStr = '';
    for (let i = 0; i < maxHearts; i++) {
      heartStr += i < currentHearts ? '\u2764\uFE0F' : '\uD83D\uDDA4';
    }

    hudLeft.innerHTML = `
      <div style="color:${RANKS[rank].color}; font-weight:bold">${RANKS[rank].name}</div>
      <div>Hearts: ${heartStr}</div>
      <div>Keys: ${totalKeys} total</div>
    `;

    if (gameState === STATE.MANSION) {
      const alive = monsters.filter(m => m.alive).length;
      hudRight.innerHTML = `
        <div style="color:#FF5722">Haunted Mansion - Level ${level + 1}</div>
        <div style="color:#FFD700">Keys: ${keysThisLevel}/10</div>
        <div>Monsters: ${alive} remaining</div>
      `;
    } else {
      const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
      const canEnter = currentHearts >= maxHearts;
      hudRight.innerHTML = `
        <div>Level ${level + 1} - Overworld</div>
        <div>${canEnter ? '<span style="color:#FFD700">Hearts full! Find the mansion portal!</span>' : `Collect hearts (${currentHearts}/${maxHearts}) to enter mansion`}</div>
        ${nextRank ? `<div style="color:${nextRank.color}">Next: ${nextRank.name} (${nextRank.threshold} keys)</div>` : ''}
      `;
    }
    hudLeft.style.display = 'block';
    hudRight.style.display = 'block';
  } else {
    hudLeft.style.display = 'none';
    hudRight.style.display = 'none';
  }
}

// ── Transition Overlay ───────────────────────────────────────
function updateTransition(dt) {
  if (transitionDir === 0) return;
  transitionAlpha += transitionDir * dt * 3;
  if (transitionAlpha >= 1 && transitionDir === 1) {
    transitionAlpha = 1;
    transitionDir = -1;
    if (transitionCallback) {
      transitionCallback();
      transitionCallback = null;
    }
  }
  if (transitionAlpha <= 0 && transitionDir === -1) {
    transitionAlpha = 0;
    transitionDir = 0;
  }
}

function drawTransition() {
  if (transitionAlpha > 0) {
    ctx.globalAlpha = transitionAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

// ── Shake ────────────────────────────────────────────────────
function applyShake() {
  if (shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * shakeIntensity * 2;
    const sy = (Math.random() - 0.5) * shakeIntensity * 2;
    ctx.save();
    ctx.translate(sx, sy);
    return true;
  }
  return false;
}

function endShake(applied) {
  if (applied) ctx.restore();
}

// ── Main Loop ────────────────────────────────────────────────
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateJustPressed();

  // Update shake
  if (shakeTimer > 0) shakeTimer -= dt;

  // Update transition
  updateTransition(dt);

  // Update state
  if (transitionDir === 0) {
    switch (gameState) {
      case STATE.TITLE: updateTitle(); break;
      case STATE.OVERWORLD: updateOverworld(dt); break;
      case STATE.MANSION_ENTER: updateMansionEnter(); break;
      case STATE.MANSION: updateMansion(dt); break;
      case STATE.COMBAT: updateCombat(dt); break;
      case STATE.LEVEL_UP: updateLevelUp(dt); break;
      case STATE.GAME_OVER: updateGameOver(); break;
      case STATE.WIN: updateWin(); break;
    }
  }

  // Update particles
  updateParticles(dt);

  // Draw
  const shook = applyShake();

  switch (gameState) {
    case STATE.TITLE: drawTitle(); break;
    case STATE.OVERWORLD: drawOverworld(); drawParticles(); break;
    case STATE.MANSION_ENTER: drawMansionEnter(); break;
    case STATE.MANSION: drawMansion(); drawParticles(); break;
    case STATE.COMBAT: drawCombat(); break;
    case STATE.LEVEL_UP: drawLevelUp(); break;
    case STATE.GAME_OVER: drawGameOver(); break;
    case STATE.WIN: drawWin(); break;
  }

  endShake(shook);

  // Draw transition on top
  drawTransition();

  // HUD
  updateHUD();

  storeInput();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
