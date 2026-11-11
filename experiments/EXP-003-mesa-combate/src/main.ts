import '../../_shell/styles.css';
import './experiment.css';
import { copyJson } from '../../_shell/export';
import type { ExperimentTestApi } from '../../_shell/types';
import { CATALOG } from './v2/catalog';
import {
  DEFAULT_DUELS,
  DEFAULT_SEED,
  HERO_ORDER,
  ENEMY_ORDER,
  measureMatchups,
} from './v2/measure';
import type {
  MatchupResult,
  MeasurementPayload,
} from './v2/measure';
import {
  DUEL_LIMITS,
  EXPERIMENT_DESCRIPTION,
  EXPERIMENT_ID,
  EXPERIMENT_QUESTION,
  EXPERIMENT_TITLE,
  SEED_LIMITS,
  buildExport,
  buildSnapshot,
  durationRows,
  exportFileName,
  exportJson,
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
  type ExportPayload,
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
let results: MeasurementPayload = measureMatchups({ seed, duels });
let selected = {
  heroId: HERO_ORDER[0] as string,
  enemyId: ENEMY_ORDER[0] as string,
};

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

const tablePanel = element('section', {
  className: 'panel matchup-panel',
  testId: 'matchup-panel',
});
tablePanel.append(
  element('h2', { text: '12 emparejamientos' }),
  element('p', {
    className: 'panel-hint',
    text: 'Banda objetivo: 40–60 % de victorias del héroe, tolerancia ±2 pp, héroe con iniciativa. Réplicas en formato disparadas/impactos/muertes; maná y daño en formato héroe/enemigo.',
  }),
);
const tableScroll = element('div', { className: 'table-scroll' });
const table = element('table', { className: 'matchup-table', testId: 'matchup-table' });
const tableHead = element('thead');
const headRow = element('tr');
for (const label of [
  'Héroe',
  'Enemigo',
  'Victorias héroe',
  'Victorias enemigo',
  'Banda 40–60 %',
  'Turnos / rondas',
  'TTK (rondas)',
  'Réplicas héroe',
  'Réplicas enemigo',
  'Hechizos',
  'Maná gastado H/E',
  'Daño H/E',
  'Detalle',
]) {
  headRow.append(element('th', { text: label }));
}
tableHead.append(headRow);
const tableBody = element('tbody', { testId: 'matchup-rows' });
table.append(tableHead, tableBody);
tableScroll.append(table);
tablePanel.append(tableScroll);

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
    text: 'Incluye versión de catálogo, semilla, escenario, catálogo y métricas. Sin marca de tiempo: la misma semilla y los mismos duelos producen el mismo JSON.',
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

root.append(header, toolbar, tablePanel, detailPanel, exportPanel);

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

function renderTable(): void {
  tableBody.replaceChildren();
  for (const matchup of results.matchups) {
    const key = matchupKey(matchup.heroId, matchup.enemyId);
    const row = element('tr', { testId: `matchup-row-${matchup.heroId}-${matchup.enemyId}` });
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
    const mana = manaSpent(matchup);
    const selectButton = element('button', {
      className: 'button ghost matchup-select',
      text: 'Ver',
      testId: `matchup-select-${matchup.heroId}-${matchup.enemyId}`,
    });
    selectButton.type = 'button';
    selectButton.addEventListener('click', () => {
      selected = { heroId: matchup.heroId, enemyId: matchup.enemyId };
      renderTable();
      renderDetail();
      setStatus(
        controlsStatus,
        `Detalle: ${matchupTitle(CATALOG, matchup)} (${key}).`,
      );
    });

    row.append(
      element('td', { text: unitName(CATALOG, matchup.heroId) }),
      element('td', { text: unitName(CATALOG, matchup.enemyId) }),
      element('td', {
        text: `${matchup.heroWins} (${formatPercent(matchup.heroWinRate)})`,
      }),
      element('td', {
        text: `${matchup.enemyWins} (${formatPercent(matchup.enemyWinRate)})`,
      }),
      element('td'),
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
      element('td'),
    );
    const cells = row.querySelectorAll('td');
    cells[4].append(band);
    cells[12].append(selectButton);
    tableBody.append(row);
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
    text: matchupTitle(CATALOG, matchup),
    testId: 'detail-title',
  });
  detailHost.append(heading, actions, spells, mana, hp, replicas, duration);
}

function currentExport(): ExportPayload {
  return buildExport(results, CATALOG);
}

function renderExport(): void {
  const payload = currentExport();
  const text = exportJson(payload);
  const bytes = new TextEncoder().encode(text).length;
  const finding = findingSummary(results.matchups);
  exportSummary.textContent =
    `experimento ${payload.experiment} · motor ${payload.engine} · catálogo ${payload.catalogVersion}\n` +
    `semilla ${payload.seed} · ${payload.duels} duelos por emparejamiento · escenario ${payload.scenario.id}\n` +
    `catálogo: ${payload.catalog.roster.length} héroes, ${payload.catalog.bestiary.length} enemigos, ` +
    `${Object.keys(payload.catalog.spells).length} hechizos\n` +
    `métricas: ${payload.matchups.length} emparejamientos, ${finding.outside} fuera de banda · ${bytes} B`;
}

function renderAll(): void {
  syncControls();
  renderBalanceWarning();
  renderTable();
  renderDetail();
  renderExport();
}

function recompute(message?: string): MeasurementPayload {
  results = measureMatchups({ seed, duels });
  renderAll();
  if (message) setStatus(controlsStatus, message);
  return results;
}

function applySeed(value: number | string, announce = false): void {
  seed = normalizeSeed(value);
  recompute(announce ? `Semilla ${seed}: 12 emparejamientos recalculados.` : undefined);
}

function applyDuels(value: number | string, announce = false): void {
  duels = normalizeDuels(value);
  recompute(
    announce
      ? `${duels} duelos por emparejamiento: 12 emparejamientos recalculados.`
      : undefined,
  );
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
  applySeed(seedInput.value, true);
});

duelInput.addEventListener('change', () => {
  applyDuels(duelInput.value, true);
});

runButton.addEventListener('click', () => {
  recompute(`Semilla ${seed} · ${duels} duelos por emparejamiento.`);
});

resetButton.addEventListener('click', () => {
  seed = DEFAULT_SEED;
  duels = DEFAULT_DUELS;
  selected = {
    heroId: results.matchups[0].heroId,
    enemyId: results.matchups[0].enemyId,
  };
  recompute(`Restablecido a semilla ${DEFAULT_SEED} y ${DEFAULT_DUELS} duelos.`);
});

copyButton.addEventListener('click', async () => {
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
  const payload = currentExport();
  downloadText(exportFileName(payload), exportJson(payload));
  setStatus(exportStatus, `JSON exportado: ${exportFileName(payload)}.`);
});

const api: V2ExperimentApi = {
  id: EXPERIMENT_ID,
  getSeed: () => seed,
  setSeed: (next) => {
    applySeed(next);
  },
  getDuels: () => duels,
  setDuels: (next) => {
    applyDuels(next);
  },
  runAll: () => recompute(),
  getResults: () => results,
  snapshot: () => buildSnapshot(results, selected),
  getDecision: () => currentExport(),
  reset: () => {
    seed = DEFAULT_SEED;
    duels = DEFAULT_DUELS;
    selected = {
      heroId: results.matchups[0].heroId,
      enemyId: results.matchups[0].enemyId,
    };
    recompute();
  },
};

window.__experiment = api as unknown as ExperimentTestApi;

renderAll();
setStatus(
  controlsStatus,
  `Semilla ${seed} · ${duels} duelos por emparejamiento · ${results.matchups.length} emparejamientos.`,
);
