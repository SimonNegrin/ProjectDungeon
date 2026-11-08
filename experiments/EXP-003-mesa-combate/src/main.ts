import '../../_shell/styles.css';
import './experiment.css';
import { copyJson, downloadJson } from '../../_shell/export';
import type { ExperimentTestApi } from '../../_shell/types';
import {
  DEFAULT_DUELS,
  DEFAULT_SEED,
  DUEL_LIMITS,
  EXPERIMENT_ID,
  EXPERIMENT_QUESTION,
  EXPERIMENT_TITLE,
  PRESET_DEFINITIONS,
  WEAPONS,
  WEAPON_OPTIONS,
  addCombatant,
  attackSummary,
  buildCombatDecision,
  createPresetRoster,
  duplicateCombatant,
  findCombatant,
  normalizeCombatant,
  normalizeDuelCount,
  normalizeSeed,
  removeCombatant,
  roundTo,
  simulateDuel,
  updateCombatant,
  type AttackSummary,
  type CombatDecisionPayload,
  type CombatExperimentApi,
  type Combatant,
  type CombatantPatch,
  type DuelSummary,
  type PresetId,
  type RosterMode,
  type Side,
  type WeaponId,
} from './combat';

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

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toFixed(digits).replace('.', ',');
}

function formatPercent(fraction: number, digits = 1): string {
  return `${formatNumber(fraction * 100, digits)} %`;
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');

const query = new URLSearchParams(window.location.search);
const testMode = query.has('test');
const rawSeed = query.get('seed');
const querySeed = rawSeed === null ? Number.NaN : Number(rawSeed);
const queryPreset = query.get('preset');
const queryDuels = query.get('duels');

let seed = Number.isFinite(querySeed)
  ? normalizeSeed(querySeed)
  : testMode
    ? DEFAULT_SEED
    : randomSeed();
let preset: RosterMode =
  queryPreset === 'A' ||
  queryPreset === 'B' ||
  queryPreset === 'C' ||
  queryPreset === 'D' ||
  queryPreset === 'personalizada'
    ? queryPreset
    : 'A';
let roster = createPresetRoster(preset === 'personalizada' ? 'A' : preset);
let duelCount = queryDuels === null ? DEFAULT_DUELS : normalizeDuelCount(queryDuels);
let attackerId = roster[0]?.id ?? '';
let defenderId = roster[1]?.id ?? '';
let attackMetrics: AttackSummary | null = null;
let duelSummary: DuelSummary | null = null;
let decision = '';
let notes = '';

document.title = `${EXPERIMENT_TITLE} · ProyectDungeon`;

root.classList.add('experiment-shell');
root.replaceChildren();

const header = element('header', { className: 'experiment-header' });
header.append(
  element('span', { className: 'eyebrow', text: EXPERIMENT_ID }),
  element('h1', { text: EXPERIMENT_TITLE, testId: 'experiment-title' }),
  element('p', { className: 'question', text: EXPERIMENT_QUESTION }),
  element('p', {
    className: 'description',
    text: 'Mesa de medición, no de decisión: edita el roster, compara presets y simula ataques y duelos. Los valores de C y D son hipótesis de playtest, no están aprobados.',
  }),
);
if (testMode) {
  header.append(
    element('span', { className: 'test-badge', text: 'modo test determinista' }),
  );
}

const toolbar = element('div', { className: 'toolbar' });
const seedLabel = element('label', { className: 'seed-label' });
seedLabel.append(element('span', { text: 'Semilla' }));
const seedInput = element('input', { testId: 'seed-input' });
seedInput.type = 'number';
seedInput.min = '0';
seedInput.max = '4294967295';
seedInput.step = '1';
seedInput.value = String(seed);
seedLabel.append(seedInput);

const duelLabel = element('label', { className: 'seed-label' });
duelLabel.append(element('span', { text: 'Duelos simulados' }));
const duelInput = element('input', { testId: 'duel-count' });
duelInput.type = 'number';
duelInput.min = String(DUEL_LIMITS.min);
duelInput.max = String(DUEL_LIMITS.max);
duelInput.step = String(DUEL_LIMITS.step);
duelInput.value = String(duelCount);
duelLabel.append(duelInput);

const regenerateButton = element('button', {
  className: 'button ghost',
  text: 'Nueva semilla',
  testId: 'seed-regenerate',
});
regenerateButton.type = 'button';

const resetButton = element('button', {
  className: 'button ghost',
  text: 'Volver a A',
  testId: 'roster-reset',
});
resetButton.type = 'button';

toolbar.append(seedLabel, duelLabel, regenerateButton, resetButton);

const layout = element('div', { className: 'experiment-layout', testId: 'combat-board' });
const controlsPanel = element('aside', { className: 'panel controls-panel' });
controlsPanel.append(
  element('h2', { text: 'Preset y selección' }),
  element('p', {
    className: 'panel-hint',
    text: 'Cambiar de preset reconstruye el roster y recalcula todas las métricas sin recargar. Mover cualquier campo pasa a «Personalizada».',
  }),
);

function createSelect(
  id: string,
  options: ReadonlyArray<{ value: string; label: string }>,
): HTMLSelectElement {
  const select = element('select', { testId: `param-${id}` });
  for (const option of options) select.append(new Option(option.label, option.value));
  return select;
}

function control(labelText: string, input: HTMLElement, hint?: string): HTMLLabelElement {
  const label = element('label', { className: 'control' });
  const heading = element('span', { className: 'control-heading' });
  heading.append(element('span', { text: labelText }));
  label.append(heading, input);
  if (hint) label.append(element('span', { className: 'control-hint', text: hint }));
  return label;
}

const presetSelect = createSelect('preset', [
  ...(['A', 'B', 'C', 'D'] as PresetId[]).map((id) => ({
    value: id,
    label: PRESET_DEFINITIONS[id].label,
  })),
  { value: 'personalizada', label: PRESET_DEFINITIONS.personalizada.label },
]);

const presetDescription = element('p', {
  className: 'preset-description',
  testId: 'preset-description',
});

const presetNotes = element('details', { className: 'preset-notes', testId: 'preset-notes' });
presetNotes.append(
  element('summary', { text: 'Valores de C y D (no aprobados)' }),
  element('p', { text: 'C · Tanque: +6 PV y +1 armadura; −1 daño base (mínimo 0).' }),
  element('p', { text: 'D · Letal: PV × 0,65 (mínimo 4); +2 daño base.' }),
);

const attackerSelect = createSelect('attacker', []);
const defenderSelect = createSelect('defender', []);

const attackPanel = element('article', { className: 'combat-card', testId: 'attack-panel' });
attackPanel.append(
  element('h3', { text: 'Un ataque' }),
  element('p', {
    className: 'card-hint',
    text: 'Impacto: mod. acierto + arma + 1d6 > mod. defensa + escudo + 1d6. El empate falla. El escudo no reduce daño.',
  }),
);

type MetricCard = { card: HTMLElement; value: HTMLElement };
function metricCard(label: string, testId: string): MetricCard {
  const card = element('div', { className: 'metric' });
  card.append(element('span', { className: 'metric-label', text: label }));
  const value = element('strong', { className: 'metric-value', text: '—', testId });
  card.append(value);
  return { card, value };
}

const attackMetricsHost = element('div', { className: 'metrics' });
const attackChance = metricCard('Prob. impacto', 'attack-impact-chance');
const attackMin = metricCard('Daño mínimo', 'attack-damage-min');
const attackMean = metricCard('Daño medio', 'attack-damage-mean');
const attackMax = metricCard('Daño máximo', 'attack-damage-max');
const attackExpected = metricCard('Daño esperado/ataque', 'attack-expected-damage');
const attackKill = metricCard('Ataques para matar', 'attack-expected-attacks');
attackMetricsHost.append(
  attackChance.card,
  attackMin.card,
  attackMean.card,
  attackMax.card,
  attackExpected.card,
  attackKill.card,
);

const distribution = element('div', {
  className: 'distribution',
  testId: 'damage-distribution',
});
attackPanel.append(attackMetricsHost, distribution);

const duelPanel = element('article', { className: 'combat-card', testId: 'duel-panel' });
duelPanel.append(
  element('h3', { text: 'Duelo simulado' }),
  element('p', {
    className: 'card-hint',
    text: 'El atacante golpea primero y se alterna hasta que uno cae. La semilla se deriva por duelo; misma semilla y roster dan el mismo resultado.',
  }),
);

const duelMetrics = element('div', { className: 'metrics' });
const duelAttackerWins = metricCard('Victorias atacante', 'duel-attacker-wins');
const duelDefenderWins = metricCard('Victorias defensor', 'duel-defender-wins');
const duelAverageTurns = metricCard('Turnos medios', 'duel-average-turns');
const duelAverageHp = metricCard('PV medios restantes', 'duel-average-hp');
const duelCountValue = metricCard('Duelos', 'duel-count-value');
duelMetrics.append(
  duelAttackerWins.card,
  duelDefenderWins.card,
  duelAverageTurns.card,
  duelAverageHp.card,
  duelCountValue.card,
);

const simulateButton = element('button', {
  className: 'button',
  text: 'Simular de nuevo',
  testId: 'duel-simulate',
});
simulateButton.type = 'button';

const duelNote = element('p', {
  className: 'card-hint',
  testId: 'duel-note',
  text: 'Los duelos se recalculan al cambiar preset, selección, semilla o número de duelos.',
});
duelPanel.append(duelMetrics, simulateButton, duelNote);

const rosterPanel = element('section', { className: 'panel roster-panel', testId: 'roster-panel' });
const rosterHeader = element('header', { className: 'roster-header' });
const rosterHeading = element('div');
rosterHeading.append(
  element('h2', { text: 'Roster' }),
  element('p', {
    className: 'panel-hint',
    text: 'Edita nombre, bando, PV, modificadores, arma, escudo y armadura. Los IDs se mantienen al editar.',
  }),
);
const addButton = element('button', {
  className: 'button',
  text: 'Añadir combatiente',
  testId: 'roster-add',
});
addButton.type = 'button';
rosterHeader.append(rosterHeading, addButton);

const rosterScroll = element('div', { className: 'roster-scroll' });
const rosterTable = element('table', { className: 'roster-table', testId: 'roster-table' });
const rosterHead = element('thead');
const headRow = element('tr');
for (const label of [
  'Nombre',
  'Bando',
  'PV',
  'Ac. base',
  'Da. base',
  'Def. base',
  'Arma',
  'Ac. arma',
  'Da. arma',
  'Escudo',
  'Armadura',
  'Acciones',
]) {
  headRow.append(element('th', { text: label }));
}
rosterHead.append(headRow);
const rosterBody = element('tbody');
rosterTable.append(rosterHead, rosterBody);
rosterScroll.append(rosterTable);
rosterPanel.append(rosterHeader, rosterScroll);

const combatGrid = element('div', { className: 'combat-grid' });
combatGrid.append(attackPanel, duelPanel);

const controlsHost = element('div', { className: 'controls' });
controlsHost.append(
  control('Preset', presetSelect, 'A y B comparan la tabla propuesta con base +0.'),
  presetDescription,
  presetNotes,
  control('Atacante', attackerSelect),
  control('Defensor', defenderSelect),
);

controlsPanel.append(controlsHost);
layout.append(controlsPanel, rosterPanel, combatGrid);
root.append(header, toolbar, layout);

const decisionPanel = element('section', { className: 'panel decision-panel' });
decisionPanel.append(
  element('h2', { text: 'Exportar la tabla' }),
  element('p', {
    className: 'panel-hint',
    text: 'Elige la opción que quieres llevar al playtest, añade notas y descarga el JSON. Exportar no decide por ti.',
  }),
);

const decisionSelect = element('select', { testId: 'decision-select' });
decisionSelect.append(new Option('Selecciona una opción…', ''));
for (const id of ['A', 'B', 'C', 'D'] as PresetId[]) {
  decisionSelect.append(new Option(PRESET_DEFINITIONS[id].label, id));
}
decisionSelect.append(new Option('Personalizada (roster actual)', 'personalizada'));

const decisionNotes = element('textarea', { testId: 'decision-notes' });
decisionNotes.rows = 3;
decisionNotes.placeholder = '¿Cómo se siente el combate? ¿Qué tabla quieres probar?';

const decisionActions = element('div', { className: 'decision-actions' });
const copyButton = element('button', {
  className: 'button ghost',
  text: 'Copiar JSON',
  testId: 'decision-copy',
});
copyButton.type = 'button';
const downloadButton = element('button', {
  className: 'button',
  text: 'Descargar JSON',
  testId: 'decision-download',
});
downloadButton.type = 'button';
decisionActions.append(copyButton, downloadButton);

const decisionStatus = element('p', {
  className: 'status',
  testId: 'decision-status',
});
decisionStatus.setAttribute('aria-live', 'polite');

decisionPanel.append(decisionSelect, decisionNotes, decisionActions, decisionStatus);
root.append(decisionPanel);

function uniqueRoster(): Combatant[] {
  return ensureUniqueIds(roster);
}

function ensureSelection(): void {
  const ids = new Set(roster.map((combatant) => combatant.id));
  if (!ids.has(attackerId)) attackerId = roster[0]?.id ?? '';
  if (!ids.has(defenderId) || defenderId === attackerId) {
    defenderId =
      roster.find((combatant) => combatant.id !== attackerId)?.id ?? '';
  }
}

function currentPair(): { attacker: Combatant; defender: Combatant } | null {
  const attacker = findCombatant(roster, attackerId);
  const defender = findCombatant(roster, defenderId);
  if (!attacker || !defender || attacker.id === defender.id) return null;
  return { attacker, defender };
}

function setStatus(message: string): void {
  decisionStatus.textContent = message;
}

function markCustom(): void {
  preset = 'personalizada';
  presetSelect.value = 'personalizada';
  presetDescription.textContent = PRESET_DEFINITIONS.personalizada.detail;
}

function selectionOptions(): void {
  for (const select of [attackerSelect, defenderSelect]) {
    const previous = select.value;
    select.replaceChildren();
    for (const combatant of roster) {
      select.append(
        new Option(
          `${combatant.name} · ${combatant.side === 'jugador' ? 'jugador' : 'enemigo'}`,
          combatant.id,
        ),
      );
    }
    select.value = previous;
  }
  attackerSelect.value = attackerId;
  defenderSelect.value = defenderId;
}

function syncPreset(): void {
  presetSelect.value = preset;
  presetDescription.textContent = PRESET_DEFINITIONS[preset].detail;
}

function numericInput(
  value: number,
  testId: string,
  min: number,
  max: number,
): HTMLInputElement {
  const input = element('input', { className: 'roster-input roster-number', testId });
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  return input;
}

function sideSelect(value: Side, testId: string): HTMLSelectElement {
  const select = element('select', { className: 'roster-input', testId });
  select.append(new Option('Jugador', 'jugador'), new Option('Enemigo', 'enemigo'));
  select.value = value;
  return select;
}

function weaponSelect(value: WeaponId, testId: string): HTMLSelectElement {
  const select = element('select', { className: 'roster-input', testId });
  for (const option of WEAPON_OPTIONS) {
    select.append(new Option(option.label, option.value));
  }
  select.value = value;
  return select;
}

function applyRosterUpdate(id: string, patch: CombatantPatch): Combatant | undefined {
  roster = updateCombatant(roster, id, patch);
  return findCombatant(roster, id);
}

function renderRoster(): void {
  rosterBody.replaceChildren();
  for (const combatant of roster) {
    const row = element('tr', { testId: `roster-row-${combatant.id}` });
    const nameInput = element('input', {
      className: 'roster-input roster-name',
      testId: `roster-${combatant.id}-name`,
    });
    nameInput.type = 'text';
    nameInput.value = combatant.name;
    nameInput.addEventListener('input', () => {
      applyRosterUpdate(combatant.id, { name: nameInput.value });
      markCustom();
      selectionOptions();
    });

    const side = sideSelect(combatant.side, `roster-${combatant.id}-side`);
    side.addEventListener('change', () => {
      applyRosterUpdate(combatant.id, { side: side.value as Side });
      markCustom();
      selectionOptions();
      recompute();
    });

    const numberFields: Array<{
      key:
        | 'hp'
        | 'acc'
        | 'dmg'
        | 'def'
        | 'weaponAcc'
        | 'weaponDmg'
        | 'shield'
        | 'armor';
      input: HTMLInputElement;
    }> = [
      { key: 'hp', input: numericInput(combatant.hp, `roster-${combatant.id}-hp`, 1, 99) },
      { key: 'acc', input: numericInput(combatant.acc, `roster-${combatant.id}-acc`, -5, 10) },
      { key: 'dmg', input: numericInput(combatant.dmg, `roster-${combatant.id}-dmg`, -5, 10) },
      { key: 'def', input: numericInput(combatant.def, `roster-${combatant.id}-def`, -5, 10) },
    ];

    const weapon = weaponSelect(combatant.weapon, `roster-${combatant.id}-weapon`);
    const weaponAcc = numericInput(
      combatant.weaponAcc,
      `roster-${combatant.id}-weaponAcc`,
      0,
      10,
    );
    const weaponDmg = numericInput(
      combatant.weaponDmg,
      `roster-${combatant.id}-weaponDmg`,
      1,
      20,
    );
    const shield = numericInput(
      combatant.shield,
      `roster-${combatant.id}-shield`,
      0,
      10,
    );
    const armor = numericInput(
      combatant.armor,
      `roster-${combatant.id}-armor`,
      0,
      10,
    );
    numberFields.push(
      { key: 'weaponAcc', input: weaponAcc },
      { key: 'weaponDmg', input: weaponDmg },
      { key: 'shield', input: shield },
      { key: 'armor', input: armor },
    );

    for (const field of numberFields) {
      field.input.addEventListener('change', () => {
        const updated = applyRosterUpdate(combatant.id, {
          [field.key]: Number(field.input.value),
        });
        markCustom();
        if (updated) field.input.value = String(updated[field.key]);
        if (field.key === 'weaponAcc' || field.key === 'weaponDmg') {
          applyRosterUpdate(combatant.id, { weapon: 'personalizada' });
          weapon.value = 'personalizada';
        }
        selectionOptions();
        recompute();
      });
    }

    weapon.addEventListener('change', () => {
      const nextWeapon = weapon.value as WeaponId;
      const patch: CombatantPatch =
        nextWeapon === 'personalizada'
          ? { weapon: nextWeapon }
          : {
              weapon: nextWeapon,
              weaponAcc: WEAPONS[nextWeapon].acc,
              weaponDmg: WEAPONS[nextWeapon].dmg,
            };
      applyRosterUpdate(combatant.id, patch);
      markCustom();
      renderRoster();
      selectionOptions();
      recompute();
    });

    const duplicateButton = element('button', {
      className: 'button ghost roster-action',
      text: 'Duplicar',
      testId: `roster-${combatant.id}-duplicate`,
    });
    duplicateButton.type = 'button';
    duplicateButton.addEventListener('click', () => {
      roster = duplicateCombatant(roster, combatant.id);
      markCustom();
      ensureSelection();
      renderAll();
      setStatus(`Duplicado ${combatant.name}.`);
    });

    const removeButton = element('button', {
      className: 'button ghost roster-action danger',
      text: 'Eliminar',
      testId: `roster-${combatant.id}-remove`,
    });
    removeButton.type = 'button';
    removeButton.addEventListener('click', () => {
      roster = removeCombatant(roster, combatant.id);
      roster = uniqueRoster();
      markCustom();
      ensureSelection();
      renderAll();
      setStatus(`Eliminado ${combatant.name}.`);
    });

    const actions = element('div', { className: 'roster-actions' });
    actions.append(duplicateButton, removeButton);

    row.append(
      element('td'),
      element('td'),
      ...numberFields.slice(0, 4).map(() => element('td')),
      element('td'),
      element('td'),
      element('td'),
      element('td'),
      element('td'),
      element('td'),
    );
    const cells = row.querySelectorAll('td');
    cells[0].append(nameInput);
    cells[1].append(side);
    cells[2].append(numberFields[0].input);
    cells[3].append(numberFields[1].input);
    cells[4].append(numberFields[2].input);
    cells[5].append(numberFields[3].input);
    cells[6].append(weapon);
    cells[7].append(weaponAcc);
    cells[8].append(weaponDmg);
    cells[9].append(shield);
    cells[10].append(armor);
    cells[11].append(actions);
    rosterBody.append(row);
  }
}

function renderDistribution(): void {
  distribution.replaceChildren();
  if (!attackMetrics) {
    distribution.append(
      element('p', { className: 'metric-empty', text: 'Elige dos combatientes distintos.' }),
    );
    return;
  }
  distribution.append(element('h4', { text: 'Distribución del daño por impacto' }));
  for (const entry of attackMetrics.distribution) {
    distribution.append(
      element('p', {
        className: 'distribution-row',
        text: `${entry.damage} de daño · ${entry.count}/36 · ${formatPercent(entry.probability)}`,
      }),
    );
  }
}

function renderMetrics(): void {
  duelCountValue.value.textContent = String(duelCount);
  if (!attackMetrics || !duelSummary) {
    for (const metric of [
      attackChance,
      attackMin,
      attackMean,
      attackMax,
      attackExpected,
      attackKill,
      duelAttackerWins,
      duelDefenderWins,
      duelAverageTurns,
      duelAverageHp,
    ]) {
      metric.value.textContent = '—';
    }
    simulateButton.disabled = true;
    copyButton.disabled = true;
    downloadButton.disabled = true;
    renderDistribution();
    return;
  }

  attackChance.value.textContent = `${formatPercent(attackMetrics.impactChance)} (${attackMetrics.impactHits}/36)`;
  attackMin.value.textContent = String(attackMetrics.damageMin);
  attackMean.value.textContent = formatNumber(attackMetrics.damageMean);
  attackMax.value.textContent = String(attackMetrics.damageMax);
  attackExpected.value.textContent = formatNumber(
    attackMetrics.expectedDamagePerAttack,
  );
  attackKill.value.textContent = formatNumber(
    attackMetrics.expectedAttacksToKill,
  );

  duelAttackerWins.value.textContent = `${duelSummary.attackerWins} (${formatPercent(
    duelSummary.attackerWinRate,
  )})`;
  duelDefenderWins.value.textContent = `${duelSummary.defenderWins} (${formatPercent(
    duelSummary.defenderWinRate,
  )})`;
  duelAverageTurns.value.textContent = formatNumber(duelSummary.averageTurns);
  duelAverageHp.value.textContent = formatNumber(duelSummary.averageWinnerHp);
  simulateButton.disabled = false;
  copyButton.disabled = false;
  downloadButton.disabled = false;
  renderDistribution();
}

function recompute(): void {
  const pair = currentPair();
  if (!pair) {
    attackMetrics = null;
    duelSummary = null;
  } else {
    attackMetrics = attackSummary(pair.attacker, pair.defender);
    duelSummary = simulateDuel(pair.attacker, pair.defender, seed, duelCount);
  }
  renderMetrics();
}

function renderSelection(): void {
  selectionOptions();
  attackerSelect.disabled = roster.length < 2;
  defenderSelect.disabled = roster.length < 2;
}

function renderAll(): void {
  syncPreset();
  renderRoster();
  renderSelection();
  recompute();
}

function applyPreset(next: RosterMode, announce = false): void {
  preset = next;
  if (next !== 'personalizada') roster = createPresetRoster(next);
  roster = uniqueRoster();
  ensureSelection();
  renderAll();
  if (announce) setStatus(`Preset ${PRESET_DEFINITIONS[next].label} aplicado.`);
}

function currentDecisionPayload(): CombatDecisionPayload {
  return buildCombatDecision({
    roster,
    preset,
    seed,
    duels: duelCount,
    attackerId,
    defenderId,
    decision,
    notes,
    decidedAt: new Date().toISOString(),
  });
}

presetSelect.addEventListener('change', () => {
  applyPreset(presetSelect.value as RosterMode, true);
});

attackerSelect.addEventListener('change', () => {
  attackerId = attackerSelect.value;
  recompute();
});

defenderSelect.addEventListener('change', () => {
  defenderId = defenderSelect.value;
  recompute();
});

addButton.addEventListener('click', () => {
  roster = addCombatant(roster);
  markCustom();
  ensureSelection();
  renderAll();
  setStatus('Combatiente añadido al roster.');
});

simulateButton.addEventListener('click', () => {
  recompute();
  setStatus(`Duelo simulado con semilla ${seed} y ${duelCount} repeticiones.`);
});

seedInput.addEventListener('change', () => {
  seed = normalizeSeed(seedInput.value);
  seedInput.value = String(seed);
  recompute();
  setStatus(`Semilla ${seed}.`);
});

duelInput.addEventListener('change', () => {
  duelCount = normalizeDuelCount(duelInput.value);
  duelInput.value = String(duelCount);
  recompute();
});

regenerateButton.addEventListener('click', () => {
  seed = randomSeed();
  seedInput.value = String(seed);
  recompute();
  setStatus(`Semilla ${seed}.`);
});

resetButton.addEventListener('click', () => {
  applyPreset('A', true);
});

decisionSelect.addEventListener('change', () => {
  decision = decisionSelect.value;
  if (decision === 'A' || decision === 'B' || decision === 'C' || decision === 'D') {
    applyPreset(decision);
  } else if (decision === 'personalizada') {
    markCustom();
    syncPreset();
    recompute();
  }
});

decisionNotes.addEventListener('input', () => {
  notes = decisionNotes.value;
});

copyButton.addEventListener('click', async () => {
  const copied = await copyJson(
    currentDecisionPayload() as unknown as Parameters<typeof copyJson>[0],
  );
  setStatus(copied ? 'JSON copiado al portapapeles.' : 'No se pudo copiar el JSON.');
});

downloadButton.addEventListener('click', () => {
  downloadJson(
    currentDecisionPayload() as unknown as Parameters<typeof downloadJson>[0],
  );
  setStatus('JSON exportado. Aún no es una decisión: falta el playtest.');
});

const api: CombatExperimentApi = {
  id: EXPERIMENT_ID,
  getSeed: () => seed,
  setSeed: (next) => {
    seed = normalizeSeed(next);
    seedInput.value = String(seed);
    recompute();
  },
  getPreset: () => preset,
  setPreset: (next) => {
    applyPreset(next);
  },
  getDuels: () => duelCount,
  setDuels: (next) => {
    duelCount = normalizeDuelCount(next);
    duelInput.value = String(duelCount);
    recompute();
  },
  getRoster: () => roster.map((combatant) => ({ ...combatant })),
  setRoster: (next) => {
    roster = ensureUniqueIds(
      next.map((combatant, index) =>
        normalizeCombatant(combatant, combatant.id ?? `custom-${index + 1}`),
      ),
    );
    markCustom();
    ensureSelection();
    renderAll();
  },
  addCombatant: (patch) => {
    roster = addCombatant(roster, patch);
    markCustom();
    ensureSelection();
    renderAll();
    return roster[roster.length - 1] ?? null;
  },
  duplicateCombatant: (id) => {
    const before = roster.length;
    roster = duplicateCombatant(roster, id);
    if (roster.length === before) return null;
    markCustom();
    ensureSelection();
    renderAll();
    return roster[roster.length - 1] ?? null;
  },
  updateCombatant: (id, patch) => {
    roster = updateCombatant(roster, id, patch);
    markCustom();
    ensureSelection();
    renderAll();
  },
  removeCombatant: (id) => {
    roster = removeCombatant(roster, id);
    roster = uniqueRoster();
    markCustom();
    ensureSelection();
    renderAll();
  },
  getSelection: () => ({ attackerId, defenderId }),
  setSelection: (nextAttacker, nextDefender) => {
    attackerId = nextAttacker;
    defenderId = nextDefender;
    ensureSelection();
    renderSelection();
    recompute();
  },
  calculateAttack: (nextAttacker, nextDefender) => {
    const attacker = findCombatant(roster, nextAttacker ?? attackerId);
    const defender = findCombatant(roster, nextDefender ?? defenderId);
    if (!attacker || !defender || attacker.id === defender.id) {
      throw new Error('El cálculo necesita dos combatientes distintos');
    }
    return attackSummary(attacker, defender);
  },
  simulateDuel: (options = {}) => {
    const attacker = findCombatant(roster, options.attackerId ?? attackerId);
    const defender = findCombatant(roster, options.defenderId ?? defenderId);
    if (!attacker || !defender || attacker.id === defender.id) {
      throw new Error('El duelo necesita dos combatientes distintos');
    }
    return simulateDuel(
      attacker,
      defender,
      normalizeSeed(options.seed ?? seed),
      normalizeDuelCount(options.duels ?? duelCount),
    );
  },
  getMetrics: () => {
    if (!attackMetrics || !duelSummary) {
      throw new Error('Selecciona dos combatientes distintos');
    }
    return { attack: attackMetrics, duel: duelSummary };
  },
  snapshot: () => ({
    params: {
      preset,
      seed,
      duels: duelCount,
      attacker: attackerId,
      defender: defenderId,
    },
    seed,
    variants: [
      {
        id: 'combat',
        metrics: [
          {
            label: 'Prob. impacto',
            value: attackMetrics ? roundTo(attackMetrics.impactChance * 100, 1) : 0,
          },
          {
            label: 'Daño esperado/ataque',
            value: attackMetrics
              ? roundTo(attackMetrics.expectedDamagePerAttack)
              : 0,
          },
          {
            label: 'Victorias atacante',
            value: duelSummary ? duelSummary.attackerWins : 0,
          },
          {
            label: 'Turnos medios',
            value: duelSummary ? duelSummary.averageTurns : 0,
          },
        ],
      },
    ],
    roster: roster.map((combatant) => ({ ...combatant })),
  }),
  getDecision: () => currentDecisionPayload(),
  reset: () => {
    seed = DEFAULT_SEED;
    seedInput.value = String(seed);
    duelCount = DEFAULT_DUELS;
    duelInput.value = String(duelCount);
    decision = '';
    notes = '';
    decisionSelect.value = '';
    decisionNotes.value = '';
    applyPreset('A');
  },
};

function ensureUniqueIds(list: ReadonlyArray<Combatant>): Combatant[] {
  const seen = new Set<string>();
  return list.map((combatant) => {
    let id = combatant.id;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${combatant.id}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    return id === combatant.id ? combatant : { ...combatant, id };
  });
}

window.__experiment = api as unknown as ExperimentTestApi;

renderAll();
