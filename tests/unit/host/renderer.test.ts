import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BspMapGenerator, createInitialState } from '../../../src/game/index';
import type { GameState } from '../../../src/game/types';
import { centerCameraOnTile } from '../../../src/host/camera';
import { gridPixelSize, visibleTileRange, type Viewport } from '../../../src/host/geometry';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_BACKING_SIZE,
  MAP_OFFSET_BACKING,
  MAP_OFFSET_LOGICAL,
  MAP_VIEWPORT,
  RENDER_SCALE,
} from '../../../src/host/layout';
import {
  renderScene,
  WEAPON_SHAPE_COLORS,
  type SceneAssets,
} from '../../../src/host/renderer';
import {
  FLOOR_BASE,
  FLOOR_PALETTES,
  floorColorFor,
  planDecoration,
  roomPalettesFor,
} from '../../../src/host/floor';
import { makeState } from '../game/helpers';

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

type RenderOp =
  | {
      readonly kind: 'draw';
      readonly image: unknown;
      readonly sx: number;
      readonly sy: number;
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly kind: 'fill';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly style: string;
    };

interface FakeContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly draws: DrawCall[];
  readonly fillRects: FillRect[];
  readonly fillStyles: string[];
  readonly ops: RenderOp[];
  readonly translates: Array<{ x: number; y: number }>;
  readonly scales: Array<{ x: number; y: number }>;
  readonly clips: FillRect[];
  readonly isSmoothingEnabled: () => boolean;
}

function createFakeContext(): FakeContext {
  const draws: DrawCall[] = [];
  const fillRects: FillRect[] = [];
  const fillStyles: string[] = [];
  const ops: RenderOp[] = [];
  const translates: Array<{ x: number; y: number }> = [];
  const scales: Array<{ x: number; y: number }> = [];
  const clips: FillRect[] = [];
  let currentPath: FillRect | undefined;

  const fake = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    save() {},
    restore() {},
    translate(x: number, y: number) {
      translates.push({ x, y });
    },
    scale(x: number, y: number) {
      scales.push({ x, y });
    },
    beginPath() {
      currentPath = undefined;
    },
    rect(x: number, y: number, width: number, height: number) {
      currentPath = { x, y, width, height };
    },
    clip() {
      if (currentPath) clips.push(currentPath);
    },
    fillRect(x: number, y: number, width: number, height: number) {
      fillRects.push({ x, y, width, height });
      fillStyles.push(fake.fillStyle);
      ops.push({ kind: 'fill', x, y, width, height, style: fake.fillStyle });
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
      ops.push({ kind: 'draw', image, sx, sy, dx, dy });
    },
  };

  return {
    ctx: fake as unknown as CanvasRenderingContext2D,
    draws,
    fillRects,
    fillStyles,
    ops,
    translates,
    scales,
    clips,
    isSmoothingEnabled: () => fake.imageSmoothingEnabled,
  };
}

const assets: SceneAssets = {
  tiles: { name: 'tiles' } as unknown as CanvasImageSource,
  rogues: { name: 'rogues' } as unknown as CanvasImageSource,
  monsters: { name: 'monsters' } as unknown as CanvasImageSource,
};

const VIEWPORT: Viewport = { width: 416, height: 416 };

function draw(state: GameState, camera: { x: number; y: number }): FakeContext {
  const fake = createFakeContext();
  renderScene(fake.ctx, state, assets, camera, VIEWPORT);
  return fake;
}

describe('render de la sala', () => {
  it('cubre exactamente 13x13 tiles con la cámara en el origen', () => {
    const state = makeState();
    const fake = draw(state, { x: 0, y: 0 });

    // El viewport 416x416 sobre una sala 20x20 cubre 13 columnas y 13 filas:
    // 144 tiles de suelo rellenados, 25 muros dibujados y el caballero. Sin
    // mapa no hay decals. El goblin queda fuera del viewport inicial.
    expect(fake.isSmoothingEnabled()).toBe(false);

    const paletteStyles = new Set(
      Object.values(FLOOR_PALETTES).flatMap((palette) => [
        palette.base,
        palette.second,
      ]),
    );
    const floorFills = fake.ops.filter(
      (op) => op.kind === 'fill' && paletteStyles.has(op.style),
    );
    const wallDraws = fake.draws.filter(
      (call) => call.image === assets.tiles && call.sy === 64,
    );

    expect(floorFills).toHaveLength(144);
    expect(wallDraws).toHaveLength(25);
    expect(fake.draws).toHaveLength(26);
    expect(wallDraws[0]).toMatchObject({ sx: 0, sy: 64, sw: 32, sh: 32 });
  });

  it('pinta el marco 2218x1248 en negro y centra el mapa de 1248x1248', () => {
    expect(CANVAS_WIDTH).toBe(2218);
    expect(CANVAS_HEIGHT).toBe(1248);
    expect(MAP_VIEWPORT.width).toBe(416);
    expect(MAP_VIEWPORT.height).toBe(416);
    expect(MAP_BACKING_SIZE).toBe(1248);
    expect(MAP_OFFSET_BACKING).toBe(485);
    expect(MAP_OFFSET_LOGICAL * RENDER_SCALE).toBe(485);
    expect((CANVAS_WIDTH - MAP_BACKING_SIZE) / 2).toBe(485);
  });

  it('usa escala interna 3x, desplaza el mapa 485 px de respaldo y recorta los laterales', () => {
    const fake = draw(makeState(), { x: 0, y: 0 });

    expect(fake.fillRects[0]).toEqual({
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
    expect(fake.fillStyles[0]).toBe('#000000');
    expect(fake.scales).toContainEqual({ x: RENDER_SCALE, y: RENDER_SCALE });
    expect(fake.translates[0]).toEqual({ x: MAP_OFFSET_LOGICAL, y: 0 });
    expect(fake.clips).toEqual([
      { x: 0, y: 0, width: MAP_VIEWPORT.width, height: MAP_VIEWPORT.height },
    ]);
  });

  it('dibuja al caballero con el recorte (0,32,32,32) centrado en su casilla', () => {
    const state = makeState();
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

  it('acepta un override entero de posición sin tocar el estado del motor', () => {
    const state = makeState();
    const player = state.players[0];
    const before = JSON.stringify(state);
    const fake = createFakeContext();
    const positions = new Map([[player.id, { x: player.x * 32 + 24, y: player.y * 32 + 8 }]]);

    renderScene(fake.ctx, state, assets, { x: 0, y: 0 }, VIEWPORT, 32, { positions });

    const knight = fake.draws.find(
      (call) => call.image === assets.rogues && call.sy === 32,
    );
    expect(knight).toMatchObject({
      dx: player.x * 32 + 8,
      dy: player.y * 32 - 8,
      dw: 32,
      dh: 32,
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('una unidad con override fuera del viewport no se dibuja', () => {
    const state = makeState();
    const enemy = state.enemies[0];
    const fake = createFakeContext();
    const positions = new Map([[enemy.id, { x: -64, y: -64 }]]);

    renderScene(fake.ctx, state, assets, { x: 0, y: 0 }, VIEWPORT, 32, { positions });

    expect(fake.draws.filter((call) => call.image === assets.monsters)).toEqual([]);
  });

  it('dibuja al goblin con el recorte (64,0,32,32) con una cámara cercana al enemigo', () => {
    const state = makeState();
    const enemy = state.enemies[0];
    const camera = centerCameraOnTile(enemy, VIEWPORT, gridPixelSize(state.grid));
    const fake = draw(state, camera);

    expect(camera).toEqual({ x: 224, y: 224 });

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

  it('pinta el fondo del mapa y aplica la traslación de la cámara', () => {
    const fake = draw(makeState(), { x: 0, y: 40 });

    expect(fake.fillRects[1]).toEqual({
      x: 0,
      y: 0,
      width: MAP_VIEWPORT.width,
      height: MAP_VIEWPORT.height,
    });
    expect(fake.translates).toContainEqual({ x: -0, y: -40 });
  });

  it('no dibuja unidades fuera del sub-viewport del mapa', () => {
    const state = makeState();
    const fake = draw(state, { x: 0, y: 0 });

    const monsterDraws = fake.draws.filter((call) => call.image === assets.monsters);
    expect(monsterDraws).toEqual([]);
  });

  it('no muta el estado del motor', () => {
    const state = makeState();
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

describe('render del mapa generado', () => {
  function generatedState(): GameState {
    return createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
  }

  it('el muro del borde superior usa wallTop (sx 0)', () => {
    const fake = draw(generatedState(), { x: 0, y: 0 });

    const topBorder = fake.draws.find(
      (call) => call.image === assets.tiles && call.dx === 0 && call.dy === 0,
    );

    expect(topBorder).toMatchObject({ sx: 0, sy: 64, sw: 32, sh: 32 });
  });

  it('un muro con suelo al sur usa wallSide1 (sx 32)', () => {
    const fake = draw(generatedState(), { x: 0, y: 0 });

    // (3,3) es muro y (3,4) es el suelo de la sala 0.
    const wall = fake.draws.find(
      (call) => call.image === assets.tiles && call.dx === 3 * 32 && call.dy === 3 * 32,
    );

    expect(wall).toMatchObject({ sx: 32, sy: 64, sw: 32, sh: 32 });
  });

  it('ningún draw usa wallSide2 (sx 64, sy 64)', () => {
    const fake = draw(generatedState(), { x: 0, y: 0 });
    const walls = fake.draws.filter((call) => call.image === assets.tiles && call.sy === 64);

    expect(walls.length).toBeGreaterThan(0);
    expect(walls.every((call) => call.sx === 0 || call.sx === 32)).toBe(true);
    expect(walls.some((call) => call.sx === 64)).toBe(false);
  });

  it('pinta cada tile de suelo con la base y el segundo tono de su sala, nunca muros', () => {
    const state = generatedState();
    const fake = draw(state, { x: 0, y: 0 });
    const range = visibleTileRange({ x: 0, y: 0 }, VIEWPORT, state.grid);
    const paletteStyles = new Set(
      Object.values(FLOOR_PALETTES).flatMap((palette) => [
        palette.base,
        palette.second,
      ]),
    );
    const floorFills = fake.ops.filter(
      (op): op is Extract<RenderOp, { kind: 'fill' }> =>
        op.kind === 'fill' && paletteStyles.has(op.style),
    );

    let expected = 0;
    for (let y = range.minY; y <= range.maxY; y += 1) {
      for (let x = range.minX; x <= range.maxX; x += 1) {
        if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
        expected += 1;
        expect(
          floorFills.some(
            (fill) =>
              fill.x === x * 32 &&
              fill.y === y * 32 &&
              fill.width === 32 &&
              fill.height === 32 &&
              fill.style === floorColorFor(state.map, x, y),
          ),
          `Suelo (${x},${y})`,
        ).toBe(true);
      }
    }

    expect(floorFills).toHaveLength(expected);
    for (const fill of floorFills) {
      const x = fill.x / 32;
      const y = fill.y / 32;
      expect(fill.width).toBe(32);
      expect(fill.height).toBe(32);
      expect(state.grid.tiles[y * state.grid.width + x]).toBe('floor');
    }

    // Los muros conservan su sprite y nunca reciben un color de suelo.
    const wallFills = floorFills.filter(
      (fill) =>
        state.grid.tiles[(fill.y / 32) * state.grid.width + fill.x / 32] ===
        'wall',
    );
    expect(wallFills).toEqual([]);
  });

  it('dibuja solo decals planos de la planificación, sobre tiles de suelo', () => {
    const state = generatedState();
    const fake = draw(state, { x: 0, y: 0 });
    const decalDraws = fake.draws.filter(
      (call) => call.image === assets.tiles && call.sy !== 64,
    );

    const range = visibleTileRange({ x: 0, y: 0 }, VIEWPORT, state.grid);
    const visiblePlan = planDecoration(state.map).filter(
      (entry) =>
        entry.x >= range.minX &&
        entry.x <= range.maxX &&
        entry.y >= range.minY &&
        entry.y <= range.maxY,
    );

    expect(decalDraws.length).toBe(visiblePlan.length);
    const expected = new Set(
      visiblePlan.map(
        (entry) => `${entry.x * 32},${entry.y * 32},${entry.decal.rect.sx},${entry.decal.rect.sy}`,
      ),
    );
    for (const call of decalDraws) {
      expect(expected.has(`${call.dx},${call.dy},${call.sx},${call.sy}`)).toBe(true);
      expect(state.grid.tiles[call.dy / 32 * state.grid.width + call.dx / 32]).toBe(
        'floor',
      );
      expect(call.sw).toBe(32);
      expect(call.sh).toBe(32);
    }
  });

  it('respeta el orden base → decals → unidades', () => {
    const state = generatedState();
    const camera = centerCameraOnTile(
      state.players[0],
      VIEWPORT,
      gridPixelSize(state.grid),
    );
    const fake = draw(state, camera);
    const paletteStyles = new Set(
      Object.values(FLOOR_PALETTES).flatMap((palette) => [
        palette.base,
        palette.second,
      ]),
    );

    const baseIndex = fake.ops.findIndex(
      (op) => op.kind === 'fill' && paletteStyles.has(op.style),
    );
    const decalIndex = fake.ops.findIndex(
      (op) =>
        op.kind === 'draw' && op.image === assets.tiles && op.sy !== 64,
    );
    const unitIndex = fake.ops.findIndex(
      (op) => op.kind === 'draw' && op.image === assets.rogues,
    );

    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(decalIndex).toBeGreaterThan(baseIndex);
    expect(unitIndex).toBeGreaterThan(decalIndex);
  });

  it('sin mapa pinta damero neutro pero no dibuja decoración', () => {
    const fake = draw(makeState(), { x: 0, y: 0 });

    const neutralStyles = new Set([
      FLOOR_BASE,
      FLOOR_PALETTES.neutral.second,
    ]);
    const floorFills = fake.ops.filter(
      (op): op is Extract<RenderOp, { kind: 'fill' }> =>
        op.kind === 'fill' && neutralStyles.has(op.style),
    );
    const decalDraws = fake.draws.filter(
      (call) => call.image === assets.tiles && call.sy !== 64,
    );

    expect(floorFills.length).toBe(144);
    expect(decalDraws).toEqual([]);
  });


  it('dos renders del mismo estado producen exactamente la misma secuencia de draws', () => {
    const state = generatedState();
    const first = draw(state, { x: 0, y: 0 });
    const second = draw(state, { x: 0, y: 0 });

    expect(second.draws).toEqual(first.draws);
    expect(second.fillRects).toEqual(first.fillRects);
  });

  it('no usa floorTileFor ni recortes de suelo del PNG en el render', () => {
    const source = readFileSync(
      new URL('../../../src/host/renderer.ts', import.meta.url),
      'utf8',
    );

    expect(source).not.toMatch(/floorTileFor/);
    expect(source).not.toMatch(/TILE_RECTS\.floor/);
    expect(source).not.toMatch(/floorTintStyle/);
    expect(source).toMatch(/floorColorFor\(state\.map, x, y\)/);
  });

  it('usa las mismas paletas por sala que expone la planificación', () => {
    const state = generatedState();
    const fake = draw(state, { x: 0, y: 0 });
    const palettes = roomPalettesFor(state.map);
    const paletteStyles = new Set(
      Object.values(FLOOR_PALETTES).flatMap((palette) => [
        palette.base,
        palette.second,
      ]),
    );
    const floorFills = fake.ops.filter(
      (op): op is Extract<RenderOp, { kind: 'fill' }> =>
        op.kind === 'fill' && paletteStyles.has(op.style),
    );

    expect(palettes).toHaveLength(state.map?.rooms.length ?? 0);
    for (const fill of floorFills) {
      expect(paletteStyles.has(fill.style)).toBe(true);
    }
  });

  it('no muta el estado generado', () => {
    const state = deepFreeze(generatedState());
    const before = JSON.stringify(state);

    expect(() => draw(state, { x: 0, y: 0 })).not.toThrow();
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('render de armas del mapa', () => {
  function stateWithWeapon(
    weaponId: 'axe' | 'dagger',
  ): { state: GameState; x: number; y: number; camera: { x: number; y: number } } {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const player = base.players[0];
    const x = player.x + 1;
    const y = player.y;
    if (!base.map) throw new Error('La semilla de referencia debe generar mapa');

    return {
      state: {
        ...base,
        map: {
          ...base.map,
          weapons: [{ id: `weapon-${weaponId}`, weaponId, x, y }],
        },
      },
      x,
      y,
      camera: centerCameraOnTile(player, VIEWPORT, gridPixelSize(base.grid)),
    };
  }

  it('dibuja el hacha con formas planas en su tile, sin assets nuevos', () => {
    const { state, x, y, camera } = stateWithWeapon('axe');
    const fake = draw(state, camera);

    const axeFills = fake.ops.filter(
      (op): op is Extract<RenderOp, { kind: 'fill' }> =>
        op.kind === 'fill' &&
        op.style === WEAPON_SHAPE_COLORS.handle &&
        op.x >= x * 32 &&
        op.x < (x + 1) * 32 &&
        op.y >= y * 32 &&
        op.y < (y + 1) * 32,
    );

    expect(axeFills.length).toBeGreaterThan(0);
    expect(
      fake.ops.some(
        (op) => op.kind === 'fill' && op.style === WEAPON_SHAPE_COLORS.axeBlade,
      ),
    ).toBe(true);
    // Las armas son formas planas: no añaden `drawImage`.
    expect(
      fake.draws.some(
        (call) =>
          call.image !== assets.tiles &&
          call.image !== assets.rogues &&
          call.image !== assets.monsters,
      ),
    ).toBe(false);
  });

  it('el hacha y la daga usan formas distintas en el mismo tile', () => {
    const axe = stateWithWeapon('axe');
    const dagger = stateWithWeapon('dagger');
    const axeFake = draw(axe.state, axe.camera);
    const daggerFake = draw(dagger.state, dagger.camera);

    const axeShape = axeFake.ops.filter(
      (op) =>
        op.kind === 'fill' &&
        (op.style === WEAPON_SHAPE_COLORS.handle ||
          op.style === WEAPON_SHAPE_COLORS.axeBlade),
    );
    const daggerShape = daggerFake.ops.filter(
      (op) =>
        op.kind === 'fill' &&
        (op.style === WEAPON_SHAPE_COLORS.handle ||
          op.style === WEAPON_SHAPE_COLORS.daggerBlade ||
          op.style === WEAPON_SHAPE_COLORS.guard),
    );

    expect(axeShape).not.toEqual(daggerShape);
    expect(
      daggerFake.ops.some(
        (op) => op.kind === 'fill' && op.style === WEAPON_SHAPE_COLORS.guard,
      ),
    ).toBe(true);
    expect(
      axeFake.ops.some(
        (op) => op.kind === 'fill' && op.style === WEAPON_SHAPE_COLORS.daggerBlade,
      ),
    ).toBe(false);
  });

  it('dibuja las armas entre decals y unidades', () => {
    const { state, camera } = stateWithWeapon('axe');
    const fake = draw(state, camera);

    const weaponIndex = fake.ops.findIndex(
      (op) => op.kind === 'fill' && op.style === WEAPON_SHAPE_COLORS.handle,
    );
    const decalIndex = fake.ops.findIndex(
      (op) => op.kind === 'draw' && op.image === assets.tiles && op.sy !== 64,
    );
    const unitIndex = fake.ops.findIndex(
      (op) =>
        op.kind === 'draw' &&
        (op.image === assets.rogues || op.image === assets.monsters),
    );

    expect(weaponIndex).toBeGreaterThan(decalIndex);
    expect(unitIndex).toBeGreaterThan(weaponIndex);
  });

  it('sin armas en el mapa no pinta formas de arma', () => {
    const fake = draw(makeState(), { x: 0, y: 0 });

    expect(
      fake.ops.some(
        (op) =>
          op.kind === 'fill' &&
          (op.style === WEAPON_SHAPE_COLORS.handle ||
            op.style === WEAPON_SHAPE_COLORS.axeBlade ||
            op.style === WEAPON_SHAPE_COLORS.daggerBlade ||
            op.style === WEAPON_SHAPE_COLORS.guard),
      ),
    ).toBe(false);
  });

  it('no muta el estado al dibujar armas', () => {
    const { state } = stateWithWeapon('dagger');
    const before = JSON.stringify(state);
    const frozen = deepFreeze(state);

    expect(() => draw(frozen, { x: 0, y: 64 })).not.toThrow();
    expect(JSON.stringify(state)).toBe(before);
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
