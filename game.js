// ============================================================
// KEY QUEST: RISE OF THE GOD
// A Pokémon-style adventure + Haunted Mansion dungeon crawler
// ============================================================

// ── Sound Engine (Web Audio API) ────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new AudioCtx(); } catch (e) { soundEnabled = false; }
}

function playTone(freq, duration, type, vol, ramp) {
  if (!soundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (ramp) osc.frequency.linearRampToValueAtTime(ramp, audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, vol) {
  if (!soundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const bufSize = audioCtx.sampleRate * duration;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

const SFX = {
  heartPickup() {
    playTone(523, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160);
  },
  keyPickup() {
    playTone(880, 0.08, 'square', 0.08);
    setTimeout(() => playTone(1047, 0.08, 'square', 0.08), 60);
    setTimeout(() => playTone(1319, 0.12, 'square', 0.07), 120);
  },
  playerAttack(effectiveness) {
    if (effectiveness >= 2) {
      playTone(200, 0.08, 'sawtooth', 0.1);
      setTimeout(() => playTone(400, 0.1, 'sawtooth', 0.12), 50);
      setTimeout(() => playTone(800, 0.15, 'sawtooth', 0.1), 100);
    } else if (effectiveness <= 0.5) {
      playTone(200, 0.15, 'triangle', 0.06);
      playNoise(0.1, 0.03);
    } else {
      playTone(300, 0.08, 'sawtooth', 0.08);
      setTimeout(() => playTone(500, 0.1, 'sawtooth', 0.08), 60);
    }
  },
  playerDefend() {
    playTone(250, 0.15, 'triangle', 0.08);
    playNoise(0.08, 0.04);
  },
  monsterAttack(heavy) {
    if (heavy) {
      playTone(120, 0.25, 'sawtooth', 0.12, 60);
      playNoise(0.15, 0.08);
    } else {
      playTone(180, 0.12, 'sawtooth', 0.08, 100);
    }
  },
  playerHit() {
    playTone(150, 0.2, 'square', 0.1, 80);
    playNoise(0.1, 0.06);
  },
  monsterDie() {
    playTone(400, 0.1, 'sawtooth', 0.1, 100);
    setTimeout(() => playTone(300, 0.15, 'sawtooth', 0.08, 80), 100);
    setTimeout(() => playNoise(0.2, 0.06), 150);
  },
  playerDie() {
    playTone(300, 0.2, 'square', 0.1, 100);
    setTimeout(() => playTone(200, 0.3, 'square', 0.1, 80), 200);
    setTimeout(() => playTone(100, 0.5, 'square', 0.08, 50), 450);
  },
  levelUp() {
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 100);
    });
  },
  portalEnter() {
    playTone(330, 0.2, 'sine', 0.08, 660);
    setTimeout(() => playTone(440, 0.3, 'sine', 0.08, 880), 150);
  },
  momTalk() {
    playTone(520, 0.08, 'sine', 0.06);
    setTimeout(() => playTone(580, 0.08, 'sine', 0.06), 80);
    setTimeout(() => playTone(520, 0.1, 'sine', 0.05), 160);
  },
  step() {
    playNoise(0.04, 0.02);
  },
  spikeHit() {
    playTone(100, 0.15, 'sawtooth', 0.08);
    playNoise(0.08, 0.05);
  },
  menuSelect() {
    playTone(660, 0.06, 'square', 0.06);
  },
  combatStart() {
    playTone(220, 0.15, 'sawtooth', 0.1, 440);
    setTimeout(() => playTone(330, 0.15, 'sawtooth', 0.1, 660), 150);
    setTimeout(() => playTone(440, 0.2, 'sawtooth', 0.08), 300);
  },
  criticalHit() {
    playTone(800, 0.08, 'sawtooth', 0.12);
    setTimeout(() => playTone(1200, 0.1, 'sawtooth', 0.14), 60);
    setTimeout(() => playTone(1600, 0.15, 'sine', 0.12), 120);
    setTimeout(() => playTone(2000, 0.1, 'sine', 0.08), 200);
  },
  achievement() {
    [660, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'sine', 0.08), i * 80);
    });
  },
  streakBonus() {
    playTone(500, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(700, 0.08, 'sine', 0.1), 80);
    setTimeout(() => playTone(900, 0.1, 'sine', 0.08), 160);
  },
  lootDrop() {
    playTone(440, 0.06, 'sine', 0.08);
    setTimeout(() => playTone(660, 0.08, 'sine', 0.1), 70);
    setTimeout(() => playTone(880, 0.12, 'sine', 0.1), 140);
  },
};

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

// Per-level character forms — the hero transforms each level
const HERO_FORMS = [
  { name: 'Spark', species: 'Ember Fox', bodyColor: '#FF6B35', accentColor: '#FFD700', feature: 'tail',  desc: 'A quick little fire fox' },
  { name: 'Gloom',  species: 'Shadow Cat', bodyColor: '#4A0E8F', accentColor: '#CE93D8', feature: 'ears',  desc: 'A stealthy shadow cat' },
  { name: 'Surge',  species: 'Storm Wolf', bodyColor: '#1565C0', accentColor: '#FFEB3B', feature: 'mane',  desc: 'An electric wolf' },
  { name: 'Thorn',  species: 'Iron Bear', bodyColor: '#5D4037', accentColor: '#B0BEC5', feature: 'armor', desc: 'An armored beast' },
  { name: 'Wraith', species: 'Void Serpent', bodyColor: '#1A0033', accentColor: '#E040FB', feature: 'wings', desc: 'A winged void serpent' },
  { name: 'Nova',   species: 'Celestial Dragon', bodyColor: '#00838F', accentColor: '#00E5FF', feature: 'halo',  desc: 'A divine dragon' },
];

// Per-level guide NPC forms — the mysterious guide transforms too
const GUIDE_FORMS = [
  { name: 'Old Toad', color: '#4CAF50', accent: '#8BC34A', shape: 'round' },
  { name: 'Lantern Ghost', color: '#4FC3F7', accent: '#B3E5FC', shape: 'float' },
  { name: 'Mushroom Sage', color: '#FF9800', accent: '#FFE0B2', shape: 'wide' },
  { name: 'Crystal Golem', color: '#7E57C2', accent: '#D1C4E9', shape: 'angular' },
  { name: 'Bone Oracle', color: '#BDBDBD', accent: '#F5F5F5', shape: 'tall' },
  { name: 'Star Child', color: '#FFD700', accent: '#FFF9C4', shape: 'glow' },
];

function getHeroForm() { return HERO_FORMS[Math.min(level, HERO_FORMS.length - 1)]; }
function getGuideForm() { return GUIDE_FORMS[Math.min(level, GUIDE_FORMS.length - 1)]; }

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

// ── Level Modifiers (each level plays differently) ──────────
const LEVEL_THEMES = [
  {
    name: 'The Forgotten Cellar',
    modifier: 'none',
    desc: 'A quiet start... clear the rats.',
    overworldSky: ['#6BB3E0', '#87CEEB', '#7BC67E'],
    mansionHue: 0,
    fogRadius: 250,
    biome: 'meadow',
    groundColor: '#4a7a3a',
    groundAccent: '#5a8a4a',
    obstacle: 'tree',
    obstacleColor: '#2d5a1e',
    waterColor: '#4a90d9',
    flowerColors: ['#FF6B6B', '#FFD93D', '#6BCB77'],
    mansionFloor: '#1a1520',
    mansionWall: '#2a2030',
  },
  {
    name: 'The Blinding Dark',
    modifier: 'darkness',
    desc: 'Reduced visibility. Stay close to torches!',
    overworldSky: ['#0a0a2a', '#1a1a3a', '#0a1a2a'],
    mansionHue: 240,
    fogRadius: 120,
    biome: 'swamp',
    groundColor: '#2a3a2a',
    groundAccent: '#3a4a30',
    obstacle: 'deadTree',
    obstacleColor: '#3a3030',
    waterColor: '#2a4a30',
    flowerColors: ['#7a9a5a', '#5a7a4a', '#8aaa6a'],
    mansionFloor: '#0a0f1a',
    mansionWall: '#151a28',
  },
  {
    name: 'The Swarming Halls',
    modifier: 'swarm',
    desc: 'Monsters are faster and more aggressive.',
    overworldSky: ['#FF6B35', '#FF8C42', '#FFD700'],
    mansionHue: 30,
    fogRadius: 220,
    biome: 'desert',
    groundColor: '#C4A35A',
    groundAccent: '#D4B36A',
    obstacle: 'cactus',
    obstacleColor: '#4a7a3a',
    waterColor: '#3a8aaa',
    flowerColors: ['#FF5722', '#FF9800', '#FFD700'],
    mansionFloor: '#1a1510',
    mansionWall: '#2a2520',
  },
  {
    name: 'The Spiked Gauntlet',
    modifier: 'trapped',
    desc: 'Spikes everywhere! Watch your step.',
    overworldSky: ['#4a4a5a', '#6a6a7a', '#5a5a4a'],
    mansionHue: 120,
    fogRadius: 200,
    biome: 'mountain',
    groundColor: '#6a6a6a',
    groundAccent: '#7a7a7a',
    obstacle: 'rock',
    obstacleColor: '#5a5a5a',
    waterColor: '#4a6a8a',
    flowerColors: ['#8a8aaa', '#7a7a9a', '#9a9aba'],
    mansionFloor: '#151518',
    mansionWall: '#252528',
  },
  {
    name: 'The Phantom Keep',
    modifier: 'phasing',
    desc: 'Monsters phase through walls to hunt you.',
    overworldSky: ['#1a0030', '#3a1060', '#2a0a4a'],
    mansionHue: 280,
    fogRadius: 180,
    biome: 'void',
    groundColor: '#1a0a2a',
    groundAccent: '#2a1a3a',
    obstacle: 'crystal',
    obstacleColor: '#8a5ac0',
    waterColor: '#3a1a5a',
    flowerColors: ['#E040FB', '#CE93D8', '#AB47BC'],
    mansionFloor: '#0a0515',
    mansionWall: '#1a0a28',
  },
  {
    name: 'The Final Stand',
    modifier: 'chaos',
    desc: 'All hazards combined. The ultimate test.',
    overworldSky: ['#1a0000', '#3a0505', '#2a1000'],
    mansionHue: 0,
    fogRadius: 160,
    biome: 'inferno',
    groundColor: '#3a1a0a',
    groundAccent: '#4a2a1a',
    obstacle: 'lava_rock',
    obstacleColor: '#2a1a1a',
    waterColor: '#FF4500',
    flowerColors: ['#FF6B35', '#FF0000', '#FF8C00'],
    mansionFloor: '#1a0a0a',
    mansionWall: '#2a0a0a',
  },
];

function getTheme() { return LEVEL_THEMES[Math.min(level, LEVEL_THEMES.length - 1)]; }

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
let momNPC = null;            // Mom NPC position & state
let momMessage = '';          // current message from Mom
let momMessageTimer = 0;      // display timer

// ── Addictive Mechanics ──────────────────────────────────────
let score = 0;
let killStreak = 0;
let bestScore = 0;
let bestLevel = 0;
let bestKeys = 0;
let bestStreak = 0;
let totalMonstersEverKilled = 0;
let damageBuffTurns = 0;       // temporary 1.5x damage buff from loot
let comboVariety = [];         // track last few different elements used
let scorePopups = [];          // floating "+100" text that rises and fades
let achievementPopup = null;   // currently displaying achievement
let achievementPopupQueue = [];
let lootDropCount = 0;
let combatStartHP = 0;        // track HP at combat start for "untouchable" achievement
let noDamageCombat = true;     // did player take 0 damage this fight?
let levelStartHearts = 0;     // hearts at level start for "flawless"

const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Defeat your first monster' },
  { id: 'collector_20', name: 'Key Hoarder', desc: 'Collect 20+ keys in one run' },
  { id: 'streak_3', name: 'On Fire', desc: 'Get a 3-kill streak' },
  { id: 'streak_5', name: 'Unstoppable', desc: 'Get a 5-kill streak' },
  { id: 'streak_7', name: 'Rampage', desc: 'Get a 7-kill streak' },
  { id: 'untouchable', name: 'Untouchable', desc: 'Win a fight taking no damage' },
  { id: 'critical', name: 'Lucky Strike', desc: 'Land a critical hit' },
  { id: 'rank_pro', name: 'Going Pro', desc: 'Reach Pro rank' },
  { id: 'rank_master', name: 'Master Class', desc: 'Reach Master rank' },
  { id: 'rank_god', name: 'Ascended', desc: 'Reach God rank' },
  { id: 'flawless', name: 'Flawless', desc: 'Complete a level at full health' },
  { id: 'champion', name: 'Champion', desc: 'Beat the game' },
  { id: 'score_1000', name: 'High Roller', desc: 'Score 1000+ points' },
  { id: 'score_5000', name: 'Score Master', desc: 'Score 5000+ points' },
  { id: 'loot_5', name: 'Treasure Hunter', desc: 'Collect 5 loot drops' },
];
let unlockedAchievements = {};

function loadHighScores() {
  try {
    const data = JSON.parse(localStorage.getItem('keyquest_highscores'));
    if (data) {
      bestScore = data.bestScore || 0;
      bestLevel = data.bestLevel || 0;
      bestKeys = data.bestKeys || 0;
      bestStreak = data.bestStreak || 0;
      unlockedAchievements = data.achievements || {};
    }
  } catch(e) {}
}

function saveHighScores() {
  try {
    if (score > bestScore) bestScore = score;
    if (level > bestLevel) bestLevel = level;
    if (totalKeys > bestKeys) bestKeys = totalKeys;
    if (killStreak > bestStreak) bestStreak = killStreak;
    localStorage.setItem('keyquest_highscores', JSON.stringify({
      bestScore, bestLevel, bestKeys, bestStreak,
      achievements: unlockedAchievements,
    }));
  } catch(e) {}
}

function addScore(points, x, y, color) {
  score += points;
  if (x !== undefined && y !== undefined) {
    scorePopups.push({ text: '+' + points, x, y, life: 60, maxLife: 60, color: color || '#FFD700' });
  }
  checkAutoAchievements();
}

function unlockAchievement(id) {
  if (unlockedAchievements[id]) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  unlockedAchievements[id] = true;
  achievementPopupQueue.push({ name: ach.name, desc: ach.desc, timer: 180 });
  SFX.achievement();
  saveHighScores();
}

function checkAutoAchievements() {
  if (score >= 1000) unlockAchievement('score_1000');
  if (score >= 5000) unlockAchievement('score_5000');
  if (totalKeys >= 20) unlockAchievement('collector_20');
  if (lootDropCount >= 5) unlockAchievement('loot_5');
  const rank = getRank(totalKeys);
  if (rank >= 2) unlockAchievement('rank_pro');
  if (rank >= 3) unlockAchievement('rank_master');
  if (rank >= 5) unlockAchievement('rank_god');
}

function checkStreakAchievements() {
  if (killStreak >= 3) unlockAchievement('streak_3');
  if (killStreak >= 5) unlockAchievement('streak_5');
  if (killStreak >= 7) unlockAchievement('streak_7');
}

function getComboMultiplier() {
  // Reward using different elements in sequence
  const unique = new Set(comboVariety);
  if (unique.size >= 4) return 1.8;
  if (unique.size >= 3) return 1.5;
  if (unique.size >= 2) return 1.2;
  return 1.0;
}

function getComboLabel() {
  const unique = new Set(comboVariety);
  if (unique.size >= 4) return 'MEGA COMBO!';
  if (unique.size >= 3) return 'TRIPLE COMBO!';
  if (unique.size >= 2) return 'COMBO!';
  return '';
}

// Load scores on script initialization
loadHighScores();

const MOM_TIPS = [
  "Watch the monster's stance — Defend against heavy attacks!",
  "Use elemental weaknesses for double damage!",
  "Don't spam the same move — mix it up or damage drops!",
  "Powerful moves have cooldowns. Use Slap or Punch in between!",
  "Smash crates to find hidden hearts!",
  "Shadow monsters are weak to Void Strike!",
  "Poison types hate Thunder — zap them!",
  "Ice monsters melt to Fireball!",
  "If a monster is guarding, save your strong move for next turn.",
  "You can do this! I sense greatness in you!",
  "Losing a fight costs 2 keys — choose battles wisely!",
  "Defend when you see CHARGING HEAVY! Trust me!",
  "Press SHIFT to dash through danger! It costs a heart though.",
  "The door glows gold when you've cleared enough to exit.",
];

// ── Input ────────────────────────────────────────────────────
const input = { up: false, down: false, left: false, right: false, space: false, enter: false, shift: false, moves: [false,false,false,false] };
const justPressed = { space: false, enter: false, shift: false, moves: [false,false,false,false] };
const prevInput = { space: false, enter: false, shift: false, moves: [false,false,false,false] };

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    input.up = true;
  if (k === 's' || k === 'arrowdown')  input.down = true;
  if (k === 'a' || k === 'arrowleft')  input.left = true;
  if (k === 'd' || k === 'arrowright') input.right = true;
  if (k === ' ') input.space = true;
  if (k === 'enter') input.enter = true;
  if (k === 'shift') input.shift = true;
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
  if (k === 'shift') input.shift = false;
  if (k === '1') input.moves[0] = false;
  if (k === '2') input.moves[1] = false;
  if (k === '3') input.moves[2] = false;
  if (k === '4') input.moves[3] = false;
});

function updateJustPressed() {
  justPressed.space = input.space && !prevInput.space;
  justPressed.enter = input.enter && !prevInput.enter;
  justPressed.shift = input.shift && !prevInput.shift;
  for (let i = 0; i < 4; i++) justPressed.moves[i] = input.moves[i] && !prevInput.moves[i];
}
function storeInput() {
  prevInput.space = input.space;
  prevInput.enter = input.enter;
  prevInput.shift = input.shift;
  for (let i = 0; i < 4; i++) prevInput.moves[i] = input.moves[i];
}

// ── Direct Canvas Touch (tap-to-move, swipe, combat tap) ────
let touchTarget = null;       // { x, y } tile target for tap-to-move
let touchStartPos = null;     // { x, y } screen coords for swipe detection
let touchStartTime = 0;

function canvasTouchToTile(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
  const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;
  return { px: tx, py: ty, tileX: Math.floor(tx / TILE), tileY: Math.floor(ty / TILE) };
}

canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  touchStartPos = { x: touch.clientX, y: touch.clientY };
  touchStartTime = Date.now();

  // Menu screens: tap to continue
  if (gameState === STATE.TITLE || gameState === STATE.MANSION_ENTER ||
      gameState === STATE.LEVEL_UP || gameState === STATE.GAME_OVER || gameState === STATE.WIN) {
    input.space = true;
    input.enter = true;
    setTimeout(() => { input.space = false; input.enter = false; }, 100);
    return;
  }

  // Combat: tap on a move box to select + confirm
  if (gameState === STATE.COMBAT && combatTurn === 'player') {
    const pos = canvasTouchToTile(e);
    const moves = getCombatMoves();
    const maxMoves = Math.min(moves.length, 5);
    const boxW = Math.min(145, (W - 60) / maxMoves - 6);
    const boxH = 50;
    const totalBW = maxMoves * (boxW + 5) - 5;
    const startX = (W - totalBW) / 2;
    const startY = H - 118;
    for (let i = 0; i < maxMoves; i++) {
      const bx = startX + i * (boxW + 5);
      if (pos.px >= bx && pos.px <= bx + boxW && pos.py >= startY && pos.py <= startY + boxH) {
        selectedMove = i;
        // Tap to select; double-tap same move to confirm (or tap A)
        input.space = true;
        input.enter = true;
        setTimeout(() => { input.space = false; input.enter = false; }, 100);
        return;
      }
    }
    return;
  }

  // Overworld / Mansion: set tap target (move toward it)
  if (gameState === STATE.OVERWORLD || gameState === STATE.MANSION) {
    const pos = canvasTouchToTile(e);
    touchTarget = { x: pos.tileX, y: pos.tileY };
  }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  if (!touchStartPos) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartPos.x;
  const dy = touch.clientY - touchStartPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const elapsed = Date.now() - touchStartTime;

  // Swipe detection: fast enough drag > 30px
  if (dist > 30 && elapsed < 400 && (gameState === STATE.OVERWORLD || gameState === STATE.MANSION)) {
    touchTarget = null; // cancel tap target, use swipe instead
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0) { input.right = true; setTimeout(() => { input.right = false; }, 120); }
      else { input.left = true; setTimeout(() => { input.left = false; }, 120); }
    } else {
      // Vertical swipe
      if (dy > 0) { input.down = true; setTimeout(() => { input.down = false; }, 120); }
      else { input.up = true; setTimeout(() => { input.up = false; }, 120); }
    }
  }
  touchStartPos = null;
}, { passive: false });

canvas.addEventListener('touchcancel', function() {
  touchStartPos = null;
  touchTarget = null;
});

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
  touchTarget = null;
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
  // Hearts to collect — exactly maxHearts so player must find them all
  let heartsToPlace = maxHearts;
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
  // Monsters (scales with level — balanced so last level is hard but possible)
  let monsterCount = 3 + Math.floor(level * 0.8); // 3,3,4,5,6,7
  monstersRequired = monsterCount;
  maxMonstersAlive = monsterCount;
  const monHp = 2 + Math.floor(level * 0.8); // 2,2,3,4,4,5
  for (let i = 0; i < monsterCount; i++) {
    let c, r;
    do { c = rand(3, COLS - 4); r = rand(3, ROWS - 4); } while (
      mansionMap[r][c] !== 'floor'
    );
    monsters.push({
      x: c, y: r, alive: true,
      hp: monHp,
      maxHp: monHp,
      name: getMonsterName(level),
      moveTimer: 0,
    });
  }
  // Heart pickups inside mansion (scales with level for survivability)
  let mansionHearts = 2 + Math.floor(level / 2); // 2,2,3,3,4,4
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

  // Place Mom NPC in a safe spot
  let mc, mr, mTries = 0;
  do {
    mc = rand(3, COLS - 4);
    mr = rand(3, ROWS - 4);
    mTries++;
  } while ((mansionMap[mr][mc] !== 'floor' || dist({ x: mc, y: mr }, { x: 1, y: ROWS - 2 }) < 4) && mTries < 50);
  momNPC = { x: mc, y: mr, talked: false };
  momMessage = '';
  momMessageTimer = 0;
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
  // Scale max hearts with level so later levels are survivable
  maxHearts = 5 + level;  // 5,6,7,8,9,10
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

// ── Avatar Drawing (transforms each level into different creature) ──
function drawAvatar(cx, cy, size, rankIdx, facing) {
  const rank = RANKS[rankIdx];
  const form = getHeroForm();
  const s = size;
  const half = s / 2;
  const t = Date.now() / 1000;

  ctx.save();
  ctx.translate(cx, cy);

  // Breathing animation
  const breathe = 1 + Math.sin(t * 2.5) * 0.03;
  ctx.scale(breathe, breathe);

  // === Rank aura ===
  if (rankIdx >= 3) {
    ctx.shadowColor = form.accentColor;
    ctx.shadowBlur = 8 + rankIdx * 3 + Math.sin(t * 3) * 4;
    ctx.strokeStyle = form.accentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2);
    ctx.beginPath();
    ctx.arc(0, 0, half + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // === Ground shadow ===
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, half * 0.8, half * 0.5, half * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Tail (fox, cat, wolf) ===
  if (form.feature === 'tail' || form.feature === 'ears' || form.feature === 'mane') {
    const tailWave = Math.sin(t * 3) * 4;
    ctx.fillStyle = form.bodyColor;
    ctx.beginPath();
    ctx.moveTo(half * 0.3, half * 0.2);
    ctx.quadraticCurveTo(half * 0.8 + tailWave, -half * 0.1, half * 0.6 + tailWave, -half * 0.5);
    ctx.quadraticCurveTo(half * 0.5, -half * 0.1, half * 0.2, half * 0.2);
    ctx.fill();
    if (form.feature === 'tail') {
      // Fox tail tip
      ctx.fillStyle = form.accentColor;
      ctx.beginPath();
      ctx.arc(half * 0.6 + tailWave, -half * 0.5, half * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Wings (serpent) ===
  if (form.feature === 'wings') {
    ctx.fillStyle = form.accentColor;
    ctx.globalAlpha = 0.4;
    const wingFlap = Math.sin(t * 4) * 5;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-half * 0.3, -half * 0.1);
    ctx.quadraticCurveTo(-half * 1.0, -half * 0.8 + wingFlap, -half * 0.7, -half * 0.2);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(half * 0.3, -half * 0.1);
    ctx.quadraticCurveTo(half * 1.0, -half * 0.8 + wingFlap, half * 0.7, -half * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === Body ===
  ctx.fillStyle = form.bodyColor;
  ctx.shadowColor = form.bodyColor;
  ctx.shadowBlur = 4;
  // Rounded creature body
  ctx.beginPath();
  ctx.ellipse(0, half * 0.1, half * 0.45, half * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // === Belly accent ===
  ctx.fillStyle = form.accentColor;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(0, half * 0.2, half * 0.25, half * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // === Head ===
  ctx.fillStyle = form.bodyColor;
  ctx.beginPath();
  ctx.arc(0, -half * 0.25, half * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // === Ears ===
  if (form.feature === 'ears' || form.feature === 'tail') {
    ctx.fillStyle = form.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-half * 0.25, -half * 0.5);
    ctx.lineTo(-half * 0.15, -half * 0.8);
    ctx.lineTo(-half * 0.02, -half * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(half * 0.02, -half * 0.5);
    ctx.lineTo(half * 0.15, -half * 0.8);
    ctx.lineTo(half * 0.25, -half * 0.5);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = form.accentColor;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-half * 0.2, -half * 0.52);
    ctx.lineTo(-half * 0.14, -half * 0.72);
    ctx.lineTo(-half * 0.06, -half * 0.52);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(half * 0.06, -half * 0.52);
    ctx.lineTo(half * 0.14, -half * 0.72);
    ctx.lineTo(half * 0.2, -half * 0.52);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === Mane (wolf) ===
  if (form.feature === 'mane') {
    ctx.fillStyle = form.accentColor;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.8 + (Math.PI * 1.6 / 4) * i;
      const wave = Math.sin(t * 3 + i) * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * half * 0.4, -half * 0.25 + Math.sin(a) * half * 0.35, half * 0.12 + wave, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Armor plates (iron bear) ===
  if (form.feature === 'armor') {
    ctx.fillStyle = form.accentColor;
    ctx.globalAlpha = 0.6;
    roundRect(-half * 0.35, -half * 0.05, half * 0.7, half * 0.35, 3);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#fff';
    roundRect(-half * 0.3, -half * 0.02, half * 0.6, half * 0.12, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === Halo (celestial dragon) ===
  if (form.feature === 'halo') {
    ctx.strokeStyle = form.accentColor;
    ctx.shadowColor = form.accentColor;
    ctx.shadowBlur = 10 + Math.sin(t * 2) * 4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -half * 0.65, half * 0.25, half * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Floating orbs
    for (let i = 0; i < 4; i++) {
      const oa = t * 1.5 + i * Math.PI / 2;
      const ox = Math.cos(oa) * half * 0.6;
      const oy = Math.sin(oa) * half * 0.6;
      ctx.fillStyle = form.accentColor;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3 + i);
      ctx.beginPath();
      ctx.arc(ox, oy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === Eyes ===
  const lookX = facing === 'left' ? -2 : facing === 'right' ? 2 : 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-half * 0.14, -half * 0.28, half * 0.1, half * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(half * 0.14, -half * 0.28, half * 0.1, half * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = form.accentColor;
  ctx.beginPath();
  ctx.arc(-half * 0.14 + lookX, -half * 0.28, half * 0.05, 0, Math.PI * 2);
  ctx.arc(half * 0.14 + lookX, -half * 0.28, half * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-half * 0.14 + lookX, -half * 0.28, half * 0.025, 0, Math.PI * 2);
  ctx.arc(half * 0.14 + lookX, -half * 0.28, half * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(-half * 0.17, -half * 0.3, half * 0.015, 0, Math.PI * 2);
  ctx.arc(half * 0.11, -half * 0.3, half * 0.015, 0, Math.PI * 2);
  ctx.fill();

  // === Mouth (small curve) ===
  ctx.strokeStyle = form.accentColor;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.arc(0, -half * 0.18, half * 0.08, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // === Legs / Paws ===
  ctx.fillStyle = form.bodyColor;
  ctx.fillRect(-half * 0.25, half * 0.4, half * 0.18, half * 0.25);
  ctx.fillRect(half * 0.07, half * 0.4, half * 0.18, half * 0.25);
  // Paw pads
  ctx.fillStyle = form.accentColor;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(-half * 0.16, half * 0.62, half * 0.07, 0, Math.PI * 2);
  ctx.arc(half * 0.16, half * 0.62, half * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // === Rank sparkles (high ranks) ===
  if (rankIdx >= 4) {
    for (let i = 0; i < 4 + rankIdx; i++) {
      const sa = t * 2 + i * Math.PI / (2 + rankIdx);
      const sr = half * 0.7 + Math.sin(t * 3 + i) * 4;
      ctx.fillStyle = `${form.accentColor}${Math.floor((0.3 + 0.3 * Math.sin(t * 4 + i)) * 255).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Guide NPC Drawing (transforms each level) ──────────────
function drawGuide(cx, cy, size) {
  const s = size;
  const half = s / 2;
  const t = Date.now() / 1000;
  const form = getGuideForm();

  ctx.save();
  ctx.translate(cx, cy);

  // Floating bob
  const bob = Math.sin(t * 2) * 3;
  ctx.translate(0, bob);

  // Glow aura
  ctx.shadowColor = form.color;
  ctx.shadowBlur = 10 + Math.sin(t * 2) * 4;

  if (form.shape === 'round') {
    // Old Toad — round green blob
    ctx.fillStyle = form.color;
    ctx.beginPath();
    ctx.ellipse(0, half * 0.1, half * 0.45, half * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly
    ctx.fillStyle = form.accent;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, half * 0.2, half * 0.25, half * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Big eyes on top
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-half * 0.2, -half * 0.2, half * 0.15, 0, Math.PI * 2);
    ctx.arc(half * 0.2, -half * 0.2, half * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-half * 0.2, -half * 0.2, half * 0.07, 0, Math.PI * 2);
    ctx.arc(half * 0.2, -half * 0.2, half * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, half * 0.05, half * 0.12, 0.3, Math.PI - 0.3);
    ctx.stroke();
  } else if (form.shape === 'float') {
    // Lantern Ghost — floaty wisp
    ctx.fillStyle = form.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-half * 0.3, half * 0.6);
    ctx.quadraticCurveTo(-half * 0.5, 0, 0, -half * 0.5);
    ctx.quadraticCurveTo(half * 0.5, 0, half * 0.3, half * 0.6);
    ctx.quadraticCurveTo(half * 0.1, half * 0.4 + Math.sin(t * 4) * 3, 0, half * 0.6 + Math.sin(t * 3) * 3);
    ctx.quadraticCurveTo(-half * 0.1, half * 0.4, -half * 0.3, half * 0.6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Lantern flame inside
    ctx.fillStyle = form.accent;
    ctx.beginPath();
    ctx.arc(0, -half * 0.1, half * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Eyes (glowing dots)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-half * 0.1, -half * 0.2, half * 0.06, 0, Math.PI * 2);
    ctx.arc(half * 0.1, -half * 0.2, half * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (form.shape === 'wide') {
    // Mushroom Sage — wide cap
    ctx.fillStyle = form.color;
    ctx.beginPath();
    ctx.ellipse(0, -half * 0.1, half * 0.55, half * 0.3, 0, Math.PI, 0);
    ctx.fill();
    // Spots
    ctx.fillStyle = form.accent;
    ctx.beginPath();
    ctx.arc(-half * 0.2, -half * 0.25, half * 0.07, 0, Math.PI * 2);
    ctx.arc(half * 0.15, -half * 0.3, half * 0.05, 0, Math.PI * 2);
    ctx.arc(half * 0.05, -half * 0.2, half * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFF3E0';
    roundRect(-half * 0.2, -half * 0.1, half * 0.4, half * 0.6, 4);
    ctx.fill();
    // Face
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-half * 0.08, half * 0.1, half * 0.04, 0, Math.PI * 2);
    ctx.arc(half * 0.08, half * 0.1, half * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (form.shape === 'angular') {
    // Crystal Golem — geometric
    ctx.shadowBlur = 0;
    ctx.fillStyle = form.color;
    drawHexagon(0, 0, half * 0.5);
    ctx.fill();
    ctx.strokeStyle = form.accent;
    ctx.lineWidth = 1;
    drawHexagon(0, 0, half * 0.5);
    ctx.stroke();
    // Inner crystal
    ctx.fillStyle = form.accent;
    ctx.globalAlpha = 0.4;
    drawHexagon(0, 0, half * 0.25);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-half * 0.12, -half * 0.08, half * 0.06, 0, Math.PI * 2);
    ctx.arc(half * 0.12, -half * 0.08, half * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (form.shape === 'tall') {
    // Bone Oracle — tall thin
    ctx.fillStyle = form.color;
    ctx.shadowBlur = 0;
    roundRect(-half * 0.15, -half * 0.5, half * 0.3, half * 1.1, 5);
    ctx.fill();
    // Skull head
    ctx.beginPath();
    ctx.arc(0, -half * 0.4, half * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Empty eye sockets
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-half * 0.08, -half * 0.4, half * 0.07, 0, Math.PI * 2);
    ctx.arc(half * 0.08, -half * 0.4, half * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // Glowing eyes
    ctx.fillStyle = form.accent;
    ctx.beginPath();
    ctx.arc(-half * 0.08, -half * 0.4, half * 0.035, 0, Math.PI * 2);
    ctx.arc(half * 0.08, -half * 0.4, half * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Star Child — glowing orb
    const pulse = 0.8 + 0.2 * Math.sin(t * 2);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.5);
    grd.addColorStop(0, form.accent);
    grd.addColorStop(0.6, form.color);
    grd.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.45 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Star shape inside
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.7;
    drawStar(0, 0, half * 0.1, half * 0.25, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-half * 0.08, -half * 0.05, half * 0.04, 0, Math.PI * 2);
    ctx.arc(half * 0.08, -half * 0.05, half * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating sparkle above
  ctx.shadowBlur = 0;
  const sparkBob = Math.sin(t * 3) * 3;
  ctx.fillStyle = form.accent;
  drawStar(0, -half * 0.7 + sparkBob, 2, 5, 4);
  ctx.fill();

  ctx.restore();
}

// Keep drawMom as alias for compatibility
function drawMom(cx, cy, size) { drawGuide(cx, cy, size); }

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

  // Floating particles with glow
  const t = Date.now() / 1000;
  ctx.save();
  for (let i = 0; i < 30; i++) {
    const px = (i * 73 + t * 20) % W;
    const py = (i * 47 + Math.sin(t + i) * 30) % H;
    const alpha = 0.3 + 0.2 * Math.sin(t + i);
    const r = 2 + Math.sin(t * 2 + i) * 1.5;
    ctx.shadowColor = `rgba(${100 + i * 5}, ${50 + i * 3}, 200, 1)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${100 + i * 5}, ${50 + i * 3}, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Title
  ctx.shadowColor = '#9C27B0';
  ctx.shadowBlur = 30;
  drawTextBold('KEY QUEST', W / 2, 180, '#E1BEE7', 60, 'center');
  ctx.shadowBlur = 15;
  drawTextBold('Rise of the God', W / 2, 230, '#CE93D8', 28, 'center');
  ctx.shadowBlur = 0;

  // Hero cycles through all forms to preview progression
  const aIdx = Math.floor((Date.now() / 1500) % 6);
  const savedLevel = level;
  level = aIdx; // temporarily set level for form lookup
  drawAvatar(W / 2 - 60, 330, 55, aIdx);
  drawText(HERO_FORMS[aIdx].name, W / 2 - 60, 380, HERO_FORMS[aIdx].accentColor, 14, 'center');
  drawText(HERO_FORMS[aIdx].species, W / 2 - 60, 398, '#888', 10, 'center');

  // Guide cycles too
  drawGuide(W / 2 + 60, 335, 50);
  drawText(GUIDE_FORMS[aIdx].name, W / 2 + 60, 380, GUIDE_FORMS[aIdx].color, 14, 'center');
  drawText('Guide', W / 2 + 60, 398, '#888', 12, 'center');
  level = savedLevel;

  // Prompt (touch-friendly)
  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawTextBold('Tap or Press ENTER to Start', W / 2, 460, '#fff', 22, 'center');
  ctx.globalAlpha = 1;

  // High scores display
  if (bestScore > 0) {
    ctx.fillStyle = 'rgba(20,10,40,0.7)';
    roundRect(W / 2 - 140, 480, 280, 80, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    roundRect(W / 2 - 140, 480, 280, 8, 8);
    ctx.stroke();
    drawText('PERSONAL BEST', W / 2, 498, '#FFD700', 11, 'center');
    const achCount = Object.keys(unlockedAchievements).length;
    drawText(`Score: ${bestScore}  |  Keys: ${bestKeys}  |  Level: ${bestLevel + 1}`, W / 2, 518, '#CE93D8', 11, 'center');
    drawText(`Best Streak: ${bestStreak}  |  Achievements: ${achCount}/${ACHIEVEMENTS.length}`, W / 2, 536, '#aaa', 10, 'center');
    drawText("Transform. Conquer. Rise.", W / 2, 556, '#666', 10, 'center');
  } else {
    drawText("Transform. Conquer. Rise.", W / 2, 510, '#888', 14, 'center');
  }
}

function updateTitle() {
  if (justPressed.enter || justPressed.space) {
    initAudio();
    SFX.menuSelect();
    level = 0;
    totalKeys = 0;
    score = 0;
    killStreak = 0;
    totalMonstersEverKilled = 0;
    damageBuffTurns = 0;
    comboVariety = [];
    lootDropCount = 0;
    scorePopups = [];
    loadHighScores();
    startTransition(() => initLevel());
  }
}

// ── Scene: Overworld ─────────────────────────────────────────
function drawOverworld() {
  // Sky gradient themed per level
  const sky = getTheme().overworldSky;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, sky[0]);
  grad.addColorStop(0.4, sky[1]);
  grad.addColorStop(1, sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() / 1000;

  // === Pass 1: Ground tiles — biome-specific rendering ===
  const theme = getTheme();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = overworldMap[r][c];
      const tx = c * TILE;
      const ty = r * TILE;
      const depthShade = Math.floor(r * 0.8);
      const noise = ((r * 7 + c * 13) % 5);

      switch (tile) {
        case 'grass':
        case 'tree':
        case 'portal': {
          // Ground color from biome
          ctx.fillStyle = (r + c) % 2 === 0 ? theme.groundColor : theme.groundAccent;
          ctx.fillRect(tx, ty, TILE, TILE);
          // 3D edges
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
          ctx.fillRect(tx + TILE - 3, ty, 3, TILE);
          // Biome-specific ground details
          if (theme.biome === 'meadow' && noise < 2) {
            ctx.strokeStyle = '#3a6a2a';
            ctx.lineWidth = 1;
            const sway = Math.sin(t * 1.5 + c * 0.5 + r * 0.3) * 2;
            ctx.beginPath();
            ctx.moveTo(tx + 10, ty + TILE);
            ctx.lineTo(tx + 12 + sway, ty + TILE - 10);
            ctx.moveTo(tx + 28, ty + TILE);
            ctx.lineTo(tx + 26 + sway * 0.7, ty + TILE - 8);
            ctx.stroke();
          } else if (theme.biome === 'desert' && noise < 2) {
            ctx.fillStyle = 'rgba(200,180,100,0.2)';
            ctx.beginPath();
            ctx.arc(tx + 10 + noise * 5, ty + 20 + noise * 3, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (theme.biome === 'swamp' && noise < 3) {
            ctx.fillStyle = 'rgba(50,80,50,0.3)';
            ctx.beginPath();
            ctx.ellipse(tx + 20, ty + 20, 6 + noise * 2, 3, noise * 0.3, 0, Math.PI * 2);
            ctx.fill();
          } else if (theme.biome === 'mountain' && noise < 2) {
            ctx.fillStyle = 'rgba(100,100,100,0.2)';
            ctx.fillRect(tx + 5 + noise * 6, ty + 8 + noise * 4, 8, 4);
          } else if (theme.biome === 'void' && noise < 2) {
            ctx.fillStyle = `rgba(200,100,255,${0.05 + 0.03 * Math.sin(t + c + r)})`;
            ctx.fillRect(tx, ty, TILE, TILE);
          } else if (theme.biome === 'inferno' && noise < 3) {
            const flicker = 0.1 + 0.08 * Math.sin(t * 3 + c * 2 + r);
            ctx.fillStyle = `rgba(255,100,0,${flicker})`;
            ctx.beginPath();
            ctx.arc(tx + 10 + noise * 5, ty + 15 + noise * 3, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'flower': {
          ctx.fillStyle = (r + c) % 2 === 0 ? theme.groundColor : theme.groundAccent;
          ctx.fillRect(tx, ty, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tx, ty, TILE, 2);
          ctx.fillRect(tx, ty, 2, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(tx, ty + TILE - 3, TILE, 3);
          // Biome flower
          const fc = theme.flowerColors[(r + c) % theme.flowerColors.length];
          const sway = Math.sin(t * 1.2 + c + r) * 1.5;
          const fcx = tx + TILE / 2 + sway;
          const fcy = ty + TILE / 2;
          if (theme.biome !== 'void' && theme.biome !== 'inferno') {
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx + TILE / 2, ty + TILE - 5);
            ctx.lineTo(fcx, fcy + 3);
            ctx.stroke();
          }
          ctx.fillStyle = fc;
          for (let p = 0; p < 5; p++) {
            const a = (Math.PI * 2 / 5) * p + t * 0.3;
            ctx.beginPath();
            ctx.ellipse(fcx + Math.cos(a) * 5, fcy + Math.sin(a) * 5, 4, 2.5, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = theme.biome === 'inferno' ? '#FF4500' : '#FFD700';
          ctx.beginPath();
          ctx.arc(fcx, fcy, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'water': {
          // Water color from biome (lava for inferno!)
          ctx.fillStyle = theme.waterColor;
          ctx.fillRect(tx, ty, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(tx, ty, TILE, 3);
          ctx.fillRect(tx, ty, 3, TILE);
          if (theme.biome === 'inferno') {
            // Lava bubbles
            const bubble = Math.sin(t * 2 + c + r * 2) * 0.3;
            ctx.fillStyle = `rgba(255,200,0,${0.3 + bubble})`;
            ctx.beginPath();
            ctx.arc(tx + 15 + Math.sin(t + c) * 3, ty + 20, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,100,0,${0.5 + bubble})`;
            ctx.beginPath();
            ctx.arc(tx + 30, ty + 12 + Math.sin(t * 1.5 + r) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.1 * Math.sin(t * 2 + c)})`;
            ctx.lineWidth = 1;
            for (let rp = 0; rp < 3; rp++) {
              const rx = tx + 8 + rp * 12;
              const ry = ty + TILE / 2 + Math.sin(t * 2 + c + rp) * 4;
              ctx.beginPath();
              ctx.arc(rx, ry, 4 + rp * 2, 0, Math.PI);
              ctx.stroke();
            }
          }
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(tx + 4, ty + 4, 6, 3);
          break;
        }
      }
    }
  }

  // === Pass 2: Obstacles with biome-specific rendering ===
  const sortedTrees = overworldEntities.filter(e => e.type === 'tree').sort((a, b) => a.y - b.y);
  // Shadows
  sortedTrees.forEach(e => {
    const tx = e.x * TILE;
    const ty = e.y * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(tx + TILE / 2 + 5, ty + TILE, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Draw obstacles
  sortedTrees.forEach(e => {
    const tx = e.x * TILE;
    const ty = e.y * TILE;
    const cx = tx + TILE / 2;
    const cy = ty + TILE / 2;

    if (theme.biome === 'meadow') {
      // Green trees
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(tx + 15, ty + 16, 10, 24);
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath(); ctx.arc(cx + 2, ty + 17, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.arc(cx, ty + 12, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#43A047';
      ctx.beginPath(); ctx.arc(cx - 2, ty + 7, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,255,150,0.12)';
      ctx.beginPath(); ctx.arc(cx - 5, ty + 5, 6, 0, Math.PI * 2); ctx.fill();
    } else if (theme.biome === 'swamp') {
      // Dead trees with hanging moss
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(tx + 16, ty + 8, 8, 32);
      // Branches
      ctx.strokeStyle = '#4a4040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx + 16, ty + 14); ctx.lineTo(tx + 6, ty + 8);
      ctx.moveTo(tx + 24, ty + 18); ctx.lineTo(tx + 34, ty + 10);
      ctx.moveTo(tx + 16, ty + 24); ctx.lineTo(tx + 8, ty + 22);
      ctx.stroke();
      // Hanging moss
      ctx.strokeStyle = 'rgba(100,140,80,0.5)';
      ctx.lineWidth = 1;
      const sway = Math.sin(t * 0.8 + e.x) * 2;
      ctx.beginPath();
      ctx.moveTo(tx + 8, ty + 10); ctx.lineTo(tx + 8 + sway, ty + 22);
      ctx.moveTo(tx + 32, ty + 12); ctx.lineTo(tx + 32 + sway, ty + 24);
      ctx.stroke();
    } else if (theme.biome === 'desert') {
      // Cactus
      ctx.fillStyle = '#4a7a3a';
      ctx.fillRect(tx + 16, ty + 10, 8, 28);
      // Arms
      ctx.fillRect(tx + 6, ty + 14, 10, 6);
      ctx.fillRect(tx + 6, ty + 8, 6, 12);
      ctx.fillRect(tx + 24, ty + 18, 10, 6);
      ctx.fillRect(tx + 28, ty + 12, 6, 12);
      // Highlights
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(tx + 17, ty + 10, 2, 28);
    } else if (theme.biome === 'mountain') {
      // Rock formation
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath();
      ctx.moveTo(tx + 5, ty + TILE);
      ctx.lineTo(tx + 12, ty + 8);
      ctx.lineTo(tx + 20, ty + 4);
      ctx.lineTo(tx + 28, ty + 10);
      ctx.lineTo(tx + 35, ty + TILE);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(tx + 14, ty + 8);
      ctx.lineTo(tx + 20, ty + 4);
      ctx.lineTo(tx + 24, ty + 12);
      ctx.closePath();
      ctx.fill();
      // Snow cap on some
      if (e.x % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(tx + 16, ty + 8);
        ctx.lineTo(tx + 20, ty + 4);
        ctx.lineTo(tx + 24, ty + 8);
        ctx.closePath();
        ctx.fill();
      }
    } else if (theme.biome === 'void') {
      // Floating crystal
      const crystalBob = Math.sin(t * 2 + e.x + e.y) * 3;
      ctx.save();
      ctx.shadowColor = '#E040FB';
      ctx.shadowBlur = 8;
      ctx.fillStyle = theme.obstacleColor;
      ctx.beginPath();
      ctx.moveTo(cx, ty + 5 + crystalBob);
      ctx.lineTo(cx + 10, cy + crystalBob);
      ctx.lineTo(cx, ty + 35 + crystalBob);
      ctx.lineTo(cx - 10, cy + crystalBob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, ty + 5 + crystalBob);
      ctx.lineTo(cx + 5, cy - 5 + crystalBob);
      ctx.lineTo(cx - 3, cy - 3 + crystalBob);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (theme.biome === 'inferno') {
      // Lava rocks with glow
      ctx.save();
      ctx.shadowColor = '#FF4500';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#2a1a1a';
      ctx.beginPath();
      ctx.moveTo(tx + 5, ty + TILE);
      ctx.lineTo(tx + 10, ty + 10);
      ctx.lineTo(tx + 20, ty + 5);
      ctx.lineTo(tx + 30, ty + 12);
      ctx.lineTo(tx + 35, ty + TILE);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Glowing cracks
      ctx.strokeStyle = `rgba(255,100,0,${0.4 + 0.2 * Math.sin(t * 3 + e.x)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 15, ty + 15);
      ctx.lineTo(tx + 20, ty + 25);
      ctx.lineTo(tx + 25, ty + 20);
      ctx.stroke();
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
  // Tap target indicator
  if (touchTarget) {
    const ttx = touchTarget.x * TILE + TILE / 2;
    const tty = touchTarget.y * TILE + TILE / 2;
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 200);
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ttx, tty, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(pfx + 2, pfy + TILE / 2 - 4, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const facing = input.left ? 'left' : input.right ? 'right' : 'down';
  drawAvatar(pfx, pfy, TILE - 4, getRank(totalKeys), facing);
}

function drawHeart(cx, cy, size, color) {
  // Outer glow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 1.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx, cy - size * 0.3, cx - size, cy - size * 0.3, cx - size, cy + size * 0.1);
  ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.6, cx + size, cy + size * 0.1);
  ctx.bezierCurveTo(cx + size, cy - size * 0.3, cx, cy - size * 0.3, cx, cy + size * 0.3);
  ctx.fill();
  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.3, cy, size * 0.25, size * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function updateOverworld(dt) {
  if (player.moveCD > 0) { player.moveCD -= dt; return; }

  // Tap-to-move: inject directional input toward touch target
  if (touchTarget && !input.up && !input.down && !input.left && !input.right) {
    const dx = touchTarget.x - player.x;
    const dy = touchTarget.y - player.y;
    if (dx === 0 && dy === 0) { touchTarget = null; }
    else {
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) input.right = true; else input.left = true;
      } else {
        if (dy > 0) input.down = true; else input.up = true;
      }
      // Auto-release after one step
      setTimeout(() => { input.up = false; input.down = false; input.left = false; input.right = false; }, 80);
    }
  }

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
    SFX.step();

    // Pick up hearts
    heartPickups.forEach(h => {
      if (!h.collected && h.x === player.x && h.y === player.y) {
        h.collected = true;
        heartsCollected++;
        currentHearts = Math.min(currentHearts + 1, maxHearts);
        spawnParticle(h.x * TILE + TILE / 2, h.y * TILE + TILE / 2, '#FF1744', 10);
        SFX.heartPickup();
        addScore(15, h.x * TILE + TILE / 2, h.y * TILE - 10, '#FF1744');
      }
    });

    // Portal check
    if (portalPos && player.x === portalPos.x && player.y === portalPos.y) {
      if (currentHearts >= maxHearts) {
        SFX.portalEnter();
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

  // Ground with fog
  ctx.fillStyle = '#1a1a0a';
  ctx.fillRect(0, 400, W, 200);
  // Ground fog
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const fogX = (i * 120 + Math.sin(t * 0.3 + i) * 40) % (W + 100) - 50;
    const fogAlpha = 0.04 + 0.02 * Math.sin(t * 0.5 + i);
    const fogGrad = ctx.createRadialGradient(fogX, 400, 0, fogX, 400, 80);
    fogGrad.addColorStop(0, `rgba(150,120,200,${fogAlpha})`);
    fogGrad.addColorStop(1, 'rgba(150,120,200,0)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(fogX - 80, 360, 160, 80);
  }
  ctx.restore();

  // Text
  const theme = getTheme();
  ctx.shadowColor = '#F44336';
  ctx.shadowBlur = 10;
  drawTextBold(theme.name, W / 2, 70, '#FF5722', 32, 'center');
  ctx.shadowBlur = 0;
  drawText(`Level ${level + 1}`, W / 2, 440, '#aaa', 18, 'center');
  drawText(theme.desc, W / 2, 466, '#FF8A65', 15, 'center');
  drawText('Collect 10 keys & defeat the monsters!', W / 2, 490, '#888', 14, 'center');

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
          const doorReady = keysThisLevel >= keysNeeded && monstersDefeated >= monstersRequired;
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(tx, ty, TILE, TILE);
          // Glow when ready to exit
          if (doorReady) {
            ctx.save();
            const doorPulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
            const doorGlow = ctx.createRadialGradient(tx + TILE / 2, ty + TILE / 2, 5, tx + TILE / 2, ty + TILE / 2, TILE);
            doorGlow.addColorStop(0, `rgba(255,215,0,${0.15 * doorPulse})`);
            doorGlow.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = doorGlow;
            ctx.fillRect(tx - TILE / 2, ty - TILE / 2, TILE * 2, TILE * 2);
            ctx.restore();
          }
          // 3D door with frame
          ctx.fillStyle = '#3E2723';
          ctx.fillRect(tx + 6, ty + 1, TILE - 12, TILE - 2);
          // Door face lighter
          ctx.fillStyle = doorReady ? '#6D5047' : '#5D4037';
          ctx.fillRect(tx + 8, ty + 3, TILE - 16, TILE - 6);
          // Door panels (3D inset)
          ctx.fillStyle = doorReady ? '#5E4438' : '#4E342E';
          ctx.fillRect(tx + 10, ty + 5, TILE - 20, (TILE - 12) / 2 - 1);
          ctx.fillRect(tx + 10, ty + TILE / 2 + 1, TILE - 20, (TILE - 12) / 2 - 1);
          // Knob with shine
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = doorReady ? 10 : 4;
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

  // Fog / darkness overlay (vignette around player) — tighter on dark levels
  const theme = getTheme();
  const fogR = theme.fogRadius;
  const pgx = player.x * TILE + TILE / 2;
  const pgy = player.y * TILE + TILE / 2;
  const fogGrad = ctx.createRadialGradient(pgx, pgy, fogR * 0.25, pgx, pgy, fogR);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(1, fogR <= 140 ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.75)');
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

  // Mom NPC
  if (momNPC) {
    const momX = momNPC.x * TILE + TILE / 2;
    const momY = momNPC.y * TILE + TILE / 2;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(momX + 1, momY + TILE / 2 - 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    drawGuide(momX, momY, TILE - 4);
    // Guide label
    const guideF = getGuideForm();
    drawText(guideF.name, momX, momY - TILE / 2 - 2, guideF.color, 10, 'center');
  }

  // Mom message bubble (positioned at bottom to avoid overlapping HUD/hearts)
  if (momMessage && momMessageTimer > 0) {
    const bubbleW = Math.min(W - 40, 360);
    const bubbleH = 50;
    const bubbleX = (W - bubbleW) / 2;
    const bubbleY = H - bubbleH - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.strokeStyle = '#FF80AB';
    ctx.lineWidth = 2;
    roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
    ctx.fill();
    ctx.stroke();
    const gForm = getGuideForm();
    drawText(gForm.name + ':', bubbleX + 12, bubbleY + 18, gForm.color, 12);
    drawText(momMessage, bubbleX + 12, bubbleY + 36, '#fff', 12);
  }

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

  // Tap target indicator
  if (touchTarget) {
    const ttx = touchTarget.x * TILE + TILE / 2;
    const tty = touchTarget.y * TILE + TILE / 2;
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 200);
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ttx, tty, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Player
  const facing = input.left ? 'left' : input.right ? 'right' : 'down';
  drawAvatar(player.x * TILE + TILE / 2, player.y * TILE + TILE / 2, TILE - 4, getRank(totalKeys), facing);

  // Torchlight vignette around player
  const plCX = player.x * TILE + TILE / 2;
  const plCY = player.y * TILE + TILE / 2;
  const vigRadius = 180 + Math.sin(Date.now() / 500) * 15;
  const vig = ctx.createRadialGradient(plCX, plCY, vigRadius * 0.3, plCX, plCY, vigRadius);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

}

function updateMansion(dt) {
  if (momMessageTimer > 0) momMessageTimer -= dt;
  if (player.moveCD > 0) { player.moveCD -= dt; return; }

  // Tap-to-move: inject directional input toward touch target
  if (touchTarget && !input.up && !input.down && !input.left && !input.right) {
    const dx = touchTarget.x - player.x;
    const dy = touchTarget.y - player.y;
    if (dx === 0 && dy === 0) { touchTarget = null; }
    else {
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) input.right = true; else input.left = true;
      } else {
        if (dy > 0) input.down = true; else input.up = true;
      }
      setTimeout(() => { input.up = false; input.down = false; input.left = false; input.right = false; }, 80);
    }
  }

  let nx = player.x;
  let ny = player.y;
  if (input.up)    ny--;
  if (input.down)  ny++;
  if (input.left)  nx--;
  if (input.right) nx++;

  // Dash (shift) — leap 2 tiles in movement direction, costs 1 heart
  if (justPressed.shift && currentHearts > 1 && (input.up || input.down || input.left || input.right)) {
    let dx = 0, dy = 0;
    if (input.up) dy = -1; else if (input.down) dy = 1;
    else if (input.left) dx = -1; else if (input.right) dx = 1;
    const dashX = player.x + dx * 2;
    const dashY = player.y + dy * 2;
    if (dashX >= 0 && dashX < COLS && dashY >= 0 && dashY < ROWS) {
      const dt2 = mansionMap[dashY][dashX];
      if (dt2 !== 'wall' && dt2 !== 'pillar' && dt2 !== 'crate') {
        currentHearts--;
        player.x = dashX;
        player.y = dashY;
        player.moveCD = 0.2;
        spawnParticle(dashX * TILE + TILE / 2, dashY * TILE + TILE / 2, getHeroForm().accentColor, 8);
        screenShake(2, 0.1);
        SFX.portalEnter();
        // Skip to key/heart/monster checks below
        nx = dashX;
        ny = dashY;
      }
    }
  }

  if (nx !== player.x || ny !== player.y) {
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    const destTile = mansionMap[ny][nx];

    // Smash crates by walking into them (press space)
    if (destTile === 'crate' && (justPressed.space || input.space)) {
      mansionMap[ny][nx] = 'floor';
      mansionObstacles = mansionObstacles.filter(o => !(o.x === nx && o.y === ny));
      spawnParticle(nx * TILE + TILE / 2, ny * TILE + TILE / 2, '#8B6914', 15);
      SFX.keyPickup();
      screenShake(2, 0.1);
      // 40% chance crate contains a heart
      if (Math.random() < 0.4) {
        heartPickups.push({ x: nx, y: ny, collected: false, mansion: true });
        spawnParticle(nx * TILE + TILE / 2, ny * TILE + TILE / 2, '#FF1744', 8);
      }
      player.moveCD = 0.15;
      return;
    }

    if (destTile === 'wall' || destTile === 'pillar' || destTile === 'crate') return;

    player.x = nx;
    player.y = ny;
    player.moveCD = 0.12;
    SFX.step();

    // Spike damage — higher chance on trapped/chaos levels (but never unfair)
    const spikeMod = getTheme().modifier;
    const spikeChance = (spikeMod === 'trapped' || spikeMod === 'chaos') ? 0.4 : 0.2;
    if (destTile === 'spikes' && Math.random() < spikeChance) {
      currentHearts = Math.max(0, currentHearts - 1);
      spawnParticle(nx * TILE + TILE / 2, ny * TILE + TILE / 2, '#AAA', 6);
      screenShake(2, 0.1);
      SFX.spikeHit();
      if (currentHearts <= 0) {
        SFX.playerDie();
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
        SFX.keyPickup();
        addScore(25, k.x * TILE + TILE / 2, k.y * TILE - 10);
        checkAutoAchievements();
      }
    });

    // Pick up mansion hearts
    heartPickups.forEach(h => {
      if (!h.collected && h.mansion && h.x === player.x && h.y === player.y) {
        h.collected = true;
        currentHearts = Math.min(currentHearts + 1, maxHearts);
        spawnParticle(h.x * TILE + TILE / 2, h.y * TILE + TILE / 2, '#FF1744', 10);
        SFX.heartPickup();
        addScore(15, h.x * TILE + TILE / 2, h.y * TILE - 10, '#FF1744');
      }
    });

    // Mom NPC interaction — gives a strategic tip
    if (momNPC && player.x === momNPC.x && player.y === momNPC.y) {
      momMessage = MOM_TIPS[Math.floor(Math.random() * MOM_TIPS.length)];
      momMessageTimer = 4;
      SFX.momTalk();
      // Heal 1 heart as guide's blessing
      if (currentHearts < maxHearts) {
        currentHearts = Math.min(currentHearts + 1, maxHearts);
        spawnParticle(momNPC.x * TILE + TILE / 2, momNPC.y * TILE + TILE / 2, '#FF80AB', 8);
      }
    }

    // Monster collision -> combat
    monsters.forEach(m => {
      if (m.alive && m.x === player.x && m.y === player.y) {
        SFX.combatStart();
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

  // Move monsters toward player — speed/behavior depends on level modifier
  const mod = getTheme().modifier;
  const moveSpeed = (mod === 'swarm' || mod === 'chaos') ? 0.35 : 0.6;
  const chaseChance = (mod === 'swarm' || mod === 'chaos') ? 0.85 : 0.6;
  const canPhase = (mod === 'phasing' || mod === 'chaos');

  monsters.forEach(m => {
    if (!m.alive) return;
    m.moveTimer += dt;
    if (m.moveTimer > moveSpeed) {
      m.moveTimer = 0;
      let mx = m.x, my = m.y;
      if (Math.random() < chaseChance) {
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
      if (canPhase || (mtile !== 'wall' && mtile !== 'pillar' && mtile !== 'crate')) {
        m.x = mx;
        m.y = my;
      }
      // Check if monster walked into player
      if (m.x === player.x && m.y === player.y) {
        SFX.combatStart();
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
  comboVariety = [];
  noDamageCombat = true;
  combatStartHP = currentHearts;
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
  // Dark background with subtle color shift
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.5, 500);
  bgGrad.addColorStop(0, '#1a0a1e');
  bgGrad.addColorStop(0.5, '#0f0510');
  bgGrad.addColorStop(1, '#050208');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Ambient light rays
  const t = Date.now() / 1000;
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 3; i++) {
    const angle = t * 0.1 + i * 2.1;
    const rayGrad = ctx.createLinearGradient(
      W / 2 + Math.cos(angle) * 200, 0,
      W / 2 + Math.cos(angle + 0.5) * 300, H
    );
    rayGrad.addColorStop(0, 'rgba(120,80,200,0)');
    rayGrad.addColorStop(0.5, '#8050c0');
    rayGrad.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // 3D Battle arena with perspective floor
  // Shadow under platform
  ctx.save();
  ctx.shadowColor = 'rgba(100,50,180,0.3)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.55, 360, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Platform side (3D depth)
  ctx.fillStyle = '#0f0a18';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.53, 350, 50, 0, 0, Math.PI);
  ctx.fill();
  // Platform top with subtle gradient
  const platGrad = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, 350);
  platGrad.addColorStop(0, '#201828');
  platGrad.addColorStop(1, '#120e18');
  ctx.fillStyle = platGrad;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.5, 350, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  // Grid lines for 3D perspective floor
  ctx.strokeStyle = 'rgba(140,100,200,0.05)';
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

  // Monster HP bar (modern gradient with glow)
  const hpBarX = monX - 50, hpBarY = monY - 62, hpBarW = 100, hpBarH = 12;
  const hpRatio = monsterHP / monsterMaxHP;
  // Background
  ctx.fillStyle = 'rgba(20,20,20,0.8)';
  roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 6);
  ctx.fill();
  // HP fill gradient (green -> yellow -> red based on HP)
  if (hpRatio > 0) {
    const hpGrad = ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW * hpRatio, 0);
    if (hpRatio > 0.5) {
      hpGrad.addColorStop(0, '#4CAF50');
      hpGrad.addColorStop(1, '#66BB6A');
    } else if (hpRatio > 0.25) {
      hpGrad.addColorStop(0, '#FF9800');
      hpGrad.addColorStop(1, '#FFB74D');
    } else {
      hpGrad.addColorStop(0, '#D32F2F');
      hpGrad.addColorStop(1, '#F44336');
    }
    ctx.save();
    ctx.beginPath();
    roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 6);
    ctx.clip();
    ctx.fillStyle = hpGrad;
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    // Shimmer highlight
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH / 3);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Glow
    ctx.save();
    ctx.shadowColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = ctx.shadowColor;
    ctx.lineWidth = 1;
    roundRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 6);
    ctx.stroke();
    ctx.restore();
  }
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 6);
  ctx.stroke();
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
    // Stance badge with glow
    ctx.save();
    ctx.shadowColor = stanceColor;
    ctx.shadowBlur = monsterStance === 'heavy' ? 12 : 6;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    roundRect(monX - 50, monY + 30, 100, 20, 6);
    ctx.fill();
    ctx.strokeStyle = stanceColor;
    ctx.lineWidth = 1;
    roundRect(monX - 50, monY + 30, 100, 20, 6);
    ctx.stroke();
    ctx.restore();
    drawText(stanceText, monX, monY + 44, stanceColor, 11, 'center');
  }

  // Player avatar (left side)
  const plX = W * 0.25;
  const plY = H * 0.45;
  if (flashColor && combatTurn === 'player_hit') {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(combatAnimTimer * 20);
  }
  // Defense aura when defending (pulsing shield)
  if (playerDefending) {
    ctx.save();
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 150);
    const shieldGrad = ctx.createRadialGradient(plX, plY, 20, plX, plY, 55);
    shieldGrad.addColorStop(0, 'rgba(79, 195, 247, 0)');
    shieldGrad.addColorStop(0.7, `rgba(79, 195, 247, ${0.08 * pulse})`);
    shieldGrad.addColorStop(1, `rgba(79, 195, 247, ${0.2 * pulse})`);
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(plX, plY, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#4FC3F7';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = `rgba(79, 195, 247, ${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plX, plY, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawAvatar(plX, plY, 70, getRank(totalKeys));
  ctx.globalAlpha = 1;

  // Player hearts
  for (let i = 0; i < maxHearts; i++) {
    const hx = plX - 45 + i * 20;
    const hy = plY - 55;
    drawHeart(hx, hy, 7, i < playerCombatHP ? '#FF1744' : '#333');
  }
  drawText(getHeroForm().name, plX, plY - 70, getHeroForm().accentColor, 14, 'center');
  drawText(RANKS[getRank(totalKeys)].name, plX, plY + 52, RANKS[getRank(totalKeys)].color, 11, 'center');

  // Message box (glass-morphism)
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,30,0.85)';
  roundRect(30, H - 200, W - 60, 70, 12);
  ctx.fill();
  // Top highlight
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  roundRect(30, H - 200, W - 60, 20, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(30, H - 200, W - 60, 70, 12);
  ctx.stroke();
  ctx.restore();
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

      // Box background (glass-morphism)
      ctx.save();
      if (isSelected && !onCooldown) {
        ctx.shadowColor = md.color;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = onCooldown ? 'rgba(30,30,30,0.6)' : isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(10,10,25,0.7)';
      roundRect(bx, by, boxW, boxH, 8);
      ctx.fill();
      // Top highlight on selected
      if (isSelected && !onCooldown) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        roundRect(bx, by, boxW, boxH * 0.4, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = onCooldown ? '#333' : isSelected ? md.color : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(bx, by, boxW, boxH, 8);
      ctx.stroke();
      ctx.restore();

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
    if (input.left && selectedMove > 0) { selectedMove--; input.left = false; SFX.menuSelect(); }
    if (input.right && selectedMove < maxMoves - 1) { selectedMove++; input.right = false; SFX.menuSelect(); }

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
        SFX.playerDefend();
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

        // Combo variety bonus: reward using different elements
        if (moveData.element !== 'physical') {
          comboVariety.push(moveData.element);
          if (comboVariety.length > 4) comboVariety.shift();
        }
        const comboMult = getComboMultiplier();
        if (comboMult > 1) {
          finalDmg = Math.max(1, Math.round(finalDmg * comboMult));
        }

        // Temporary damage buff from loot
        if (damageBuffTurns > 0) {
          finalDmg = Math.max(1, Math.round(finalDmg * 1.5));
          damageBuffTurns--;
        }

        // Critical hit: 15% chance (+2% per rank) for 2x damage
        let isCritical = false;
        const critChance = 0.15 + getRank(totalKeys) * 0.02;
        if (Math.random() < critChance) {
          isCritical = true;
          finalDmg *= 2;
          unlockAchievement('critical');
        }

        monsterHP -= finalDmg;

        // Build message
        let msg = `${move} dealt ${finalDmg} dmg!`;
        if (isCritical) msg = `CRITICAL HIT! ${move} dealt ${finalDmg} dmg!`;
        if (effectiveness >= 2) msg += ' SUPER EFFECTIVE!';
        else if (effectiveness <= 0.5) msg += ' Not very effective...';
        if (monsterStance === 'guard') msg += ' (Guarded)';
        if (comboCount >= 3) msg += ' (Stale)';
        const cLabel = getComboLabel();
        if (cLabel && !isCritical) msg += ` ${cLabel}`;
        combatMessage = msg;

        // Score for dealing damage
        let dmgScore = finalDmg * 10;
        if (isCritical) dmgScore *= 2;
        if (effectiveness >= 2) dmgScore = Math.round(dmgScore * 1.5);
        addScore(dmgScore, W * 0.65, H * 0.35 - 80);

        if (isCritical) {
          spawnParticle(W * 0.65, H * 0.35, '#FFD700', 35);
          screenShake(8, 0.4);
          SFX.criticalHit();
          flashColor = '#FFD700';
        } else {
          spawnParticle(W * 0.65, H * 0.35, moveData.color, effectiveness >= 2 ? 25 : 15);
          screenShake(effectiveness >= 2 ? 5 : 3, effectiveness >= 2 ? 0.3 : 0.2);
          SFX.playerAttack(effectiveness);
        }

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
        SFX.monsterDie();
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
        noDamageCombat = false;
        stanceMsg += ` -${finalDmg} heart${finalDmg > 1 ? 's' : ''}!`;
        spawnParticle(W * 0.25, H * 0.45, '#FF0000', 12);
        screenShake(baseDmg >= 2 ? 6 : 4, 0.25);
        SFX.monsterAttack(baseDmg >= 2);
        setTimeout(() => SFX.playerHit(), 100);
      } else if (baseDmg > 0) {
        SFX.playerDefend();
      }
      combatMessage = stanceMsg;

      // Advance monster stance for next turn
      monsterStance = monsterNextStance;
      monsterNextStance = pickMonsterStance();

      if (playerCombatHP <= 0) {
        playerCombatHP = 0;
        combatTurn = 'player_dying';
        combatAnimTimer = 0;
        SFX.playerDie();
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
      totalMonstersEverKilled++;
      killStreak++;

      // === Kill score (escalates with streak) ===
      const killScore = 50 + killStreak * 20 + level * 10;
      addScore(killScore, currentMonster.x * TILE + TILE / 2, currentMonster.y * TILE + TILE / 2);

      // === Kill streak bonuses ===
      checkStreakAchievements();
      if (killStreak === 3) {
        // 3-kill streak: bonus key
        totalKeys++;
        keysThisLevel++;
        scorePopups.push({ text: 'STREAK x3: +1 KEY!', x: W / 2, y: H / 2 - 40, life: 90, maxLife: 90, color: '#FFD700' });
        SFX.streakBonus();
      } else if (killStreak === 5) {
        // 5-kill streak: heal 2 hearts
        playerCombatHP = Math.min(playerCombatHP + 2, maxHearts);
        scorePopups.push({ text: 'STREAK x5: +2 HEARTS!', x: W / 2, y: H / 2 - 40, life: 90, maxLife: 90, color: '#FF1744' });
        SFX.streakBonus();
      } else if (killStreak === 7) {
        // 7-kill streak: bonus 3 keys + damage buff
        totalKeys += 3;
        keysThisLevel += 3;
        damageBuffTurns = 3;
        scorePopups.push({ text: 'STREAK x7: +3 KEYS + POWER UP!', x: W / 2, y: H / 2 - 40, life: 90, maxLife: 90, color: '#E040FB' });
        SFX.streakBonus();
      } else if (killStreak > 0 && killStreak % 3 === 0) {
        // Every 3 kills after 7: bonus key
        totalKeys++;
        keysThisLevel++;
        scorePopups.push({ text: `STREAK x${killStreak}: +1 KEY!`, x: W / 2, y: H / 2 - 40, life: 90, maxLife: 90, color: '#FFD700' });
        SFX.streakBonus();
      }

      // === Untouchable achievement ===
      if (noDamageCombat) unlockAchievement('untouchable');
      if (totalMonstersEverKilled === 1) unlockAchievement('first_blood');

      // === Loot drops (variable reward!) ===
      const lootRoll = Math.random();
      if (lootRoll < 0.30) {
        // 30% chance: heart drop
        playerCombatHP = Math.min(playerCombatHP + 1, maxHearts);
        lootDropCount++;
        scorePopups.push({ text: 'LOOT: +1 HEART!', x: W / 2, y: H / 2, life: 70, maxLife: 70, color: '#FF1744' });
        SFX.lootDrop();
      } else if (lootRoll < 0.45) {
        // 15% chance: bonus key
        totalKeys++;
        keysThisLevel++;
        lootDropCount++;
        scorePopups.push({ text: 'LOOT: +1 KEY!', x: W / 2, y: H / 2, life: 70, maxLife: 70, color: '#FFD700' });
        SFX.lootDrop();
      } else if (lootRoll < 0.55) {
        // 10% chance: damage buff (next 3 attacks deal 1.5x)
        damageBuffTurns += 3;
        lootDropCount++;
        scorePopups.push({ text: 'LOOT: POWER SURGE! (1.5x DMG)', x: W / 2, y: H / 2, life: 70, maxLife: 70, color: '#E040FB' });
        SFX.lootDrop();
      }
      checkAutoAchievements();

      // No free heal — you keep whatever HP you survived with
      currentHearts = playerCombatHP;
      saveHighScores();
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
      // Kill streak broken!
      killStreak = 0;
      // Jeopardy: lose 2 keys (or all remaining if fewer), respawn at mansion entrance
      const keysToLose = Math.min(2, keysThisLevel);
      keysThisLevel -= keysToLose;
      totalKeys -= keysToLose;
      // Un-collect some key pickups so they reappear on the map
      let restored = 0;
      for (let i = keys.length - 1; i >= 0 && restored < keysToLose; i--) {
        if (keys[i].collected) {
          keys[i].collected = false;
          restored++;
        }
      }
      // Monster survives with full HP (it beat you)
      currentMonster.hp = currentMonster.maxHp;
      // Respawn at mansion entrance with 1 heart
      currentHearts = 1;
      player.x = 1;
      player.y = ROWS - 2;
      combatMessage = '';
      startTransition(() => {
        gameState = STATE.MANSION;
      });
    }
  }
}

// ── Level Up / Win ───────────────────────────────────────────
function levelUp() {
  const prevRank = getRank(totalKeys - keysThisLevel);
  const newRank = getRank(totalKeys);

  // Level completion score bonus
  const levelBonus = 200 + level * 100 + killStreak * 25;
  addScore(levelBonus);

  // Flawless achievement — completed level at full health
  if (currentHearts >= maxHearts) unlockAchievement('flawless');

  level++;
  SFX.levelUp();
  saveHighScores();
  if (level >= 6 || totalKeys >= 60) {
    unlockAchievement('champion');
    saveHighScores();
    gameState = STATE.WIN;
  } else {
    gameState = STATE.LEVEL_UP;
    levelUpTimer = 0;
  }
}

function drawLevelUp() {
  ctx.fillStyle = '#0a0020';
  ctx.fillRect(0, 0, W, H);

  // Fireworks particles with bloom
  const t = Date.now() / 1000;
  ctx.save();
  for (let i = 0; i < 20; i++) {
    const fx = (i * 97 + t * 50) % W;
    const fy = (i * 53 + Math.sin(t * 2 + i * 0.7) * 100 + 200) % H;
    const hue = (i * 40 + t * 100) % 360;
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
    ctx.shadowBlur = 12;
    ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
    ctx.beginPath();
    ctx.arc(fx, fy, 3 + Math.sin(t * 3 + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

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

  // Show next form preview
  const nextForm = HERO_FORMS[Math.min(level, HERO_FORMS.length - 1)];
  drawText(`New form: ${nextForm.species}`, W / 2, 440, nextForm.accentColor, 16, 'center');
  drawText(`Entering Level ${level + 1}...`, W / 2, 465, '#aaa', 14, 'center');

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
  // Dark vignette background
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 450);
  vigGrad.addColorStop(0, '#180000');
  vigGrad.addColorStop(1, '#050000');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Falling embers
  const t = Date.now() / 1000;
  ctx.save();
  for (let i = 0; i < 15; i++) {
    const ex = (i * 67 + t * 15) % W;
    const ey = (i * 43 + t * 30) % H;
    ctx.shadowColor = '#F44336';
    ctx.shadowBlur = 6;
    ctx.fillStyle = `rgba(244,67,54,${0.2 + 0.15 * Math.sin(t + i)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.shadowColor = '#F44336';
  ctx.shadowBlur = 25;
  drawTextBold('YOU DIED', W / 2, 130, '#F44336', 48, 'center');
  ctx.shadowBlur = 0;

  // Stats panel
  const rank = getRank(totalKeys);
  ctx.fillStyle = 'rgba(20,10,10,0.7)';
  roundRect(W / 2 - 180, 155, 360, 130, 10);
  ctx.fill();

  drawText(`Score: ${score}`, W / 2, 180, '#FFD700', 20, 'center');
  drawText(`Keys: ${totalKeys}  |  Rank: ${RANKS[rank].name}  |  Level: ${level + 1}`, W / 2, 205, RANKS[rank].color, 14, 'center');
  drawText(`Monsters Slain: ${totalMonstersEverKilled}  |  Best Streak: ${killStreak}`, W / 2, 225, '#aaa', 12, 'center');

  // Near-miss messaging — show how close to next milestone
  const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
  if (nextRank) {
    const keysAway = nextRank.threshold - totalKeys;
    if (keysAway <= 5) {
      drawTextBold(`SO CLOSE! Only ${keysAway} more key${keysAway !== 1 ? 's' : ''} to ${nextRank.name}!`, W / 2, 252, '#FF5722', 14, 'center');
    } else {
      drawText(`${keysAway} keys to ${nextRank.name} rank`, W / 2, 252, '#888', 12, 'center');
    }
  }

  if (keysThisLevel > 0 && keysThisLevel < keysNeeded) {
    const keysLeft = keysNeeded - keysThisLevel;
    drawText(`You needed just ${keysLeft} more key${keysLeft !== 1 ? 's' : ''} to escape!`, W / 2, 272, '#FF8A65', 12, 'center');
  }

  // New best indicators
  const isNewBest = score > bestScore;
  if (isNewBest && score > 0) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    ctx.globalAlpha = pulse;
    drawTextBold('NEW HIGH SCORE!', W / 2, 310, '#FFD700', 24, 'center');
    ctx.globalAlpha = 1;
  } else if (bestScore > 0) {
    drawText(`Best Score: ${bestScore}  |  Best Level: ${bestLevel + 1}`, W / 2, 310, '#666', 12, 'center');
  }

  // Motivational messages based on progress
  let motivation = 'The darkness was too strong...';
  if (totalMonstersEverKilled >= 5) motivation = 'You fought bravely! Try a different strategy.';
  if (killStreak >= 3) motivation = 'That streak was impressive! Keep the momentum going.';
  if (level >= 3) motivation = "You've come so far! The end is within reach.";
  if (score > bestScore && score > 0) motivation = 'New record! You keep getting better!';
  drawText(motivation, W / 2, 345, '#888', 13, 'center');

  // Achievements earned this run
  const achCount = Object.keys(unlockedAchievements).length;
  if (achCount > 0) {
    drawText(`Achievements: ${achCount}/${ACHIEVEMENTS.length}`, W / 2, 375, '#CE93D8', 12, 'center');
  }

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Tap or Press ENTER to try again', W / 2, 420, '#FF8A65', 18, 'center');
  ctx.globalAlpha = 1;

  // Save high scores
  saveHighScores();
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
  drawTextBold('ASCENSION COMPLETE', W / 2, 120, '#00E5FF', 44, 'center');
  ctx.shadowBlur = 0;

  // Final hero form + guide
  drawAvatar(W / 2 - 55, 260, 90, 5);
  drawGuide(W / 2 + 55, 265, 70);

  drawTextBold('You became the God!', W / 2, 350, '#FFD700', 28, 'center');

  // Final stats
  drawText(`Final Score: ${score}  |  ${totalKeys} keys  |  ${totalMonstersEverKilled} monsters slain`, W / 2, 385, '#aaa', 13, 'center');
  drawText(`Best Kill Streak: ${killStreak >= bestStreak ? killStreak : bestStreak}`, W / 2, 405, '#FF5722', 12, 'center');

  // Achievement summary
  const achCount = Object.keys(unlockedAchievements).length;
  const achTotal = ACHIEVEMENTS.length;
  drawText(`Achievements: ${achCount}/${achTotal}`, W / 2, 430, '#CE93D8', 14, 'center');

  // Show unlocked achievements as a row
  let achX = W / 2 - (Math.min(achCount, 8) * 30) / 2;
  let achDrawn = 0;
  ACHIEVEMENTS.forEach(ach => {
    if (unlockedAchievements[ach.id] && achDrawn < 8) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('*', achX + achDrawn * 30 + 15, 458);
      ctx.font = '7px Segoe UI, sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText(ach.name.substring(0, 8), achX + achDrawn * 30 + 15, 470);
      achDrawn++;
    }
  });

  if (score > bestScore) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    ctx.globalAlpha = pulse;
    drawTextBold('NEW HIGH SCORE!', W / 2, 495, '#FFD700', 20, 'center');
    ctx.globalAlpha = 1;
  } else {
    drawText('The universe bows to you.', W / 2, 495, '#00E5FF', 14, 'center');
  }

  const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = alpha;
  drawText('Tap or Press ENTER to play again', W / 2, 530, '#fff', 18, 'center');
  ctx.globalAlpha = 1;

  saveHighScores();
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
  ctx.save();
  particles.forEach(p => {
    const lifeRatio = p.life / p.maxLife;
    const radius = p.size * lifeRatio;
    ctx.globalAlpha = lifeRatio;
    // Glow layer
    ctx.shadowColor = p.color;
    ctx.shadowBlur = radius * 4;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    // Bright core
    ctx.shadowBlur = 0;
    ctx.globalAlpha = lifeRatio * 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Score Popups ─────────────────────────────────────────────
function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].y -= 1;
    scorePopups[i].life--;
    if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
  }
  // Achievement popup queue
  if (!achievementPopup && achievementPopupQueue.length > 0) {
    achievementPopup = achievementPopupQueue.shift();
  }
  if (achievementPopup) {
    achievementPopup.timer--;
    if (achievementPopup.timer <= 0) achievementPopup = null;
  }
}

function drawScorePopups() {
  ctx.save();
  scorePopups.forEach(sp => {
    const alpha = sp.life / sp.maxLife;
    ctx.globalAlpha = alpha;
    ctx.font = sp.text.length > 10 ? 'bold 12px Segoe UI, sans-serif' : 'bold 16px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(sp.text, sp.x + 1, sp.y + 1);
    ctx.fillStyle = sp.color;
    ctx.fillText(sp.text, sp.x, sp.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawAchievementPopup() {
  if (!achievementPopup) return;
  const ap = achievementPopup;
  const alpha = ap.timer > 150 ? (180 - ap.timer) / 30 :
                ap.timer < 30 ? ap.timer / 30 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const bw = 280;
  const bh = 50;
  const bx = (W - bw) / 2;
  const by = 20;
  // Background
  ctx.fillStyle = 'rgba(20,10,40,0.92)';
  roundRect(bx, by, bw, bh, 10);
  ctx.fill();
  // Gold border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  roundRect(bx, by, bw, bh, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Text
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ACHIEVEMENT UNLOCKED!', W / 2, by + 18);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.fillText(`${ap.name} — ${ap.desc}`, W / 2, by + 38);
  ctx.globalAlpha = 1;
  ctx.restore();
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

    // Progress bar to next rank
    const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
    const prevThreshold = RANKS[rank].threshold;
    const nextThreshold = nextRank ? nextRank.threshold : prevThreshold;
    const progress = nextRank ? Math.min(1, (totalKeys - prevThreshold) / (nextThreshold - prevThreshold)) : 1;
    const progressBar = nextRank ? `<div style="background:rgba(255,255,255,0.1);border-radius:3px;height:6px;margin-top:2px;overflow:hidden"><div style="background:${RANKS[rank].color};height:100%;width:${Math.round(progress * 100)}%;border-radius:3px;transition:width 0.3s"></div></div>` : '';

    const heroF = getHeroForm();
    const streakStr = killStreak >= 3 ? `<span style="color:#FF5722"> x${killStreak}</span>` : '';
    const buffStr = damageBuffTurns > 0 ? `<span style="color:#E040FB"> PWR(${damageBuffTurns})</span>` : '';
    hudLeft.innerHTML = `
      <div style="color:${heroF.accentColor}; font-weight:bold">${heroF.name} <span style="color:${RANKS[rank].color}">(${RANKS[rank].name})</span>${streakStr}${buffStr}</div>
      <div>Hearts: ${heartStr}</div>
      <div style="color:#FFD700">Score: ${score} | Keys: ${totalKeys}${progressBar}</div>
    `;

    if (gameState === STATE.MANSION) {
      const alive = monsters.filter(m => m.alive).length;
      hudRight.innerHTML = `
        <div style="color:#FF5722">Haunted Mansion - Level ${level + 1}</div>
        <div style="color:#FFD700">Keys: ${keysThisLevel}/10</div>
        <div>Defeated: ${monstersDefeated}/${monstersRequired}${alive > 0 ? ' ('+alive+' roaming)' : ''}${killStreak >= 2 ? ' | Streak: ' + killStreak : ''}</div>
      `;
    } else {
      const canEnter = currentHearts >= maxHearts;
      hudRight.innerHTML = `
        <div>Level ${level + 1} - Overworld</div>
        <div>${canEnter ? '<span style="color:#FFD700">Hearts full! Find the mansion portal!</span>' : `Collect hearts (${currentHearts}/${maxHearts}) to enter mansion`}</div>
        ${nextRank ? `<div style="color:${nextRank.color}">Next: ${nextRank.name} (${nextRank.threshold - totalKeys} keys away)</div>` : '<div style="color:#00E5FF">MAX RANK</div>'}
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
  updateScorePopups();

  // Draw
  const shook = applyShake();

  switch (gameState) {
    case STATE.TITLE: drawTitle(); break;
    case STATE.OVERWORLD: drawOverworld(); drawParticles(); drawScorePopups(); break;
    case STATE.MANSION_ENTER: drawMansionEnter(); break;
    case STATE.MANSION: drawMansion(); drawParticles(); drawScorePopups(); break;
    case STATE.COMBAT: drawCombat(); drawScorePopups(); break;
    case STATE.LEVEL_UP: drawLevelUp(); break;
    case STATE.GAME_OVER: drawGameOver(); break;
    case STATE.WIN: drawWin(); break;
  }

  // Achievement popup on top of everything except transition
  drawAchievementPopup();

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
