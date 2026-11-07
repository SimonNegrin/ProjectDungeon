import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../src/game/engine';
import type { GameState } from '../../../src/game/types';
import { centerCameraOnTile } from '../../../src/host/camera';
import { gridPixelSize, type Viewport } from '../../../src/host/geometry';
import { renderScene, type SceneAssets } from '../../../src/host/renderer';

interface DrawCall {
  readonly image: unknown;
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
  readonly dx: number;
  readonly dy: number;
  readonly dw: number;
  readonly dh: number;
}

interface FillRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface FakeContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly draws: DrawCall[];
  readonly fillRects: FillRect[];
  readonly translates: Array<{ x: number; y: number }>;
  readonly isSmoothingEnabled: () => boolean;
}

function createFakeContext(): FakeContext {
  const draws: DrawCall[] = [];
  const fillRects: FillRect[] = [];
  const translates: Array<{ x: number; y: number }> = [];

  const fake = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    save() {},
    restore() {},
    translate(x: number, y: number) {
      translates.push({ x, y });
    },
    fillRect(x: number, y: number, width: number, height: number) {
      fillRects.push({ x, y, width, height });
    },
    drawImage(
      image: unknown,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ) {
      draws.push({ image, sx, sy, sw, sh, dx, dy, dw, dh });
    },
  };

  return {
    ctx: fake as unknown as CanvasRenderingContext2D,
    draws,
    fillRects,
    translates,
    isSmoothingEnabled: () => fake.imageSmoothingEnabled,
  };
}

const assets: SceneAssets = {
  tiles: { name: 'tiles' } as unknown as CanvasImageSource,
  rogues: { name: 'rogues' } as unknown as CanvasImageSource,
  monsters: { name: 'monsters' } as unknown as CanvasImageSource,
};

const VIEWPORT: Viewport = { width: 960, height: 600 };

function draw(state: GameState, camera: { x: number; y: number }): FakeContext {
  const fake = createFakeContext();
  renderScene(fake.ctx, state, assets, camera, VIEWPORT);
  return fake;
}

describe('render de la sala', () => {
  it('dibuja suelo y muros del estado con la cámara en el origen', () => {
    const state = createInitialState();
    const fake = draw(state, { x: 0, y: 0 });

    // El viewport 960x600 sobre una sala 20x20 cubre 20 columnas y 19 filas:
    // 380 tiles (324 de suelo y 56 de muro) más las dos unidades.
    expect(fake.draws.length).toBe(382);
    expect(fake.isSmoothingEnabled()).toBe(false);

    const floorDraws = fake.draws.filter((call) => call.image === assets.tiles && call.sy === 288);
    const wallDraws = fake.draws.filter((call) => call.image === assets.tiles && call.sy === 64);

    expect(floorDraws.length).toBe(324);
    expect(wallDraws.length).toBe(56);
    expect(new Set(floorDraws.map((call) => call.sx))).toEqual(new Set([32, 64, 96]));
    expect(floorDraws[0]).toMatchObject({ sy: 288, sw: 32, sh: 32 });
    expect(wallDraws[0]).toMatchObject({ sx: 0, sy: 64, sw: 32, sh: 32 });
  });

  it('dibuja al caballero con el recorte (0,32,32,32) centrado en su casilla', () => {
    const state = createInitialState();
    const player = state.players[0];
    const fake = draw(state, { x: 0, y: 0 });

    const knight = fake.draws.find(
      (call) =>
        call.image === assets.rogues &&
        call.sx === 0 &&
        call.sy === 32 &&
        call.sw === 32 &&
        call.sh === 32,
    );

    expect(knight).toBeDefined();
    expect(knight).toMatchObject({
      dx: player.x * 32,
      dy: player.y * 32,
      dw: 32,
      dh: 32,
    });
  });

  it('dibuja al goblin con el recorte (64,0,32,32) con una cámara cercana al enemigo', () => {
    const state = createInitialState();
    const enemy = state.enemies[0];
    const camera = centerCameraOnTile(enemy, VIEWPORT, gridPixelSize(state.grid));
    const fake = draw(state, camera);

    expect(camera).toEqual({ x: 0, y: 40 });

    const goblin = fake.draws.find(
      (call) =>
        call.image === assets.monsters &&
        call.sx === 64 &&
        call.sy === 0 &&
        call.sw === 32 &&
        call.sh === 32,
    );

    expect(goblin).toBeDefined();
    expect(goblin).toMatchObject({
      dx: enemy.x * 32,
      dy: enemy.y * 32,
      dw: 32,
      dh: 32,
    });
  });

  it('pinta el fondo del viewport y aplica la traslación de la cámara', () => {
    const fake = draw(createInitialState(), { x: 0, y: 40 });

    expect(fake.fillRects[0]).toEqual({ x: 0, y: 0, width: 960, height: 600 });
    expect(fake.translates).toContainEqual({ x: -0, y: -40 });
  });

  it('no muta el estado del motor', () => {
    const state = createInitialState();
    const before = JSON.stringify(state);
    const frozen = deepFreeze(state);

    expect(() => draw(frozen, { x: 0, y: 0 })).not.toThrow();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('solo importa tipos del motor, nunca reglas de movimiento, combate, IA o turnos', () => {
    const source = readFileSync(
      new URL('../../../src/host/renderer.ts', import.meta.url),
      'utf8',
    );

    expect(source).toMatch(/import type \{[^}]*\} from '\.\.\/game\/types'/);
    expect(source).not.toMatch(
      /from\s+'\.\.\/game\/(engine|movement|combat|ai|turn|grid)'/,
    );
  });
});

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
