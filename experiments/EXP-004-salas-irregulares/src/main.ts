import { ASSET_URLS } from '../../../src/host/assets';
import { mountExperiment } from '../../_shell/experiment';
import type {
  ExperimentDefinition,
  ExperimentTestApi,
  ParameterValues,
  Variant,
} from '../../_shell/types';
import { fingerprint, generateMap } from './generate';
import { computeMetrics } from './metrics';
import { renderExperiment } from './render';
import type { GeneratedMap, VariantId } from './types';
import './experiment.css';

interface ExperimentState {
  readonly map: GeneratedMap;
  readonly generationMs: number;
}

const assets: { tiles: HTMLImageElement | null; monsters: HTMLImageElement | null } = {
  tiles: null,
  monsters: null,
};
const states = new Map<VariantId, ExperimentState>();

function optionsFromParams(params: ParameterValues) {
  return {
    mapWidth: Number(params.mapWidth),
    mapHeight: Number(params.mapHeight),
    roomCount: Number(params.roomCount),
    roomMin: Number(params.roomMin),
    roomMax: Number(params.roomMax),
    corridorMaxLength: Number(params.corridorMaxLength),
    wideCorridorChance: Number(params.wideCorridorChance),
    wallThickness: Number(params.wallThickness),
    megaRoomChance: Number(params.megaRoomChance),
    spawnMinTiles: Number(params.spawnMinTiles),
  };
}

const variantDefinitions: Array<{
  id: VariantId;
  label: string;
  description: string;
}> = [
  {
    id: 'growth',
    label: 'A · crecimiento sobre roca',
    description: 'Mapa macizo, salas sembradas que crecen con máscaras irregulares y se conectan con puertas o pasos cortos.',
  },
  {
    id: 'bsp',
    label: 'B · BSP con máscaras',
    description: 'Partición BSP en 4-6 hojas; cada hoja se llena con una máscara irregular y 1-2 tiles de muro.',
  },
  {
    id: 'templates',
    label: 'C · plantillas empaquetadas',
    description: 'Biblioteca de formas L/T/con muescas, rotadas y espejadas, colocadas en un grafo empaquetado.',
  },
];

function createVariant(definition: (typeof variantDefinitions)[number]): Variant {
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    create: (context) => {
      const started = performance.now();
      const map = generateMap(definition.id, context.seed, optionsFromParams(context.params));
      const generationMs = performance.now() - started;
      const state: ExperimentState = { map, generationMs };
      states.set(definition.id, state);
      return state;
    },
    render: (state, context) => {
      const current = state as ExperimentState;
      renderExperiment(current.map, context, assets);
    },
    metrics: (state) => {
      const current = state as ExperimentState;
      return computeMetrics(current.map, current.generationMs);
    },
  };
}

const definition: ExperimentDefinition = {
  id: 'EXP-004',
  title: 'Comparador de salas irregulares',
  question:
    '¿Qué algoritmo y qué parámetros producen salas caprichosas, pegadas y con pasillos cortos, manteniendo la mazmorra legible y jugable?',
  description:
    'A/B/C reciben la misma semilla y parámetros. Compara siluetas, paredes compartidas, puertas, spawn protegido y reparto de enemigos con el tileset real.',
  parameters: [
    { id: 'mapWidth', label: 'Ancho', type: 'range', min: 14, max: 32, step: 1, default: 22, unit: 'tiles' },
    { id: 'mapHeight', label: 'Alto', type: 'range', min: 12, max: 28, step: 1, default: 18, unit: 'tiles' },
    { id: 'roomCount', label: 'Salas', type: 'range', min: 4, max: 6, step: 1, default: 5 },
    { id: 'roomMin', label: 'Sala mínima', type: 'range', min: 2, max: 6, step: 1, default: 3, unit: 'tiles' },
    { id: 'roomMax', label: 'Sala máxima', type: 'range', min: 6, max: 12, step: 1, default: 9, unit: 'tiles' },
    { id: 'corridorMaxLength', label: 'Pasillo máximo', type: 'range', min: 0, max: 3, step: 1, default: 3, unit: 'tiles' },
    { id: 'wideCorridorChance', label: 'Pasillo ancho', type: 'range', min: 0, max: 100, step: 1, default: 33, unit: '%' },
    { id: 'wallThickness', label: 'Grosor de muro', type: 'range', min: 1, max: 2, step: 1, default: 1, unit: 'tiles' },
    { id: 'megaRoomChance', label: 'Caverna', type: 'range', min: 0, max: 100, step: 1, default: 17, unit: '%' },
    { id: 'spawnMinTiles', label: 'Huecos de spawn', type: 'range', min: 4, max: 10, step: 1, default: 6 },
    {
      id: 'variant',
      label: 'Variante de la vista 13×13',
      type: 'select',
      options: variantDefinitions.map((variant) => ({ value: variant.id, label: variant.label })),
      default: 'growth',
    },
    { id: 'showDebug', label: 'Capa de debug', type: 'toggle', default: false },
    { id: 'showDoors', label: 'Puertas decorativas', type: 'toggle', default: true },
    { id: 'showSpawn', label: 'Spawn y huecos', type: 'toggle', default: true },
    { id: 'showEnemies', label: 'Enemigos', type: 'toggle', default: true },
  ],
  variants: variantDefinitions.map(createVariant),
  decisionOptions: [
    { value: 'growth', label: 'A · crecimiento sobre roca' },
    { value: 'bsp', label: 'B · BSP con máscaras' },
    { value: 'templates', label: 'C · plantillas empaquetadas' },
    { value: 'none', label: 'Ninguna / seguir probando' },
  ],
  stageSize: { width: 520, height: 600 },
};

type MapSnapshot = {
  variant: VariantId;
  seed: number;
  stats: GeneratedMap['stats'] | null;
  fingerprint: string | null;
  warnings: readonly string[];
  metrics: ReturnType<typeof computeMetrics>;
};

type ExtendedTestApi = ExperimentTestApi & {
  getMaps: () => MapSnapshot[];
  getExportData: () => Record<string, unknown>;
};

function mapSnapshots(): MapSnapshot[] {
  return variantDefinitions.map((variant) => {
    const state = states.get(variant.id);
    return {
      variant: variant.id,
      seed: state?.map.seed ?? 0,
      stats: state?.map.stats ?? null,
      fingerprint: state ? fingerprint(state.map) : null,
      warnings: state?.map.warnings ?? [],
      metrics: state ? computeMetrics(state.map, state.generationMs) : [],
    };
  });
}

function exportData(api: ExperimentTestApi): Record<string, unknown> {
  const snapshot = api.snapshot();
  return {
    experiment: definition.id,
    question: definition.question,
    seed: snapshot.seed,
    variant: String(snapshot.params.variant ?? 'growth'),
    parameters: snapshot.params,
    variants: mapSnapshots(),
    decidedAt: new Date().toISOString(),
  };
}

function downloadJson(payload: Record<string, unknown>): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'EXP-004-data.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function extendPage(api: ExperimentTestApi): void {
  const extended = api as ExtendedTestApi;
  extended.getMaps = mapSnapshots;
  extended.getExportData = () => exportData(api);

  const originalDecision = api.getDecision.bind(api);
  api.getDecision = () => {
    const base = originalDecision();
    const snapshot = api.snapshot();
    return {
      ...base,
      variant: String(snapshot.params.variant ?? 'growth'),
      maps: mapSnapshots(),
    };
  };

  const actions = document.querySelector<HTMLElement>('.decision-actions');
  if (actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button ghost';
    button.dataset.testid = 'export-data';
    button.textContent = 'Exportar datos + métricas';
    button.addEventListener('click', () => {
      downloadJson(exportData(api));
      const status = document.querySelector<HTMLElement>('[data-testid="decision-status"]');
      if (status) status.textContent = 'Datos y métricas exportados.';
    });
    actions.append(button);
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
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

async function loadAssets(): Promise<void> {
  const [tiles, monsters] = await Promise.allSettled([
    loadImage(ASSET_URLS.tiles),
    loadImage(ASSET_URLS.monsters),
  ]);
  if (tiles.status === 'fulfilled') assets.tiles = tiles.value;
  else console.error('No se pudo cargar tiles.png; se usa un fallback de color.', tiles.reason);
  if (monsters.status === 'fulfilled') assets.monsters = monsters.value;
  else console.error('No se pudo cargar monsters.png; se usan fichas etiquetadas.', monsters.reason);
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');

loadAssets()
  .catch((error: unknown) => {
    console.error('No se pudieron cargar los assets del experimento.', error);
  })
  .finally(() => {
    const api = mountExperiment(definition, root);
    extendPage(api);
  });
