import {
  ARMORS,
  SHIELDS,
  armorValue,
  shieldValue,
  weaponFor,
} from '../game/equipment';
import type { GameEvent, GameState, Position, Unit } from '../game/types';
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
import type { Viewport } from './geometry';
import { NOTICE_DURATION_MS, NOTICE_MESSAGES, type NoticeCode } from './notices';

export const KEYS_HELP =
  'Flechas/WASD cursor · Espacio/Enter moverse · F atacar · E terminar turno · R reiniciar · F1 debug';

export interface HudModel {
  readonly playerHp: string;
  readonly playerMp: string;
  readonly action: string;
  readonly phase: string;
  readonly enemyHp: string;
  /** Arma equipada con sus valores del catálogo. */
  readonly weapon: string;
  readonly shield: string;
  readonly armor: string;
  /** Modificadores propios del jugador, en el orden acierto/daño/defensa. */
  readonly modifiers: string;
  /** Vida del enemigo vivo bajo el cursor; `—/—` si no hay ninguno. */
  readonly cursorEnemyHp: string;
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

function formatHp(unit: Unit | undefined): string {
  return unit ? `${unit.hp}/${unit.maxHp}` : '—/—';
}

function formatMp(unit: Unit | undefined): string {
  return unit ? `${unit.mp}/${unit.maxMp}` : '—/—';
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

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function weaponLabel(unit: Unit | undefined): string {
  if (!unit) return '—';
  const weapon = weaponFor(unit.equipment.weaponId);
  return `${weapon.name} ${signed(weapon.accuracy)}/${signed(weapon.damage)}`;
}

function shieldLabel(unit: Unit | undefined): string {
  if (!unit || unit.equipment.shieldId === null) return 'Sin escudo';
  const shield = SHIELDS[unit.equipment.shieldId];
  return `${shield.name} ${signed(shieldValue(unit.equipment.shieldId))}`;
}

function armorLabel(unit: Unit | undefined): string {
  if (!unit || unit.equipment.armorId === null) return 'Sin armadura';
  const armor = ARMORS[unit.equipment.armorId];
  return `${armor.name} ${signed(armorValue(unit.equipment.armorId))}`;
}

function modifiersLabel(unit: Unit | undefined): string {
  if (!unit) return '—';
  const { habilidad, fuerza, defensa } = unit.stats;
  return `${signed(habilidad)} acierto · ${signed(fuerza)} daño · ${signed(defensa)} defensa`;
}

function enemyAt(state: GameState, position: Position | undefined): Unit | undefined {
  if (!position) return undefined;
  return state.enemies.find(
    (enemy) => enemy.hp > 0 && enemy.x === position.x && enemy.y === position.y,
  );
}

function weaponAtPlayer(state: GameState, player: Unit | undefined) {
  if (!player) return undefined;
  return state.map?.weapons?.find(
    (weapon) => weapon.x === player.x && weapon.y === player.y,
  );
}

/** Modelo del HUD derivado solo del estado del motor y la posición del cursor. */
export function buildHudModel(state: GameState, cursor?: Position): HudModel {
  const player = state.players[0];
  const enemy = state.enemies[0];
  const mapWeapon = weaponAtPlayer(state, player);
  const cursorEnemy = enemyAt(state, cursor);

  return {
    playerHp: formatHp(player),
    playerMp: formatMp(player),
    action: boolLabel(player?.actionAvailable),
    phase: phaseLabel(state),
    enemyHp: formatHp(enemy),
    weapon: weaponLabel(player),
    shield: shieldLabel(player),
    armor: armorLabel(player),
    modifiers: modifiersLabel(player),
    cursorEnemyHp: formatHp(cursorEnemy),
    weaponHint: mapWeapon
      ? `G recoger ${weaponFor(mapWeapon.weaponId).name}`
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
  return `Equipo: ${weaponLabel(unit)} · ${shieldLabel(unit)} · ${armorLabel(unit)} · Modificadores ${modifiersLabel(unit)}`;
}

function enemyEquipmentLines(state: GameState): readonly string[] {
  const alive = state.enemies.filter((enemy) => enemy.hp > 0);
  if (alive.length === 0) return ['Equipo enemigo: ninguno'];
  return alive.map(
    (enemy) =>
      `Equipo enemigo ${enemy.id}: ${weaponLabel(enemy)} · ${shieldLabel(enemy)} · ${armorLabel(enemy)} · Modificadores ${modifiersLabel(enemy)}`,
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
  if (rolls.damage !== null) parts.push(`daño ${rolls.damage}`);
  if (rolls.armor !== null) parts.push(`armadura ${rolls.armor}`);
  return `Último ataque: ${attack.attackerId}→${attack.targetId} ${outcome} · tiradas ${parts.join(' ')}`;
}

function cursorEnemyDebugLine(state: GameState, cursor: Position): string {
  const enemy = enemyAt(state, cursor);
  return enemy
    ? `Enemigo bajo cursor: ${enemy.id} ${formatHp(enemy)}`
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
      `Jugador: ${positions(player)} · HP ${formatHp(player)} · MP ${formatMp(player)} · Acción ${boolLabel(player?.actionAvailable)}`,
      `Enemigo: ${positions(enemy)} · HP ${formatHp(enemy)}`,
      equipmentDebugLine(player),
      ...enemyEquipmentLines(state),
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

export interface HudView {
  update(state: GameState, cursor?: Position): void;
}

/**
 * Crea las estadísticas de equipo dentro de un grupo del HUD sin tocar
 * `index.html`. Si el nodo ya existe lo reutiliza, de modo que el HUD sigue
 * siendo idempotente si se reconstruye la vista.
 */
function ensureHudStat(
  root: ParentNode,
  container: HTMLElement,
  testId: string,
  label: string,
): HTMLElement {
  const existing = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (existing) return existing;

  const element = document.createElement('span');
  element.className = 'hud-stat';
  element.append(`${label} `);
  const value = document.createElement('strong');
  value.dataset.testid = testId;
  value.textContent = '—';
  element.append(value);
  container.append(element);
  return value;
}

function ensureEquipmentGroup(root: ParentNode, hud: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>('[data-testid="hud-equipment"]');
  if (existing) return existing;

  const group = document.createElement('div');
  group.className = 'hud-group';
  group.dataset.testid = 'hud-equipment';
  hud.append(group);
  return group;
}

function ensureWeaponHint(root: ParentNode, keys: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>('[data-testid="weapon-hint"]');
  if (existing) return existing;

  const hint = document.createElement('p');
  hint.className = 'hud-keys';
  hint.dataset.testid = 'weapon-hint';
  hint.hidden = true;
  keys.after(hint);
  return hint;
}

/** Vista DOM del HUD y de los overlays de resultado. */
export function createHudView(root: ParentNode): HudView {
  const hud = requireElement(root, 'hud');
  const playerHp = requireElement(root, 'hud-player-hp');
  const playerMp = requireElement(root, 'hud-player-mp');
  const action = requireElement(root, 'hud-action');
  const phase = requireElement(root, 'hud-phase');
  const enemyHp = requireElement(root, 'hud-enemy-hp');
  const turn = requireElement(root, 'hud-turn');
  const status = requireElement(root, 'hud-status');
  const keys = requireElement(root, 'hud-keys');
  const victory = requireElement(root, 'overlay-victory');
  const defeat = requireElement(root, 'overlay-defeat');

  const equipmentGroup = ensureEquipmentGroup(root, hud);
  const weapon = ensureHudStat(root, equipmentGroup, 'hud-weapon', 'Arma');
  const shield = ensureHudStat(root, equipmentGroup, 'hud-shield', 'Escudo');
  const armor = ensureHudStat(root, equipmentGroup, 'hud-armor', 'Armadura');
  const modifiers = ensureHudStat(root, equipmentGroup, 'hud-modifiers', 'Mods');
  const cursorEnemyHp = ensureHudStat(
    root,
    equipmentGroup,
    'hud-cursor-enemy-hp',
    'Enemigo cursor',
  );
  const weaponHint = ensureWeaponHint(root, keys);

  return {
    update(state: GameState, cursor?: Position): void {
      const model = buildHudModel(state, cursor);
      playerHp.textContent = model.playerHp;
      playerMp.textContent = model.playerMp;
      action.textContent = model.action;
      phase.textContent = model.phase;
      enemyHp.textContent = model.enemyHp;
      turn.textContent = model.turn;
      status.textContent = model.status;
      keys.textContent = model.keys;
      weapon.textContent = model.weapon;
      shield.textContent = model.shield;
      armor.textContent = model.armor;
      modifiers.textContent = model.modifiers;
      cursorEnemyHp.textContent = model.cursorEnemyHp;
      weaponHint.textContent = model.weaponHint ?? '';
      weaponHint.hidden = model.weaponHint === null;
      victory.hidden = !model.overlays.victory;
      defeat.hidden = !model.overlays.defeat;
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
