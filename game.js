'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    color: '#ffffff',
    flameColor: 'rgba(255, 130, 0, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    noseOffset: 21,
    flameVerts: [[-8, -4], [0, 0], [-8, 4]],
    flameLength: [6, 14],
  },
  {
    name: 'CAZADOR',
    color: '#00ffff',
    flameColor: 'rgba(0, 220, 255, 0.85)',
    verts: [[22, 0], [-10, -11], [-4, -3], [-14, 0], [-4, 3], [-10, 11]],
    noseOffset: 23,
    flameVerts: [[-6, -3], [0, 0], [-6, 3]],
    flameLength: [5, 12],
  },
  {
    name: 'FANTASMA',
    color: '#cc44ff',
    flameColor: 'rgba(200, 80, 255, 0.85)',
    verts: [[18, 0], [10, -8], [-2, -11], [-14, -6], [-14, 6], [-2, 11], [10, 8]],
    noseOffset: 19,
    flameVerts: [[-10, -3], [0, 0], [-10, 3]],
    flameLength: [4, 10],
  },
  {
    name: 'FLECHA',
    color: '#ffcc00',
    flameColor: 'rgba(255, 200, 0, 0.85)',
    verts: [[24, 0], [-8, -7], [-4, 0], [-8, 7]],
    noseOffset: 25,
    flameVerts: [[-5, -3], [0, 0], [-5, 3]],
    flameLength: [5, 11],
  },
];

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella Fugaz ────────────────────────────────────────────────────────────
class ShootingStar {
  constructor() {
    const side = randInt(0, 3);
    if (side === 0)      { this.x = -10; this.y = rand(0, H); }
    else if (side === 1) { this.x = W + 10; this.y = rand(0, H); }
    else if (side === 2) { this.x = rand(0, W); this.y = -10; }
    else                 { this.x = rand(0, W); this.y = H + 10; }

    const angle = rand(0, Math.PI * 2);
    const speed = 200;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius = 12;
    this.ttl    = 8;
    this.dead   = false;
    this.rot    = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-2, 2);

    const n = randInt(5, 8);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.7, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() { return []; }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.strokeStyle = '#ffdd00';
    ctx.fillStyle   = 'rgba(255, 221, 0, 0.25)';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Estela
    const alpha = Math.min(1, this.ttl / 3);
    ctx.strokeStyle = `rgba(255, 221, 0, ${(alpha * 0.5).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.08, this.y - this.vy * 0.08);
    ctx.stroke();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.speedMultiplier = 1;
    this.speedTimer      = 0;

    this.shieldEnergy = 100;
    this.shieldMaxEnergy = 100;
    this.shieldActive = false;
    this.shieldDrainRate = 30;
    this.shieldRechargeRate = 15;
    this.shieldMinActivation = 10;
    this.tripleShot     = false;
    this.tripleShotTimer = 0;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    if (this.speedTimer > 0) {
      this.speedTimer -= dt;
      if (this.speedTimer <= 0) {
        this.speedMultiplier = 1;
        this.speedTimer = 0;
      }
    }

    // Escudo
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      if (this.shieldEnergy > this.shieldMinActivation) {
        this.shieldActive = true;
        this.shieldEnergy -= this.shieldDrainRate * dt;
        if (this.shieldEnergy < 0) this.shieldEnergy = 0;
      } else {
        this.shieldActive = false;
      }
    } else {
      this.shieldActive = false;
      if (this.shieldEnergy < this.shieldMaxEnergy) {
        this.shieldEnergy += this.shieldRechargeRate * dt;
        if (this.shieldEnergy > this.shieldMaxEnergy) this.shieldEnergy = this.shieldMaxEnergy;
      }
    }

    if (this.tripleShotTimer > 0) {
      this.tripleShotTimer -= dt;
      if (this.tripleShotTimer <= 0) {
        this.tripleShot = false;
        this.tripleShotTimer = 0;
      }
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * this.speedMultiplier;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SKINS[currentSkin].noseOffset;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot) {
      return [
        new Bullet(ox, oy, this.angle - 0.1),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + 0.1),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[currentSkin];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la skin seleccionada
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const fv = skin.flameVerts;
      const fl = skin.flameLength;
      ctx.beginPath();
      ctx.moveTo(fv[0][0], fv[0][1]);
      ctx.lineTo(fv[0][0] - rand(fl[0], fl[1]), 0);
      ctx.lineTo(fv[2][0], fv[2][1]);
      ctx.strokeStyle = skin.flameColor;
      ctx.stroke();
    }

    ctx.restore();

    // Escudo visual
    if (this.shieldActive) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
      const alpha = 0.2 + (this.shieldEnergy / this.shieldMaxEnergy) * 0.3;
      ctx.save();
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fillStyle = `rgba(0, 255, 255, ${(alpha * 0.3).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '#fff', size = 1) {
    this.x  = x;
    this.y  = y;
    this.color = color;
    this.size  = size;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = this.color.replace('1)', `${alpha.toFixed(2)})`).replace('rgb(', 'rgba(').replace('#fff', `rgba(255,255,255,${alpha.toFixed(2)})`);
    if (this.color.startsWith('#')) {
      const r = parseInt(this.color.slice(1, 3), 16);
      const g = parseInt(this.color.slice(3, 5), 16);
      const b = parseInt(this.color.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
    }
    ctx.lineWidth = this.size;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Anillo expansivo ──────────────────────────────────────────────────────────
class Ring {
  constructor(x, y, color = '#ffdd00') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 2;
    this.maxRadius = 80;
    this.speed = 200;
    this.life = 0.5;
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0 || this.radius >= this.maxRadius) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${(alpha * 0.8).toFixed(2)})`;
    ctx.lineWidth = 2 + alpha * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Power-Up ────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = Math.random() < 0.5 ? 'velocidad' : 'triple';
    this.radius = 10;
    this.ttl = 15;
    this.dead = false;
    this.pulse = 0;
  }

  update(dt) {
    this.ttl -= dt;
    this.pulse += dt * 4;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    const glow = 0.5 + Math.sin(this.pulse) * 0.3;
    ctx.globalAlpha = glow;

    ctx.fillStyle = this.type === 'triple' ? '#ff00ff' : '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (this.type === 'triple') {
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 0);
      ctx.lineTo(-4, 4);
      ctx.moveTo(1, -4);
      ctx.lineTo(7, 0);
      ctx.lineTo(1, 4);
    } else {
      ctx.moveTo(-1, -5);
      ctx.lineTo(2, -1);
      ctx.lineTo(-2, 0);
      ctx.lineTo(1, 5);
    }
    ctx.stroke();

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars, rings;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;
let flashAlpha;

// ── Estado de skins ──────────────────────────────────────────────────────────
let currentSkin = parseInt(localStorage.getItem('asteroids_skin')) || 0;
let menuSkin    = currentSkin;
let menuBlink   = 0;
let menuStars   = [];
(function initMenuStars() {
  for (let i = 0; i < 60; i++)
    menuStars.push({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.5), a: rand(0.3, 1) });
})();

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  rings     = [];
  starTimer = 3;
  flashAlpha = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function startGame() {
  currentSkin = menuSkin;
  localStorage.setItem('asteroids_skin', currentSkin);
  initGame();
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  rings     = [];
  flashAlpha = 0;
  starTimer = 3;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  const skinColor = SKINS[currentSkin].color;
  for (let i = 0; i < 14; i++) particles.push(new Particle(ship.x, ship.y, skinColor, rand(1, 2)));
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    if (pressed('ArrowLeft'))  menuSkin = (menuSkin - 1 + SKINS.length) % SKINS.length;
    if (pressed('ArrowRight')) menuSkin = (menuSkin + 1) % SKINS.length;
    if (pressed('Space')) startGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) { state = 'menu'; menuSkin = currentSkin; }
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    rings.forEach(r => r.update(dt));
    rings = rings.filter(r => !r.dead);
    if (flashAlpha > 0) flashAlpha -= dt * 3;
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));
  rings.forEach(r => r.update(dt));

  if (flashAlpha > 0) flashAlpha -= dt * 3;

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  rings     = rings.filter(r => !r.dead);

  // Spawn estrella fugaz
  starTimer -= dt;
  if (starTimer <= 0) {
    starTimer = 3;
    if (Math.random() < 0.10) shootingStars.push(new ShootingStar());
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < 0.15) powerUps.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += 500;

        // Explosión dorada: partículas rápidas y grandes
        for (let i = 0; i < 30; i++) {
          const p = new Particle(s.x, s.y, '#ffdd00', rand(1.5, 3));
          const angle = rand(0, Math.PI * 2);
          const speed = rand(80, 300);
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.life = rand(0.5, 1.4);
          p.ttl = p.life;
          particles.push(p);
        }
        // Partículas blancas centrales
        for (let i = 0; i < 15; i++) {
          const p = new Particle(s.x, s.y, '#ffffff', rand(2, 4));
          const angle = rand(0, Math.PI * 2);
          const speed = rand(20, 100);
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.life = rand(0.3, 0.8);
          p.ttl = p.life;
          particles.push(p);
        }
        // Anillos expansivos
        rings.push(new Ring(s.x, s.y, '#ffdd00'));
        rings.push(new Ring(s.x, s.y, '#ff8800'));
        // Flash de pantalla
        flashAlpha = 0.7;
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);
  bullets = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldActive) {
          // Escudo absorbe el golpe
          for (let i = 0; i < 8; i++) {
            const p = new Particle(ship.x, ship.y, '#00ffff', rand(1, 2));
            const angle = rand(0, Math.PI * 2);
            const speed = rand(50, 120);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = rand(0.3, 0.6);
            p.ttl = p.life;
            particles.push(p);
          }
          ship.shieldEnergy -= 20;
          if (ship.shieldEnergy < 0) ship.shieldEnergy = 0;
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (dist(ship, s) < ship.radius + s.radius) {
        if (ship.shieldActive) {
          // Escudo absorbe el golpe
          for (let i = 0; i < 8; i++) {
            const p = new Particle(ship.x, ship.y, '#00ffff', rand(1, 2));
            const angle = rand(0, Math.PI * 2);
            const speed = rand(50, 120);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = rand(0.3, 0.6);
            p.ttl = p.life;
            particles.push(p);
          }
          ship.shieldEnergy -= 30;
          if (ship.shieldEnergy < 0) ship.shieldEnergy = 0;
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple') {
        ship.tripleShot = true;
        ship.tripleShotTimer = 5;
      } else {
        ship.speedMultiplier = 2;
        ship.speedTimer = 5;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = SKINS[currentSkin].color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.speedTimer > 0) {
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD  ${ship.speedTimer.toFixed(1)}s`, 14, 50);
  }

  // Indicador del escudo
  const shieldY = 74;
  const shieldBarWidth = 100;
  const shieldBarHeight = 8;
  const shieldX = 14;

  // Fondo de la barra
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(shieldX, shieldY, shieldBarWidth, shieldBarHeight);

  // Barra de energía
  const shieldPercent = ship.shieldEnergy / ship.shieldMaxEnergy;
  ctx.fillStyle = ship.shieldActive ? '#00ffff' : '#008888';
  ctx.fillRect(shieldX, shieldY, shieldBarWidth * shieldPercent, shieldBarHeight);

  // Borde
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(shieldX, shieldY, shieldBarWidth, shieldBarHeight);

  // Texto
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(`ESCUDO`, shieldX, shieldY - 4);

  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#ff00ff';
    ctx.textAlign = 'left';
    ctx.fillText(`TRIPLE SHOT  ${ship.tripleShotTimer.toFixed(1)}s`, 14, 90);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

// ── Menú de selección de skin ─────────────────────────────────────────────────
function drawMenu() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Estrellas de fondo
  for (const s of menuStars) {
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Título
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('ASTEROIDS', W / 2, 100);

  // Subtítulo
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('SELECCIONA TU NAVE', W / 2, 135);

  // Preview de la nave centrada
  const skin = SKINS[menuSkin];
  ctx.save();
  ctx.translate(W / 2, H / 2 - 30);
  ctx.rotate(-Math.PI / 2);

  // Anillo de selección
  menuBlink += 0.03;
  const glow = 0.3 + Math.sin(menuBlink * 2) * 0.15;
  ctx.strokeStyle = `rgba(255,255,255,${glow.toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();

  // Silueta de la nave
  ctx.strokeStyle = skin.color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();

  // Llama estática para efecto visual
  const fv = skin.flameVerts;
  const fl = skin.flameLength;
  ctx.beginPath();
  ctx.moveTo(fv[0][0], fv[0][1]);
  ctx.lineTo(fv[0][0] - rand(fl[0], fl[1]), 0);
  ctx.lineTo(fv[2][0], fv[2][1]);
  ctx.strokeStyle = skin.flameColor;
  ctx.stroke();

  ctx.restore();

  // Nombre de la skin
  ctx.textAlign = 'center';
  ctx.fillStyle = skin.color;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(skin.name, W / 2, H / 2 + 45);

  // Indicador de flechas
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px monospace';
  ctx.fillText('◄  ▶', W / 2, H / 2 + 72);

  // Miniaturas de todas las skins (fila inferior)
  const startX = W / 2 - (SKINS.length - 1) * 50;
  for (let i = 0; i < SKINS.length; i++) {
    const sx = startX + i * 100;
    const sy = H / 2 + 110;
    const s = SKINS[i];

    // Indicador de seleccionada
    if (i === menuSkin) {
      ctx.fillStyle = `rgba(255,255,255,0.12)`;
      ctx.fillRect(sx - 38, sy - 28, 76, 56);
    }

    // Mini nave
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(0.55, 0.55);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.verts[0][0], s.verts[0][1]);
    for (let j = 1; j < s.verts.length; j++)
      ctx.lineTo(s.verts[j][0], s.verts[j][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Nombre debajo
    ctx.fillStyle = i === menuSkin ? s.color : 'rgba(255,255,255,0.35)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, sx, sy + 38);
  }

  // Texto "ESPACIO PARA JUGAR"
  ctx.textAlign = 'center';
  const alpha = 0.5 + Math.sin(menuBlink * 3) * 0.3;
  ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
  ctx.font = '18px monospace';
  ctx.fillText('ESPACIO PARA JUGAR', W / 2, H - 50);
}

function draw() {
  if (state === 'menu') {
    drawMenu();
    return;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  shootingStars.forEach(s => s.draw());
  rings.forEach(r => r.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(p => p.draw());
  ship.draw();

  // Flash de pantalla
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 221, 0, ${Math.max(0, flashAlpha).toFixed(2)})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
state = 'menu';
requestAnimationFrame(loop);
