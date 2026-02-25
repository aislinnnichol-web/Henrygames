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
  'Slap':         { dmg: 1, color: '#fff',    element: 'physical', cooldown: 0 },
  'Punch':        { dmg: 2, color: '#FFA726', element: 'physical', cooldown: 0 },
  'Fireball':     { dmg: 3, color: '#FF5722', element: 'fire',     cooldown: 1 },
  'Thunder':      { dmg: 4, color: '#FFEB3B', element: 'electric', cooldown: 2 },
  'Void Strike':  { dmg: 5, color: '#CE93D8', element: 'shadow',   cooldown: 2 },
  'Divine Wrath': { dmg: 8, color: '#00E5FF', element: 'divine',   cooldown: 3 },
  'Defend':       { dmg: 0, color: '#4FC3F7', element: 'none',     cooldown: 0 },
};

// Element effectiveness: attacker element -> defender weakness
const ELEMENT_CHART = {
  fire:     { strong: 'ice',    weak: 'fire' },
  electric: { strong: 'poison', weak: 'shadow' },
  shadow:   { strong: 'shadow', weak: 'poison' },
  divine:   { strong: 'all',    weak: 'none' },
  physical: { strong: 'none',   weak: 'none' },
};

const MONSTER_ELEMENTS = {
  'Shadow Rat':  'shadow',
  'Ghoul':       'poison',
  'Phantom':     'ice',
  'Wraith':      'shadow',
  'Dark Knight': 'fire',
  'Demon Lord':  'poison',
};

const ELEMENT_COLORS = {
  fire: '#FF5722', ice: '#4FC3F7', shadow: '#9C27B0',
  poison: '#8BC34A', physical: '#999', electric: '#FFEB3B',
  divine: '#00E5FF',
};

const ELEMENT_ICONS = {
  fire: '\u{1F525}', ice: '\u{2744}\u{FE0F}', shadow: '\u{1F47B}',
  poison: '\u{2620}\u{FE0F}', physical: '\u{1F44A}', electric: '\u{26A1}',
  divine: '\u{2728}',
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
let maxHearts = 5;
let currentHearts = 5;
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
let monstersDefeated = 0;
let moveCooldowns = {};       // { 'Fireball': 0, 'Thunder': 2, ... }
let monsterStance = 'attack'; // 'attack' | 'heavy' | 'guard'
let monsterNextStance = 'attack';
let playerDefending = false;
let monsterElement = 'shadow';
let comboCount = 0;           // consecutive same-element hits
let lastElement = '';
let turnNumber = 0;
let monstersRequired = 0;    // how many kills needed to complete level
let monsterRespawnTimer = 0;
let maxMonstersAlive = 0;    // cap on simultaneous alive monsters
let torches = [];             // mansion torch positions for lighting
let ambientParticles = [];    // dust motes / fireflies

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

// ── Canvas Tap (for menu screens on mobile) ─────────────────
canvas.addEventListener('touchstart', function(e) {
  if (gameState === STATE.TITLE || gameState === STATE.MANSION_ENTER ||
      gameState === STATE.LEVEL_UP || gameState === STATE.GAME_OVER || gameState === STATE.WIN) {
    e.preventDefault();
    input.space = true;
    input.enter = true;
    setTimeout(() => { input.space = false; input.enter = false; }, 100);
  }
}, { passive: false });

// ── Touch Input ─────────────────────────────────────────────
(function setupTouch() {
  // D-Pad touch handling
  const dirs = ['up', 'down', 'left', 'right'];
  dirs.forEach(dir => {
    const el = document.getElementById('dpad-' + dir);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); input[dir] = true; el.classList.add('active'); }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); input[dir] = false; el.classList.remove('active'); }, { passive: false });
    el.addEventListener('touchcancel', e => { input[dir] = false; el.classList.remove('active'); });
  });
  // A button = Space/Enter (confirm / attack)
  const btnA = document.getElementById('btn-a');
  if (btnA) {
    btnA.addEventListener('touchstart', e => { e.preventDefault(); input.space = true; input.enter = true; btnA.classList.add('active'); }, { passive: false });
    btnA.addEventListener('touchend', e => { e.preventDefault(); input.space = false; input.enter = false; btnA.classList.remove('active'); }, { passive: false });
    btnA.addEventListener('touchcancel', e => { input.space = false; input.enter = false; btnA.classList.remove('active'); });
  }
  // B button = cycle through moves in combat
  const btnB = document.getElementById('btn-b');
  if (btnB) {
    btnB.addEventListener('touchstart', e => {
      e.preventDefault();
      btnB.classList.add('active');
      if (gameState === STATE.COMBAT && combatTurn === 'player') {
        const maxMoves = Math.min(getCombatMoves().length, 5);
        selectedMove = (selectedMove + 1) % maxMoves;
        updateMoveButtons();
      }
    }, { passive: false });
    btnB.addEventListener('touchend', e => { e.preventDefault(); btnB.classList.remove('active'); }, { passive: false });
    btnB.addEventListener('touchcancel', e => { btnB.classList.remove('active'); });
  }
})();

// Update combat move buttons for touch
function updateMoveButtons() {
  const moveBtnsEl = document.getElementById('moveBtns');
  if (!moveBtnsEl) return;
  if (gameState === STATE.COMBAT && combatTurn === 'player') {
    const moves = getCombatMoves();
    const max = Math.min(moves.length, 5);
    moveBtnsEl.style.display = 'flex';
    moveBtnsEl.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const move = moves[i];
      const md = MOVE_DATA[move];
      const onCooldown = moveCooldowns[move] && moveCooldowns[move] > 0;
      const eff = move !== 'Defend' ? getEffectiveness(md.element, monsterElement) : 0;
      const btn = document.createElement('div');
      btn.className = 'move-btn' + (i === selectedMove ? ' selected' : '');
      let label = move;
      if (move === 'Defend') { label = 'Defend'; }
      else if (onCooldown) { label = move + ' (CD:' + moveCooldowns[move] + ')'; }
      else if (eff >= 2) { label = move + ' x2!'; }
      else if (eff <= 0.5) { label = move + ' x.5'; }
      else { label = move + ' (' + md.dmg + ')'; }
      btn.textContent = label;
      if (onCooldown) btn.style.opacity = '0.4';
      btn.addEventListener('touchstart', (function(idx) {
        return function(e) {
          e.preventDefault();
          selectedMove = idx;
          updateMoveButtons();
        };
      })(i), { passive: false });
      moveBtnsEl.appendChild(btn);
    }
  } else {
    moveBtnsEl.style.display = 'none';
  }
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
  let heartsToPlace = 5 + level * 2;
  for (let i = 0; i < heartsToPlace; i++) {
    let c, r;
    do { c = rand(1, COLS - 2); r = rand(1, ROWS - 2); } while (
      overworldMap[r][c] !== 'grass' && overworldMap[r][c] !== 'flower'
    );
    heartPickups.push({ x: c, y: r, collected: false, mansion: false });
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
  torches = [];
  monstersDefeated = 0;
  monsterRespawnTimer = 0;
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
  // Internal walls (more than before)
  for (let i = 0; i < 16 + level * 4; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor'
    );
    mansionMap[r][c] = 'wall';
    mansionObstacles.push({ x: c, y: r });
  }
  // Pillars (new obstacle type - decorative stone pillars)
  for (let i = 0; i < 3 + level; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor'
    );
    mansionMap[r][c] = 'pillar';
    mansionObstacles.push({ x: c, y: r, type: 'pillar' });
  }
  // Crates (breakable-looking obstacles)
  for (let i = 0; i < 2 + level; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor'
    );
    mansionMap[r][c] = 'crate';
    mansionObstacles.push({ x: c, y: r, type: 'crate' });
  }
  // Spike traps (walkable but visual hazard tiles)
  for (let i = 0; i < 4 + level * 2; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor'
    );
    mansionMap[r][c] = 'spikes';
  }
  // Torches along walls for atmospheric lighting
  for (let r = 2; r < ROWS - 2; r += 3) {
    if (mansionMap[r][1] === 'wall') torches.push({ x: 1, y: r });
    if (mansionMap[r][COLS - 2] === 'wall') torches.push({ x: COLS - 2, y: r });
  }
  for (let c = 3; c < COLS - 3; c += 4) {
    if (mansionMap[1][c] === 'wall') torches.push({ x: c, y: 1 });
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
  let monsterCount = 3 + level;
  monstersRequired = monsterCount;
  maxMonstersAlive = monsterCount;
  for (let i = 0; i < monsterCount; i++) {
    let c, r;
    do { c = rand(3, COLS - 4); r = rand(3, ROWS - 4); } while (
      mansionMap[r][c] !== 'floor'
    );
    monsters.push({
      x: c, y: r, alive: true,
      hp: 2 + level,
      maxHp: 2 + level,
      name: getMonsterName(level),
      moveTimer: 0,
    });
  }
  // Heart pickups inside mansion (heal between fights)
  let mansionHearts = 3 + level;
  for (let i = 0; i < mansionHearts; i++) {
    let c, r;
    do { c = rand(2, COLS - 3); r = rand(2, ROWS - 3); } while (
      mansionMap[r][c] !== 'floor' && mansionMap[r][c] !== 'cobweb'
    );
    heartPickups.push({ x: c, y: r, collected: false, mansion: true });
  }
  // Door back (bottom-left)
  mansionDoorPos = { x: 1, y: ROWS - 2 };
  mansionMap[ROWS - 2][1] = 'door';
}

function spawnRespawnMonster() {
  let c, r, tries = 0;
  do {
    c = rand(3, COLS - 4);
    r = rand(3, ROWS - 4);
    tries++;
  } while (
    (mansionMap[r][c] !== 'floor' || dist({ x: c, y: r }, player) < 5) && tries < 50
  );
  if (tries >= 50) return; // no valid spot found
  const respawnHp = Math.max(1, 1 + Math.floor(level * 0.7));
  monsters.push({
    x: c, y: r, alive: true,
    hp: respawnHp,
    maxHp: respawnHp,
    name: getMonsterName(level),
    moveTimer: 0,
    respawned: true,
  });
  // Spawn effect
  spawnParticle(c * TILE + TILE / 2, r * TILE + TILE / 2, '#FF0000', 8);
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
  currentHearts = 0; // Start empty -- collect hearts to fill up!
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
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(cx, cy);

  // Breathing animation
  const breathe = 1 + Math.sin(t * 2.5) * 0.04;
  ctx.scale(breathe, breathe);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(3, half - 2, half * 0.7, half * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura glow (pulsing)
  const monColors = ['#666', '#8B0000', '#4B0082', '#2F4F4F', '#800080', '#B22222'];
  const baseColor = monColors[Math.min(lvl, monColors.length - 1)];
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 10 + lvl * 3 + Math.sin(t * 3) * 4;

  // Spiky body with animated wobble
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  const spikes = 5 + lvl;
  for (let i = 0; i < spikes * 2; i++) {
    const wobble = i % 2 === 0 ? Math.sin(t * 4 + i * 0.5) * 2 : 0;
    const r = (i % 2 === 0 ? half : half * 0.55) + wobble;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const px = r * Math.cos(a);
    const py = r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner body pattern (darker core)
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Vein-like lines from center
  ctx.strokeStyle = 'rgba(255,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < spikes; i++) {
    const a = (Math.PI * 2 / spikes) * i + t * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * half * 0.7, Math.sin(a) * half * 0.7);
    ctx.stroke();
  }

  // Evil eyes (animated - track slightly)
  const eyeTrack = Math.sin(t * 1.5) * 1.5;
  ctx.fillStyle = '#FF0000';
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-half * 0.25, -half * 0.1, s * 0.11, 0, Math.PI * 2);
  ctx.arc(half * 0.25, -half * 0.1, s * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Pupils
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(-half * 0.25 + eyeTrack, -half * 0.1, s * 0.05, 0, Math.PI * 2);
  ctx.arc(half * 0.25 + eyeTrack, -half * 0.1, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(-half * 0.25 - 1, -half * 0.1 - 2, s * 0.025, 0, Math.PI * 2);
  ctx.arc(half * 0.25 - 1, -half * 0.1 - 2, s * 0.025, 0, Math.PI * 2);
  ctx.fill();

  // Menacing mouth (for higher levels)
  if (lvl >= 2) {
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mw = half * 0.3;
    ctx.moveTo(-mw, half * 0.2);
    ctx.quadraticCurveTo(0, half * 0.35 + Math.sin(t * 4) * 2, mw, half * 0.2);
    ctx.stroke();
    // Teeth
    ctx.fillStyle = '#FFF';
    for (let i = 0; i < 3; i++) {
      const tx2 = -mw + 0.3 * mw + i * mw * 0.5;
      ctx.beginPath();
      ctx.moveTo(tx2, half * 0.2);
      ctx.lineTo(tx2 + 3, half * 0.28);
      ctx.lineTo(tx2 + 6, half * 0.2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── 3D Block Drawing Helpers ─────────────────────────────────
const BLOCK_DEPTH = 12; // visible side height for 3D blocks

function draw3DBlock(x, y, w, h, topColor, leftColor, rightColor) {
  // Top face
  ctx.fillStyle = topColor;
  ctx.fillRect(x, y, w, h);
  // Right face (bottom-right shadow)
  ctx.fillStyle = rightColor;
  ctx.beginPath();
  ctx.moveTo(x + w, y + h);
  ctx.lineTo(x + w + BLOCK_DEPTH * 0.4, y + h + BLOCK_DEPTH);
  ctx.lineTo(x + BLOCK_DEPTH * 0.4, y + h + BLOCK_DEPTH);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  // Right side face
  ctx.fillStyle = leftColor;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + BLOCK_DEPTH * 0.4, y + BLOCK_DEPTH);
  ctx.lineTo(x + w + BLOCK_DEPTH * 0.4, y + h + BLOCK_DEPTH);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function draw3DWallBlock(x, y, w, h, baseColor, depth) {
  const d = depth || BLOCK_DEPTH;
  // Darken for side faces
  const top = baseColor;
  const right = shadeColor(baseColor, -30);
  const bottom = shadeColor(baseColor, -50);
  // Top face
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, h);
  // Front face (taller for walls)
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y + h, w, d);
  // Right face
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h + d);
  ctx.lineTo(x + w + d * 0.3, y + h + d * 0.7);
  ctx.lineTo(x + w + d * 0.3, y - d * 0.3);
  ctx.closePath();
  ctx.fill();
  // Highlight edge
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function shadeColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
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

  // Prompt (touch-friendly)
  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawTextBold('Tap or Press ENTER to Start', W / 2, 480, '#fff', 22, 'center');
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

  // === Pass 1: Ground tiles with 3D depth ===
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = overworldMap[r][c];
      const tx = c * TILE;
      const ty = r * TILE;
      const depthShade = Math.floor(r * 0.8);

      switch (tile) {
        case 'grass':
        case 'tree':
        case 'portal': {
          const hue = 120 + ((r + c) % 3) - 1;
          const sat = 50 + ((r + c) % 3) * 5;
          const light = 35 + depthShade + ((r * c) % 5) * 2;
          // 3D raised tile
          ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // 3D edges: top highlight, bottom/right shadow
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
          ctx.fillRect(tx + TILE - 3, ty, 3, TILE);
          // Bevel inner highlight
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(tx + 2, ty + 2, TILE - 4, TILE - 4);
          // Grass blades
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
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
          // Stem
          ctx.strokeStyle = '#2E7D32';
          ctx.lineWidth = 2;
          const sway = Math.sin(t * 1.2 + c + r) * 1.5;
          ctx.beginPath();
          ctx.moveTo(tx + TILE / 2, ty + TILE - 5);
          ctx.lineTo(tx + TILE / 2 + sway, ty + TILE / 2 + 3);
          ctx.stroke();
          // 3D petals with shadow
          const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#DA70D6'];
          const fc = flowerColors[(r + c) % flowerColors.length];
          const fcx = tx + TILE / 2 + sway;
          const fcy = ty + TILE / 2;
          // Shadow under flower
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(fcx + 2, fcy + 3, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fc;
          for (let p = 0; p < 5; p++) {
            const a = (Math.PI * 2 / 5) * p + t * 0.3;
            ctx.beginPath();
            ctx.ellipse(fcx + Math.cos(a) * 5, fcy + Math.sin(a) * 5, 4, 2.5, a, 0, Math.PI * 2);
            ctx.fill();
          }
          // Bright center
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(fcx, fcy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case 'water': {
          const waveLight = 48 + Math.sin(t * 1.5 + r * 0.7 + c * 0.5) * 6;
          // Sunken water tile (3D inset)
          ctx.fillStyle = `hsl(210, 70%, ${waveLight}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Dark edges for inset look
          ctx.fillStyle = 'rgba(0,0,40,0.3)';
          ctx.fillRect(tx, ty, TILE, 3);
          ctx.fillRect(tx, ty, 3, TILE);
          ctx.fillStyle = 'rgba(100,180,255,0.15)';
          ctx.fillRect(tx, ty + TILE - 2, TILE, 2);
          ctx.fillRect(tx + TILE - 2, ty, 2, TILE);
          // Animated ripples
          ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(t * 2 + c)})`;
          ctx.lineWidth = 1;
          for (let rp = 0; rp < 3; rp++) {
            const rx = tx + 8 + rp * 12;
            const ry = ty + TILE / 2 + Math.sin(t * 2 + c + rp) * 4;
            ctx.beginPath();
            ctx.arc(rx, ry, 4 + rp * 2, 0, Math.PI);
            ctx.stroke();
          }
          // Specular highlight
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(tx + 4, ty + 4, 6, 3);
          break;
        }
      }
    }
  }

  // === Pass 2: Trees with 3D shadows and depth ===
  // Sort by Y for depth ordering
  const sortedTrees = overworldEntities.filter(e => e.type === 'tree').sort((a, b) => a.y - b.y);
  // Draw shadows first
  sortedTrees.forEach(e => {
    const tx = e.x * TILE;
    const ty = e.y * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(tx + TILE / 2 + 8, ty + TILE + 2, 18, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Draw trees front-to-back
  sortedTrees.forEach(e => {
    const tx = e.x * TILE;
    const ty = e.y * TILE;
    // 3D trunk with visible front and side
    const trunkGrad = ctx.createLinearGradient(tx + 14, ty, tx + 26, ty);
    trunkGrad.addColorStop(0, '#5D4037');
    trunkGrad.addColorStop(0.4, '#795548');
    trunkGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(tx + 14, ty + 14, 12, 26);
    // Trunk right side (3D)
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(tx + 26, ty + 14, 3, 26);
    // Trunk front bottom
    ctx.fillStyle = '#2E1B0E';
    ctx.fillRect(tx + 14, ty + 38, 15, 4);
    // Multi-layer canopy for 3D depth
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(tx + TILE / 2 + 3, ty + 18, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(tx + TILE / 2, ty + 13, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.arc(tx + TILE / 2 - 3, ty + 8, 12, 0, Math.PI * 2);
    ctx.fill();
    // 3D highlights (sunlight from top-left)
    ctx.fillStyle = 'rgba(150,255,150,0.15)';
    ctx.beginPath();
    ctx.arc(tx + TILE / 2 - 7, ty + 5, 7, 0, Math.PI * 2);
    ctx.fill();
    // Canopy shadow (bottom edge darker)
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(tx + TILE / 2 + 2, ty + 20, 12, 0, Math.PI);
    ctx.fill();
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

  // Floating clouds (parallax)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 230 + t * 12) % (W + 100)) - 50;
    const cy = 20 + i * 35 + Math.sin(t * 0.3 + i) * 8;
    const cw = 60 + i * 15;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, 12 + i * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - cw * 0.3, cy + 3, cw * 0.5, 10 + i, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + cw * 0.35, cy + 2, cw * 0.4, 8 + i, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Butterflies
  for (let i = 0; i < 3; i++) {
    const bx = (i * 280 + Math.sin(t * 0.7 + i * 3) * 60 + t * 15) % W;
    const by = 100 + i * 80 + Math.sin(t * 1.5 + i * 2) * 30;
    const wingFlap = Math.sin(t * 8 + i * 4) * 6;
    const bColors = ['#FF69B4', '#FFD700', '#87CEEB'];
    ctx.fillStyle = bColors[i];
    ctx.beginPath();
    ctx.ellipse(bx - 4, by, 4, Math.abs(wingFlap), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + 4, by, 4, Math.abs(wingFlap), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - 0.5, by - 3, 1, 6);
  }

  // Heart pickups with glow and shadow
  heartPickups.forEach(h => {
    if (h.collected || h.mansion) return;
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
  drawText('Tap or Press ENTER to go inside...', W / 2, 510, '#FF8A65', 18, 'center');
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
      const tx = c * TILE;
      const ty = r * TILE;
      switch (tile) {
        case 'wall': {
          // 3D raised wall block
          const baseLight = 10 + ((r + c) % 3) * 2;
          // Top face
          ctx.fillStyle = `hsl(0, 0%, ${baseLight + 8}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Front face (darker)
          ctx.fillStyle = `hsl(0, 0%, ${baseLight}%)`;
          ctx.fillRect(tx, ty + TILE - 8, TILE, 8);
          // Right face
          ctx.fillStyle = `hsl(0, 0%, ${baseLight - 3}%)`;
          ctx.fillRect(tx + TILE - 4, ty, 4, TILE);
          // 3D highlight edges
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          // Brick lines with 3D grooves
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 2, ty + 2, TILE - 4, TILE / 2 - 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.strokeRect(tx + 3, ty + 3, TILE - 6, TILE / 2 - 4);
          break;
        }
        case 'floor': {
          // 3D stone floor tile
          const fl = 15 + ((r + c) % 2) * 3;
          ctx.fillStyle = `hsl(270, 5%, ${fl}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Inset groove between tiles
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 1, ty + 1, TILE - 2, TILE - 2);
          // Subtle 3D inner bevel
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(tx + 2, ty + 2, TILE - 4, 1);
          ctx.fillRect(tx + 2, ty + 2, 1, TILE - 4);
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(tx + 2, ty + TILE - 3, TILE - 4, 1);
          break;
        }
        case 'cobweb':
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(tx, ty, TILE, TILE);
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + TILE, ty + TILE);
          ctx.moveTo(tx + TILE, ty);
          ctx.lineTo(tx, ty + TILE);
          ctx.moveTo(tx + TILE / 2, ty);
          ctx.lineTo(tx + TILE / 2, ty + TILE);
          ctx.moveTo(tx, ty + TILE / 2);
          ctx.lineTo(tx + TILE, ty + TILE / 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200,200,200,0.15)';
          ctx.beginPath();
          ctx.arc(tx + TILE / 2, ty + TILE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'pillar': {
          // Floor underneath
          ctx.fillStyle = `hsl(270, 5%, ${15 + ((r + c) % 2) * 3}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // 3D stone pillar
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(tx + TILE / 2 + 3, ty + TILE - 4, 14, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pillar body gradient
          const pillarGrad = ctx.createLinearGradient(tx + 8, ty, tx + TILE - 8, ty);
          pillarGrad.addColorStop(0, '#4a4a5a');
          pillarGrad.addColorStop(0.3, '#6a6a7a');
          pillarGrad.addColorStop(0.7, '#5a5a6a');
          pillarGrad.addColorStop(1, '#3a3a4a');
          ctx.fillStyle = pillarGrad;
          ctx.fillRect(tx + 10, ty + 4, TILE - 20, TILE - 8);
          // Capital (top) and base
          ctx.fillStyle = '#7a7a8a';
          ctx.fillRect(tx + 7, ty + 2, TILE - 14, 6);
          ctx.fillRect(tx + 7, ty + TILE - 8, TILE - 14, 6);
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tx + 12, ty + 6, 4, TILE - 16);
          break;
        }
        case 'crate': {
          // Floor underneath
          ctx.fillStyle = `hsl(270, 5%, ${15 + ((r + c) % 2) * 3}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(tx + 6, ty + TILE - 6, TILE - 8, 6);
          // 3D wooden crate - top face
          ctx.fillStyle = '#8B6914';
          ctx.fillRect(tx + 4, ty + 4, TILE - 8, TILE - 10);
          // Right face
          ctx.fillStyle = '#6B4F10';
          ctx.fillRect(tx + TILE - 8, ty + 6, 4, TILE - 14);
          // Bottom face
          ctx.fillStyle = '#5A4010';
          ctx.fillRect(tx + 4, ty + TILE - 10, TILE - 8, 4);
          // Cross planks
          ctx.strokeStyle = '#9B7924';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx + 6, ty + 6);
          ctx.lineTo(tx + TILE - 10, ty + TILE - 12);
          ctx.moveTo(tx + TILE - 10, ty + 6);
          ctx.lineTo(tx + 6, ty + TILE - 12);
          ctx.stroke();
          // Nails
          ctx.fillStyle = '#CCC';
          ctx.beginPath();
          ctx.arc(tx + TILE / 2, ty + TILE / 2 - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'spikes': {
          // Floor underneath
          const sf = 15 + ((r + c) % 2) * 3;
          ctx.fillStyle = `hsl(270, 5%, ${sf}%)`;
          ctx.fillRect(tx, ty, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 1, ty + 1, TILE - 2, TILE - 2);
          // Spike triangles
          const t2 = Date.now() / 1000;
          const spikeAlpha = 0.5 + 0.3 * Math.sin(t2 * 3 + c + r);
          ctx.fillStyle = `rgba(180, 180, 180, ${spikeAlpha})`;
          for (let sx = 0; sx < 3; sx++) {
            for (let sy = 0; sy < 3; sy++) {
              const spx = tx + 6 + sx * 12;
              const spy = ty + 6 + sy * 12;
              ctx.beginPath();
              ctx.moveTo(spx, spy + 8);
              ctx.lineTo(spx + 4, spy);
              ctx.lineTo(spx + 8, spy + 8);
              ctx.closePath();
              ctx.fill();
            }
          }
          // Metallic highlight
          ctx.fillStyle = `rgba(255, 255, 255, ${spikeAlpha * 0.3})`;
          for (let sx = 0; sx < 3; sx++) {
            for (let sy = 0; sy < 3; sy++) {
              ctx.beginPath();
              ctx.arc(tx + 10 + sx * 12, ty + 8 + sy * 12, 1, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }
        case 'door': {
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(tx, ty, TILE, TILE);
          // 3D door with frame
          ctx.fillStyle = '#3E2723';
          ctx.fillRect(tx + 6, ty + 1, TILE - 12, TILE - 2);
          // Door face lighter
          ctx.fillStyle = '#5D4037';
          ctx.fillRect(tx + 8, ty + 3, TILE - 16, TILE - 6);
          // Door panels (3D inset)
          ctx.fillStyle = '#4E342E';
          ctx.fillRect(tx + 10, ty + 5, TILE - 20, (TILE - 12) / 2 - 1);
          ctx.fillRect(tx + 10, ty + TILE / 2 + 1, TILE - 20, (TILE - 12) / 2 - 1);
          // Knob with shine
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(tx + TILE / 2 + 6, ty + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // Knob highlight
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.arc(tx + TILE / 2 + 5, ty + TILE / 2 - 1, 1, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
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

  // Torch light effects (warm glow on walls)
  const tNow = Date.now() / 1000;
  torches.forEach(torch => {
    const tcx = torch.x * TILE + TILE / 2;
    const tcy = torch.y * TILE + TILE / 2;
    const flicker = 0.7 + 0.3 * Math.sin(tNow * 8 + torch.x * 3 + torch.y * 7);
    const radius = 70 + Math.sin(tNow * 5 + torch.x) * 10;
    // Warm light circle
    const torchGrad = ctx.createRadialGradient(tcx, tcy, 5, tcx, tcy, radius);
    torchGrad.addColorStop(0, `rgba(255, 140, 40, ${0.25 * flicker})`);
    torchGrad.addColorStop(0.5, `rgba(255, 100, 20, ${0.1 * flicker})`);
    torchGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = torchGrad;
    ctx.fillRect(tcx - radius, tcy - radius, radius * 2, radius * 2);
    // Torch bracket (on wall)
    ctx.fillStyle = '#555';
    ctx.fillRect(tcx - 2, tcy - 6, 4, 8);
    // Flame
    ctx.fillStyle = `rgba(255, ${150 + Math.floor(flicker * 50)}, 0, ${flicker})`;
    ctx.beginPath();
    ctx.moveTo(tcx - 4, tcy - 6);
    ctx.quadraticCurveTo(tcx + Math.sin(tNow * 10 + torch.x) * 3, tcy - 18, tcx + 4, tcy - 6);
    ctx.fill();
    // Flame core
    ctx.fillStyle = `rgba(255, 255, 100, ${flicker * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(tcx - 2, tcy - 6);
    ctx.quadraticCurveTo(tcx + Math.sin(tNow * 12 + torch.x) * 1.5, tcy - 13, tcx + 2, tcy - 6);
    ctx.fill();
    // Ember particles near torch
    for (let e = 0; e < 2; e++) {
      const ex = tcx + Math.sin(tNow * 4 + e * 5 + torch.x) * 8;
      const ey = tcy - 14 - (tNow * 20 + e * 15 + torch.y * 7) % 20;
      const ea = Math.max(0, 1 - ((tNow * 20 + e * 15 + torch.y * 7) % 20) / 20);
      ctx.fillStyle = `rgba(255, 180, 50, ${ea * 0.6})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5 * ea, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Ambient dust motes floating in the mansion
  for (let i = 0; i < 15; i++) {
    const dx = (i * 137 + tNow * 8) % W;
    const dy = (i * 89 + Math.sin(tNow * 0.5 + i) * 40 + 200) % H;
    const da = 0.1 + 0.1 * Math.sin(tNow + i * 2);
    ctx.fillStyle = `rgba(200, 180, 140, ${da})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 1 + Math.sin(tNow * 2 + i) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mansion heart pickups
  heartPickups.forEach(h => {
    if (h.collected || !h.mansion) return;
    const hx = h.x * TILE + TILE / 2;
    const hy = h.y * TILE + TILE / 2;
    const bob = Math.sin(Date.now() / 1000 * 2.5 + h.x + h.y * 0.7) * 4;
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 10;
    drawHeart(hx, hy + bob - 4, 8, '#FF1744');
    ctx.shadowBlur = 0;
  });

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

  // Monsters with ground shadow and HP indicator
  monsters.forEach(m => {
    if (!m.alive) return;
    const mx = m.x * TILE + TILE / 2;
    const my = m.y * TILE + TILE / 2;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(mx + 2, my + TILE / 2 - 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawMonster(mx, my, TILE - 6, level);
    // Mini HP bar above monster
    const barW = TILE - 10;
    const hpPct = m.hp / m.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mx - barW / 2, my - TILE / 2 - 4, barW, 3);
    ctx.fillStyle = hpPct > 0.5 ? '#4CAF50' : hpPct > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillRect(mx - barW / 2, my - TILE / 2 - 4, barW * hpPct, 3);
    // Respawned indicator (dimmer)
    if (m.respawned) {
      ctx.fillStyle = 'rgba(100,100,255,0.3)';
      ctx.beginPath();
      ctx.arc(mx, my - TILE / 2 - 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const destTile = mansionMap[ny][nx];
    if (destTile === 'wall' || destTile === 'pillar' || destTile === 'crate') return;

    player.x = nx;
    player.y = ny;
    player.moveCD = 0.12;

    // Spike damage (small chance to lose half a heart equivalent)
    if (destTile === 'spikes' && Math.random() < 0.3) {
      currentHearts = Math.max(0, currentHearts - 1);
      spawnParticle(nx * TILE + TILE / 2, ny * TILE + TILE / 2, '#AAA', 6);
      screenShake(2, 0.1);
      if (currentHearts <= 0) {
        gameState = STATE.GAME_OVER;
        return;
      }
    }

    // Pick up keys
    keys.forEach(k => {
      if (!k.collected && k.x === player.x && k.y === player.y) {
        k.collected = true;
        keysThisLevel++;
        totalKeys++;
        spawnParticle(k.x * TILE + TILE / 2, k.y * TILE + TILE / 2, '#FFD700', 12);
      }
    });

    // Pick up mansion hearts
    heartPickups.forEach(h => {
      if (!h.collected && h.mansion && h.x === player.x && h.y === player.y) {
        h.collected = true;
        currentHearts = Math.min(currentHearts + 1, maxHearts);
        spawnParticle(h.x * TILE + TILE / 2, h.y * TILE + TILE / 2, '#FF1744', 10);
      }
    });

    // Monster collision -> combat
    monsters.forEach(m => {
      if (m.alive && m.x === player.x && m.y === player.y) {
        startCombat(m);
      }
    });

    // Check exit
    if (mansionDoorPos && player.x === mansionDoorPos.x && player.y === mansionDoorPos.y) {
      if (keysThisLevel >= keysNeeded && monstersDefeated >= monstersRequired) {
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
      const mtile = mansionMap[my][mx];
      if (mtile !== 'wall' && mtile !== 'pillar' && mtile !== 'crate') {
        m.x = mx;
        m.y = my;
      }
      // Check if monster walked into player
      if (m.x === player.x && m.y === player.y) {
        startCombat(m);
      }
    }
  });

  // Monster respawn logic
  const aliveCount = monsters.filter(m => m.alive).length;
  if (aliveCount < maxMonstersAlive && monstersDefeated < monstersRequired) {
    // Don't respawn yet, player still needs to defeat originals
  } else if (aliveCount < Math.max(1, Math.floor(maxMonstersAlive * 0.5)) && monstersDefeated >= monstersRequired) {
    // After beating required count, respawn weaker monsters to keep tension
    monsterRespawnTimer += dt;
    if (monsterRespawnTimer > 6) {
      monsterRespawnTimer = 0;
      spawnRespawnMonster();
    }
  }
}

// ── Combat ───────────────────────────────────────────────────
function startCombat(monster) {
  currentMonster = monster;
  monsterHP = monster.hp;
  monsterMaxHP = monster.maxHp;
  playerCombatHP = currentHearts;
  monsterElement = MONSTER_ELEMENTS[monster.name] || 'shadow';
  combatMessage = `A wild ${monster.name} appeared! ${ELEMENT_ICONS[monsterElement]} ${monsterElement} type`;
  combatTurn = 'player';
  combatAnimTimer = 0;
  selectedMove = 0;
  playerDefending = false;
  turnNumber = 0;
  comboCount = 0;
  lastElement = '';
  // Reset cooldowns
  moveCooldowns = {};
  // Pick monster's first stance
  monsterStance = 'attack';
  monsterNextStance = pickMonsterStance();
  gameState = STATE.COMBAT;
}

function pickMonsterStance() {
  const r = Math.random();
  // Higher levels use heavy/guard more often
  const heavyChance = 0.15 + level * 0.05;
  const guardChance = 0.10 + level * 0.04;
  if (r < heavyChance) return 'heavy';
  if (r < heavyChance + guardChance) return 'guard';
  return 'attack';
}

function getEffectiveness(moveElement, monElement) {
  if (moveElement === 'physical' || moveElement === 'none') return 1;
  const chart = ELEMENT_CHART[moveElement];
  if (!chart) return 1;
  if (chart.strong === 'all' || chart.strong === monElement) return 2;
  if (chart.weak === monElement) return 0.5;
  return 1;
}

function drawCombat() {
  // Dark background with red tint
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0000');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 3D Battle arena with perspective floor
  // Shadow under platform
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.55, 360, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Platform side (3D depth)
  ctx.fillStyle = '#0f0a15';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.53, 350, 50, 0, 0, Math.PI);
  ctx.fill();
  // Platform top
  ctx.fillStyle = '#1a1520';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.5, 350, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  // Grid lines for 3D perspective floor
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 60, H * 0.5 - 50);
    ctx.lineTo(W / 2 + i * 70, H * 0.5 + 50);
    ctx.stroke();
  }

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
  // Monster name + element
  const elColor = ELEMENT_COLORS[monsterElement] || '#888';
  const elIcon = ELEMENT_ICONS[monsterElement] || '';
  drawText(`${currentMonster.name} ${elIcon}`, monX, monY - 72, '#FF8A65', 14, 'center');
  drawText(`${monsterHP}/${monsterMaxHP}  ${monsterElement.toUpperCase()}`, monX, monY - 45, elColor, 11, 'center');

  // Monster stance indicator
  if (combatTurn === 'player' || combatTurn === 'player_hit') {
    let stanceText = '';
    let stanceColor = '#888';
    if (monsterStance === 'heavy') {
      stanceText = 'CHARGING HEAVY!';
      stanceColor = '#FF5722';
    } else if (monsterStance === 'guard') {
      stanceText = 'GUARDING';
      stanceColor = '#4FC3F7';
    } else {
      stanceText = 'Attacking';
      stanceColor = '#FF8A65';
    }
    // Stance badge
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(monX - 50, monY + 30, 100, 20, 4);
    ctx.fill();
    ctx.strokeStyle = stanceColor;
    ctx.lineWidth = 1;
    roundRect(monX - 50, monY + 30, 100, 20, 4);
    ctx.stroke();
    drawText(stanceText, monX, monY + 44, stanceColor, 11, 'center');
  }

  // Player avatar (left side)
  const plX = W * 0.25;
  const plY = H * 0.45;
  if (flashColor && combatTurn === 'player_hit') {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(combatAnimTimer * 20);
  }
  // Defense aura when defending
  if (playerDefending) {
    ctx.fillStyle = 'rgba(79, 195, 247, 0.15)';
    ctx.beginPath();
    ctx.arc(plX, plY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plX, plY, 48, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawAvatar(plX, plY, 70, getRank(totalKeys));
  ctx.globalAlpha = 1;

  // Player hearts
  for (let i = 0; i < maxHearts; i++) {
    const hx = plX - 45 + i * 20;
    const hy = plY - 55;
    drawHeart(hx, hy, 7, i < playerCombatHP ? '#FF1744' : '#333');
  }
  drawText(RANKS[getRank(totalKeys)].name, plX, plY - 70, RANKS[getRank(totalKeys)].color, 14, 'center');

  // Message box
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  roundRect(30, H - 200, W - 60, 70, 10);
  ctx.fill();
  ctx.stroke();
  drawText(combatMessage, W / 2, H - 162, '#fff', 14, 'center');

  // Move selection (only during player turn)
  if (combatTurn === 'player') {
    const moves = getCombatMoves();
    const maxMoves = Math.min(moves.length, 5);
    const boxW = Math.min(145, (W - 60) / maxMoves - 6);
    const boxH = 50;
    const totalW = maxMoves * (boxW + 5) - 5;
    const startX = (W - totalW) / 2;
    const startY = H - 118;

    for (let i = 0; i < maxMoves; i++) {
      const move = moves[i];
      const md = MOVE_DATA[move];
      const bx = startX + i * (boxW + 5);
      const by = startY;
      const isSelected = i === selectedMove;
      const onCooldown = moveCooldowns[move] && moveCooldowns[move] > 0;
      const eff = move !== 'Defend' ? getEffectiveness(md.element, monsterElement) : 0;

      // Box background
      ctx.fillStyle = onCooldown ? 'rgba(60,60,60,0.5)' : isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)';
      ctx.strokeStyle = onCooldown ? '#333' : isSelected ? md.color : '#444';
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Move name
      const nameColor = onCooldown ? '#555' : md.color;
      drawText(move, bx + 4, by + 14, nameColor, 11);

      if (move === 'Defend') {
        drawText('Block 50%', bx + 4, by + 28, '#4FC3F7', 9);
        drawText('No damage', bx + 4, by + 40, '#888', 9);
      } else {
        // Damage + effectiveness
        let effLabel = '';
        let effColor = '#888';
        if (eff >= 2) { effLabel = ' x2!'; effColor = '#4CAF50'; }
        else if (eff <= 0.5) { effLabel = ' x0.5'; effColor = '#F44336'; }
        drawText(`DMG:${md.dmg}${effLabel}`, bx + 4, by + 28, effColor, 9);

        // Cooldown or element
        if (onCooldown) {
          drawText(`CD: ${moveCooldowns[move]}`, bx + 4, by + 40, '#F44336', 9);
        } else {
          const eIcon = ELEMENT_ICONS[md.element] || '';
          drawText(`${eIcon} ${md.element}`, bx + 4, by + 40, ELEMENT_COLORS[md.element] || '#888', 9);
        }
      }

      // Key number label
      if (i < 4) {
        drawText(`${i + 1}`, bx + boxW - 12, by + 12, isSelected ? '#fff' : '#555', 10);
      }
    }
  }

  // Particles
  drawParticles();
}

function getCombatMoves() {
  const rank = getRank(totalKeys);
  const moves = RANKS[rank].moves.slice();
  moves.push('Defend');
  return moves;
}

function updateCombat(dt) {
  if (combatTurn === 'player') {
    const moves = getCombatMoves();
    const maxMoves = Math.min(moves.length, 5);

    // Move selection with number keys
    for (let i = 0; i < Math.min(maxMoves, 4); i++) {
      if (justPressed.moves[i]) selectedMove = i;
    }
    if (input.left && selectedMove > 0) { selectedMove--; input.left = false; }
    if (input.right && selectedMove < maxMoves - 1) { selectedMove++; input.right = false; }

    // Execute action
    if (justPressed.space || justPressed.enter) {
      const move = moves[selectedMove];
      const moveData = MOVE_DATA[move];

      // Check cooldown
      if (moveCooldowns[move] && moveCooldowns[move] > 0) {
        combatMessage = `${move} is on cooldown! (${moveCooldowns[move]} turns)`;
        return;
      }

      turnNumber++;
      playerDefending = false;

      if (move === 'Defend') {
        // Defend action
        playerDefending = true;
        combatMessage = 'You brace for impact! (Damage halved)';
        spawnParticle(W * 0.25, H * 0.45, '#4FC3F7', 8);
        lastElement = '';
        comboCount = 0;
      } else {
        // Attack action
        let baseDmg = moveData.dmg;

        // Element effectiveness
        const effectiveness = getEffectiveness(moveData.element, monsterElement);
        let finalDmg = Math.max(1, Math.round(baseDmg * effectiveness));

        // Monster guard stance halves damage
        if (monsterStance === 'guard') {
          finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
        }

        // Combo penalty: using same element 3+ times in a row reduces damage
        if (moveData.element === lastElement && moveData.element !== 'physical') {
          comboCount++;
          if (comboCount >= 3) {
            finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
          }
        } else {
          comboCount = 1;
          lastElement = moveData.element;
        }

        monsterHP -= finalDmg;

        // Build message
        let msg = `${move} dealt ${finalDmg} dmg!`;
        if (effectiveness >= 2) msg += ' SUPER EFFECTIVE!';
        else if (effectiveness <= 0.5) msg += ' Not very effective...';
        if (monsterStance === 'guard') msg += ' (Guarded)';
        if (comboCount >= 3) msg += ' (Stale)';
        combatMessage = msg;

        spawnParticle(W * 0.65, H * 0.35, moveData.color, effectiveness >= 2 ? 25 : 15);
        screenShake(effectiveness >= 2 ? 5 : 3, effectiveness >= 2 ? 0.3 : 0.2);

        // Set cooldown
        if (moveData.cooldown > 0) {
          moveCooldowns[move] = moveData.cooldown + 1; // +1 because we tick down this turn
        }
      }

      // Tick all cooldowns
      for (const m in moveCooldowns) {
        if (moveCooldowns[m] > 0) moveCooldowns[m]--;
      }

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
      // Monster attacks based on current stance
      let baseDmg = 0;
      let stanceMsg = '';
      if (monsterStance === 'attack') {
        baseDmg = 1;
        stanceMsg = `${currentMonster.name} attacks!`;
      } else if (monsterStance === 'heavy') {
        baseDmg = 2;
        stanceMsg = `${currentMonster.name} unleashes a HEAVY BLOW!`;
      } else if (monsterStance === 'guard') {
        baseDmg = 0;
        stanceMsg = `${currentMonster.name} was guarding (no attack).`;
      }

      // Player defend halves damage
      let finalDmg = baseDmg;
      if (playerDefending && baseDmg > 0) {
        finalDmg = Math.max(0, Math.floor(baseDmg * 0.5));
        stanceMsg += finalDmg > 0 ? ' Blocked some!' : ' Fully blocked!';
      }

      if (finalDmg > 0) {
        playerCombatHP -= finalDmg;
        stanceMsg += ` -${finalDmg} heart${finalDmg > 1 ? 's' : ''}!`;
        spawnParticle(W * 0.25, H * 0.45, '#FF0000', 12);
        screenShake(baseDmg >= 2 ? 6 : 4, 0.25);
      }
      combatMessage = stanceMsg;

      // Advance monster stance for next turn
      monsterStance = monsterNextStance;
      monsterNextStance = pickMonsterStance();

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
      // Show next stance telegraph
      let hint = 'Your turn!';
      if (monsterStance === 'heavy') hint += ' WARNING: Charging heavy attack!';
      else if (monsterStance === 'guard') hint += ' Enemy is guarding...';
      else hint += ' Enemy preparing to attack.';
      combatMessage = hint;
    }
  } else if (combatTurn === 'monster_dying') {
    combatAnimTimer += dt;
    if (combatAnimTimer > 1.2) {
      currentMonster.alive = false;
      if (!currentMonster.respawned) monstersDefeated++;
      playerCombatHP = Math.min(playerCombatHP + 1, maxHearts);
      currentHearts = playerCombatHP;
      startTransition(() => {
        gameState = STATE.MANSION;
        // Check for level complete
        if (keysThisLevel >= keysNeeded && monstersDefeated >= monstersRequired) {
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
  drawText('Tap or Press ENTER to continue', W / 2, 520, '#fff', 18, 'center');
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
  drawText('Tap or Press ENTER to try again', W / 2, 470, '#FF8A65', 20, 'center');
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
  drawText('Tap or Press ENTER to play again', W / 2, 520, '#fff', 18, 'center');
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
        <div>Defeated: ${monstersDefeated}/${monstersRequired}${alive > 0 ? ' ('+alive+' roaming)' : ''}</div>
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

  // Touch move buttons
  updateMoveButtons();

  storeInput();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
