import { mountExperiment } from '../../_shell/experiment';
import type {
  ExperimentDefinition,
  RenderContext,
  Variant,
  VariantContext,
} from '../../_shell/types';

type DemoState = {
  cols: number;
  rows: number;
  cells: boolean[];
  palette: string;
  checksum: number;
};

const palettes = {
  embers: { cell: '#e8b86d', glow: 'rgba(232, 184, 109, 0.18)' },
  moss: { cell: '#9fd3a8', glow: 'rgba(159, 211, 168, 0.16)' },
  ice: { cell: '#7fb3d5', glow: 'rgba(127, 179, 213, 0.18)' },
} as const;

function createState(context: VariantContext, mirrored: boolean): DemoState {
  const cols = Number(context.params.gridSize);
  const rows = cols;
  const density = Number(context.params.density) / 100;
  const palette = String(context.params.palette);
  const cells = new Array<boolean>(cols * rows).fill(false);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sourceCol = mirrored ? Math.min(col, cols - 1 - col) : col;
      const index = row * cols + sourceCol;
      if (cells[index] === undefined) {
        cells[index] = false;
      }
      if (col === sourceCol || !mirrored) {
        cells[index] = context.rng() < density;
      }
      if (mirrored) {
        cells[row * cols + (cols - 1 - sourceCol)] = cells[index];
      }
    }
  }

  const checksum = cells.reduce(
    (sum, cell, index) => (cell ? (sum + Math.imul(index + 1, 31)) >>> 0 : sum),
    0,
  );

  return { cols, rows, cells, palette, checksum };
}

function renderState(state: DemoState, context: RenderContext): void {
  const { ctx, width, height, params } = context;
  const padding = 22;
  const cellSize = Math.max(
    4,
    Math.floor(Math.min((width - padding * 2) / state.cols, (height - padding * 2) / state.rows)),
  );
  const boardWidth = cellSize * state.cols;
  const boardHeight = cellSize * state.rows;
  const offsetX = Math.floor((width - boardWidth) / 2);
  const offsetY = Math.floor((height - boardHeight) / 2);
  const palette = palettes[state.palette as keyof typeof palettes] ?? palettes.embers;
  const showGrid = Boolean(params.showGrid);

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  ctx.fillStyle = palette.glow;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      if (!state.cells[row * state.cols + col]) continue;
      const inset = Math.max(1, Math.floor(cellSize * 0.12));
      ctx.fillStyle = palette.cell;
      ctx.fillRect(
        col * cellSize + inset,
        row * cellSize + inset,
        cellSize - inset * 2,
        cellSize - inset * 2,
      );
    }
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(237, 242, 247, 0.12)';
    ctx.lineWidth = 1;
    for (let col = 0; col <= state.cols; col += 1) {
      ctx.beginPath();
      ctx.moveTo(col * cellSize + 0.5, 0);
      ctx.lineTo(col * cellSize + 0.5, boardHeight);
      ctx.stroke();
    }
    for (let row = 0; row <= state.rows; row += 1) {
      ctx.beginPath();
      ctx.moveTo(0, row * cellSize + 0.5);
      ctx.lineTo(boardWidth, row * cellSize + 0.5);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(237, 242, 247, 0.22)';
  ctx.strokeRect(0.5, 0.5, boardWidth - 1, boardHeight - 1);
  ctx.restore();

  ctx.fillStyle = 'rgba(237, 242, 247, 0.55)';
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`semilla ${context.seed}`, padding, height - 10);
}

function metricsFor(state: DemoState) {
  const filled = state.cells.filter(Boolean).length;
  return [
    { label: 'Celdas', value: state.cells.length },
    { label: 'Llenas', value: filled },
    { label: 'Checksum', value: state.checksum },
  ];
}

const randomVariant: Variant = {
  id: 'random',
  label: 'Aleatorio',
  description: 'Cada celda se decide con el RNG de la variante.',
  create: (context) => createState(context, false),
  render: (state, context) => renderState(state as DemoState, context),
  metrics: (state) => metricsFor(state as DemoState),
};

const mirrorVariant: Variant = {
  id: 'mirror',
  label: 'Espejo',
  description: 'Genera media rejilla y la refleja; útil para comparar A/B.',
  create: (context) => createState(context, true),
  render: (state, context) => renderState(state as DemoState, context),
  metrics: (state) => metricsFor(state as DemoState),
};

const definition: ExperimentDefinition = {
  id: 'EXP-000',
  title: 'Shell de experimentos',
  question: '¿El shell permite ajustar parámetros, comparar variantes y exportar una decisión?',
  description:
    'Este experimento no decide nada de juego. Es una prueba de humo del shell: controles, semilla, A/B, métricas y decisión.',
  parameters: [
    {
      id: 'gridSize',
      label: 'Tamaño de rejilla',
      type: 'range',
      min: 4,
      max: 16,
      default: 8,
    },
    {
      id: 'density',
      label: 'Densidad',
      type: 'range',
      min: 0,
      max: 100,
      step: 5,
      default: 40,
      unit: '%',
    },
    {
      id: 'palette',
      label: 'Paleta',
      type: 'select',
      options: [
        { value: 'embers', label: 'Brasas' },
        { value: 'moss', label: 'Musgo' },
        { value: 'ice', label: 'Hielo' },
      ],
      default: 'embers',
    },
    {
      id: 'showGrid',
      label: 'Mostrar rejilla',
      type: 'toggle',
      default: true,
    },
  ],
  variants: [randomVariant, mirrorVariant],
  decisionOptions: [
    { value: 'random', label: 'Aleatorio' },
    { value: 'mirror', label: 'Espejo' },
    { value: 'none', label: 'Ninguna / seguir probando' },
  ],
  stageSize: { width: 520, height: 360 },
};

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');
mountExperiment(definition, root);
