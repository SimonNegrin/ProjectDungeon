import { EQUIPMENT_SLOTS, ITEMS } from '../game/equipment';
import { backpackCount, type ItemInstance } from '../game/inventory';
import type { GameEvent, GameState, GroundItem, Position, Unit } from '../game/types';
import { alarmRadius, visionRadius } from '../game/perception';
import {
  pathLength,
  wideCorridorStretch,
  type Corridor,
  type Door,
  type Room,
} from '../game/map';
import type { Camera, CameraBounds } from './camera';
import type { CursorState, CursorStatus } from './cursor';
import { DAMAGE_TYPES, formatProfile, type BandRow } from './damage-labels';
import {
  archetypeLabel,
  armorLabel,
  buildCursorDetail,
  conditionLabel,
  formatActions,
  formatHp,
  formatMagic,
  formatMana,
  formatMp,
  shieldLabel,
  statsLabel,
  traitsLabel,
  weaponLabel,
  type CursorDetail,
  type CursorDetailKind,
  type PanelDetail,
  type PanelDetailBlock,
} from './hud-detail';
import type { Viewport } from './geometry';
import { NOTICE_DURATION_MS, NOTICE_MESSAGES, type NoticeCode } from './notices';
import { PANEL_SLOT_LABELS } from './inventory-panel';

export const KEYS_HELP =
  'Flechas/WASD cursor · Espacio/Enter moverse · F atacar · I panel · Escape cerrar · Q hechizos · X lanzar · E terminar turno · R reiniciar · F1 debug';

export interface HudModel {
  /** Nombre de instancia del jugador. */
  readonly playerName: string;
  /** Nombre del arquetipo del jugador; `—` si no tiene. */
  readonly archetype: string;
  readonly playerHp: string;
  readonly playerMp: string;
  /** Nivel de magia único del jugador (REQ-025 R-011). */
  readonly playerMagic: string;
  /** Maná actual/máximo del jugador; `0/0` sin magia. */
  readonly playerMana: string;
  /** `false` si el jugador no tiene maná y la fila se omite sin dejar hueco. */
  readonly playerManaVisible: boolean;
  /** Acciones restantes/máximas del jugador activo, p. ej. `2/2`. */
  readonly action: string;
  /** Traits activos derivados de las definiciones equipadas. */
  readonly traits: string;
  /** «Fantasma» con `hp <= 0`; no altera la mecánica de REQ-021. */
  readonly condition: string | null;
  /** Sugerencia discreta de terminar el turno; `null` si no aplica. */
  readonly actionSuggestion: string | null;
  readonly phase: string;
  readonly enemyHp: string;
  /** Arma equipada con sus valores del catálogo. */
  readonly weapon: string;
  readonly shield: string;
  readonly armor: string;
  /** Atributos inherentes del jugador (REQ-014): habilidad, fuerza y defensa. */
  readonly stats: string;
  /** Vida del enemigo vivo bajo el cursor; `—/—` si no hay ninguno. */
  readonly cursorEnemyHp: string;
  /** Nivel de magia del enemigo bajo el cursor; `—` si no hay ninguno. */
  readonly cursorEnemyMagic: string;
  /** Maná actual/máximo del enemigo bajo el cursor; `—/—` si no hay ninguno. */
  readonly cursorEnemyMana: string;
  /** `true` si el enemigo visible usa magia y procede mostrar magia/maná. */
  readonly cursorEnemyMagicVisible: boolean;
  /**
   * Cinco bandas del enemigo vivo bajo el cursor; `null` sin enemigo, con el
   * jugador muerto o sin línea de visión (REQ-029 R-010 / T-008).
   */
  readonly cursorEnemyBands: readonly BandRow[] | null;
  /** Composición del detalle bajo el cursor (REQ-023). */
  readonly cursorDetail: CursorDetail;
  /** Pista de recogida cuando el jugador ocupa un arma del mapa. */
  readonly weaponHint: string | null;
  readonly turn: string;
  readonly status: string;
  readonly keys: string;
  readonly overlays: {
    readonly victory: boolean;
    readonly defeat: boolean;
  };
}

export interface DebugModel {
  readonly lines: readonly string[];
}

/**
 * El turno solo se cierra con `E`; esta pista no bloquea ni envía ningún
 * comando. Aparece únicamente cuando el jugador ya no puede actuar ni moverse.
 */
function actionSuggestion(state: GameState): string | null {
  const player = state.players[0];
  if (!player) return null;
  if (state.phase !== 'player' || state.status !== 'playing') return null;
  if (player.actions.remaining > 0 || player.mp > 0) return null;
  return 'Sin acciones ni MP: pulsa E para terminar el turno';
}

function phaseLabel(state: GameState): string {
  return state.phase === 'player' ? 'Jugador' : 'Enemigo';
}

function statusLabel(state: GameState): string {
  if (state.status === 'victory') return 'Victoria';
  if (state.status === 'defeat') return 'Derrota';
  return 'En juego';
}

function boolLabel(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'Sí' : 'No';
}

function enemyAt(state: GameState, position: Position | undefined): Unit | undefined {
  if (!position) return undefined;
  return state.enemies.find(
    (enemy) => enemy.hp > 0 && enemy.x === position.x && enemy.y === position.y,
  );
}

function itemAtPlayer(
  state: GameState,
  player: Unit | undefined,
): GroundItem | undefined {
  if (!player) return undefined;
  return (state.groundItems ?? []).find(
    (item) => item.x === player.x && item.y === player.y,
  );
}

/** Modelo del HUD derivado solo del estado del motor y la posición del cursor. */
export function buildHudModel(state: GameState, cursor?: Position): HudModel {
  const player = state.players[0];
  const enemy = state.enemies[0];
  const groundItem = itemAtPlayer(state, player);
  const cursorDetail = buildCursorDetail(state, cursor);
  // La compatibilidad del HUD solo publica datos de un enemigo visible; sin
  // línea de visión el panel dice «Desconocido» y no filtra sus stats.
  const cursorEnemy =
    cursorDetail.kind === 'enemy' ? enemyAt(state, cursor) : undefined;
  const cursorEnemyMagicVisible =
    cursorEnemy !== undefined &&
    (cursorEnemy.stats.magicLevel > 0 || cursorEnemy.mana.max > 0);

  return {
    playerName: player?.nombre ?? '—',
    archetype: archetypeLabel(player),
    playerHp: formatHp(player),
    playerMp: formatMp(player),
    playerMagic: formatMagic(player),
    playerMana: formatMana(player),
    playerManaVisible: (player?.mana.max ?? 0) > 0,
    action: formatActions(player),
    traits: traitsLabel(player),
    condition: conditionLabel(player),
    actionSuggestion: actionSuggestion(state),
    phase: phaseLabel(state),
    enemyHp: formatHp(enemy),
    weapon: weaponLabel(player),
    shield: shieldLabel(player),
    armor: armorLabel(player),
    stats: statsLabel(player),
    cursorEnemyHp: formatHp(cursorEnemy),
    cursorEnemyMagic: formatMagic(cursorEnemy),
    cursorEnemyMana: formatMana(cursorEnemy),
    cursorEnemyMagicVisible,
    cursorEnemyBands: cursorDetail.kind === 'enemy' ? cursorDetail.bands : null,
    cursorDetail,
    weaponHint: groundItem
      ? `I panel · ${ITEMS[groundItem.itemId].name} en el suelo`
      : null,
    turn: `Turno ${state.turn}`,
    status: statusLabel(state),
    keys: KEYS_HELP,
    overlays: {
      victory: state.status === 'victory',
      defeat: state.status === 'defeat',
    },
  };
}

function eventLabel(event: GameEvent): string {
  switch (event.type) {
    case 'UnitMoved':
      return `${event.unitId}: (${event.from.x},${event.from.y})→(${event.to.x},${event.to.y}) MP ${event.mpLeft}`;
    case 'AttackPerformed':
      return event.hit
        ? `${event.attackerId}→${event.targetId} -${event.damage} (HP ${event.targetHp})`
        : `${event.attackerId}→${event.targetId} fallo (HP ${event.targetHp})`;
    case 'SpellCast': {
      // Texto del overlay de debug; TASK-0083 añade el feedback de juego.
      const result =
        event.effect === 'damage'
          ? event.hit
            ? `impacto ${event.damage} (HP ${event.targetHp})`
            : `fallo (HP ${event.targetHp})`
          : event.effect === 'heal'
            ? `cura ${event.healing} (HP ${event.targetHp})`
            : `resucita (HP ${event.targetHp})`;
      return `${event.casterId} lanza ${event.spellId}: ${result}`;
    }
    case 'ReplicaPerformed':
      // Texto del overlay de debug; la réplica no muestra texto en el juego.
      return event.hit
        ? `${event.attackerId} replica ${event.damage} (HP ${event.targetHp})`
        : `${event.attackerId} replica y falla`;
    case 'UnitDied':
      return `${event.unitId} muere`;
    case 'TurnEnded':
      return `termina turno ${event.turn}`;
    case 'EnemyPhaseStarted':
      return `fase enemiga (turno ${event.turn})`;
    case 'PlayerTurnStarted':
      return `fase jugador (turno ${event.turn})`;
    case 'EnemyWaited':
      return `${event.unitId} espera`;
    case 'GameEnded':
      return `fin: ${event.status}`;
    case 'GameRestarted':
      return 'reinicio';
    case 'EnemySpotted':
      return `${event.unitId} ve a ${event.playerId} en (${event.step.x},${event.step.y})`;
    case 'AlarmRaised':
      return `alarma de ${event.unitId} en (${event.position.x},${event.position.y})`;
    case 'EnemyFled':
      return `${event.unitId} huye`;
    case 'EnemyReturned':
      return `${event.unitId} vuelve a su puesto`;
    case 'CommandRejected':
      return `${event.commandType} rechazado: ${event.reason}`;
  }
}

function positions(unit: Unit | undefined): string {
  return unit ? `(${unit.x}, ${unit.y})` : '—';
}

const CURSOR_STATE_LABELS: Readonly<Record<CursorState, string>> = {
  player: 'jugador',
  reachable: 'alcanzable',
  'too-far': 'fuera de alcance',
  invalid: 'inválido',
  enemy: 'enemigo',
};

function cursorLabel(cursor: CursorStatus): string {
  const suffix = cursor.visible ? '' : ' (oculto)';
  const attack = cursor.attackTile
    ? ` · ataque (${cursor.attackTile.x}, ${cursor.attackTile.y})`
    : '';
  return `Cursor: (${cursor.x}, ${cursor.y}) ${CURSOR_STATE_LABELS[cursor.state]}${suffix} · camino ${cursor.path.length}${attack}`;
}

function formatEventSummary(events: readonly GameEvent[]): string {
  if (events.length === 0) return 'ninguno';
  return events.slice(-8).map(eventLabel).join(' · ');
}

function roomLabel(room: Room): string {
  return `${room.id} (${room.x},${room.y}) ${room.width}×${room.height} ${room.role}`;
}

function doorLabel(door: Door): string {
  const style = door.style ? ` · ${door.style}` : '';
  return `(${door.x},${door.y}) ${door.orientation} sala ${door.roomId}${style}`;
}

function spawnAccessLabel(map: NonNullable<GameState['map']>): string {
  const roomId = map.spawns.roomId;
  if (roomId === undefined) return 'sin sala';
  const cells = [
    ...map.doors
      .filter((door) => door.roomA === roomId || door.roomB === roomId || door.roomId === roomId)
      .map((door) => `puerta (${door.x},${door.y})`),
    ...(map.openMouths ?? [])
      .filter((mouth) => mouth.roomA === roomId || mouth.roomB === roomId)
      .map((mouth) => `boca (${mouth.x},${mouth.y}) ${mouth.reason}`),
  ];
  return cells.length === 0 ? 'sin accesos' : cells.join(' · ');
}

function spawnDebugLine(map: NonNullable<GameState['map']>): string {
  const party = map.spawns.party ?? [map.spawns.player];
  const holes = party.map((hole, index) => `${index === 0 ? 'J' : index + 1}(${hole.x},${hole.y})`);
  const entrance = map.entrance ? `(${map.entrance.position.x},${map.entrance.position.y})` : '—';
  return `Spawn: sala ${map.spawns.roomId ?? '—'} · ${holes.join(' ')} · entrada ${entrance} · accesos ${spawnAccessLabel(map)}`;
}

function exitDebugLine(map: NonNullable<GameState['map']>): string {
  if (!map.exit) return 'Salida: —';
  const exit = map.exit;
  return `Salida: ${exit.kind} (${exit.position.x},${exit.position.y}) · acceso (${exit.access.x},${exit.access.y}) · sala ${exit.roomId} · distancia ${exit.distance}${exit.fallback ? ' · fallback' : ''}`;
}

function mouthDebugLine(map: NonNullable<GameState['map']>): string {
  const mouths = map.openMouths ?? [];
  if (mouths.length === 0) return 'Bocas sin puerta: ninguna';
  return `Bocas sin puerta: ${mouths
    .map((mouth) => `(${mouth.x},${mouth.y}) ${mouth.reason}`)
    .join(' · ')}`;
}

function mapEnemyDebugLine(map: NonNullable<GameState['map']>): string {
  const enemies = map.enemies ?? [];
  if (enemies.length === 0) return 'Enemigos del generador: ninguno';
  return `Enemigos del generador: ${enemies
    .map(
      (enemy) =>
        `${enemy.id} ${enemy.type} (${enemy.x},${enemy.y}) home (${enemy.home.x},${enemy.home.y}) sala ${enemy.roomId}${enemy.hidden ? ' emboscada' : ''}${enemy.interior ? ' interior' : ' borde'}`,
    )
    .join(' · ')}`;
}

function hotspotDebugLine(map: NonNullable<GameState['map']>): string {
  const hotspots = map.hotspots ?? [];
  if (hotspots.length === 0) return 'Puntos calientes: ninguno';
  const eligible = hotspots.filter((hotspot) => hotspot.eligible).length;
  const occupied = hotspots.filter((hotspot) => hotspot.occupied).length;
  return `Puntos calientes: ${hotspots.length} · elegibles ${eligible} · ocupados ${occupied}`;
}

function corridorDebugLine(map: NonNullable<GameState['map']>): string {
  if (map.corridors.length === 0) return 'Pasillos: ninguno';
  return `Pasillos: ${map.corridors
    .map(
      (corridor) =>
        `${corridor.fromRoomId}→${corridor.toRoomId} ancho ${corridor.width} · ${pathLength(corridor.path)} tiles`,
    )
    .join(' · ')}`;
}

function wideCorridorLabel(map: NonNullable<GameState['map']>, corridor: Corridor): string {
  const length = pathLength(corridor.path);
  const lane = wideCorridorStretch(map, corridor);
  return `${corridor.fromRoomId}→${corridor.toRoomId} ${corridor.width} tiles · ${length} tiles · carril ${lane}`;
}

function mapDebugLines(state: GameState): readonly string[] {
  const map = state.map;
  if (!map) {
    return [
      'Semilla: n/a (determinista)',
      'Salas: n/a',
      'Huecos: n/a',
      'Spawns: n/a',
      'Pasillos anchos: n/a',
    ];
  }

  const wide = map.corridors.filter((corridor) => corridor.width === 2);
  return [
    `Semilla: ${map.seed}`,
    `Salas: ${map.rooms.map(roomLabel).join(' · ')}`,
    `Huecos: ${map.doors.length === 0 ? 'ninguno' : map.doors.map(doorLabel).join(' · ')}`,
    `Spawns: jugador (${map.spawns.player.x},${map.spawns.player.y}) · enemigo (${map.spawns.enemy.x},${map.spawns.enemy.y}) · distancia ${map.spawns.distance}`,
    spawnDebugLine(map),
    mouthDebugLine(map),
    `Pasillos anchos: ${
      wide.length === 0
        ? 'ninguno'
        : wide.map((corridor) => wideCorridorLabel(map, corridor)).join(' · ')
    }`,
    corridorDebugLine(map),
    exitDebugLine(map),
    mapEnemyDebugLine(map),
    hotspotDebugLine(map),
    `Caverna: ${map.cavernRoomId !== undefined && map.cavernRoomId !== null ? `sala ${map.cavernRoomId}` : 'ninguna'}`,
  ];
}

function equipmentDebugLine(unit: Unit | undefined): string {
  return `Equipo: ${weaponLabel(unit)} · ${shieldLabel(unit)} · ${armorLabel(unit)} · Atributos ${statsLabel(unit)}`;
}

function itemLabel(instance: ItemInstance): string {
  return `${ITEMS[instance.itemId].name} [${instance.id}]`;
}

function inventoryDebugLines(unit: Unit | undefined): readonly string[] {
  if (!unit) {
    return ['Mochila: —', 'Equipo por hueco: —'];
  }

  const entries = unit.inventory.items.flatMap((item, index) =>
    item === null ? [] : [`${index + 1}. ${itemLabel(item)}`],
  );
  const slots = EQUIPMENT_SLOTS.map((slot) => {
    const instance = unit.equipment[slot];
    return `${PANEL_SLOT_LABELS[slot]} ${instance ? itemLabel(instance) : '—'}`;
  });

  return [
    `Mochila ${backpackCount(unit.inventory)}/${unit.inventory.capacity}: ${
      entries.length === 0 ? 'vacía' : entries.join(' · ')
    }`,
    `Equipo por hueco: ${slots.join(' · ')}`,
  ];
}

/** Objetos del suelo con su instancia y localización, misma verdad que el panel. */
function groundDebugLine(state: GameState): string {
  const items = state.groundItems ?? [];
  if (items.length === 0) return 'Suelo: sin objetos';
  return `Suelo: ${items
    .map((item) => `${itemLabel(item)} en (${item.x},${item.y})`)
    .join(' · ')}`;
}

function magicLabel(unit: Unit | undefined): string {
  return unit
    ? `Magia ${formatMagic(unit)} · Maná ${formatMana(unit)}`
    : 'Magia — · Maná —';
}

function enemyMagicLines(state: GameState): readonly string[] {
  if (state.enemies.length === 0) return ['Magia enemiga: ninguno'];
  return state.enemies.map(
    (enemy) => `Magia enemiga ${enemy.id}: ${magicLabel(enemy)}`,
  );
}

function enemyEquipmentLines(state: GameState): readonly string[] {
  const alive = state.enemies.filter((enemy) => enemy.hp > 0);
  if (alive.length === 0) return ['Equipo enemigo: ninguno'];
  return alive.map(
    (enemy) =>
      `Equipo enemigo ${enemy.id}: ${weaponLabel(enemy)} · ${shieldLabel(enemy)} · ${armorLabel(enemy)} · Atributos ${statsLabel(enemy)} · Acciones ${formatActions(enemy)}`,
  );
}

/** Estado de percepción por enemigo; solo se muestra en el overlay de `F1`. */
function enemyPerceptionLines(state: GameState): readonly string[] {
  if (state.enemies.length === 0) return ['Percepción enemiga: ninguno'];
  return state.enemies.map((enemy) => {
    const lastKnown = enemy.lastKnown
      ? `(${enemy.lastKnown.x}, ${enemy.lastKnown.y})`
      : '—';
    return `Percepción ${enemy.id} (${enemy.enemyType ?? '—'}) HP ${formatHp(enemy)}: ${enemy.awareness} · huida ${boolLabel(enemy.fleeing)} · alertTurns ${enemy.alertTurns} · alarma ${boolLabel(enemy.hasShouted)} · puesto (${enemy.home.x}, ${enemy.home.y}) · última ${lastKnown} · visión ${visionRadius(enemy)} · alarma ${alarmRadius(enemy)}`;
  });
}

function vitalityLine(state: GameState): string {
  const units = [...state.players, ...state.enemies];
  if (units.length === 0) return 'Vida: —';
  return `Vida: ${units
    .map((unit) => `${unit.id} ${formatHp(unit)}`)
    .join(' · ')}`;
}

function lastAttackLine(events: readonly GameEvent[]): string {
  const attack = [...events]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
    );
  if (!attack) return 'Último ataque: ninguno';
  const outcome = attack.hit
    ? `impacto ${attack.damage} (PV ${attack.targetHp})`
    : 'fallo';
  const rolls = attack.rolls;
  const parts = [`ataque ${rolls.attack}`, `escudo ${rolls.shield}`];
  if (rolls.damage !== null) parts.push(`golpe ${rolls.damage}`);
  if (rolls.armor !== null) parts.push(`absorción ${rolls.armor}`);
  return `Último ataque: ${attack.attackerId}→${attack.targetId} ${outcome} · tiradas ${parts.join(' ')}`;
}

function cursorEnemyDebugLine(state: GameState, cursor: Position): string {
  const enemy = enemyAt(state, cursor);
  return enemy
    ? `Enemigo bajo cursor: ${enemy.id} ${formatHp(enemy)} · bandas ${formatProfile(enemy.stats.resistencia)}`
    : 'Enemigo bajo cursor: ninguno';
}

/** Información del overlay de debug, también derivada del estado y la cámara. */
export function buildDebugModel(
  state: GameState,
  camera: Camera,
  bounds: CameraBounds,
  viewport: Viewport,
  lastEvents: readonly GameEvent[],
  cursor: CursorStatus,
): DebugModel {
  const player = state.players[0];
  const enemy = state.enemies[0];

  return {
    lines: [
      `Jugador: ${positions(player)} · HP ${formatHp(player)} · MP ${formatMp(player)} · Acciones ${formatActions(player)} · ${magicLabel(player)}`,
      `Identidad: ${player?.nombre ?? '—'} · Arquetipo ${archetypeLabel(player)}`,
      `Enemigo: ${positions(enemy)} · HP ${formatHp(enemy)} · Acciones ${formatActions(enemy)}`,
      equipmentDebugLine(player),
      ...inventoryDebugLines(player),
      groundDebugLine(state),
      ...enemyEquipmentLines(state),
      ...enemyMagicLines(state),
      ...enemyPerceptionLines(state),
      vitalityLine(state),
      `Fase: ${phaseLabel(state)} · Turno ${state.turn} · Estado: ${statusLabel(state)}`,
      cursorLabel(cursor),
      cursorEnemyDebugLine(state, cursor),
      lastAttackLine(lastEvents),
      `Cámara: (${camera.x}, ${camera.y}) · Límites (${bounds.maxX}, ${bounds.maxY}) · Viewport ${viewport.width}×${viewport.height}`,
      ...mapDebugLines(state),
      `Últimos eventos: ${formatEventSummary(lastEvents)}`,
      'F2 nueva semilla',
    ],
  };
}

function requireElement<T extends HTMLElement>(root: ParentNode, testId: string): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Falta el elemento con data-testid="${testId}"`);
  }
  return element;
}

/** Feedback de presentación que el HUD refleja sin tocar el estado del motor. */
export interface HudFeedback {
  /** Duración del pulso de la ranura del arma, o `null` si no hay cue. */
  readonly weaponPulseMs: number | null;
}

export interface HudView {
  update(
    state: GameState,
    cursor?: Position,
    feedback?: HudFeedback,
    panelDetail?: PanelDetail | null,
  ): void;
}

const DETAIL_KIND_LABELS: Readonly<Record<CursorDetailKind, string>> = {
  enemy: 'Enemigo',
  ally: 'Aliado',
  item: 'Objeto',
  door: 'Puerta',
  terrain: 'Terreno',
  unknown: 'Desconocido',
  container: 'Contenedor',
};

/**
 * Grupo de bandas del enemigo bajo el cursor. Reutiliza los nodos si ya existen
 * para que reconstruir la vista siga siendo idempotente.
 */
function ensureCursorBands(
  root: ParentNode,
  detail: HTMLElement,
): { readonly group: HTMLElement; readonly rows: ReadonlyMap<string, HTMLElement> } {
  const existingGroup = root.querySelector<HTMLElement>('[data-testid="hud-cursor-bands"]');
  const group = existingGroup ?? document.createElement('div');
  if (!existingGroup) {
    group.className = 'hud-cursor-bands';
    group.dataset.testid = 'hud-cursor-bands';
    group.hidden = true;
    detail.append(group);
  }

  const rows = new Map<string, HTMLElement>();
  for (const type of DAMAGE_TYPES) {
    const testId = `hud-cursor-band-${type}`;
    const existingRow = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    const row = existingRow ?? document.createElement('span');
    if (!existingRow) {
      row.className = 'hud-cursor-band-row';
      row.dataset.testid = testId;
      group.append(row);
    }
    rows.set(type, row);
  }

  return { group, rows };
}

/** Vista DOM del HUD y de los overlays de resultado. */
export function createHudView(root: ParentNode): HudView {
  const playerName = requireElement(root, 'hud-player-name');
  const archetype = requireElement(root, 'hud-archetype');
  const playerHp = requireElement(root, 'hud-player-hp');
  const playerMp = requireElement(root, 'hud-player-mp');
  const playerMagic = requireElement(root, 'hud-player-magic');
  const playerMana = requireElement(root, 'hud-player-mana');
  const manaRow = requireElement(root, 'hud-mana-row');
  const action = requireElement(root, 'hud-action');
  const stats = requireElement(root, 'hud-stats');
  const traits = requireElement(root, 'hud-traits');
  const condition = requireElement(root, 'hud-condition');
  const weapon = requireElement(root, 'hud-weapon');
  const actionSuggestion = requireElement(root, 'hud-suggestion');
  const phase = requireElement(root, 'hud-phase');
  const enemyHp = requireElement(root, 'hud-enemy-hp');
  const turn = requireElement(root, 'hud-turn');
  const status = requireElement(root, 'hud-status');
  const keys = requireElement(root, 'hud-keys');
  const weaponHint = requireElement(root, 'weapon-hint');
  const victory = requireElement(root, 'overlay-victory');
  const defeat = requireElement(root, 'overlay-defeat');

  const detail = requireElement(root, 'hud-cursor-detail');
  const detailKind = requireElement(root, 'hud-cursor-kind');
  const detailTitle = requireElement(root, 'hud-cursor-title');
  const detailSubtitle = requireElement(root, 'hud-cursor-subtitle');
  const detailRows = requireElement(root, 'hud-cursor-rows');
  const detailNotes = requireElement(root, 'hud-cursor-notes');
  const vitals = requireElement(root, 'hud-cursor-vitals');
  const magicVital = vitals.querySelector<HTMLElement>('[data-vital="magic"]');
  const manaVital = vitals.querySelector<HTMLElement>('[data-vital="mana"]');
  if (!magicVital || !manaVital) {
    throw new Error('Faltan las filas de magia y maná del detalle del cursor');
  }
  const cursorEnemyHp = requireElement(root, 'hud-cursor-enemy-hp');
  const cursorEnemyMagic = requireElement(root, 'hud-cursor-enemy-magic');
  const cursorEnemyMana = requireElement(root, 'hud-cursor-enemy-mana');
  const cursorBands = ensureCursorBands(root, detail);

  const panelDetailSection = requireElement(root, 'hud-panel-detail');
  const panelBlocks = {
    selected: requireElement(root, 'hud-panel-selected'),
    equipped: requireElement(root, 'hud-panel-equipped'),
  };

  let lastDetailKey: string | null = null;
  let lastPanelKey: string | null = null;

  const renderDetail = (value: CursorDetail): void => {
    const key = JSON.stringify(value);
    if (key === lastDetailKey) return;
    lastDetailKey = key;

    detail.dataset.kind = value.kind;
    detailKind.textContent = DETAIL_KIND_LABELS[value.kind];
    detailTitle.textContent = value.title;
    detailSubtitle.textContent = value.subtitle ?? '';
    detailSubtitle.hidden = value.subtitle === null;

    detailRows.replaceChildren(
      ...value.rows.map((row) => {
        const item = document.createElement('div');
        item.className = 'hud-detail-row';
        item.dataset.row = row.id;
        const label = document.createElement('dt');
        label.textContent = row.label;
        const valueNode = document.createElement('dd');
        valueNode.textContent = row.value;
        item.append(label, valueNode);
        return item;
      }),
    );

    detailNotes.textContent = value.notes.join(' · ');
    detailNotes.hidden = value.notes.length === 0;

    cursorBands.group.hidden = value.bands === null;
    for (const row of value.bands ?? []) {
      const element = cursorBands.rows.get(row.type);
      if (element) element.textContent = `${row.typeLabel} ${row.bandLabel} ${row.icon}`;
    }
  };

  const renderPanelBlock = (
    block: PanelDetailBlock,
    element: HTMLElement,
  ): void => {
    const prefix = `hud-panel-${block.id}`;
    const title = requireElement(element, `${prefix}-title`);
    const subtitle = requireElement(element, `${prefix}-subtitle`);
    const rows = requireElement(element, `${prefix}-rows`);
    const traits = requireElement(element, `${prefix}-traits`);
    const description = requireElement(element, `${prefix}-description`);

    element.dataset.empty = String(block.empty);
    title.textContent = block.title;
    subtitle.textContent = block.subtitle;
    subtitle.hidden = block.subtitle === '';
    rows.replaceChildren(
      ...block.rows.map((row) => {
        const item = document.createElement('div');
        item.className = 'hud-detail-row';
        item.dataset.row = row.id;
        const label = document.createElement('dt');
        label.textContent = row.label;
        const valueNode = document.createElement('dd');
        valueNode.textContent = row.value;
        item.append(label, valueNode);
        return item;
      }),
    );
    traits.textContent = block.traits;
    traits.hidden = block.traits === '';
    description.textContent = block.description;
    description.hidden = block.description === '';
  };

  const renderPanelDetail = (value: PanelDetail): void => {
    const key = JSON.stringify(value);
    if (key === lastPanelKey) return;
    lastPanelKey = key;
    renderPanelBlock(value.blocks[0], panelBlocks.selected);
    renderPanelBlock(value.blocks[1], panelBlocks.equipped);
  };

  return {
    update(
      state: GameState,
      cursor?: Position,
      feedback?: HudFeedback,
      panelDetail?: PanelDetail | null,
    ): void {
      const model = buildHudModel(state, cursor);
      playerName.textContent = model.playerName;
      archetype.textContent = model.archetype;
      playerHp.textContent = model.playerHp;
      playerMp.textContent = model.playerMp;
      playerMagic.textContent = model.playerMagic;
      playerMana.textContent = model.playerMana;
      manaRow.hidden = !model.playerManaVisible;
      action.textContent = model.action;
      stats.textContent = model.stats;
      traits.textContent = model.traits;
      condition.textContent = model.condition ?? '';
      condition.hidden = model.condition === null;
      weapon.textContent = model.weapon;
      actionSuggestion.textContent = model.actionSuggestion ?? '';
      actionSuggestion.hidden = model.actionSuggestion === null;
      phase.textContent = model.phase;
      enemyHp.textContent = model.enemyHp;
      turn.textContent = model.turn;
      status.textContent = model.status;
      keys.textContent = model.keys;
      cursorEnemyHp.textContent = model.cursorEnemyHp;
      cursorEnemyMagic.textContent = model.cursorEnemyMagic;
      cursorEnemyMana.textContent = model.cursorEnemyMana;
      const panelOpen = panelDetail !== null && panelDetail !== undefined;
      detail.hidden = panelOpen;
      panelDetailSection.hidden = !panelOpen;
      vitals.hidden = panelOpen || model.cursorDetail.kind !== 'enemy';
      magicVital.hidden = panelOpen || !model.cursorEnemyMagicVisible;
      manaVital.hidden = panelOpen || !model.cursorEnemyMagicVisible;
      renderDetail(model.cursorDetail);
      // El detalle del cursor se mantiene compuesto bajo la ficha: al cerrar
      // el panel basta con volver a mostrarlo y las bandas recuperan su estado.
      cursorBands.group.hidden =
        panelOpen || model.cursorDetail.bands === null;
      if (panelOpen) renderPanelDetail(panelDetail);
      weaponHint.textContent = model.weaponHint ?? '';
      weaponHint.hidden = model.weaponHint === null;
      victory.hidden = !model.overlays.victory;
      defeat.hidden = !model.overlays.defeat;

      // El pulso se dispara al empezar el cue; reutiliza el nodo y no reinicia
      // la animación en cada frame mientras el cue siga activo.
      const pulseMs = feedback?.weaponPulseMs ?? null;
      if (pulseMs !== null) {
        if (!weapon.classList.contains('is-pulsing')) {
          weapon.style.setProperty('--hud-pulse-ms', `${pulseMs}ms`);
          weapon.classList.add('is-pulsing');
        }
      } else if (weapon.classList.contains('is-pulsing')) {
        weapon.classList.remove('is-pulsing');
        weapon.style.removeProperty('--hud-pulse-ms');
      }
    },
  };
}

export interface DebugView {
  update(
    state: GameState,
    camera: Camera,
    bounds: CameraBounds,
    viewport: Viewport,
    lastEvents: readonly GameEvent[],
    cursor: CursorStatus,
  ): void;
  isOpen(): boolean;
  toggle(): void;
  close(): void;
}

/** Overlay de debug independiente del HUD y de la partida. */
export function createDebugView(root: ParentNode): DebugView {
  const overlay = requireElement(root, 'debug-overlay');
  const content = requireElement(root, 'debug-content');

  return {
    update(state, camera, bounds, viewport, lastEvents, cursor): void {
      content.textContent = buildDebugModel(
        state,
        camera,
        bounds,
        viewport,
        lastEvents,
        cursor,
      ).lines.join('\n');
    },
    isOpen(): boolean {
      return !overlay.hidden;
    },
    toggle(): void {
      overlay.hidden = !overlay.hidden;
    },
    close(): void {
      overlay.hidden = true;
    },
  };
}

export interface NoticeView {
  show(code: NoticeCode): void;
  clear(): void;
}

/**
 * Aviso breve del HUD para acciones rechazadas. No crea estado de juego ni
 * bloquea la siguiente pulsación: solo escribe texto y se apaga con un timer.
 */
export function createNoticeView(root: ParentNode): NoticeView {
  const element = requireElement(root, 'hud-message');
  let timer: number | undefined;

  const hide = (): void => {
    element.hidden = true;
    element.textContent = '';
    delete element.dataset.notice;
  };

  return {
    show(code: NoticeCode): void {
      element.textContent = NOTICE_MESSAGES[code];
      element.dataset.notice = code;
      element.hidden = false;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        hide();
        timer = undefined;
      }, NOTICE_DURATION_MS);
    },
    clear(): void {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      hide();
    },
  };
}
