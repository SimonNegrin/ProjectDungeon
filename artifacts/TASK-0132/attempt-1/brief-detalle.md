---
type: Task Brief Detail
title: "TASK-0132: contrato técnico del intento 1"
description: Representación del fantasma, comandos, costes y pruebas esperadas.
task: TASK-0132
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T16:10:00Z }
---

# Representación

- `Unit.ghost?: boolean`, aditivo y serializable. Ausente o `false` = no fantasma.
- `isGhost(unit) = unit.hp === 0 && unit.ghost === true` en `grid.ts`.
- `lifeState(unit): 'alive' | 'dead' | 'ghost'` derivado: vivo si `hp > 0`;
  fantasma si `isGhost`; si no, muerto. No guardar un estado que pueda
  desincronizarse de `hp`.
- `isAlive`, `isOccupied` y `livingUnitAt` conservan su intención: el fantasma no
  bloquea porque no está vivo.
- `settleUnitDeath` marca `ghost: true` al jugador muerto, conserva `id`,
  posición, nombre, arquetipo, variante, `stats` y `maxMp`, vacía equipo y
  mochila como hoy y mantiene el cadáver. `actions` queda en máximo 1 y
  `remaining = min(remainante, 1)`; el MP no se regala en la muerte.
- `actions`: constante/helper de una acción (por ejemplo `GHOST_ACTIONS = 1`).
- `restorePlayerTurn` restaura recursos también a fantasmas (MP intrínseco,
  maná, `spellsCast` y una acción). Los muertos sin fantasma no se restauran.

# Movimiento y objetivo

- El fantasma no atraviesa muros, fuera del mapa ni corta esquinas por muro; sí
  comparte casilla con vivos y enemigos.
- Añadir una opción de bloqueo (por ejemplo `ignoreUnits`) usada por
  `cellBlockReason`: con ella no cuenta `isOccupied`. `Move`, `MoveTo` y el BFS de
  `planCursorTarget` deben respetar muros y esquinas con esa opción.
- El fantasma puede moverse sobre un aliado o enemigo y terminar allí; nunca
  ataca al llegar.
- La IA, la percepción, el daño y `resolveAttack` no deben elegir ni dañar al
  fantasma: ya filtran por `isAlive`; añadir test de no regresión.
- `MoveTo` del fantasma nunca devuelve plan `enemy`; trata la casilla como suelo
  si no es muro ni está fuera.

# Comandos y costes

- Permitidos: `Move`/`MoveTo` (1 MP por paso), `PickUp`/`DropItem` (1 acción y
  0 MP para el fantasma), `InspectContainer` (sin coste), `EndTurn`, `Restart`.
- Prohibidos: `Attack`, `CastSpell`, `EquipItem`, `UnequipItem`, `SelectWeapon`.
  Rechazo con `CommandRejected` y estado idéntico; no consumir RNG, MP ni acción.
- `PickUp` del fantasma va suelo → mochila. `DropItem` va mochila → suelo. No
  crear una segunda ruta de inventario: reutilizar `pickUpItem`/`dropItem` con un
  modo de coste explícito; los vivos conservan 1 MP y 0 acción.
- No hay comando de abrir cofre en el motor; no se añade. No implementar puertas:
  no existe estado de puerta interactiva en este corte y REQ-034 las excluye.

# Inspección

- Comando `{ type: 'InspectContainer'; unitId; containerId }`, solo para fantasmas
  en fase de jugador.
- Helper puro en `inventory.ts` que localiza el contenedor y devuelve solo
  `id`, `itemId` y `lootable` de cada instancia, más `containerId`.
- Evento `ContainerInspected` con `unitId`, `containerId` e `items` seguros. No
  incluir `kind`, `capacity`, `corpseOf`, posición ni ningún campo de trampa o
  apertura; una propiedad extra inyectada en el contenedor no debe aparecer.
- No muta contenedor ni estado, no gasta acción ni MP y no revela trampa.

# Pruebas mínimas

- Muerte con dos jugadores → fantasma con identidad, `hp 0`, una acción y
  serialización JSON; un muerto sin fantasma sigue siendo `dead`.
- Mismo tile vivo/fantasma; vivo se mueve al tile del fantasma; fantasma se mueve
  al tile de un vivo y de un enemigo; muro y esquina siguen bloqueando.
- Pathfinding: el camino del fantasma ignora unidades; el del vivo no. IA y
  percepción no ven al fantasma; atacarlo da `target-dead`.
- MP: `maxMp` del fantasma es el intrínseco con y sin equipo; el equipo no sube
  sus acciones. No inventar modificadores de MP en objetos.
- Una acción: recoger gasta acción y no MP; segundo recoger/soltar sin acción se
  rechaza; `EndTurn` restaura una. Atacar, equipar, desequipar, seleccionar arma
  o lanzar hechizo se rechazan sin cambios.
- Inspección devuelve contenido, ignora trampa inyectada, no muta y no cuesta.
- `pnpm run verify` pasa; sin tests debilitados.
