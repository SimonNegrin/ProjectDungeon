import { mountExperiment } from '../../_shell/experiment';
import type { ExperimentDefinition, ParameterValues, Variant } from '../../_shell/types';
import { ASSET_URLS, loadImage } from '../../../src/host/assets';
import {
  computeMetrics,
  createDungeon,
  type DungeonOptions,
  type DungeonState,
  type VariantId,
} from './dungeon';
import { renderDungeon } from './render';
import './experiment.css';

let tiles: HTMLImageElement | null = null;

function optionsFromParams(params: ParameterValues): DungeonOptions {
  return {
    width: 32,
    height: 32,
    roomTarget: Number(params.roomTarget),
    roomMin: Number(params.roomMin),
    roomMax: Number(params.roomMax),
    loopRatio: Number(params.loopRatio),
  };
}

type VariantDefinition = {
  id: string;
  variant: VariantId;
  label: string;
  description: string;
};

const variantDefinitions: VariantDefinition[] = [
  {
    id: 'bsp',
    variant: 'bsp',
    label: 'A · BSP',
    description: 'Partición recursiva; salas en hojas y pasillos L/Z entre hermanos.',
  },
  {
    id: 'random',
    variant: 'random',
    label: 'B · Salas + pasillos',
    description: 'Salas sin solape, árbol de expansión y pasillos L/Z con bucles extra.',
  },
  {
    id: 'hybrid',
    variant: 'hybrid',
    label: 'C · Híbrido',
    description: 'Salas + árbol + relleno laberíntico determinista en el espacio libre.',
  },
];

function createVariant(definition: VariantDefinition): Variant {
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    create: (context) => {
      const started = performance.now();
      const state = createDungeon(definition.variant, context.seed, optionsFromParams(context.params));
      const generationMs = performance.now() - started;
      return { ...state, generationMs };
    },
    render: (state, context) => renderDungeon(state as DungeonState, context, tiles),
    metrics: (state) => computeMetrics(state as DungeonState),
  };
}

const definition: ExperimentDefinition = {
  id: 'EXP-001',
  title: 'Comparador de generadores de mazmorra',
  question: '¿Qué generador produce la mazmorra legible, variada y con los pasillos y huecos de puerta que queremos?',
  description:
    'Tres generadores reciben la misma semilla y parámetros. Compara estructura, pasillos, huecos de puerta, apariciones y métricas antes de decidir.',
  parameters: [
    {
      id: 'roomTarget',
      label: 'Salas objetivo',
      type: 'range',
      min: 8,
      max: 12,
      step: 1,
      default: 10,
    },
    {
      id: 'roomMin',
      label: 'Sala mínima',
      type: 'range',
      min: 3,
      max: 6,
      step: 1,
      default: 3,
      unit: 'tiles',
    },
    {
      id: 'roomMax',
      label: 'Sala máxima',
      type: 'range',
      min: 8,
      max: 11,
      step: 1,
      default: 11,
      unit: 'tiles',
    },
    {
      id: 'loopRatio',
      label: 'Bucles extra',
      type: 'range',
      min: 0,
      max: 40,
      step: 5,
      default: 20,
      unit: '%',
    },
    {
      id: 'showDoors',
      label: 'Marcar huecos de puerta',
      type: 'toggle',
      default: true,
    },
  ],
  variants: variantDefinitions.map(createVariant),
  decisionOptions: [
    { value: 'variant-a', label: 'A · BSP' },
    { value: 'variant-b', label: 'B · Salas + pasillos' },
    { value: 'variant-c', label: 'C · Híbrido' },
    { value: 'none', label: 'Ninguna / seguir probando' },
  ],
  stageSize: { width: 512, height: 512 },
};

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');

loadImage(ASSET_URLS.tiles)
  .then((image) => {
    tiles = image;
    mountExperiment(definition, root);
  })
  .catch((error: unknown) => {
    console.error('No se pudo cargar tiles.png; se usa un fallback de color.', error);
    mountExperiment(definition, root);
  });
