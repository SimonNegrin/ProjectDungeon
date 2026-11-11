import '../../_shell/styles.css';
import './experiment.css';
import { copyJson } from '../../_shell/export';
import type { ExperimentTestApi } from '../../_shell/types';
import {
  ENEMY_FIELD_LABELS,
  ENEMY_FIELD_ORDER,
  ENEMY_NUMERIC_LIMITS,
  ENEMY_SELECT_FIELDS,
  WEAPON_LIMITS,
  benchFileName,
  enemyFieldPatch,
  enemyFieldValue,
  formatBenchSummary,
  formatDelta,
  formatDiagnosisRow,
  formatFourOfFour,
  formatRowState,
  formatTarget,
  heroFieldPatch,
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
  manaSpent,
  matchupKey,
  matchupTitle,
  normalizeDuels,
  normalizeSeed,
  replicaTotals,
  spellRows,
  totalSpellCasts,
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
let expanded: { heroId: string; enemyId: string } | null = null;
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

const controlsStatus = element('p', {
  className: 'status controls-status',
  testId: 'controls-status',
});
controlsStatus.setAttribute('aria-live', 'polite');

toolbar.append(seedLabel, duelLabel, runButton, resetButton, controlsStatus);

/* Tabla de emparejamientos con objetivo, delta y acción de ajuste. */

const tablePanel = element('section', {
  className: 'panel matchup-panel',
  testId: 'matchup-panel',
});
tablePanel.append(
  element('h2', { text: '12 emparejamientos' }),
  element('p', {
    className: 'panel-hint',
    text: 'Banda de referencia 40–60 % de victorias del héroe, tolerancia ±2 pp, héroe con iniciativa. Cada fila muestra además el objetivo editable del enemigo y el delta real − objetivo con margen ±5 pp. «Ajustar» abre el editor compartido del enemigo.',
  }),
);
const tableScroll = element('div', { className: 'table-scroll' });
const table = element('table', { className: 'matchup-table', testId: 'matchup-table' });
const tableHead = element('thead');
const headRow = element('tr');
const TABLE_HEADERS = [
  'Héroe',
  'Enemigo',
  'Victorias héroe',
  'Victorias enemigo',
  'Banda 40–60 %',
  'Objetivo',
  'Real',
  'Δ objetivo',
  'Estado',
  'Turnos / rondas',
  'TTK (rondas)',
  'Réplicas héroe',
  'Réplicas enemigo',
  'Hechizos',
  'Maná gastado H/E',
  'Daño H/E',
  'Detalle',
  'Ajustar',
] as const;
for (const label of TABLE_HEADERS) {
  headRow.append(element('th', { text: label }));
}
tableHead.append(headRow);
const tableBody = element('tbody', { testId: 'matchup-rows' });
table.append(tableHead, tableBody);
tableScroll.append(table);
tablePanel.append(tableScroll);

/* Panel del banco: diagnóstico, objetivos y armas globales. */

const benchPanel = element('section', {
  className: 'panel bench-panel',
  testId: 'bench-panel',
});
benchPanel.append(
  element('h2', { text: 'Banco de ajuste' }),
  element('p', {
    className: 'panel-hint',
    text: 'Objetivos por enemigo, diagnóstico 4-de-4 y armas compartidas. Los avisos son informativos: no bloquean edición, export ni reset. Los cambios de stats y armas recalculan solo las filas afectadas.',
  }),
);
const benchToolbar = element('div', { className: 'bench-toolbar' });
const benchStatus = element('p', {
  className: 'status bench-status',
  testId: 'bench-status',
});
benchStatus.setAttribute('aria-live', 'polite');
benchStatus.setAttribute('role', 'status');
const resetAllButton = element('button', {
  className: 'button ghost',
  text: 'Restablecer banco',
  testId: 'bench-reset-all',
});
resetAllButton.type = 'button';
benchToolbar.append(benchStatus, resetAllButton);
benchPanel.append(benchToolbar);

const diagnosisGrid = element('div', { className: 'diagnosis-grid' });
benchPanel.append(diagnosisGrid);

const weaponsBlock = element('div', { className: 'weapons-block' });
weaponsBlock.append(
  element('h3', { text: 'Armas globales' }),
  element('p', {
    className: 'panel-hint',
    text: 'Acierto y daño se aplican a todas las unidades que equipan el arma; un arma compartida mueve a héroes y enemigos. Las unidades listadas salen del catálogo ajustado.',
  }),
);
const weaponScroll = element('div', { className: 'table-scroll' });
const weaponTable = element('table', {
  className: 'weapon-table',
  testId: 'bench-weapon-table',
});
const weaponHead = element('thead');
const weaponHeadRow = element('tr');
for (const label of ['Arma', 'Acierto', 'Daño', 'Unidades que la usan', 'Reset']) {
  weaponHeadRow.append(element('th', { text: label }));
}
weaponHead.append(weaponHeadRow);
const weaponBody = element('tbody');
weaponTable.append(weaponHead, weaponBody);
weaponScroll.append(weaponTable);
weaponsBlock.append(weaponScroll);
benchPanel.append(weaponsBlock);

const detailPanel = element('section', {
  className: 'panel detail-panel',
  testId: 'matchup-detail-panel',
});
detailPanel.append(
  element('h2', { text: 'Detalle del emparejamiento' }),
  element('p', {
    className: 'panel-hint',
    text: 'Acciones por tipo, hechizos por id, maná no gastado, PV restantes y distribución de duración del emparejamiento seleccionado.',
  }),
);
const detailHost = element('div', { className: 'detail-grid', testId: 'matchup-detail' });
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

root.append(header, toolbar, tablePanel, benchPanel, detailPanel, exportPanel);

/* Estado de refs para actualizar en sitio sin reconstruir estructura. */

interface RowRefs {
  readonly winsHero: HTMLElement;
  readonly band: HTMLElement;
  readonly target: HTMLElement;
  readonly real: HTMLElement;
  readonly delta: HTMLElement;
  readonly state: HTMLElement;
}

interface DiagnosisRefs {
  readonly four: HTMLElement;
  readonly targetInput: HTMLInputElement;
  readonly targetError: HTMLElement;
  readonly guide: HTMLElement;
  readonly rows: HTMLElement;
  readonly problems: HTMLElement;
}

interface WeaponRefs {
  readonly accuracy: HTMLInputElement;
  readonly damage: HTMLInputElement;
  readonly accuracyError: HTMLElement;
  readonly damageError: HTMLElement;
  readonly users: HTMLElement;
}

const rowRefs = new Map<string, RowRefs>();
const diagnosisRefs = new Map<string, DiagnosisRefs>();
const weaponRefs = new Map<string, WeaponRefs>();
const fieldInputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
const fieldErrors = new Map<string, HTMLElement>();

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

function rowDelta(matchup: MatchupResult): { delta: number; inside: boolean } {
  const target = targets[matchup.enemyId] ?? 0;
  const delta =
    Math.round((matchup.heroWinRate - target + Number.EPSILON) * 10000) / 10000;
  return { delta, inside: Math.abs(delta) <= MARGIN_PP };
}

function renderTable(): void {
  tableBody.replaceChildren();
  rowRefs.clear();
  fieldInputs.clear();
  fieldErrors.clear();

  for (const matchup of results.matchups) {
    const key = matchupKey(matchup.heroId, matchup.enemyId);
    const row = element('tr', {
      testId: `matchup-row-${matchup.heroId}-${matchup.enemyId}`,
    });
    if (
      matchup.heroId === selected.heroId &&
      matchup.enemyId === selected.enemyId
    ) {
      row.classList.add('is-selected');
    }

    const band = element('span', {
      className: matchup.insideBand ? 'band-ok' : 'band-out',
      text: formatBand(matchup.insideBand, matchup.bandDelta),
      testId: `matchup-band-${matchup.heroId}-${matchup.enemyId}`,
    });
    const bandCell = element('td');
    bandCell.append(band);

    const targetCell = element('td', {
      testId: `bench-row-target-${matchup.heroId}-${matchup.enemyId}`,
    });
    const winsHero = element('td', {
      text: `${matchup.heroWins} (${formatPercent(matchup.heroWinRate)})`,
      testId: `matchup-wins-${matchup.heroId}-${matchup.enemyId}`,
    });
    const realCell = element('td', {
      testId: `bench-row-real-${matchup.heroId}-${matchup.enemyId}`,
    });
    const deltaCell = element('td', {
      testId: `bench-row-delta-${matchup.heroId}-${matchup.enemyId}`,
    });
    const stateCell = element('td', {
      testId: `bench-row-state-${matchup.heroId}-${matchup.enemyId}`,
    });

    const mana = manaSpent(matchup);
    const selectButton = element('button', {
      className: 'button ghost matchup-select',
      text: 'Ver',
      testId: `matchup-select-${matchup.heroId}-${matchup.enemyId}`,
    });
    selectButton.type = 'button';
    selectButton.addEventListener('click', () => {
      selected = { heroId: matchup.heroId, enemyId: matchup.enemyId };
      for (const [rowKeyValue, refs] of rowRefs) {
        const isSelected = rowKeyValue === key;
        refs.winsHero.closest('tr')?.classList.toggle('is-selected', isSelected);
      }
      renderDetail();
      setStatus(
        controlsStatus,
        `Detalle: ${matchupTitle(CATALOG, matchup)} (${key}).`,
      );
    });

    const adjustButton = element('button', {
      className: 'button ghost bench-adjust',
      text: expanded?.heroId === matchup.heroId &&
        expanded?.enemyId === matchup.enemyId
        ? 'Cerrar'
        : 'Ajustar',
      testId: `bench-adjust-${matchup.heroId}-${matchup.enemyId}`,
    });
    adjustButton.type = 'button';
    adjustButton.setAttribute(
      'aria-expanded',
      String(
        expanded?.heroId === matchup.heroId &&
          expanded?.enemyId === matchup.enemyId,
      ),
    );
    adjustButton.addEventListener('click', () => {
      const same =
        expanded?.heroId === matchup.heroId &&
        expanded?.enemyId === matchup.enemyId;
      expanded = same ? null : { heroId: matchup.heroId, enemyId: matchup.enemyId };
      renderTable();
      syncTableValues();
    });

    const detailCell = element('td');
    detailCell.append(selectButton);
    const adjustCell = element('td');
    adjustCell.append(adjustButton);

    row.append(
      element('td', { text: unitName(workingCatalog, matchup.heroId) }),
      element('td', { text: unitName(workingCatalog, matchup.enemyId) }),
      winsHero,
      element('td', {
        text: `${matchup.enemyWins} (${formatPercent(matchup.enemyWinRate)})`,
      }),
      bandCell,
      targetCell,
      realCell,
      deltaCell,
      stateCell,
      element('td', {
        text: `${formatNumber(matchup.turns.mean)} / ${formatNumber(matchup.rounds.mean)}`,
      }),
      element('td', { text: formatNumber(matchup.ttkRounds) }),
      element('td', {
        text: `${matchup.replicas.hero.triggered}/${matchup.replicas.hero.hits}/${matchup.replicas.hero.kills}`,
      }),
      element('td', {
        text: `${matchup.replicas.enemy.triggered}/${matchup.replicas.enemy.hits}/${matchup.replicas.enemy.kills}`,
      }),
      element('td', { text: String(totalSpellCasts(matchup.spells)) }),
      element('td', { text: `${mana.hero} / ${mana.enemy}` }),
      element('td', {
        text: `${matchup.damage.heroDealt} / ${matchup.damage.enemyDealt}`,
      }),
      detailCell,
      adjustCell,
    );
    tableBody.append(row);

    rowRefs.set(key, {
      winsHero,
      band,
      target: targetCell,
      real: realCell,
      delta: deltaCell,
      state: stateCell,
    });

    if (
      expanded?.heroId === matchup.heroId &&
      expanded?.enemyId === matchup.enemyId
    ) {
      tableBody.append(renderEditorRow(matchup.enemyId));
    }
  }
}

function displayFieldValue(enemyId: string, field: EnemyField): string {
  const template = findTemplate(workingCatalog, enemyId);
  if (!template) return '';
  const value = enemyFieldValue(template, field);
  return value === null ? '' : String(value);
}

function clearFieldError(enemyId: string, field: EnemyField): void {
  const key = `${enemyId}:${field}`;
  const input = fieldInputs.get(key);
  input?.removeAttribute('aria-invalid');
  const error = fieldErrors.get(key);
  if (error) error.textContent = '';
}

function showFieldError(
  enemyId: string,
  field: EnemyField,
  message: string,
): void {
  const key = `${enemyId}:${field}`;
  fieldInputs.get(key)?.setAttribute('aria-invalid', 'true');
  const error = fieldErrors.get(key);
  if (error) error.textContent = message;
}

function fieldEditable(enemyId: string, field: EnemyField): boolean {
  const template = findTemplate(workingCatalog, enemyId);
  return template !== undefined && [
    ...ENEMY_FIELD_ORDER,
  ].includes(field);
}

function syncEnemyEditorValues(enemyId: string): void {
  for (const field of ENEMY_FIELD_ORDER) {
    const input = fieldInputs.get(`${enemyId}:${field}`);
    if (!input) continue;
    if (document.activeElement !== input) {
      input.value = displayFieldValue(enemyId, field);
    }
    clearFieldError(enemyId, field);
  }
}

function renderEditorRow(enemyId: string): HTMLTableRowElement {
  const template = findTemplate(workingCatalog, enemyId);
  const row = element('tr', {
    className: 'bench-editor-row',
    testId: `bench-editor-row-${enemyId}`,
  });
  const cell = element('td');
  cell.colSpan = TABLE_HEADERS.length;
  const editor = element('div', {
    className: 'bench-editor',
    testId: `bench-editor-${enemyId}`,
  });

  const heroNames = workingCatalog.roster.map((hero) => hero.name);
  editor.append(
    element('h3', {
      text: `${template?.name ?? enemyId} · editor compartido`,
    }),
    element('p', {
      className: 'bench-editor-warning',
      text:
        `Este enemigo es compartido: el cambio afecta a sus cuatro filas ` +
        `(${heroNames.join(', ')}). No hay copias por fila.`,
      testId: `bench-editor-shared-${enemyId}`,
    }),
  );

  const grid = element('div', { className: 'bench-fields' });
  for (const field of ENEMY_FIELD_ORDER) {
    const label = element('label', { className: 'bench-field' });
    label.append(element('span', { text: ENEMY_FIELD_LABELS[field] }));
    const isSelect = (ENEMY_SELECT_FIELDS as ReadonlyArray<string>).includes(field);
    let input: HTMLInputElement | HTMLSelectElement;

    if (isSelect) {
      const select = element('select', {
        testId: `bench-field-${enemyId}-${field}`,
      });
      const emptyOption = element('option', {
        text:
          field === 'armorId'
            ? 'Sin armadura'
            : field === 'shieldId'
              ? 'Sin escudo'
              : 'Sin arma',
      });
      emptyOption.value = '';
      select.append(emptyOption);
      const options =
        field === 'armorId'
          ? workingCatalog.armors
          : field === 'shieldId'
            ? workingCatalog.shields
            : workingCatalog.weapons;
      for (const option of Object.values(options)) {
        const node = element('option', { text: option.name });
        node.value = option.id;
        select.append(node);
      }
      input = select;
    } else {
      const number = element('input', {
        testId: `bench-field-${enemyId}-${field}`,
      });
      number.type = 'number';
      number.step = '1';
      const limits = ENEMY_NUMERIC_LIMITS[field as keyof typeof ENEMY_NUMERIC_LIMITS];
      number.min = String(limits.min);
      number.max = String(limits.max);
      input = number;
    }

    const key = `${enemyId}:${field}`;
    fieldInputs.set(key, input);
    input.value = displayFieldValue(enemyId, field);
    input.setAttribute(
      'aria-label',
      `${ENEMY_FIELD_LABELS[field]} de ${template?.name ?? enemyId}`,
    );

    const error = element('p', {
      className: 'field-error',
      testId: `bench-field-error-${enemyId}-${field}`,
    });
    error.setAttribute('aria-live', 'polite');
    fieldErrors.set(key, error);

    const onFieldChange = (): void => {
      const validation = validateEnemyField(field, input.value, CATALOG);
      if (!validation.ok) {
        showFieldError(enemyId, field, validation.message);
        return;
      }
      clearFieldError(enemyId, field);
      applyEnemyField(enemyId, field, validation.value);
    };
    input.addEventListener(isSelect ? 'change' : 'input', onFieldChange);
    if (!isSelect) {
      input.addEventListener('blur', () => {
        (input as HTMLInputElement).value = displayFieldValue(enemyId, field);
        clearFieldError(enemyId, field);
      });
    }

    const resetFieldButton = element('button', {
      className: 'button ghost bench-field-reset',
      text: 'Restablecer',
      testId: `bench-field-reset-${enemyId}-${field}`,
    });
    resetFieldButton.type = 'button';
    resetFieldButton.addEventListener('click', () => resetEnemyField(enemyId, field));

    label.append(input, resetFieldButton, error);
    grid.append(label);
  }
  editor.append(grid);

  const resetEnemyButton = element('button', {
    className: 'button ghost',
    text: `Restablecer ${template?.name ?? enemyId}`,
    testId: `bench-enemy-reset-${enemyId}`,
  });
  resetEnemyButton.type = 'button';
  resetEnemyButton.addEventListener('click', () => resetEnemyState(enemyId));
  editor.append(resetEnemyButton);

  cell.append(editor);
  row.append(cell);
  return row;
}

function syncTableValues(): void {
  for (const matchup of results.matchups) {
    const refs = rowRefs.get(matchupKey(matchup.heroId, matchup.enemyId));
    if (!refs) continue;
    const target = targets[matchup.enemyId] ?? 0;
    const { delta, inside } = rowDelta(matchup);
    refs.winsHero.textContent = `${matchup.heroWins} (${formatPercent(matchup.heroWinRate)})`;
    refs.band.textContent = formatBand(matchup.insideBand, matchup.bandDelta);
    refs.band.className = matchup.insideBand ? 'band-ok' : 'band-out';
    refs.target.textContent = formatTarget(target);
    refs.real.textContent = `${formatPercent(matchup.heroWinRate)}`;
    refs.delta.textContent = formatDelta(delta);
    refs.state.textContent = formatRowState(inside);
    refs.state.className = inside ? 'state-ok' : 'state-out';
  }
}

function renderDiagnosis(): void {
  diagnosisGrid.replaceChildren();
  diagnosisRefs.clear();

  for (const entry of diagnosis) {
    const card = element('article', {
      className: 'diagnosis-card',
      testId: `bench-diagnosis-${entry.enemyId}`,
    });
    const cardHeader = element('div', { className: 'diagnosis-header' });
    cardHeader.append(element('h3', { text: unitName(workingCatalog, entry.enemyId) }));
    const four = element('span', {
      className: 'diagnosis-four',
      testId: `bench-four-of-four-${entry.enemyId}`,
    });
    cardHeader.append(four);
    card.append(cardHeader);

    const targetRow = element('div', { className: 'target-row' });
    const targetLabel = element('label', { className: 'target-label' });
    targetLabel.append(element('span', { text: 'Objetivo' }));
    const targetInput = element('input', {
      testId: `bench-target-${entry.enemyId}`,
    });
    targetInput.type = 'number';
    targetInput.min = '0';
    targetInput.max = '100';
    targetInput.step = '1';
    targetInput.value = String(entry.target);
    targetInput.setAttribute(
      'aria-label',
      `Objetivo de ${unitName(workingCatalog, entry.enemyId)}`,
    );
    targetLabel.append(targetInput);

    const guide = element('span', {
      className: 'target-guide',
      testId: `bench-guide-${entry.enemyId}`,
      text: `guía ${formatTarget(GUIDE_TARGETS[entry.enemyId] ?? entry.target)}`,
    });
    const targetReset = element('button', {
      className: 'button ghost bench-target-reset',
      text: 'Guía',
      testId: `bench-target-reset-${entry.enemyId}`,
    });
    targetReset.type = 'button';
    targetReset.addEventListener('click', () => {
      targets = resetTarget(targets, entry.enemyId);
      refreshDiagnosisOnly();
    });

    const targetError = element('p', {
      className: 'field-error',
      testId: `bench-target-error-${entry.enemyId}`,
    });
    targetError.setAttribute('aria-live', 'polite');

    targetInput.addEventListener('input', () => {
      const validation = validateTargetInput(targetInput.value);
      if (!validation.ok) {
        targetInput.setAttribute('aria-invalid', 'true');
        targetError.textContent = validation.message;
        return;
      }
      targetInput.removeAttribute('aria-invalid');
      targetError.textContent = '';
      targets = setBenchTarget(targets, entry.enemyId, validation.value);
      refreshDiagnosisOnly();
    });
    targetInput.addEventListener('blur', () => {
      targetInput.value = String(targets[entry.enemyId] ?? entry.target);
      targetInput.removeAttribute('aria-invalid');
      targetError.textContent = '';
    });

    targetRow.append(targetLabel, guide, targetReset, targetError);
    card.append(targetRow);

    const rows = element('ul', {
      className: 'diagnosis-rows',
      testId: `bench-diagnosis-rows-${entry.enemyId}`,
    });
    const problems = element('ul', {
      className: 'diagnosis-problems',
      testId: `bench-problems-${entry.enemyId}`,
    });
    card.append(rows, problems);
    diagnosisGrid.append(card);

    diagnosisRefs.set(entry.enemyId, {
      four,
      targetInput,
      targetError,
      guide,
      rows,
      problems,
    });
  }

  syncDiagnosis();
}

function syncDiagnosis(): void {
  for (const entry of diagnosis) {
    const refs = diagnosisRefs.get(entry.enemyId);
    if (!refs) continue;
    refs.four.textContent = formatFourOfFour(entry, workingCatalog);
    refs.four.className = entry.fourOfFour
      ? 'diagnosis-four is-good'
      : 'diagnosis-four is-bad';
    if (document.activeElement !== refs.targetInput) {
      refs.targetInput.value = String(entry.target);
    }
    refs.guide.textContent = `guía ${formatTarget(
      GUIDE_TARGETS[entry.enemyId] ?? entry.target,
    )}`;

    refs.rows.replaceChildren(
      ...entry.rows.map((row) => {
        const item = element('li', {
          testId: `bench-diagnosis-row-${row.heroId}-${entry.enemyId}`,
        });
        item.textContent =
          `${unitName(workingCatalog, row.heroId)} · ` +
          formatDiagnosisRow(
            row.heroWinRate,
            entry.target,
            row.delta,
            row.inside,
          );
        item.className = row.inside ? 'is-inside' : 'is-outside';
        return item;
      }),
    );

    if (entry.problems.length === 0) {
      refs.problems.replaceChildren(
        element('li', { className: 'is-empty', text: 'Sin avisos.' }),
      );
    } else {
      refs.problems.replaceChildren(
        ...entry.problems.map((problem) =>
          element('li', { className: `problem-${problem.kind}`, text: problem.message }),
        ),
      );
    }
  }
}

function renderWeapons(): void {
  weaponBody.replaceChildren();
  weaponRefs.clear();

  for (const weapon of weaponRows(workingCatalog)) {
    const row = element('tr', {
      testId: `bench-weapon-row-${weapon.id}`,
    });
    const accuracy = element('input', {
      testId: `bench-weapon-${weapon.id}-accuracy`,
    });
    accuracy.type = 'number';
    accuracy.step = '1';
    accuracy.min = String(WEAPON_LIMITS.accuracy.min);
    accuracy.max = String(WEAPON_LIMITS.accuracy.max);
    accuracy.value = String(weapon.accuracy);
    accuracy.setAttribute('aria-label', `Acierto de ${weapon.name}`);

    const damage = element('input', {
      testId: `bench-weapon-${weapon.id}-damage`,
    });
    damage.type = 'number';
    damage.step = '1';
    damage.min = String(WEAPON_LIMITS.damage.min);
    damage.max = String(WEAPON_LIMITS.damage.max);
    damage.value = String(weapon.damage);
    damage.setAttribute('aria-label', `Daño de ${weapon.name}`);

    const accuracyError = element('p', {
      className: 'field-error',
      testId: `bench-weapon-error-${weapon.id}-accuracy`,
    });
    accuracyError.setAttribute('aria-live', 'polite');
    const damageError = element('p', {
      className: 'field-error',
      testId: `bench-weapon-error-${weapon.id}-damage`,
    });
    damageError.setAttribute('aria-live', 'polite');

    const attach = (
      field: WeaponField,
      input: HTMLInputElement,
      error: HTMLElement,
    ): void => {
      input.addEventListener('input', () => {
        const validation = validateWeaponField(field, input.value);
        if (!validation.ok) {
          input.setAttribute('aria-invalid', 'true');
          error.textContent = validation.message;
          return;
        }
        input.removeAttribute('aria-invalid');
        error.textContent = '';
        applyWeaponField(weapon.id, field, validation.value);
      });
      input.addEventListener('blur', () => {
        input.value = String(workingCatalog.weapons[weapon.id]?.[field] ?? '');
        input.removeAttribute('aria-invalid');
        error.textContent = '';
      });
    };
    attach('accuracy', accuracy, accuracyError);
    attach('damage', damage, damageError);

    const users = element('td', {
      testId: `bench-weapon-users-${weapon.id}`,
      text: weapon.users.join(', '),
    });
    const accuracyReset = element('button', {
      className: 'button ghost bench-field-reset',
      text: 'Reset campo',
      testId: `bench-weapon-field-reset-${weapon.id}-accuracy`,
    });
    accuracyReset.type = 'button';
    accuracyReset.setAttribute('aria-label', `Restablecer acierto de ${weapon.name}`);
    accuracyReset.addEventListener('click', () =>
      resetWeaponFieldState(weapon.id, 'accuracy'),
    );
    const damageReset = element('button', {
      className: 'button ghost bench-field-reset',
      text: 'Reset campo',
      testId: `bench-weapon-field-reset-${weapon.id}-damage`,
    });
    damageReset.type = 'button';
    damageReset.setAttribute('aria-label', `Restablecer daño de ${weapon.name}`);
    damageReset.addEventListener('click', () =>
      resetWeaponFieldState(weapon.id, 'damage'),
    );
    const accuracyCell = element('td');
    accuracyCell.append(accuracy, accuracyReset, accuracyError);
    const damageCell = element('td');
    damageCell.append(damage, damageReset, damageError);

    const resetWeaponButton = element('button', {
      className: 'button ghost',
      text: 'Restablecer',
      testId: `bench-weapon-reset-${weapon.id}`,
    });
    resetWeaponButton.type = 'button';
    resetWeaponButton.setAttribute(
      'aria-label',
      `Restablecer arma ${weapon.name}`,
    );
    resetWeaponButton.addEventListener('click', () => resetWeaponState(weapon.id));
    const resetCell = element('td');
    resetCell.append(resetWeaponButton);

    row.append(
      element('td', {
        text: `${weapon.name} (${weapon.id})`,
      }),
      accuracyCell,
      damageCell,
      users,
      resetCell,
    );
    weaponBody.append(row);

    weaponRefs.set(weapon.id, {
      accuracy,
      damage,
      accuracyError,
      damageError,
      users,
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
    refs.accuracy.removeAttribute('aria-invalid');
    refs.damage.removeAttribute('aria-invalid');
    refs.accuracyError.textContent = '';
    refs.damageError.textContent = '';
    refs.users.textContent = weapon.users.join(', ');
  }
}

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

function renderDetail(): void {
  const matchup = selectedMatchup();
  detailHost.replaceChildren();

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
    spells.append(element('p', { className: 'detail-empty', text: 'Sin hechizos lanzados.' }));
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
        ['Disponible', String(matchup.mana.hero.available), String(matchup.mana.enemy.available)],
        ['Gastado', String(matchup.mana.hero.spent), String(matchup.mana.enemy.spent)],
        ['No gastado', String(matchup.mana.hero.unspent), String(matchup.mana.enemy.unspent)],
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
        ['Disparadas', String(matchup.replicas.hero.triggered), String(matchup.replicas.enemy.triggered)],
        ['Impactos', String(matchup.replicas.hero.hits), String(matchup.replicas.enemy.hits)],
        ['Fallos', String(matchup.replicas.hero.misses), String(matchup.replicas.enemy.misses)],
        ['Muertes', String(matchup.replicas.hero.kills), String(matchup.replicas.enemy.kills)],
        ['Daño', String(matchup.replicas.hero.damage), String(matchup.replicas.enemy.damage)],
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
  detailHost.append(heading, actions, spells, mana, hp, replicas, duration);
}

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

function syncDerived(): void {
  syncTableValues();
  syncDiagnosis();
  syncWeapons();
  renderBalanceWarning();
  renderDetail();
  renderExport();
}

function renderAll(): void {
  syncControls();
  renderTable();
  renderDiagnosis();
  renderWeapons();
  syncDerived();
}

/* Mutaciones de estado y recálculo diferido/síncrono. */

function setOverrides(next: BenchOverrides): void {
  overrides = pruneOverrides(CATALOG, next);
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
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
    benchStatus.textContent = `Recalculado: ${count} filas afectadas.`;
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
    benchStatus.textContent = `Recalculado: ${count} filas afectadas.`;
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
    benchStatus.textContent = `Recalculado: ${affected} filas afectadas.`;
    return results;
  }

  results = measureMatchups({ seed, duels, catalog: workingCatalog });
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncDerived();
  benchStatus.textContent = `Recalculado: ${results.matchups.length} filas.`;
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

function applyEnemyField(
  enemyId: string,
  field: EnemyField,
  value: number | string | null,
): void {
  if (!fieldEditable(enemyId, field)) return;
  setOverrides(withEnemyOverride(overrides, enemyId, enemyFieldPatch(field, value)));
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
  scheduleRecalc({ kind: 'weapon', weaponId });
}

function resetEnemyField(enemyId: string, field: EnemyField): void {
  setOverrides(resetEnemyFieldOverride(overrides, enemyId, field));
  syncEnemyEditorValues(enemyId);
  scheduleRecalc({ kind: 'enemy', enemyId });
}

function resetEnemyState(enemyId: string): void {
  setOverrides(resetEnemyOverride(overrides, enemyId));
  targets = resetTarget(targets, enemyId);
  syncEnemyEditorValues(enemyId);
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncDiagnosis();
  syncTableValues();
  renderExport();
  scheduleRecalc({ kind: 'enemy', enemyId });
}

function resetWeaponState(weaponId: string): void {
  setOverrides(resetWeaponOverride(overrides, weaponId));
  syncWeapons();
  scheduleRecalc({ kind: 'weapon', weaponId });
}

function resetWeaponFieldState(weaponId: string, field: WeaponField): void {
  setOverrides(resetWeaponFieldOverride(overrides, weaponId, field));
  const refs = weaponRefs.get(weaponId);
  if (refs) {
    const input = field === 'accuracy' ? refs.accuracy : refs.damage;
    input.value = String(workingCatalog.weapons[weaponId]?.[field] ?? '');
    input.removeAttribute('aria-invalid');
    const error = field === 'accuracy' ? refs.accuracyError : refs.damageError;
    error.textContent = '';
  }
  scheduleRecalc({ kind: 'weapon', weaponId });
}

function resetAllState(): void {
  overrides = resetAllOverrides();
  targets = createTargets();
  workingCatalog = createWorkingCatalog(CATALOG, overrides);
  selected = {
    heroId: HERO_ORDER[0] as string,
    enemyId: ENEMY_ORDER[0] as string,
  };
  recomputeAll();
  benchStatus.textContent =
    'Banco restablecido: catálogo base y objetivos de guía; 12 filas medidas de nuevo.';
}

function resetEnemiesState(): void {
  overrides = resetEnemyOverrides(overrides);
  targets = resetTargets();
  recomputeAll();
  benchStatus.textContent =
    'Enemigos restablecidos: catálogo base y objetivos de guía; 12 filas medidas de nuevo.';
}

function resetWeaponsState(): void {
  overrides = resetWeaponOverrides(overrides);
  recomputeAll();
  benchStatus.textContent =
    'Armas restablecidas: catálogo base; 12 filas medidas de nuevo.';
}

function resetHeroesState(): void {
  overrides = resetHeroOverrides(overrides);
  recomputeAll();
  benchStatus.textContent =
    'Héroes restablecidos: catálogo base; 12 filas medidas de nuevo.';
}

function assertHero(heroId: string): void {
  if (!CATALOG.roster.some((hero) => hero.id === heroId)) {
    throw new RangeError(`Héroe desconocido: ${heroId}.`);
  }
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

function resetHeroState(heroId: string): void {
  assertHero(heroId);
  setOverrides(resetHeroOverride(overrides, heroId));
  recalculateNow({ kind: 'hero', heroId });
}

function refreshDiagnosisOnly(): void {
  diagnosis = diagnoseBench(results.matchups, targets, workingCatalog);
  syncDiagnosis();
  syncTableValues();
  renderExport();
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

function setEnemyField(enemyId: string, field: EnemyField, value: unknown): void {
  if (!findTemplate(CATALOG, enemyId)) {
    throw new RangeError(`Enemigo desconocido: ${enemyId}.`);
  }
  const validation = validateEnemyField(field, value, CATALOG);
  if (!validation.ok) throw new RangeError(validation.message);
  setOverrides(withEnemyOverride(overrides, enemyId, enemyFieldPatch(field, validation.value)));
  recalculateNow({ kind: 'enemy', enemyId });
}

function resetEnemyFieldApi(enemyId: string, field: EnemyField): void {
  resetEnemyField(enemyId, field);
  recalculateNow({ kind: 'enemy', enemyId });
}

function setWeaponField(
  weaponId: string,
  field: WeaponField,
  value: unknown,
): void {
  if (!workingCatalog.weapons[weaponId]) {
    throw new RangeError(`Arma desconocida: ${weaponId}.`);
  }
  const validation = validateWeaponField(field, value);
  if (!validation.ok) throw new RangeError(validation.message);
  const patch = field === 'accuracy'
    ? { accuracy: validation.value }
    : { damage: validation.value };
  setOverrides(withWeaponOverride(overrides, weaponId, patch));
  recalculateNow({ kind: 'weapon', weaponId });
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
    resetEnemyState(enemyId);
    recalculateNow({ kind: 'enemy', enemyId });
  },
  resetWeapon: (weaponId) => {
    resetWeaponState(weaponId);
    recalculateNow({ kind: 'weapon', weaponId });
  },
  resetWeaponField: (weaponId, field) => {
    if (!workingCatalog.weapons[weaponId]) {
      throw new RangeError(`Arma desconocida: ${weaponId}.`);
    }
    resetWeaponFieldState(weaponId, field);
    recalculateNow({ kind: 'weapon', weaponId });
  },
  resetAll: () => {
    resetAllState();
  },
  setEnemyField: (enemyId, field, value) => {
    setEnemyField(enemyId, field as EnemyField, value);
  },
  resetEnemyField: (enemyId, field) => {
    resetEnemyFieldApi(enemyId, field as EnemyField);
  },
  setWeaponField: (weaponId, field, value) => {
    setWeaponField(weaponId, field, value);
  },
  setHeroField: (heroId, field, value) => {
    setHeroFieldApi(heroId, field as HeroField, value);
  },
  resetHeroField: (heroId, field) => {
    resetHeroFieldApi(heroId, field as HeroField);
  },
  resetHero: (heroId) => {
    resetHeroState(heroId);
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

renderAll();
setStatus(
  controlsStatus,
  `Semilla ${seed} · ${duels} duelos por emparejamiento · ${results.matchups.length} emparejamientos.`,
);
benchStatus.textContent = 'Listo. Edita un objetivo o un campo para recalcular.';
