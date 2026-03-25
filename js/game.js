if (!canvas) console.error("Canvas not found!");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
 
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
 
// ── State ──────────────────────────────────────────────────────────────────
let state = 'menu'; // menu | playing | dead
let score = 0, wave = 1, waveTimer = 0;
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let activeWeapon = 1;
let ammo = { 2: 12, 3: 5 };
let ammoRegenTimers = { 2: 0, 3: 0 };
 
// Player
const player = {
  x: 0, y: 0, r: 52,
  health: 100, maxHealth: 100,
  vx: 0, vy: 0, speed: 3.5,
  shootCooldown: 0, invincible: 0
};
 
let projectiles = [];
let enemies = [];
let particles = [];
let bubbleParticles = []; // floating background bubbles
let shockwaves = [];
 
// ── Weapons ────────────────────────────────────────────────────────────────
const WEAPONS = {
  1: { name: 'PULSE',     cooldown: 12,  dmg: 18,  spd: 10, r: 4,  color: '#00ffe0', pierce: false, aoe: false },
  2: { name: 'TORPEDO',   cooldown: 30,  dmg: 55,  spd: 14, r: 6,  color: '#ff8800', pierce: true,  aoe: false },
  3: { name: 'NOVA BURST',cooldown: 60,  dmg: 90,  spd: 0,  r: 0,  color: '#ff00cc', pierce: false, aoe: true  },
};
 
// ── Enemy types ────────────────────────────────────────────────────────────
const ENEMY_TYPES = [
  { id:'jellyfish', label:'JELLYFISH',   r:18, hp:30,  spd:1.2, dmg:8,  color:'#cc44ff', pulse:true  },
  { id:'anglerfish',label:'ANGLERFISH',  r:24, hp:80,  spd:0.7, dmg:20, color:'#ff4400', pulse:false },
  { id:'crab',      label:'CRAB',        r:20, hp:55,  spd:0.9, dmg:14, color:'#ffaa00', pulse:false },
  { id:'manta',     label:'MANTA RAY',   r:28, hp:100, spd:1.8, dmg:10, color:'#0055ff', pulse:false },
  { id:'squid',     label:'GIANT SQUID', r:35, hp:200, spd:0.5, dmg:30, color:'#882299', pulse:false },
];
 
// ── Init ───────────────────────────────────────────────────────────────────
function initGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = player.maxHealth = 100;
  player.vx = player.vy = 0;
  player.shootCooldown = 0;
  player.invincible = 0;
  score = 0; wave = 1; waveTimer = 0;
  activeWeapon = 1;
  ammo = { 2: 12, 3: 5 };
  ammoRegenTimers = { 2: 0, 3: 0 };
  projectiles = []; enemies = []; particles = []; shockwaves = [];
  bubbleParticles = Array.from({length: 40}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 2 + Math.random() * 8,
    spd: 0.2 + Math.random() * 0.5,
    opacity: 0.05 + Math.random() * 0.15
  }));
  updateUI();
  spawnWave();
}
 
// ── Wave spawning ──────────────────────────────────────────────────────────
function spawnWave() {
  const count = 4 + wave * 2;
  for (let i = 0; i < count; i++) {
    spawnEnemy();
  }
}
 
function spawnEnemy() {
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  const side = Math.floor(Math.random() * 4);
  let x, y;
  const pad = 60;
  if (side === 0) { x = Math.random() * canvas.width; y = -pad; }
  else if (side === 1) { x = canvas.width + pad; y = Math.random() * canvas.height; }
  else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + pad; }
  else { x = -pad; y = Math.random() * canvas.height; }
 
  const hpScale = 1 + (wave - 1) * 0.25;
  enemies.push({
    ...type,
    x, y,
    maxHp: type.hp * hpScale,
    hp: type.hp * hpScale,
    angle: 0,
    pulseT: Math.random() * Math.PI * 2,
    attackCooldown: 60 + Math.random() * 60,
    tentacles: type.id === 'squid' ? Array.from({length:6}, (_, i) => ({ a: i / 6 * Math.PI * 2, len: 0.5 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 })) : null
  });
}
 
// ── Shooting ───────────────────────────────────────────────────────────────
function shoot() {
  const w = WEAPONS[activeWeapon];
  if (player.shootCooldown > 0) return;
  if (activeWeapon !== 1 && ammo[activeWeapon] <= 0) return;
 
  if (w.aoe) {
    // Nova burst — radial explosion
    const blastR = 160;
    shockwaves.push({ x: player.x, y: player.y, r: player.r, maxR: blastR, opacity: 1, color: w.color });
    enemies.forEach(e => {
      const dx = e.x - player.x, dy = e.y - player.y;
      if (Math.hypot(dx, dy) < blastR + e.r) {
        e.hp -= w.dmg;
        spawnHitParticles(e.x, e.y, w.color, 12);
      }
    });
    spawnExplosion(player.x, player.y, w.color, 30);
    ammo[activeWeapon]--;
  } else {
    const dx = mouse.x - player.x, dy = mouse.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * w.spd;
    const vy = (dy / dist) * w.spd;
    projectiles.push({
      x: player.x, y: player.y,
      vx, vy, r: w.r, dmg: w.dmg,
      color: w.color, pierce: w.pierce,
      life: 80, trail: []
    });
    if (activeWeapon !== 1) ammo[activeWeapon]--;
  }
 
  player.shootCooldown = w.cooldown;
  updateWeaponUI();
}
 
// ── Update ─────────────────────────────────────────────────────────────────
function update() {
  if (state !== 'playing') return;
 
  // Movement
  let dx = 0, dy = 0;
  if (keys['a'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['d'] || keys['ArrowRight']) dx += 1;
  if (keys['w'] || keys['ArrowUp'])    dy -= 1;
  if (keys['s'] || keys['ArrowDown'])  dy += 1;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  player.vx += dx * 0.4; player.vy += dy * 0.4;
  player.vx *= 0.88; player.vy *= 0.88;
  const spd = Math.hypot(player.vx, player.vy);
  if (spd > player.speed) { player.vx = player.vx / spd * player.speed; player.vy = player.vy / spd * player.speed; }
  player.x += player.vx; player.y += player.vy;
  // clamp
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
 
  // Auto-shoot on click hold (weapon 1)
  if (mouse.down) shoot();
  if (player.shootCooldown > 0) player.shootCooldown--;
  if (player.invincible > 0) player.invincible--;
 
  // Ammo regen
  for (const w of [2, 3]) {
    const maxA = w === 2 ? 12 : 5;
    if (ammo[w] < maxA) {
      ammoRegenTimers[w]++;
      const regenAt = w === 2 ? 180 : 300;
      if (ammoRegenTimers[w] >= regenAt) { ammo[w]++; ammoRegenTimers[w] = 0; }
    }
  }
 
  // Health regen
  if (player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + 0.03);
  }
  player.maxHealth = Math.min(200, player.maxHealth + 0.001);
 
  // Projectiles
  projectiles = projectiles.filter(p => {
    p.trail.unshift({x: p.x, y: p.y});
    if (p.trail.length > 10) p.trail.pop();
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height || p.life <= 0) return false;
    // Hit enemies
    let hit = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r) {
        e.hp -= p.dmg;
        spawnHitParticles(e.x, e.y, p.color, 6);
        if (!p.pierce) { hit = true; break; }
      }
    }
    return !hit;
  });
 
  // Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.pulseT += 0.05;
 
    // Move toward player
    const ex = player.x - e.x, ey = player.y - e.y;
    const ed = Math.hypot(ex, ey) || 1;
    const spd2 = e.spd * (1 + (wave - 1) * 0.1);
    if (ed > player.r + e.r + 5) {
      e.x += (ex / ed) * spd2;
      e.y += (ey / ed) * spd2;
    } else {
      // Attack
      e.attackCooldown--;
      if (e.attackCooldown <= 0 && player.invincible <= 0) {
        player.health -= e.dmg;
        player.invincible = 40;
        spawnHitParticles(player.x, player.y, '#fff', 10);
        e.attackCooldown = 80;
      }
    }
 
    e.angle = Math.atan2(ey, ex);
 
    // Dead?
    if (e.hp <= 0) {
      score += Math.round(e.maxHp * 0.5);
      spawnExplosion(e.x, e.y, e.color, 20);
      enemies.splice(i, 1);
    }
  }
 
  // Shockwaves
  shockwaves = shockwaves.filter(s => {
    s.r += 8; s.opacity -= 0.045;
    return s.opacity > 0;
  });
 
  // Particles
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--; p.vy += 0.05;
    p.vx *= 0.96; p.vy *= 0.96;
    return p.life > 0;
  });
 
  // Background bubbles float up
  bubbleParticles.forEach(b => {
    b.y -= b.spd;
    if (b.y < -20) { b.y = canvas.height + 20; b.x = Math.random() * canvas.width; }
  });
 
  // Wave complete
  if (enemies.length === 0) {
    waveTimer++;
    if (waveTimer > 120) {
      wave++;
      waveTimer = 0;
      spawnWave();
    }
  }
 
  // Death
  if (player.health <= 0) {
    player.health = 0;
    state = 'dead';
    showDeadScreen();
  }
 
  updateUI();
}
 
// ── Helpers ────────────────────────────────────────────────────────────────
function spawnHitParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, r: 1+Math.random()*3, color, life: 20+Math.random()*20 });
  }
}
function spawnExplosion(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, r: 2+Math.random()*5, color, life: 30+Math.random()*30 });
  }
}
 
// ── Draw ───────────────────────────────────────────────────────────────────
function draw() {
  const W = canvas.width, H = canvas.height;
 
  // Ocean background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#000814');
  bg.addColorStop(0.5, '#001830');
  bg.addColorStop(1, '#000a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
 
  // Caustics light rays
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 8; i++) {
    const rx = (W * 0.1) + (W * 0.8 / 8) * i;
    const grad = ctx.createLinearGradient(rx, 0, rx + 40, H);
    grad.addColorStop(0, '#00aaff');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(rx - 30, 0);
    ctx.lineTo(rx + 30, 0);
    ctx.lineTo(rx + 80, H);
    ctx.lineTo(rx + 20, H);
    ctx.fill();
  }
  ctx.restore();
 
  // Background bubbles
  bubbleParticles.forEach(b => {
    ctx.save();
    ctx.globalAlpha = b.opacity;
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
 
  // Shockwaves
  shockwaves.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.opacity * 0.6;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
 
  // Projectiles
  projectiles.forEach(p => {
    // Trail
    p.trail.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = (1 - i / p.trail.length) * 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.r * (1 - i / p.trail.length), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // Core
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
 
  // Enemies
  enemies.forEach(e => drawEnemy(e));
 
  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / 50;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
 
  // Player bubble
  drawPlayer();
 
  // Wave announce
  if (enemies.length === 0 && waveTimer > 0 && waveTimer < 100) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, waveTimer / 30) * (1 - waveTimer / 100);
    ctx.font = 'bold 14px Orbitron, monospace';
    ctx.letterSpacing = '6px';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(`WAVE ${wave} INCOMING`, W / 2, H / 2 - 20);
    ctx.restore();
  }
}
 
function drawPlayer() {
  const { x, y, r, health, maxHealth, invincible } = player;
  const pct = health / maxHealth;
 
  // Outer glow
  ctx.save();
  ctx.shadowBlur = 30 + Math.sin(Date.now() * 0.003) * 8;
  ctx.shadowColor = invincible > 0 ? '#ff4444' : '#00ffe0';
 
  // Bubble
  const bubbleAlpha = invincible > 0 ? 0.25 + Math.sin(Date.now() * 0.05) * 0.1 : 0.18;
  const bubbleGrad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
  bubbleGrad.addColorStop(0, `rgba(200,255,255,${bubbleAlpha + 0.05})`);
  bubbleGrad.addColorStop(0.7, `rgba(0,180,255,${bubbleAlpha})`);
  bubbleGrad.addColorStop(1, `rgba(0,80,200,${bubbleAlpha - 0.05})`);
  ctx.fillStyle = bubbleGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
 
  // Health ring
  ctx.lineWidth = 3;
  ctx.strokeStyle = invincible > 0 ? '#ff4444' : '#00ffe0';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();
 
  // Outer ring
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
 
  // Highlight
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - r*0.25, y - r*0.3, r*0.3, r*0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();
 
  ctx.restore();
 
  // Submarine body
  ctx.save();
  const angle = Math.atan2(mouse.y - y, mouse.x - x);
  ctx.translate(x, y);
  ctx.rotate(angle);
 
  // Hull
  ctx.fillStyle = '#1a4a7a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();
 
  // Top stripe
  ctx.fillStyle = '#2266aa';
  ctx.beginPath();
  ctx.ellipse(0, -2, 24, 7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
 
  // Conning tower
  ctx.fillStyle = '#1a4a7a';
  ctx.beginPath();
  ctx.roundRect(-4, -16, 10, 11, 3);
  ctx.fill();
 
  // Periscope
  ctx.strokeStyle = '#3399cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.lineTo(2, -22);
  ctx.lineTo(8, -22);
  ctx.stroke();
 
  // Propeller
  ctx.fillStyle = '#3399cc';
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(-26, 0);
    ctx.rotate((Date.now() * 0.01) + i * Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
 
  // Porthole
  ctx.fillStyle = '#88ddff';
  ctx.beginPath();
  ctx.arc(5, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#004488';
  ctx.beginPath();
  ctx.arc(5, 0, 2, 0, Math.PI * 2);
  ctx.fill();
 
  ctx.restore();
}
 
function drawEnemy(e) {
  ctx.save();
  const t = e.pulseT;
  const hpPct = e.hp / e.maxHp;
 
  if (e.id === 'jellyfish') {
    // Bell
    const bellR = e.r * (1 + Math.sin(t) * 0.12);
    const grad = ctx.createRadialGradient(e.x, e.y - 5, 2, e.x, e.y, bellR);
    grad.addColorStop(0, '#ee88ff');
    grad.addColorStop(1, '#660099');
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, bellR, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Tentacles
    ctx.strokeStyle = '#cc44ff88';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const tx = e.x - bellR * 0.8 + (bellR * 1.6 / 5) * i;
      ctx.beginPath();
      ctx.moveTo(tx, e.y);
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(tx + Math.sin(t + j + i) * 6, e.y + j * 6);
      }
      ctx.stroke();
    }
  } else if (e.id === 'anglerfish') {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = e.color;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.r, e.r * 0.75, e.angle, 0, Math.PI * 2);
    ctx.fill();
    // Lure
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(e.angle - 0.3) * e.r, e.y + Math.sin(e.angle - 0.3) * e.r);
    ctx.lineTo(e.x + Math.cos(e.angle) * (e.r + 14) + Math.sin(t) * 4,
               e.y + Math.sin(e.angle) * (e.r + 14) + Math.cos(t) * 4);
    ctx.stroke();
    ctx.fillStyle = '#ffdd00';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffdd00';
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(e.angle) * (e.r + 14) + Math.sin(t) * 4,
            e.y + Math.sin(e.angle) * (e.r + 14) + Math.cos(t) * 4, 4, 0, Math.PI * 2);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const ta = e.angle + (-0.3 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(ta) * e.r, e.y + Math.sin(ta) * e.r);
      ctx.lineTo(e.x + Math.cos(ta) * (e.r + 8), e.y + Math.sin(ta) * (e.r + 8));
      ctx.lineTo(e.x + Math.cos(ta + 0.1) * e.r, e.y + Math.sin(ta + 0.1) * e.r);
      ctx.fill();
    }
  } else if (e.id === 'crab') {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = e.color;
    // Body
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.r * 0.9, e.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Claws
    const clawWave = Math.sin(t) * 0.3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(e.x + side * (e.r + 6), e.y + Math.sin(t) * 4, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Legs
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(e.x + side * e.r * 0.5, e.y + (i - 1) * 6);
        ctx.lineTo(e.x + side * (e.r + 14), e.y + (i - 1) * 6 + Math.sin(t + i) * 5);
        ctx.stroke();
      }
    }
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(e.x - 6, e.y - 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 6, e.y - 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(e.x - 6, e.y - 8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 6, e.y - 8, 2, 0, Math.PI * 2); ctx.fill();
  } else if (e.id === 'manta') {
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = e.color;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const wingFlap = Math.sin(t * 1.5) * 0.18;
    ctx.beginPath();
    ctx.moveTo(e.r, 0);
    ctx.quadraticCurveTo(0, -e.r * (1.5 + wingFlap), -e.r, 0);
    ctx.quadraticCurveTo(-e.r * 0.5, e.r * 0.4, 0, 0);
    ctx.quadraticCurveTo(e.r * 0.5, e.r * 0.4, e.r, 0);
    ctx.fill();
    // Tail
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-e.r, 0);
    ctx.quadraticCurveTo(-e.r - 10, 10 + Math.sin(t * 2) * 5, -e.r - 20, 0);
    ctx.stroke();
    ctx.restore();
  } else if (e.id === 'squid') {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = e.color;
    // Mantle
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.r * 0.55, e.r, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fins
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 0.5, e.y - e.r * 0.5);
    ctx.lineTo(e.x - e.r * 0.85, e.y + e.r * 0.1);
    ctx.lineTo(e.x - e.r * 0.4, e.y + e.r * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + e.r * 0.5, e.y - e.r * 0.5);
    ctx.lineTo(e.x + e.r * 0.85, e.y + e.r * 0.1);
    ctx.lineTo(e.x + e.r * 0.4, e.y + e.r * 0.2);
    ctx.fill();
    // Tentacles
    if (e.tentacles) {
      ctx.strokeStyle = e.color;
      e.tentacles.forEach(ten => {
        const baseA = ten.a + t * 0.3;
        const len = e.r * 1.3 * ten.len;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let px = e.x + Math.cos(baseA) * e.r * 0.4;
        let py = e.y + Math.sin(baseA) * e.r * 0.4;
        ctx.moveTo(px, py);
        for (let seg = 1; seg <= 5; seg++) {
          const segA = baseA + Math.sin(t + ten.phase + seg * 0.4) * 0.5;
          px += Math.cos(segA) * (len / 5);
          py += Math.sin(segA) * (len / 5);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      });
    }
    // Eyes
    ctx.fillStyle = '#ffaacc';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00aa';
    ctx.beginPath(); ctx.arc(e.x - 10, e.y - e.r * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 10, e.y - e.r * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(e.x - 10, e.y - e.r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 10, e.y - e.r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
  }
 
  // HP bar
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(e.x - e.r, e.y + e.r + 5, e.r * 2, 5);
  ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillRect(e.x - e.r, e.y + e.r + 5, e.r * 2 * hpPct, 5);
 
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '8px Share Tech Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(e.label, e.x, e.y + e.r + 18);
 
  ctx.restore();
}
 
// ── UI Updates ─────────────────────────────────────────────────────────────
function updateUI() {
  const pct = player.health / player.maxHealth;
  document.getElementById('healthFill').style.width = (pct * 100) + '%';
  document.getElementById('healthFill').style.background =
    pct > 0.5 ? 'linear-gradient(90deg,#00ffe0,#00aaff)' :
    pct > 0.25 ? 'linear-gradient(90deg,#ffaa00,#ff6600)' :
    'linear-gradient(90deg,#ff3333,#ff0000)';
  document.getElementById('healthVal').textContent =
    `${Math.ceil(player.health)} / ${Math.ceil(player.maxHealth)}`;
  document.getElementById('scoreVal').textContent = String(score).padStart(6, '0');
  document.getElementById('waveVal').textContent = `WAVE ${wave}`;
  updateWeaponUI();
}
 
function updateWeaponUI() {
  for (const i of [1, 2, 3]) {
    const slot = document.getElementById(`ws${i}`);
    slot.classList.toggle('active', activeWeapon === i);
  }
  document.getElementById('ammo2').textContent = ammo[2];
  document.getElementById('ammo3').textContent = ammo[3];
}
 
// ── Game loop ──────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  update();
  draw();
}
requestAnimationFrame(loop);
 
// ── Overlay screens ────────────────────────────────────────────────────────
function showDeadScreen() {
  const ov = document.getElementById('overlay');
  ov.classList.remove('hidden');
  ov.innerHTML = `
    <h1>HULL BREACH</h1>
    <div class="sub-title">BUBBLE DESTROYED</div>
    <div id="finalScore">${String(score).padStart(6,'0')}</div>
    <div style="font-size:10px;color:rgba(0,200,255,0.4);letter-spacing:2px;margin-bottom:20px">WAVE ${wave} — FINAL SCORE</div>
    <button class="btn" id="startBtn">DIVE AGAIN</button>
  `;
  document.getElementById('startBtn').addEventListener('click', startGame);
}
 
function startGame() {
  document.getElementById('overlay').classList.add('hidden');
  state = 'playing';
  initGame();
}
 
document.getElementById('startBtn').addEventListener('click', startGame);
 
// ── Input ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === '1') { activeWeapon = 1; updateWeaponUI(); }
  if (e.key === '2') { activeWeapon = 2; updateWeaponUI(); }
  if (e.key === '3') { activeWeapon = 3; updateWeaponUI(); }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });
 
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', e => {
  mouse.down = true;
  if (state === 'playing') shoot();
});
canvas.addEventListener('mouseup', () => { mouse.down = false; });
 
// Touch support
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  mouse.x = t.clientX - r.left;
  mouse.y = t.clientY - r.top;
  mouse.down = true;
  if (state === 'playing') shoot();
}, {passive: false});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  mouse.x = t.clientX - r.left;
  mouse.y = t.clientY - r.top;
}, {passive: false});
canvas.addEventListener('touchend', () => { mouse.down = false; });
