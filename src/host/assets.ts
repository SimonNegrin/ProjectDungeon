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
} as const;

/** Recortes comprobados sobre la rejilla real de los PNG (32 px por celda). */
export const TILE_RECTS = {
  wallTop: { sx: 0, sy: 64, sw: 32, sh: 32 },
  wallSide1: { sx: 32, sy: 64, sw: 32, sh: 32 },
  wallSide2: { sx: 64, sy: 64, sw: 32, sh: 32 },
  floor1: { sx: 32, sy: 288, sw: 32, sh: 32 },
  floor2: { sx: 64, sy: 288, sw: 32, sh: 32 },
  floor3: { sx: 96, sy: 288, sw: 32, sh: 32 },
} as const satisfies Record<string, SpriteRect>;

/**
 * Recortes 32×32 de decals planos aprobados (`REQ-007`). Columnas a-d = 0-96,
 * e-g = 128-192; filas 7-11 → sy 192-320, 21-23 → sy 640-704.
 */
export const DECAL_RECTS = {
  dirt7e: { sx: 128, sy: 192, sw: 32, sh: 32 },
  dirt7f: { sx: 160, sy: 192, sw: 32, sh: 32 },
  dirt7g: { sx: 192, sy: 192, sw: 32, sh: 32 },
  grass8e: { sx: 128, sy: 224, sw: 32, sh: 32 },
  grass8f: { sx: 160, sy: 224, sw: 32, sh: 32 },
  grass8g: { sx: 192, sy: 224, sw: 32, sh: 32 },
  bones9e: { sx: 128, sy: 256, sw: 32, sh: 32 },
  bones9f: { sx: 160, sy: 256, sw: 32, sh: 32 },
  bones9g: { sx: 192, sy: 256, sw: 32, sh: 32 },
  dirt10e: { sx: 128, sy: 288, sw: 32, sh: 32 },
  dirt10f: { sx: 160, sy: 288, sw: 32, sh: 32 },
  dirt10g: { sx: 192, sy: 288, sw: 32, sh: 32 },
  bones11e: { sx: 128, sy: 320, sw: 32, sh: 32 },
  bones11f: { sx: 160, sy: 320, sw: 32, sh: 32 },
  bones11g: { sx: 192, sy: 320, sw: 32, sh: 32 },
  mushroom21a: { sx: 0, sy: 640, sw: 32, sh: 32 },
  mushroom21b: { sx: 32, sy: 640, sw: 32, sh: 32 },
  bones22a: { sx: 0, sy: 672, sw: 32, sh: 32 },
  bones22b: { sx: 32, sy: 672, sw: 32, sh: 32 },
  blood23a: { sx: 0, sy: 704, sw: 32, sh: 32 },
  blood23b: { sx: 32, sy: 704, sw: 32, sh: 32 },
  blood23c: { sx: 64, sy: 704, sw: 32, sh: 32 },
  blood23d: { sx: 96, sy: 704, sw: 32, sh: 32 },
} as const satisfies Record<string, SpriteRect>;

export const KNIGHT_RECT: SpriteRect = { sx: 0, sy: 32, sw: 32, sh: 32 };
export const GOBLIN_RECT: SpriteRect = { sx: 64, sy: 0, sw: 32, sh: 32 };

export interface GameAssets {
  readonly tiles: HTMLImageElement;
  readonly rogues: HTMLImageElement;
  readonly monsters: HTMLImageElement;
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

/** Espera a que las tres imágenes estén listas antes de renderizar. */
export async function loadAssets(): Promise<GameAssets> {
  const [tiles, rogues, monsters] = await Promise.all([
    loadImage(ASSET_URLS.tiles),
    loadImage(ASSET_URLS.rogues),
    loadImage(ASSET_URLS.monsters),
  ]);

  return { tiles, rogues, monsters };
}
