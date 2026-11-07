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
