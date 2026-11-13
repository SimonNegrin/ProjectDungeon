/**
 * Carga de los PNG locales de 32rogues y recortes usados por el render.
 * Los assets viven en `public/assets/32rogues/` y se sirven desde el bundle:
 * no hay peticiones de red externas.
 */

export interface SpriteRect {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

export const ASSET_URLS = {
  tiles: '/assets/32rogues/tiles.png',
  rogues: '/assets/32rogues/rogues.png',
  monsters: '/assets/32rogues/monsters.png',
  items: '/assets/32rogues/items.png',
} as const;

/** Recortes comprobados sobre la rejilla real de los PNG (32 px por celda). */
export const TILE_RECTS = {
  wallTop: { sx: 0, sy: 64, sw: 32, sh: 32 },
  wallSide1: { sx: 32, sy: 64, sw: 32, sh: 32 },
  wallSide2: { sx: 64, sy: 64, sw: 32, sh: 32 },
  // Recortes históricos que usan los experimentos; el render ya no los lee.
  floor1: { sx: 32, sy: 288, sw: 32, sh: 32 },
  floor2: { sx: 64, sy: 288, sw: 32, sh: 32 },
  floor3: { sx: 96, sy: 288, sw: 32, sh: 32 },
} as const satisfies Record<string, SpriteRect>;

/**
 * Recortes 32×32 de decals planos aprobados (`REQ-008`). Columnas a-d = 0-96,
 * e-g = 128-192, l = 352, n-o-p = 416-480; filas 7-12 → sy 192-352,
 * 20-23 → sy 608-704. La fila 9 es tierra, la 10 ladrillo azul y la 11 huesos.
 */
export const DECAL_RECTS = {
  pebbles7e: { sx: 128, sy: 192, sw: 32, sh: 32 },
  pebbles7f: { sx: 160, sy: 192, sw: 32, sh: 32 },
  pebbles7g: { sx: 192, sy: 192, sw: 32, sh: 32 },
  grass8e: { sx: 128, sy: 224, sw: 32, sh: 32 },
  grass8f: { sx: 160, sy: 224, sw: 32, sh: 32 },
  grass8g: { sx: 192, sy: 224, sw: 32, sh: 32 },
  dirt9e: { sx: 128, sy: 256, sw: 32, sh: 32 },
  dirt9f: { sx: 160, sy: 256, sw: 32, sh: 32 },
  dirt9g: { sx: 192, sy: 256, sw: 32, sh: 32 },
  blueBrick10e: { sx: 128, sy: 288, sw: 32, sh: 32 },
  blueBrick10f: { sx: 160, sy: 288, sw: 32, sh: 32 },
  blueBrick10g: { sx: 192, sy: 288, sw: 32, sh: 32 },
  bones11e: { sx: 128, sy: 320, sw: 32, sh: 32 },
  bones11f: { sx: 160, sy: 320, sw: 32, sh: 32 },
  bones11g: { sx: 192, sy: 320, sw: 32, sh: 32 },
  redBrick12e: { sx: 128, sy: 352, sw: 32, sh: 32 },
  redBrick12f: { sx: 160, sy: 352, sw: 32, sh: 32 },
  redBrick12g: { sx: 192, sy: 352, sw: 32, sh: 32 },
  plant20a: { sx: 0, sy: 608, sw: 32, sh: 32 },
  plant20b: { sx: 32, sy: 608, sw: 32, sh: 32 },
  plant20e: { sx: 128, sy: 608, sw: 32, sh: 32 },
  plant20l: { sx: 352, sy: 608, sw: 32, sh: 32 },
  plant20n: { sx: 416, sy: 608, sw: 32, sh: 32 },
  plant20o: { sx: 448, sy: 608, sw: 32, sh: 32 },
  plant20p: { sx: 480, sy: 608, sw: 32, sh: 32 },
  mushroom21a: { sx: 0, sy: 640, sw: 32, sh: 32 },
  mushroom21b: { sx: 32, sy: 640, sw: 32, sh: 32 },
  corpse22a: { sx: 0, sy: 672, sw: 32, sh: 32 },
  corpse22b: { sx: 32, sy: 672, sw: 32, sh: 32 },
  blood23a: { sx: 0, sy: 704, sw: 32, sh: 32 },
  blood23b: { sx: 32, sy: 704, sw: 32, sh: 32 },
  blood23c: { sx: 64, sy: 704, sw: 32, sh: 32 },
  blood23d: { sx: 96, sy: 704, sw: 32, sh: 32 },
} as const satisfies Record<string, SpriteRect>;

export const KNIGHT_RECT: SpriteRect = { sx: 0, sy: 32, sw: 32, sh: 32 };
export const GOBLIN_RECT: SpriteRect = { sx: 64, sy: 0, sw: 32, sh: 32 };

/**
 * Recortes reservados para el cadáver de presentación de REQ-017. No forman
 * parte de la decoración ambiental; solo se dibujan donde murió una unidad.
 */
export const CORPSE_RECTS: readonly SpriteRect[] = [
  DECAL_RECTS.corpse22a,
  DECAL_RECTS.corpse22b,
];

/** Elige `corpse-22a/b` de forma determinista a partir de la unidad. */
export function corpseRectFor(unit: {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}): SpriteRect {
  let hash = unit.x * 73856093 + unit.y * 19349663;
  for (let index = 0; index < unit.id.length; index += 1) {
    hash = (Math.imul(hash, 31) + unit.id.charCodeAt(index)) | 0;
  }
  const index = Math.abs(hash) % CORPSE_RECTS.length;
  return CORPSE_RECTS[index];
}

export interface GameAssets {
  readonly tiles: HTMLImageElement;
  readonly rogues: HTMLImageElement;
  readonly monsters: HTMLImageElement;
  /** Hoja de objetos de 32rogues; el catálogo decide el recorte. */
  readonly items: HTMLImageElement;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener(
      'error',
      () => reject(new Error(`No se pudo cargar el asset local ${src}`)),
      { once: true },
    );
    image.src = src;
  });
}

/** Espera a que las cuatro imágenes estén listas antes de renderizar. */
export async function loadAssets(): Promise<GameAssets> {
  const [tiles, rogues, monsters, items] = await Promise.all([
    loadImage(ASSET_URLS.tiles),
    loadImage(ASSET_URLS.rogues),
    loadImage(ASSET_URLS.monsters),
    loadImage(ASSET_URLS.items),
  ]);

  return { tiles, rogues, monsters, items };
}
