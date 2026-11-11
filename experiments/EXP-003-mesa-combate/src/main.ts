import '../../_shell/styles.css';
import './experiment.css';
import { copyJson } from '../../_shell/export';
import type { ExperimentTestApi } from '../../_shell/types';
import {
  COMBAT_COLUMNS,
  ENEMY_NUMERIC_LIMITS,
  ENEMY_TABLE_FIELDS,
  HERO_COLUMNS,
  HERO_NUMERIC_LIMITS,
  HERO_TABLE_FIELDS,
  WEAPON_COLUMNS,
  WEAPON_LIMITS,
  benchFileName,
  enemyFieldPatch,
  enemyFieldValue,
  formatBenchSummary,
  formatDelta,
  formatFourOfFour,
  formatRealCell,
  formatRecalcStatus,
  formatTarget,
  formatWeaponBonus,
  formatWeaponUsers,
  formatWins,
  groupMatchupsByEnemy,
  heroFieldPatch,
  heroFieldValue,
  pruneOverrides,
  resetEnemyFieldOverride,
  resetHeroFieldOverride,
  resetWeaponFieldOverride,
  validateEnemyField,
  validateHeroField,
  validateTargetInput,
  validateWeaponField,
  weaponRows,
} from './bench-ui';
import type { EnemyField, HeroField, WeaponField } from './bench-ui';
import {
  DEFAULT_DUELS,
  DEFAULT_SEED,
  ENEMY_ORDER,
  HERO_ORDER,
  measureMatchups,
} from './v2/measure';
import type { MatchupResult, MeasurementPayload } from './v2/measure';
import {
  GUIDE_TARGETS,
  MARGIN_PP,
  affectedRows,
  benchExportJson,
  buildBenchExport,
  createTargets,
  createWorkingCatalog,
  diagnoseBench,
  emptyOverrides,
  overridesId,
  recalculateMatchups,
  resetEnemies as resetEnemyOverrides,
  resetEnemyOverride,
  resetHeroes as resetHeroOverrides,
  resetHeroOverride,
  resetOverrides as resetAllOverrides,
  resetTarget,
  resetTargets,
  resetWeaponOverride,
  resetWeapons as resetWeaponOverrides,
  rowKey,
  setTarget as setBenchTarget,
  withEnemyOverride,
  withHeroOverride,
  withWeaponOverride,
} from './v2/bench';
import type {
  BenchExport,
  BenchOverrides,
  BenchSelection,
  BenchTargets,
  EnemyDiagnosis,
} from './v2/bench';
import { CATALOG, findTemplate } from './v2/catalog';
import {
  DUEL_LIMITS,
  EXPERIMENT_DESCRIPTION,
  EXPERIMENT_ID,
  EXPERIMENT_QUESTION,
  EXPERIMENT_TITLE,
  SEED_LIMITS,
  buildSnapshot,
  durationRows,
  findingSummary,
  formatBand,
  formatFindingRange,
  formatNumber,
  formatPercent,
  matchupTitle,
  normalizeDuels,
  normalizeSeed,
  replicaTotals,
  spellRows,
  unitName,
  type BenchSnapshot,
  type V2ExperimentApi,
} from './ui';

type ElementOptions = {
  className?: string;
  text?: string;
  testId?: string;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.testId) node.dataset.testid = options.testId;
  return node;
}

function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}

function buildHead(labels: ReadonlyArray<string>): HTMLTableSectionElement {
  const head = element('thead');
  const row = element('tr');
  for (const label of labels) {
    const cell = element('th', { text: label });
    cell.scope = 'col';
    row.append(cell);
  }
  head.append(row);
  return head;
}

function buildColgroup(widths: ReadonlyArray<string>): HTMLTableColElement[] {
  return widths.map((width) => {
    const col = document.createElement('col');
    col.style.width = width;
    return col;
  });
}

function createNumberInput(
  value: number | string | null,
  limits: { readonly min: number; readonly max: number },
  testId: string,
): HTMLInputElement {
  const input = element('input', { className: 'cell-input', testId });
  input.type = 'number';
  input.step = '1';
  input.min = String(limits.min);
  input.max = String(limits.max);
  input.value = value === null ? '' : String(value);
  return input;
}

function createSelect(
  value: string | null,
  emptyLabel: string,
  options: Readonly<Record<string, { readonly id: string; readonly name: string }>>,
  testId: string,
): HTMLSelectElement {
  const select = element('select', { className: 'cell-input', testId });
  const emptyOption = element('option', { text: emptyLabel });
  emptyOption.value = '';
  select.append(emptyOption);
  for (const option of Object.values(options)) {
    const node = element('option', { text: option.name });
    node.value = option.id;
    select.append(node);
  }
  select.value = value ?? '';
  return select;
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');

const query = new URLSearchParams(window.location.search);
const testMode = query.has('test');
const querySeed = query.get('seed');
const queryDuels = query.get('duels');

let seed =
  querySeed === null
    ? testMode
      ? DEFAULT_SEED
      : randomSeed()
    : normalizeSeed(querySeed);
let duels = queryDuels === null ? DEFAULT_DUELS : normalizeDuels(queryDuels);

let overrides: BenchOverrides = emptyOverrides();
let targets: BenchTargets = createTargets();
let workingCatalog = createWorkingCatalog(CATALOG, overrides);
let results: MeasurementPayload = measureMatchups({
  seed,
  duels,
  catalog: workingCatalog,
});
let diagnosis: ReadonlyArray<EnemyDiagnosis> = diagnoseBench(
  results.matchups,
  targets,
  workingCatalog,
);
let selected = {
  heroId: HERO_ORDER[0] as string,
  enemyId: ENEMY_ORDER[0] as string,
};
let pendingSelections: BenchSelection[] = [];
let recalcTimer: ReturnType<typeof setTimeout> | null = null;

const RECALC_DELAY_MS = 280;

document.title = `${EXPERIMENT_TITLE} · ProyectDungeon`;
root.classList.add('experiment-shell');
root.replaceChildren();

const header = element('header', { className: 'experiment-header' });
header.append(
  element('span', {
    className: 'eyebrow',
    text: `${EXPERIMENT_ID} · v2.0`,
    testId: 'experiment-id',
  }),
  element('h1', { text: EXPERIMENT_TITLE, testId: 'experiment-title' }),
  element('p', {
    className: 'question',
    text: EXPERIMENT_QUESTION,
    testId: 'experiment-question',
  }),
  element('p', { className: 'description', text: EXPERIMENT_DESCRIPTION }),
);
if (testMode) {
  header.append(
    element('span', { className: 'test-badge', text: 'modo test determinista' }),
  );
}
const balanceWarning = element('p', {
  className: 'balance-warning',
  testId: 'balance-warning',
});
header.append(balanceWarning);

const toolbar = element('div', { className: 'toolbar' });
const seedLabel = element('label', { className: 'seed-label' });
seedLabel.append(element('span', { text: 'Semilla' }));
const seedInput = element('input', { testId: 'seed-input' });
seedInput.type = 'number';
seedInput.min = String(SEED_LIMITS.min);
seedInput.max = String(SEED_LIMITS.max);
seedInput.step = '1';
seedLabel.append(seedInput);

const duelLabel = element('label', { className: 'seed-label' });
duelLabel.append(element('span', { text: 'Duelos por emparejamiento' }));
const duelInput = element('input', { testId: 'duel-count' });
duelInput.type = 'number';
duelInput.min = String(DUEL_LIMITS.min);
duelInput.max = String(DUEL_LIMITS.max);
duelInput.step = String(DUEL_LIMITS.step);
duelLabel.append(duelInput);

const runButton = element('button', {
  className: 'button',
  text: 'Ejecutar medición',
  testId: 'run-button',
});
runButton.type = 'button';

const resetButton = element('button', {
  className: 'button ghost',
  text: `Restablecer ${DEFAULT_SEED} · ${DEFAULT_DUELS}`,
  testId: 'controls-reset',
});
resetButton.type = 'button';

const resetAllButton = element('button', {
  className: 'button ghost',
  text: 'Restablecer todo',
  testId: 'bench-reset-all',
});
resetAllButton.type = 'button';

const controlsStatus = element('p', {
  className: 'status controls-status',
  testId: 'controls-status',
});
controlsStatus.setAttribute('aria-live', 'polite');

toolbar.append(
  seedLabel,
  duelLabel,
  runButton,
  resetButton,
  resetAllButton,
  controlsStatus,
);

/* Tabla 1 · Combates: 15 columnas con el bloque del enemigo agrupado. */

const combatsPanel = element('section', {
  className: 'panel combats-panel',
  testId: 'combats-panel',
});
combatsPanel.append(
  element('h2', { text: 'Combates' }),
  element('p', {
    className: 'panel-hint',
    text: 'Doce emparejamientos agrupados por enemigo. El enemigo, el objetivo y sus nueve stats son un bloque compartido: un solo input afecta a sus cuatro héroes. Al enfocar un stat se resaltan sus cuatro filas; el foco se conserva tras el recálculo.',
  }),
);
const combatsToolbar = element('div', { className: 'panel-toolbar' });
const benchStatus = element('p', {
  className: 'status bench-status',
  testId: 'bench-status',
});
benchStatus.setAttribute('aria-live', 'polite');
benchStatus.setAttribute('role', 'status');
const resetEnemiesButton = element('button', {
  className: 'button ghost',
  text: 'Restablecer enemigos',
  testId: 'bench-reset-enemies',
});
resetEnemiesButton.type = 'button';
combatsToolbar.append(benchStatus, resetEnemiesButton);
combatsPanel.append(combatsToolbar);

const combatsScroll = element('div', { className: 'table-scroll' });
const combatsTable = element('table', {
  className: 'combats-table',
  testId: 'combats-table',
});
combatsTable.append(
  ...buildColgroup([
    '8%',
    '8%',
    '6%',
    '6%',
    '6%',
    '10%',
    '5%',
    '5.5%',
    '5%',
    '5%',
    '5%',
    '5%',
    '9%',
    '8%',
    '8.5%',
  ]),
  buildHead(COMBAT_COLUMNS),
);
const combatsBody = element('tbody', { testId: 'combats-rows' });
combatsTable.append(combatsBody);
combatsScroll.append(combatsTable);
combatsPanel.append(combatsScroll);

/* Tabla 2 · Armas: nombre con sus unidades, acierto y daño. */

const weaponsPanel = element('section', {
  className: 'panel weapons-panel',
  testId: 'weapons-panel',
});
weaponsPanel.append(
  element('h2', { text: 'Armas' }),
  element('p', {
    className: 'panel-hint',
    text: 'Acierto y daño se aplican a todas las unidades que equipan el arma. Bajo cada nombre aparecen las unidades que la usan en el catálogo ajustado; un arma compartida mueve a héroes y enemigos.',
  }),
);
const weaponsToolbar = element('div', { className: 'panel-toolbar' });
const weaponStatus = element('p', {
  className: 'status',
  testId: 'weapons-status',
});
weaponStatus.setAttribute('aria-live', 'polite');
const resetWeaponsButton = element('button', {
  className: 'button ghost',
  text: 'Restablecer armas',
  testId: 'bench-reset-weapons',
});
resetWeaponsButton.type = 'button';
weaponsToolbar.append(weaponStatus, resetWeaponsButton);
weaponsPanel.append(weaponsToolbar);

const weaponsScroll = element('div', { className: 'table-scroll' });
const weaponsTable = element('table', {
  className: 'weapon-table',
  testId: 'weapons-table',
});
weaponsTable.append(buildHead(WEAPON_COLUMNS));
const weaponsBody = element('tbody', { testId: 'weapon-rows' });
weaponsTable.append(weaponsBody);
weaponsScroll.append(weaponsTable);
weaponsPanel.append(weaponsScroll);

/* Tabla 3 · Héroes: set completo y arma inicial con «sin arma». */

const heroesPanel = element('section', {
  className: 'panel heroes-panel',
  testId: 'heroes-panel',
});
heroesPanel.append(
  element('h2', { text: 'Héroes' }),
  element('p', {
    className: 'panel-hint',
    text: 'Acierto y daño son la habilidad y la fuerza propias del héroe; el arma suma aparte. Editar un stat recalcula sus tres filas. Armadura, escudo y arma inicial incluyen la opción vacía.',
  }),
);
const heroesToolbar = element('div', { className: 'panel-toolbar' });
const heroStatus = element('p', {
  className: 'status',
  testId: 'heroes-status',
});
heroStatus.setAttribute('aria-live', 'polite');
const resetHeroesButton = element('button', {
  className: 'button ghost',
  text: 'Restablecer héroes',
  testId: 'bench-reset-heroes',
});
resetHeroesButton.type = 'button';
heroesToolbar.append(heroStatus, resetHeroesButton);
heroesPanel.append(heroesToolbar);

const heroesScroll = element('div', { className: 'table-scroll' });
const heroesTable = element('table', {
  className: 'heroes-table',
  testId: 'heroes-table',
});
heroesTable.append(buildHead(HERO_COLUMNS));
const heroesBody = element('tbody', { testId: 'hero-rows' });
heroesTable.append(heroesBody);
heroesScroll.append(heroesTable);
heroesPanel.append(heroesScroll);

const detailPanel = element('section', {
  className: 'panel detail-panel',
  testId: 'matchup-detail-panel',
});
detailPanel.append(
  element('h2', { text: 'Detalle del emparejamiento' }),
  element('p', {
    className: 'panel-hint',
    text: 'Selecciona una fila de combates. Conserva acciones, hechizos, maná, PV, réplicas y duración, y añade banda, TTK, turnos/rondas y daño.',
  }),
);
const detailHost = element('div', {
  className: 'detail-grid',
  testId: 'matchup-detail',
});
detailPanel.append(detailHost);

const exportPanel = element('section', {
  className: 'panel export-panel',
  testId: 'export-panel',
});
exportPanel.append(
  element('h2', { text: 'Export reproducible' }),
  element('p', {
    className: 'panel-hint',
    text: 'Incluye catálogo ajustado, objetivos, overrides identificados por contenido y diagnóstico. Sin marca de tiempo: el mismo estado produce el mismo JSON. Sin overrides conserva el nombre base; con overrides usa bench-overrides-<id>.',
  }),
);
const exportSummary = element('pre', {
  className: 'export-summary',
  testId: 'export-summary',
});
const exportActions = element('div', { className: 'decision-actions' });
const copyButton = element('button', {
  className: 'button ghost',
  text: 'Copiar JSON',
  testId: 'export-copy',
});
copyButton.type = 'button';
const downloadButton = element('button', {
  className: 'button',
  text: 'Descargar JSON',
  testId: 'export-download',
});
downloadButton.type = 'button';
exportActions.append(copyButton, downloadButton);
const exportStatus = element('p', {
  className: 'status',
  testId: 'export-status',
});
exportStatus.setAttribute('aria-live', 'polite');
exportPanel.append(exportSummary, exportActions, exportStatus);

root.append(
  header,
  toolbar,
  combatsPanel,
  weaponsPanel,
  heroesPanel,
  detailPanel,
  exportPanel,
);

interface FieldRefs {
  readonly input: HTMLInputElement | HTMLSelectElement;
  readonly error: HTMLElement;
  readonly hint?: HTMLElement;
}

interface CombatRowRefs {
  readonly key: string;
  readonly row: HTMLTableRowElement;
  readonly winsHero: HTMLElement;
  readonly winsEnemy: HTMLElement;
  readonly real: HTMLElement;
}

interface CombatBlockRefs {
  readonly enemyId: string;
  readonly four: HTMLElement;
  readonly problems: HTMLElement;
  targetInput: HTMLInputElement;
  targetError: HTMLElement;
  readonly fields: Map<EnemyField, FieldRefs>;
  readonly rows: CombatRowRefs[];
}

interface WeaponRowRefs {
  readonly accuracy: HTMLInputElement;
  readonly damage: HTMLInputElement;
  readonly accuracyError: HTMLElement;
  readonly damageError: HTMLElement;
  readonly users: HTMLElement;
}

interface HeroRowRefs {
  readonly fields: Map<HeroField, FieldRefs>;
  readonly weaponHint: HTMLElement;
}

const combatBlocks = new Map<string, CombatBlockRefs>();
const combatRows = new Map<string, CombatRowRefs>();
const weaponRefs = new Map<string, WeaponRowRefs>();
const heroRefs = new Map<string, HeroRowRefs>();

function selectedMatchup(): MatchupResult {
  const found = results.matchups.find(
    (matchup) =>
      matchup.heroId === selected.heroId && matchup.enemyId === selected.enemyId,
  );
  return found ?? results.matchups[0];
}

function setStatus(target: HTMLElement, message: string): void {
  target.textContent = message;
}

function syncControls(): void {
  seedInput.value = String(seed);
  duelInput.value = String(duels);
}

function renderBalanceWarning(): void {
  const finding = findingSummary(results.matchups);
  balanceWarning.textContent =
    `Hallazgo con semilla ${results.seed} y ${results.duels} duelos por emparejamiento: ` +
    `${formatFindingRange(finding.min, finding.max)} de victorias del héroe; ` +
    `${finding.outside} de ${finding.total} emparejamientos fuera de la banda 40–60 % (±2 pp). ` +
    'Los valores de balance están pendientes de aprobación del usuario.';
}

function displayEnemyField(enemyId: string, field: EnemyField): string {
  const template = findTemplate(workingCatalog, enemyId);
  if (!template) return '';
  const value = enemyFieldValue(template, field);
  return value === null ? '' : String(value);
}

function showFieldError(refs: FieldRefs, message: string): void {
  refs.input.setAttribute('aria-invalid', 'true');
  refs.error.textContent = message;
}

function clearFieldError(refs: FieldRefs): void {
  refs.input.removeAttribute('aria-invalid');
  refs.error.textContent = '';
}

function setBlockActive(enemyId: string, active: boolean): void {
  const block = combatBlocks.get(enemyId);
  if (!block) return;
  for (const refs of block.rows) {
    refs.row.classList.toggle('is-block-active', active);
  }
}

function selectionKey(selection: BenchSelection): string {
  if (selection.kind === 'enemy') return `enemy:${selection.enemyId}`;
  if (selection.kind === 'weapon') return `weapon:${selection.weaponId}`;
  return `hero:${selection.heroId}`;
}

function scheduleRecalc(selection: BenchSelection): void {
  const key = selectionKey(selection);
  if (!pendingSelections.some((entry) => selectionKey(entry) === key)) {
    pendingSelections.push(selection);
  }
  benchStatus.textContent = 'Recalculando filas afectadas…';
  if (recalcTimer !== null) clearTimeout(recalcTimer);
  recalcTimer = setTimeout(() => {
    recalcTimer = null;
    const count = flushRecalculation();
    benchStatus.textContent = formatRecalcStatus(count);
  }, RECALC_DELAY_MS);
}

function flushRecalculation(): number {
  const selections = pendingSelections;
  pendingSelections = [];
  if (selections.length === 0) return 0;

  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  const affected = new Set<string>();
  for (const selection of selections) {
    for (const row of affectedRows(workingCatalog, selection)) {
      affected.add(rowKey(row));
    }
    results = recalculateMatchups(results, workingCatalog, selection);
  }
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncDerived();
  return affected.size;
}

let flushingPending = false;

/**
 * Fuerza el recálculo pendiente antes de exportar o leer estado. No se llama
 * desde `currentExport()` para evitar la recursión de `renderExport()` durante
 * `syncDerived()`.
 */
function ensureRecalculated(): void {
  if (flushingPending) return;
  if (recalcTimer === null && pendingSelections.length === 0) return;
  if (recalcTimer !== null) {
    clearTimeout(recalcTimer);
    recalcTimer = null;
  }
  flushingPending = true;
  try {
    const count = flushRecalculation();
    benchStatus.textContent = formatRecalcStatus(count);
  } finally {
    flushingPending = false;
  }
}

function recalculateNow(selection?: BenchSelection): MeasurementPayload {
  if (recalcTimer !== null) {
    clearTimeout(recalcTimer);
    recalcTimer = null;
  }
  pendingSelections = [];
  workingCatalog = createWorkingCatalog(CATALOG, overrides);

  if (selection) {
    results = recalculateMatchups(results, workingCatalog, selection);
    const affected = affectedRows(workingCatalog, selection).length;
    diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
    syncDerived();
    benchStatus.textContent = formatRecalcStatus(affected);
    return results;
  }

  results = measureMatchups({ seed, duels, catalog: workingCatalog });
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncDerived();
  benchStatus.textContent = formatRecalcStatus(results.matchups.length);
  return results;
}

function recomputeAll(message?: string): void {
  if (recalcTimer !== null) {
    clearTimeout(recalcTimer);
    recalcTimer = null;
  }
  pendingSelections = [];
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  results = measureMatchups({ seed, duels, catalog: workingCatalog });
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  renderAll();
  if (message) setStatus(controlsStatus, message);
}

function setOverrides(next: BenchOverrides): void {
  overrides = pruneOverrides(CATALOG, next);
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
}

function applyEnemyField(
  enemyId: string,
  field: EnemyField,
  value: number | string | null,
): void {
  if (!findTemplate(CATALOG, enemyId)) return;
  setOverrides(withEnemyOverride(overrides, enemyId, enemyFieldPatch(field, value)));
  if (field === 'weaponId') syncCombatWeaponHints();
  scheduleRecalc({ kind: 'enemy', enemyId });
}

function applyWeaponField(
  weaponId: string,
  field: WeaponField,
  value: number,
): void {
  if (!workingCatalog.weapons[weaponId]) return;
  const patch = field === 'accuracy' ? { accuracy: value } : { damage: value };
  setOverrides(withWeaponOverride(overrides, weaponId, patch));
  syncCombatWeaponHints();
  scheduleRecalc({ kind: 'weapon', weaponId });
}

function applyHeroField(
  heroId: string,
  field: HeroField,
  value: number | string | null,
): void {
  if (!CATALOG.roster.some((hero) => hero.id === heroId)) return;
  setOverrides(withHeroOverride(overrides, heroId, heroFieldPatch(field, value)));
  scheduleRecalc({ kind: 'hero', heroId });
}

function refreshDiagnosisOnly(): void {
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncCombats();
  renderDetail();
  renderExport();
}

function selectRow(heroId: string, enemyId: string): void {
  selected = { heroId, enemyId };
  const selectedKey = rowKey(selected);
  for (const [key, refs] of combatRows) {
    const isSelected = key === selectedKey;
    refs.row.classList.toggle('is-selected', isSelected);
    refs.row.setAttribute('aria-selected', String(isSelected));
  }
  renderDetail();
  setStatus(
    controlsStatus,
    `Detalle: ${matchupTitle(workingCatalog, selectedMatchup())}.`,
  );
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'OPTION' ||
    target.tagName === 'BUTTON'
  );
}

/* Construcción de la tabla de combates. */

function buildTargetCell(enemyId: string): HTMLTableCellElement {
  const cell = element('td', { className: 'shared-cell' });
  const input = element('input', {
    className: 'cell-input',
    testId: `combats-target-${enemyId}`,
  });
  input.type = 'number';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.value = String(targets[enemyId] ?? GUIDE_TARGETS[enemyId] ?? 0);
  input.title = `Guía ${formatTarget(GUIDE_TARGETS[enemyId] ?? targets[enemyId] ?? 0)}`;
  input.setAttribute(
    'aria-label',
    `Objetivo de ${unitName(workingCatalog, enemyId)} (compartido)`,
  );

  const error = element('p', {
    className: 'field-error cell-error',
    testId: `combats-target-error-${enemyId}`,
  });
  error.setAttribute('aria-live', 'polite');

  input.addEventListener('input', () => {
    const validation = validateTargetInput(input.value);
    if (!validation.ok) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = validation.message;
      return;
    }
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    targets = setBenchTarget(targets, enemyId, validation.value);
    refreshDiagnosisOnly();
    benchStatus.textContent =
      `Objetivo de ${unitName(workingCatalog, enemyId)}: diagnóstico actualizado; ` +
      '0 filas medidas de nuevo.';
  });
  input.addEventListener('blur', () => {
    input.value = String(targets[enemyId] ?? 0);
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  });

  cell.append(input, error);
  return cell;
}

function buildSharedFieldCell(
  enemyId: string,
  field: EnemyField,
  label: string,
): HTMLTableCellElement {
  const cell = element('td', {
    className: 'shared-cell',
    testId: `combats-cell-${enemyId}-${field}`,
  });
  const template = findTemplate(workingCatalog, enemyId);
  const isSelect =
    field === 'armorId' || field === 'shieldId' || field === 'weaponId';
  let input: HTMLInputElement | HTMLSelectElement;

  if (isSelect) {
    const emptyLabel =
      field === 'armorId'
        ? 'Sin armadura'
        : field === 'shieldId'
          ? 'Sin escudo'
          : 'Sin arma';
    const options =
      field === 'armorId'
        ? CATALOG.armors
        : field === 'shieldId'
          ? CATALOG.shields
          : CATALOG.weapons;
    const current = template ? enemyFieldValue(template, field) : null;
    input = createSelect(
      typeof current === 'string' ? current : null,
      emptyLabel,
      options,
      `combats-field-${enemyId}-${field}`,
    );
  } else {
    input = createNumberInput(
      template ? enemyFieldValue(template, field) : null,
      ENEMY_NUMERIC_LIMITS[field as keyof typeof ENEMY_NUMERIC_LIMITS],
      `combats-field-${enemyId}-${field}`,
    );
  }
  input.setAttribute(
    'aria-label',
    `${label} de ${template?.name ?? enemyId} (compartido)`,
  );

  const error = element('p', {
    className: 'field-error cell-error',
    testId: `combats-field-error-${enemyId}-${field}`,
  });
  error.setAttribute('aria-live', 'polite');
  const hint =
    field === 'weaponId'
      ? element('span', {
          className: 'weapon-hint',
          testId: `combats-weapon-hint-${enemyId}`,
        })
      : undefined;
  const refs: FieldRefs = { input, error, ...(hint ? { hint } : {}) };

  const onFieldChange = (): void => {
    const validation = validateEnemyField(field, input.value, CATALOG);
    if (!validation.ok) {
      showFieldError(refs, validation.message);
      return;
    }
    clearFieldError(refs);
    applyEnemyField(enemyId, field, validation.value);
  };
  input.addEventListener(isSelect ? 'change' : 'input', onFieldChange);
  input.addEventListener('focus', () => setBlockActive(enemyId, true));
  input.addEventListener('blur', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      input.value = displayEnemyField(enemyId, field);
    }
    clearFieldError(refs);
    setBlockActive(enemyId, false);
  });

  cell.append(input, ...(hint ? [hint] : []), error);
  const block = combatBlocks.get(enemyId);
  if (block) block.fields.set(field, refs);
  return cell;
}

function renderCombats(): void {
  combatsBody.replaceChildren();
  combatBlocks.clear();
  combatRows.clear();

  const blocks = groupMatchupsByEnemy(results.matchups, results.enemyOrder);
  for (const block of blocks) {
    const blockRefs: CombatBlockRefs = {
      enemyId: block.enemyId,
      four: element('span', {
        className: 'four-of-four',
        testId: `combats-four-${block.enemyId}`,
      }),
      problems: element('ul', {
        className: 'block-problems',
        testId: `combats-problems-${block.enemyId}`,
      }),
      targetInput: document.createElement('input'),
      targetError: element('p'),
      fields: new Map(),
      rows: [],
    };
    combatBlocks.set(block.enemyId, blockRefs);

    const enemyCell = element('td', {
      className: 'shared-cell enemy-cell',
    });
    enemyCell.append(
      element('strong', { text: unitName(workingCatalog, block.enemyId) }),
      blockRefs.four,
      blockRefs.problems,
    );

    const targetCell = buildTargetCell(block.enemyId);
    const targetInput = targetCell.querySelector<HTMLInputElement>('input');
    if (targetInput) blockRefs.targetInput = targetInput;
    const targetError = targetCell.querySelector<HTMLElement>('.field-error');
    if (targetError) blockRefs.targetError = targetError;

    const statCells = ENEMY_TABLE_FIELDS.map(({ field, label }) =>
      buildSharedFieldCell(block.enemyId, field, label),
    );

    block.rows.forEach((matchup, index) => {
      const key = rowKey(matchup);
      const row = element('tr', {
        testId: `combats-row-${matchup.heroId}-${matchup.enemyId}`,
      });
      row.tabIndex = 0;
      row.setAttribute('aria-selected', 'false');
      row.addEventListener('click', (event) => {
        if (isInteractive(event.target)) return;
        selectRow(matchup.heroId, matchup.enemyId);
      });
      row.addEventListener('keydown', (event) => {
        if (isInteractive(event.target)) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectRow(matchup.heroId, matchup.enemyId);
      });

      const heroCell = element('td', {
        className: 'hero-cell',
        text: unitName(workingCatalog, matchup.heroId),
      });
      const winsHero = element('td', {
        className: 'numeric-cell',
        testId: `combats-wins-hero-${matchup.heroId}-${matchup.enemyId}`,
      });
      const winsEnemy = element('td', {
        className: 'numeric-cell',
        testId: `combats-wins-enemy-${matchup.heroId}-${matchup.enemyId}`,
      });
      const real = element('td', {
        className: 'real-cell',
        testId: `combats-real-${matchup.heroId}-${matchup.enemyId}`,
      });

      row.append(heroCell);
      if (index === 0) {
        enemyCell.rowSpan = block.rows.length;
        targetCell.rowSpan = block.rows.length;
        for (const cell of statCells) cell.rowSpan = block.rows.length;
        row.append(enemyCell, winsHero, winsEnemy, targetCell, real, ...statCells);
      } else {
        row.append(winsHero, winsEnemy, real);
      }
      combatsBody.append(row);

      const rowRefs: CombatRowRefs = { key, row, winsHero, winsEnemy, real };
      blockRefs.rows.push(rowRefs);
      combatRows.set(key, rowRefs);
    });
  }

  syncCombats();
}

function renderBlockProblems(
  host: HTMLElement,
  entry: EnemyDiagnosis,
): void {
  const problems = entry.problems.filter(
    (problem) =>
      problem.kind === 'dispersion' || problem.kind === 'global-weapon',
  );
  host.replaceChildren(
    ...problems.map((problem) =>
      element('li', {
        className: `problem-${problem.kind}`,
        text: problem.message,
      }),
    ),
  );
}

function syncCombats(): void {
  const diagnosisByEnemy = new Map(
    diagnosis.map((entry) => [entry.enemyId, entry] as const),
  );
  const matchupsByKey = new Map(
    results.matchups.map((matchup) => [rowKey(matchup), matchup] as const),
  );

  for (const block of combatBlocks.values()) {
    const entry = diagnosisByEnemy.get(block.enemyId);
    if (entry) {
      block.four.textContent = formatFourOfFour(entry, workingCatalog);
      block.four.className = entry.fourOfFour
        ? 'four-of-four is-good'
        : 'four-of-four is-bad';
      renderBlockProblems(block.problems, entry);
    }

    if (document.activeElement !== block.targetInput) {
      block.targetInput.value = String(
        targets[block.enemyId] ?? entry?.target ?? 0,
      );
    }

    for (const [field, refs] of block.fields) {
      if (document.activeElement !== refs.input) {
        refs.input.value = displayEnemyField(block.enemyId, field);
      }
      if (field === 'weaponId' && refs.hint) {
        refs.hint.textContent = enemyWeaponHint(block.enemyId);
      }
    }

    for (const refs of block.rows) {
      const matchup = matchupsByKey.get(refs.key);
      if (!matchup) continue;
      const diagnosed = entry?.rows.find(
        (row) => row.heroId === matchup.heroId,
      );
      const delta = diagnosed?.delta ?? 0;
      const inside = diagnosed?.inside ?? false;
      refs.winsHero.textContent =
        `${formatWins(matchup.heroWins, matchup.draws)} · ` +
        formatPercent(matchup.heroWinRate);
      refs.winsEnemy.textContent =
        `${formatWins(matchup.enemyWins, matchup.draws)} · ` +
        formatPercent(matchup.enemyWinRate);
      refs.real.textContent = formatRealCell(
        matchup.heroWinRate,
        delta,
        inside,
      );
      refs.real.className = inside
        ? 'real-cell state-ok'
        : 'real-cell state-out';
    }
  }

  const selectedKey = rowKey(selected);
  for (const [key, refs] of combatRows) {
    const isSelected = key === selectedKey;
    refs.row.classList.toggle('is-selected', isSelected);
    refs.row.setAttribute('aria-selected', String(isSelected));
  }
}

/* Tabla de armas. */

function renderWeapons(): void {
  weaponsBody.replaceChildren();
  weaponRefs.clear();

  for (const weapon of weaponRows(workingCatalog)) {
    const row = element('tr', { testId: `weapons-row-${weapon.id}` });
    const nameCell = element('td', { className: 'weapon-name-cell' });
    nameCell.append(
      element('span', { className: 'weapon-name', text: weapon.name }),
      element('span', {
        className: 'weapon-users',
        testId: `weapon-users-${weapon.id}`,
        text: formatWeaponUsers(weapon.users),
      }),
    );

    const accuracy = createNumberInput(
      weapon.accuracy,
      WEAPON_LIMITS.accuracy,
      `weapon-${weapon.id}-accuracy`,
    );
    accuracy.setAttribute('aria-label', `Acierto de ${weapon.name}`);
    const damage = createNumberInput(
      weapon.damage,
      WEAPON_LIMITS.damage,
      `weapon-${weapon.id}-damage`,
    );
    damage.setAttribute('aria-label', `Daño de ${weapon.name}`);

    const accuracyError = element('p', {
      className: 'field-error cell-error',
      testId: `weapon-error-${weapon.id}-accuracy`,
    });
    accuracyError.setAttribute('aria-live', 'polite');
    const damageError = element('p', {
      className: 'field-error cell-error',
      testId: `weapon-error-${weapon.id}-damage`,
    });
    damageError.setAttribute('aria-live', 'polite');

    const attach = (
      field: WeaponField,
      input: HTMLInputElement,
      error: HTMLElement,
    ): void => {
      const refs: FieldRefs = { input, error };
      input.addEventListener('input', () => {
        const validation = validateWeaponField(field, input.value);
        if (!validation.ok) {
          showFieldError(refs, validation.message);
          return;
        }
        clearFieldError(refs);
        applyWeaponField(weapon.id, field, validation.value);
      });
      input.addEventListener('blur', () => {
        if (input.getAttribute('aria-invalid') === 'true') {
          input.value = String(workingCatalog.weapons[weapon.id]?.[field] ?? '');
        }
        clearFieldError(refs);
      });
    };
    attach('accuracy', accuracy, accuracyError);
    attach('damage', damage, damageError);

    const accuracyCell = element('td', { className: 'numeric-cell' });
    accuracyCell.append(accuracy, accuracyError);
    const damageCell = element('td', { className: 'numeric-cell' });
    damageCell.append(damage, damageError);

    row.append(nameCell, accuracyCell, damageCell);
    weaponsBody.append(row);
    weaponRefs.set(weapon.id, {
      accuracy,
      damage,
      accuracyError,
      damageError,
      users: nameCell.querySelector<HTMLElement>('.weapon-users') as HTMLElement,
    });
  }
}

function syncWeapons(): void {
  for (const weapon of weaponRows(workingCatalog)) {
    const refs = weaponRefs.get(weapon.id);
    if (!refs) continue;
    if (document.activeElement !== refs.accuracy) {
      refs.accuracy.value = String(weapon.accuracy);
    }
    if (document.activeElement !== refs.damage) {
      refs.damage.value = String(weapon.damage);
    }
    refs.users.textContent = formatWeaponUsers(weapon.users);
  }
}

/* Tabla de héroes. */

function renderHeroes(): void {
  heroesBody.replaceChildren();
  heroRefs.clear();

  for (const hero of CATALOG.roster) {
    const row = element('tr', { testId: `heroes-row-${hero.id}` });
    row.append(
      element('td', {
        className: 'hero-cell',
        text: unitName(CATALOG, hero.id),
      }),
    );
    const fields = new Map<HeroField, FieldRefs>();
    let weaponHint = element('span', { className: 'weapon-hint' });

    for (const { field, label } of HERO_TABLE_FIELDS) {
      const cell = element('td', {
        className:
          field === 'weaponId' || field === 'armorId' || field === 'shieldId'
            ? 'shared-cell'
            : 'numeric-cell',
        testId: `heroes-cell-${hero.id}-${field}`,
      });
      const value = heroFieldValue(hero, field);
      const isSelect =
        field === 'weaponId' || field === 'armorId' || field === 'shieldId';
      let input: HTMLInputElement | HTMLSelectElement;

      if (isSelect) {
        const emptyLabel =
          field === 'weaponId'
            ? 'Sin arma'
            : field === 'armorId'
              ? 'Sin armadura'
              : 'Sin escudo';
        const options =
          field === 'weaponId'
            ? CATALOG.weapons
            : field === 'armorId'
              ? CATALOG.armors
              : CATALOG.shields;
        input = createSelect(
          typeof value === 'string' ? value : null,
          emptyLabel,
          options,
          `hero-field-${hero.id}-${field}`,
        );
      } else {
        input = createNumberInput(
          typeof value === 'number' ? value : null,
          HERO_NUMERIC_LIMITS[field as keyof typeof HERO_NUMERIC_LIMITS],
          `hero-field-${hero.id}-${field}`,
        );
      }
      input.setAttribute(
        'aria-label',
        `${label} de ${hero.name}`,
      );

      const error = element('p', {
        className: 'field-error cell-error',
        testId: `hero-field-error-${hero.id}-${field}`,
      });
      error.setAttribute('aria-live', 'polite');
      const refs: FieldRefs = { input, error };
      fields.set(field, refs);

      const onFieldChange = (): void => {
        const validation = validateHeroField(field, input.value, CATALOG);
        if (!validation.ok) {
          showFieldError(refs, validation.message);
          return;
        }
        clearFieldError(refs);
        applyHeroField(hero.id, field, validation.value);
      };
      input.addEventListener(isSelect ? 'change' : 'input', onFieldChange);
      input.addEventListener('blur', () => {
        if (input.getAttribute('aria-invalid') === 'true') {
          const current = findTemplate(workingCatalog, hero.id);
          const currentValue = current ? heroFieldValue(current, field) : null;
          input.value = currentValue === null ? '' : String(currentValue);
        }
        clearFieldError(refs);
      });

      if (field === 'weaponId') {
        weaponHint = element('span', {
          className: 'weapon-hint',
          testId: `hero-weapon-hint-${hero.id}`,
        });
        cell.append(input, weaponHint, error);
      } else {
        cell.append(input, error);
      }
      row.append(cell);
    }
    heroesBody.append(row);
    heroRefs.set(hero.id, { fields, weaponHint });
  }
}

function enemyWeaponHint(enemyId: string): string {
  const template = findTemplate(workingCatalog, enemyId);
  const weapon = template?.weaponId
    ? workingCatalog.weapons[template.weaponId]
    : null;
  return formatWeaponBonus(weapon);
}

function syncCombatWeaponHints(): void {
  for (const block of combatBlocks.values()) {
    const refs = block.fields.get('weaponId');
    if (refs?.hint) refs.hint.textContent = enemyWeaponHint(block.enemyId);
  }
}

function heroWeaponHint(heroId: string): string {
  const template = findTemplate(workingCatalog, heroId);
  const weapon = template?.weaponId
    ? workingCatalog.weapons[template.weaponId]
    : null;
  return formatWeaponBonus(weapon);
}

function syncHeroes(): void {
  for (const hero of CATALOG.roster) {
    const refs = heroRefs.get(hero.id);
    if (!refs) continue;
    const template = findTemplate(workingCatalog, hero.id);
    if (!template) continue;
    for (const [field, fieldRefs] of refs.fields) {
      if (document.activeElement === fieldRefs.input) continue;
      const value = heroFieldValue(template, field);
      fieldRefs.input.value = value === null ? '' : String(value);
    }
    refs.weaponHint.textContent = heroWeaponHint(hero.id);
  }
}

function syncAll(): void {
  syncControls();
  syncCombats();
  syncWeapons();
  syncHeroes();
  renderBalanceWarning();
  renderDetail();
  renderExport();
}

function renderAll(): void {
  syncAll();
}

function syncDerived(): void {
  syncCombats();
  syncWeapons();
  syncHeroes();
  renderBalanceWarning();
  renderDetail();
  renderExport();
}

/* Detalle del emparejamiento seleccionado. */

function detailBlock(title: string, testId: string): HTMLElement {
  const block = element('div', { className: 'detail-block', testId });
  block.append(element('h3', { text: title }));
  return block;
}

function detailTable(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
): HTMLTableElement {
  const node = element('table', { className: 'detail-table' });
  const head = element('thead');
  const headRow = element('tr');
  for (const header of headers) headRow.append(element('th', { text: header }));
  head.append(headRow);
  const body = element('tbody');
  for (const cells of rows) {
    const row = element('tr');
    for (const cell of cells) row.append(element('td', { text: cell }));
    body.append(row);
  }
  node.append(head, body);
  return node;
}

function matchupDelta(matchup: MatchupResult): { delta: number; inside: boolean } {
  const target = targets[matchup.enemyId] ?? 0;
  const delta =
    Math.round((matchup.heroWinRate - target + Number.EPSILON) * 10000) / 10000;
  return { delta, inside: Math.abs(delta) <= MARGIN_PP };
}

function renderDetail(): void {
  const matchup = selectedMatchup();
  detailHost.replaceChildren();
  const { delta, inside } = matchupDelta(matchup);

  const result = detailBlock('Resultado', 'detail-result');
  result.append(
    detailTable(
      ['Métrica', 'Valor'],
      [
        ['Banda 40–60 %', formatBand(matchup.insideBand, matchup.bandDelta)],
        [
          '% real · objetivo · delta',
          `${formatPercent(matchup.heroWinRate)} · ${formatTarget(
            targets[matchup.enemyId] ?? 0,
          )} · ${formatDelta(delta)} · ${inside ? 'dentro' : 'fuera'}`,
        ],
        [
          'Victorias héroe / enemigo / empates',
          `${matchup.heroWins} / ${matchup.enemyWins} / ${matchup.draws}`,
        ],
        ['TTK (rondas)', formatNumber(matchup.ttkRounds)],
        [
          'Turnos / rondas medios',
          `${formatNumber(matchup.turns.mean)} / ${formatNumber(matchup.rounds.mean)}`,
        ],
        [
          'Daño héroe / enemigo',
          `${matchup.damage.heroDealt} / ${matchup.damage.enemyDealt}`,
        ],
      ],
    ),
  );

  const actions = detailBlock('Acciones por tipo', 'detail-actions');
  actions.append(
    detailTable(
      ['Acción', 'Héroe', 'Enemigo'],
      [
        [
          'Atacar',
          String(matchup.actions.hero.attack),
          String(matchup.actions.enemy.attack),
        ],
        [
          'Hechizo',
          String(matchup.actions.hero.spell),
          String(matchup.actions.enemy.spell),
        ],
        [
          'Mover',
          String(matchup.actions.hero.move),
          String(matchup.actions.enemy.move),
        ],
        [
          'Esperar',
          String(matchup.actions.hero.wait),
          String(matchup.actions.enemy.wait),
        ],
      ],
    ),
  );

  const spells = detailBlock('Hechizos por id', 'detail-spells');
  const spellList = spellRows(matchup.spells);
  if (spellList.length === 0) {
    spells.append(
      element('p', { className: 'detail-empty', text: 'Sin hechizos lanzados.' }),
    );
  } else {
    spells.append(
      detailTable(
        ['Id', 'Lanzados', 'Impactos', 'Fallos', 'Daño'],
        spellList.map((spell) => [
          spell.id,
          String(spell.casts),
          String(spell.hits),
          String(spell.misses),
          String(spell.damage),
        ]),
      ),
    );
  }

  const mana = detailBlock('Maná', 'detail-mana');
  mana.append(
    detailTable(
      ['', 'Héroe', 'Enemigo'],
      [
        [
          'Disponible',
          String(matchup.mana.hero.available),
          String(matchup.mana.enemy.available),
        ],
        [
          'Gastado',
          String(matchup.mana.hero.spent),
          String(matchup.mana.enemy.spent),
        ],
        [
          'No gastado',
          String(matchup.mana.hero.unspent),
          String(matchup.mana.enemy.unspent),
        ],
      ],
    ),
  );

  const hp = detailBlock('PV restantes', 'detail-hp');
  hp.append(
    detailTable(
      ['Métrica', 'Valor'],
      [
        ['PV medios del héroe', formatNumber(matchup.hp.heroRemaining)],
        ['PV medios del enemigo', formatNumber(matchup.hp.enemyRemaining)],
        ['PV medios del ganador', formatNumber(matchup.hp.winnerRemaining)],
      ],
    ),
  );

  const replicas = detailBlock('Réplicas', 'detail-replicas');
  const totals = replicaTotals(matchup.replicas);
  replicas.append(
    detailTable(
      ['', 'Héroe', 'Enemigo'],
      [
        [
          'Disparadas',
          String(matchup.replicas.hero.triggered),
          String(matchup.replicas.enemy.triggered),
        ],
        [
          'Impactos',
          String(matchup.replicas.hero.hits),
          String(matchup.replicas.enemy.hits),
        ],
        [
          'Fallos',
          String(matchup.replicas.hero.misses),
          String(matchup.replicas.enemy.misses),
        ],
        [
          'Muertes',
          String(matchup.replicas.hero.kills),
          String(matchup.replicas.enemy.kills),
        ],
        [
          'Daño',
          String(matchup.replicas.hero.damage),
          String(matchup.replicas.enemy.damage),
        ],
      ],
    ),
    element('p', {
      className: 'detail-empty',
      text: `Totales: ${totals.triggered} disparadas, ${totals.hits} impactos, ${totals.kills} muertes.`,
    }),
  );

  const duration = detailBlock('Distribución de duración', 'detail-duration');
  duration.append(
    element('p', {
      className: 'detail-empty',
      text:
        `Rondas media ${formatNumber(matchup.rounds.mean)} · mediana ${formatNumber(matchup.rounds.median)} · ` +
        `mín ${matchup.rounds.min} · máx ${matchup.rounds.max}.`,
    }),
  );
  const durationList = element('div', { className: 'duration-list' });
  for (const entry of durationRows(matchup.rounds)) {
    durationList.append(
      element('p', {
        className: 'duration-row',
        text: `${entry.value} ${entry.value === 1 ? 'ronda' : 'rondas'} · ${entry.count}/${matchup.duels}`,
      }),
    );
  }
  duration.append(durationList);

  const heading = element('h3', {
    className: 'detail-title',
    text: matchupTitle(workingCatalog, matchup),
    testId: 'detail-title',
  });
  detailHost.append(heading, result, actions, spells, mana, hp, replicas, duration);
}

/* Export reproducible. */

function currentExport(): BenchExport {
  return buildBenchExport(results, workingCatalog, targets, overrides);
}

function renderExport(): void {
  const payload = currentExport();
  const text = benchExportJson(payload);
  const bytes = new TextEncoder().encode(text).length;
  exportSummary.textContent = formatBenchSummary(
    payload,
    overrides,
    payload.diagnosis,
    bytes,
    workingCatalog,
  );
}

/* Resets por tabla y global; sin resets por campo en las celdas. */

function clearCombatErrors(): void {
  for (const block of combatBlocks.values()) {
    for (const refs of block.fields.values()) clearFieldError(refs);
    block.targetInput.removeAttribute('aria-invalid');
    block.targetError.textContent = '';
  }
  for (const refs of weaponRefs.values()) {
    clearFieldError({ input: refs.accuracy, error: refs.accuracyError });
    clearFieldError({ input: refs.damage, error: refs.damageError });
  }
  for (const refs of heroRefs.values()) {
    for (const fieldRefs of refs.fields.values()) clearFieldError(fieldRefs);
  }
}

function resetAllState(): void {
  overrides = resetAllOverrides();
  targets = createTargets();
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  selected = {
    heroId: HERO_ORDER[0] as string,
    enemyId: ENEMY_ORDER[0] as string,
  };
  clearCombatErrors();
  recomputeAll();
  benchStatus.textContent =
    'Todo restablecido: catálogo base, guía de objetivos y 12 filas medidas de nuevo.';
}

function resetEnemiesState(): void {
  overrides = resetEnemyOverrides(overrides);
  targets = resetTargets();
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  clearCombatErrors();
  recomputeAll();
  benchStatus.textContent =
    'Enemigos restablecidos: catálogo base y objetivos de guía; 12 filas medidas de nuevo.';
}

function resetWeaponsState(): void {
  overrides = resetWeaponOverrides(overrides);
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  clearCombatErrors();
  recomputeAll();
  weaponStatus.textContent =
    'Armas restablecidas: catálogo base; 12 filas medidas de nuevo.';
}

function resetHeroesState(): void {
  overrides = resetHeroOverrides(overrides);
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  clearCombatErrors();
  recomputeAll();
  heroStatus.textContent =
    'Héroes restablecidos: catálogo base; 12 filas medidas de nuevo.';
}

function assertHero(heroId: string): void {
  if (!CATALOG.roster.some((hero) => hero.id === heroId)) {
    throw new RangeError(`Héroe desconocido: ${heroId}.`);
  }
}

function setEnemyFieldApi(
  enemyId: string,
  field: EnemyField,
  value: unknown,
): void {
  if (!findTemplate(CATALOG, enemyId)) {
    throw new RangeError(`Enemigo desconocido: ${enemyId}.`);
  }
  const validation = validateEnemyField(field, value, CATALOG);
  if (!validation.ok) throw new RangeError(validation.message);
  setOverrides(
    withEnemyOverride(overrides, enemyId, enemyFieldPatch(field, validation.value)),
  );
  recalculateNow({ kind: 'enemy', enemyId });
}

function resetEnemyFieldApi(enemyId: string, field: EnemyField): void {
  setOverrides(resetEnemyFieldOverride(overrides, enemyId, field));
  recalculateNow({ kind: 'enemy', enemyId });
}

function setWeaponFieldApi(
  weaponId: string,
  field: WeaponField,
  value: unknown,
): void {
  if (!workingCatalog.weapons[weaponId]) {
    throw new RangeError(`Arma desconocida: ${weaponId}.`);
  }
  const validation = validateWeaponField(field, value);
  if (!validation.ok) throw new RangeError(validation.message);
  const patch =
    field === 'accuracy'
      ? { accuracy: validation.value }
      : { damage: validation.value };
  setOverrides(withWeaponOverride(overrides, weaponId, patch));
  recalculateNow({ kind: 'weapon', weaponId });
}

function resetWeaponFieldApi(weaponId: string, field: WeaponField): void {
  if (!workingCatalog.weapons[weaponId]) {
    throw new RangeError(`Arma desconocida: ${weaponId}.`);
  }
  setOverrides(resetWeaponFieldOverride(overrides, weaponId, field));
  recalculateNow({ kind: 'weapon', weaponId });
}

function setHeroFieldApi(
  heroId: string,
  field: HeroField,
  value: unknown,
): void {
  assertHero(heroId);
  const validation = validateHeroField(field, value, CATALOG);
  if (!validation.ok) throw new RangeError(validation.message);
  setOverrides(
    withHeroOverride(overrides, heroId, heroFieldPatch(field, validation.value)),
  );
  recalculateNow({ kind: 'hero', heroId });
}

function resetHeroFieldApi(heroId: string, field: HeroField): void {
  assertHero(heroId);
  setOverrides(resetHeroFieldOverride(overrides, heroId, field));
  recalculateNow({ kind: 'hero', heroId });
}

function resetEnemyApi(enemyId: string): void {
  if (!findTemplate(CATALOG, enemyId)) {
    throw new RangeError(`Enemigo desconocido: ${enemyId}.`);
  }
  setOverrides(resetEnemyOverride(overrides, enemyId));
  targets = resetTarget(targets, enemyId);
  recalculateNow({ kind: 'enemy', enemyId });
}

function resetWeaponApi(weaponId: string): void {
  if (!workingCatalog.weapons[weaponId]) {
    throw new RangeError(`Arma desconocida: ${weaponId}.`);
  }
  setOverrides(resetWeaponOverride(overrides, weaponId));
  recalculateNow({ kind: 'weapon', weaponId });
}

function resetHeroApi(heroId: string): void {
  assertHero(heroId);
  setOverrides(resetHeroOverride(overrides, heroId));
  recalculateNow({ kind: 'hero', heroId });
}

function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

seedInput.addEventListener('change', () => {
  seed = normalizeSeed(seedInput.value);
  recomputeAll(`Semilla ${seed}: 12 emparejamientos recalculados.`);
});

duelInput.addEventListener('change', () => {
  duels = normalizeDuels(duelInput.value);
  recomputeAll(`${duels} duelos por emparejamiento: 12 emparejamientos recalculados.`);
});

runButton.addEventListener('click', () => {
  recomputeAll(`Semilla ${seed} · ${duels} duelos por emparejamiento.`);
});

resetButton.addEventListener('click', () => {
  seed = DEFAULT_SEED;
  duels = DEFAULT_DUELS;
  selected = {
    heroId: results.matchups[0].heroId,
    enemyId: results.matchups[0].enemyId,
  };
  recomputeAll(`Restablecido a semilla ${DEFAULT_SEED} y ${DEFAULT_DUELS} duelos.`);
});

resetAllButton.addEventListener('click', () => {
  resetAllState();
});

resetEnemiesButton.addEventListener('click', () => {
  resetEnemiesState();
});

resetWeaponsButton.addEventListener('click', () => {
  resetWeaponsState();
});

resetHeroesButton.addEventListener('click', () => {
  resetHeroesState();
});

copyButton.addEventListener('click', async () => {
  ensureRecalculated();
  const payload = currentExport();
  const copied = await copyJson(
    payload as unknown as Parameters<typeof copyJson>[0],
  );
  setStatus(
    exportStatus,
    copied ? 'JSON copiado al portapapeles.' : 'No se pudo copiar el JSON.',
  );
});

downloadButton.addEventListener('click', () => {
  ensureRecalculated();
  const payload = currentExport();
  const fileName = benchFileName(payload, overrides);
  downloadText(fileName, benchExportJson(payload));
  setStatus(exportStatus, `JSON exportado: ${fileName}.`);
});

function currentSnapshot(): BenchSnapshot {
  return {
    ...buildSnapshot(results, selected),
    experiment: results.experiment,
    engine: results.engine,
    duels: results.duels,
    scenario: results.scenario,
    catalog: workingCatalog,
    targets,
    overrides,
    overridesId: overridesId(overrides),
    diagnosis,
  };
}

function applyTarget(enemyId: string, value: unknown): void {
  targets = setBenchTarget(targets, enemyId, value);
  refreshDiagnosisOnly();
}

const api: V2ExperimentApi = {
  id: EXPERIMENT_ID,
  getSeed: () => seed,
  setSeed: (next) => {
    seed = normalizeSeed(next);
    recomputeAll();
  },
  getDuels: () => duels,
  setDuels: (next) => {
    duels = normalizeDuels(next);
    recomputeAll();
  },
  runAll: () => recalculateNow(),
  getResults: () => {
    ensureRecalculated();
    return results;
  },
  snapshot: () => {
    ensureRecalculated();
    return currentSnapshot();
  },
  getDecision: () => {
    ensureRecalculated();
    return currentExport();
  },
  reset: () => {
    seed = DEFAULT_SEED;
    duels = DEFAULT_DUELS;
    selected = {
      heroId: results.matchups[0].heroId,
      enemyId: results.matchups[0].enemyId,
    };
    recomputeAll();
  },
  getTargets: () => targets,
  setTarget: (enemyId, value) => {
    applyTarget(enemyId, value);
  },
  resetTarget: (enemyId) => {
    targets = resetTarget(targets, enemyId);
    refreshDiagnosisOnly();
  },
  getOverrides: () => overrides,
  resetEnemy: (enemyId) => {
    resetEnemyApi(enemyId);
  },
  resetWeapon: (weaponId) => {
    resetWeaponApi(weaponId);
  },
  resetWeaponField: (weaponId, field) => {
    resetWeaponFieldApi(weaponId, field);
  },
  resetAll: () => {
    resetAllState();
  },
  setEnemyField: (enemyId, field, value) => {
    setEnemyFieldApi(enemyId, field as EnemyField, value);
  },
  resetEnemyField: (enemyId, field) => {
    resetEnemyFieldApi(enemyId, field as EnemyField);
  },
  setWeaponField: (weaponId, field, value) => {
    setWeaponFieldApi(weaponId, field, value);
  },
  setHeroField: (heroId, field, value) => {
    setHeroFieldApi(heroId, field as HeroField, value);
  },
  resetHeroField: (heroId, field) => {
    resetHeroFieldApi(heroId, field as HeroField);
  },
  resetHero: (heroId) => {
    resetHeroApi(heroId);
  },
  resetEnemies: () => {
    resetEnemiesState();
  },
  resetWeapons: () => {
    resetWeaponsState();
  },
  resetHeroes: () => {
    resetHeroesState();
  },
  recalculate: (selection) => recalculateNow(selection),
  getDiagnosis: () => {
    ensureRecalculated();
    return diagnosis;
  },
  getWorkingCatalog: () => workingCatalog,
  getOverridesId: () => overridesId(overrides),
};

window.__experiment = api as unknown as ExperimentTestApi;

renderCombats();
renderWeapons();
renderHeroes();
renderAll();
selectRow(selected.heroId, selected.enemyId);
setStatus(
  controlsStatus,
  `Semilla ${seed} · ${duels} duelos por emparejamiento · ${results.matchups.length} emparejamientos.`,
);
benchStatus.textContent = 'Listo. Edita un stat compartido, un arma o un héroe.';
