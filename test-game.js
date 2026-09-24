'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function createCanvas() {
  const noop = () => {};
  const context = new Proxy({}, {
    get(target, property) {
      if (property === 'measureText') return () => ({ width: 0 });
      if (!(property in target)) target[property] = noop;
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });

  return {
    width: 800,
    height: 600,
    getContext: () => context,
  };
}

function loadGame() {
  const listeners = { keydown: [], keyup: [] };
  const canvas = createCanvas();
  let nextFrame = null;
  const sandbox = {
    console,
    document: {
      getElementById: id => id === 'canvas' ? canvas : null,
    },
    localStorage: createStorage(),
    requestAnimationFrame(callback) {
      nextFrame = callback;
      return 1;
    },
    addEventListener(type, listener) {
      listeners[type].push(listener);
    },
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: 'game.js' });

  return {
    evaluate(expression) {
      return vm.runInContext(expression, context);
    },
    press(code) {
      const event = { code, preventDefault() {} };
      for (const listener of listeners.keydown) listener(event);
      for (const listener of listeners.keyup) listener({ code });
    },
    tick(timestamp) {
      assert.ok(nextFrame, 'No se ha registrado ningún frame');
      const callback = nextFrame;
      nextFrame = null;
      callback(timestamp);
    },
  };
}

function testMenu() {
  const game = loadGame();
  assert.equal(game.evaluate('state'), 'menu');
  assert.ok(game.evaluate('SKINS.length') > 0);
  assert.equal(game.evaluate('menuStars.length'), 60);

  const initialSkin = game.evaluate('menuSkin');
  game.press('ArrowRight');
  game.evaluate('update(0)');
  assert.equal(game.evaluate('menuSkin'), (initialSkin + 1) % game.evaluate('SKINS.length'));

  game.press('Space');
  game.evaluate('update(0)');
  assert.equal(game.evaluate('state'), 'playing');
  assert.equal(game.evaluate('asteroids.length'), 4);
  assert.equal(game.evaluate('ship.dead'), false);
}

function testShipSelection() {
  for (let index = 0; index < 4; index++) {
    const game = loadGame();
    game.evaluate(`menuSkin = ${index}; startGame()`);
    assert.equal(game.evaluate('currentSkin'), index);
    assert.equal(game.evaluate('ship.dead'), false);
    assert.equal(game.evaluate('localStorage.getItem("asteroids_skin")'), String(index));
  }
}

function testShooting() {
  const game = loadGame();
  game.evaluate('startGame(); asteroids = [new Asteroid(0, 0, 3)]');
  game.press('Space');
  game.evaluate('update(0)');
  assert.equal(game.evaluate('bullets.length'), 1);
  assert.equal(game.evaluate('bullets[0].dead'), false);
}

function testScoringAndSplitting() {
  const game = loadGame();
  game.evaluate(`
    startGame();
    ship.invincible = 999;
    asteroids = [new Asteroid(400, 300, 1)];
    bullets = [new Bullet(400, 300, 0)];
    score = 0;
    update(0);
  `);
  assert.equal(game.evaluate('score'), game.evaluate('POINTS[1]'));

  const pieces = game.evaluate('new Asteroid(400, 300, 2).split()');
  assert.equal(pieces.length, 2);
  assert.equal(pieces[0].size, 1);
  assert.equal(pieces[1].size, 1);
}

function testWrappingAndDrawing() {
  const game = loadGame();
  assert.equal(game.evaluate('wrap(-1, 10)'), 9);
  assert.equal(game.evaluate('wrap(11, 10)'), 1);
  game.tick(16);
  game.evaluate('state = "playing"; draw()');
}

const tests = [
  ['menú y selección inicial', testMenu],
  ['selección de todas las naves', testShipSelection],
  ['disparo de la nave', testShooting],
  ['puntuación y división de asteroides', testScoringAndSplitting],
  ['envoltura y dibujado', testWrappingAndDrawing],
];

for (const [name, test] of tests) {
  test();
  process.stdout.write(`✓ ${name}\n`);
}

process.stdout.write(`${tests.length} pruebas superadas.\n`);
