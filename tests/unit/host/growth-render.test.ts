import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  type MapOptions,
} from '../../../src/game/index';
import { GrowthMapGenerator } from '../../../src/game/chambers/variants/growth';
import type { GameState } from '../../../src/game/types';
import { renderScene, type SceneAssets } from '../../../src/host/renderer';
import type { Viewport } from '../../../src/host/geometry';

const SEED = 2738263054;
const VIEWPORT: Viewport = { width: 22 * 32, height: 18 * 32 };

const assets: SceneAssets = {
  tiles: { name: 'tiles' } as unknown as CanvasImageSource,
  rogues: { name: 'rogues' } as unknown as CanvasImageSource,
  monsters: { name: 'monsters' } as unknown as CanvasImageSource,
};

const DOOR_FRAME_COLORS = ['#6b4423', '#4e5d6b', '#3d4a55'];
const DOOR_LEAF_COLORS = ['#c88a4a', '#a9bece', '#7c8c99'];

interface FakeFill {
  readonly x: number;
  readonly y: number;
  readonly style: string;
}

function createFakeContext() {
  const fills: FakeFill[] = [];
  const texts: Array<{ text: string; style: string }> = [];
  const draws: Array<{ sx: number; sy: number; dx: number; dy: number }> = [];
  let path: { x: number; y: number; width: number; height: number } | undefined;

  const fake = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {
      path = undefined;
    },
    rect(x: number, y: number, width: number, height: number) {
      path = { x, y, width, height };
    },
    clip() {
      void path;
    },
    fillRect(x: number, y: number, width: number, height: number) {
      fills.push({ x, y, style: fake.fillStyle });
      void width;
      void height;
    },
    drawImage(
      _image: unknown,
      sx: number,
      sy: number,
      _sw: number,
      _sh: number,
      dx: number,
      dy: number,
    ) {
      draws.push({ sx, sy, dx, dy });
    },
    fillText(text: string, x: number, y: number) {
      void x;
      void y;
      texts.push({ text, style: fake.fillStyle });
    },
    measureText(text: string) {
      return { width: text.length * 6 };
    },
  };

  return { ctx: fake as unknown as CanvasRenderingContext2D, fills, texts, draws };
}

function growthState(options: MapOptions = {}): GameState {
  return createInitialState({
    seed: SEED,
    generator: new GrowthMapGenerator(),
    options,
  });
}

function render(
  state: GameState,
  debug: boolean | undefined,
): ReturnType<typeof createFakeContext> {
  const fake = createFakeContext();
  renderScene(fake.ctx, state, assets, { x: 0, y: 0 }, VIEWPORT, 32, {
    ...(debug === undefined ? {} : { debug }),
  });
  return fake;
}

function tileOf(fill: FakeFill): { x: number; y: number } {
  return { x: Math.floor(fill.x / 32), y: Math.floor(fill.y / 32) };
}

describe('render del mapa growth', () => {
  it('dibuja puertas solo en los huecos de `map.doors` y con su estilo', () => {
    const state = growthState();
    const map = state.map!;
    const fake = render(state, undefined);
    const doorFills = fake.fills.filter(
      (fill) =>
        DOOR_FRAME_COLORS.includes(fill.style) || DOOR_LEAF_COLORS.includes(fill.style),
    );

    expect(doorFills.length).toBeGreaterThan(0);
    const doorKeys = new Set(map.doors.map((door) => `${door.x},${door.y}`));
    for (const fill of doorFills) {
      const tile = tileOf(fill);
      expect(doorKeys.has(`${tile.x},${tile.y}`), `puerta en ${tile.x},${tile.y}`).toBe(
        true,
      );
    }
    for (const mouth of map.openMouths ?? []) {
      expect(
        doorFills.some((fill) => tileOf(fill).x === mouth.x && tileOf(fill).y === mouth.y),
        `boca sin puerta en ${mouth.x},${mouth.y}`,
      ).toBe(false);
    }
  });

  it('dibuja la salida con su tile propio: puerta dorada o escalera', () => {
    const doorState = growthState({ exitMode: 'door' } as MapOptions);
    const doorExit = doorState.map!.exit!;
    const doorFake = render(doorState, undefined);

    expect(doorExit.kind).toBe('door');
    expect(
      doorFake.fills.some(
        (fill) =>
          fill.style === '#f2c14e' &&
          tileOf(fill).x === doorExit.position.x &&
          tileOf(fill).y === doorExit.position.y,
      ),
    ).toBe(true);

    const stairState = growthState({ exitMode: 'stairs-down' } as MapOptions);
    const stairExit = stairState.map!.exit!;
    const stairFake = render(stairState, undefined);

    expect(stairExit.kind).toBe('stairs-down');
    expect(
      stairFake.draws.some(
        (draw) =>
          draw.sx === 224 &&
          draw.sy === 512 &&
          draw.dx === stairExit.position.x * 32 &&
          draw.dy === stairExit.position.y * 32,
      ),
    ).toBe(true);
  });

  it('sin F1 no dibuja etiquetas ni marcas de debug', () => {
    const state = growthState();
    const normal = render(state, false);
    const implicit = render(state, undefined);

    expect(normal.texts).toEqual([]);
    expect(implicit.texts).toEqual([]);
    expect(normal.fills).toEqual(implicit.fills);
    expect(normal.draws).toEqual(implicit.draws);
  });

  it('F1 añade máscaras, spawn de 6, motivos, entrada/salida y puntos calientes', () => {
    const state = growthState();
    const normal = render(state, false);
    const debug = render(state, true);
    const texts = debug.texts.map((entry) => entry.text);

    expect(debug.fills.length).toBeGreaterThan(normal.fills.length);
    for (let index = 1; index <= 6; index += 1) {
      expect(texts).toContain(index === 1 ? 'J' : String(index));
    }
    expect(texts.some((text) => text.startsWith('salida '))).toBe(true);
    expect(texts).toContain('entrada');
    for (const mouth of state.map!.openMouths ?? []) {
      expect(texts, `motivo de boca ${mouth.x},${mouth.y}`).toContain(mouth.reason);
    }
    for (const hotspot of state.map!.hotspots ?? []) {
      expect(
        debug.fills.some(
          (fill) =>
            fill.style === 'rgba(8, 11, 16, 0.78)' &&
            Math.abs(fill.x - hotspot.x * 32) < 32,
        ),
      ).toBe(true);
    }
  });

  it('la misma semilla produce exactamente el mismo render', () => {
    const first = render(growthState(), true);
    const second = render(growthState(), true);

    expect(second.fills).toEqual(first.fills);
    expect(second.texts).toEqual(first.texts);
    expect(second.draws).toEqual(first.draws);
  });
});
