---
type: Task Brief
title: "TASK-0076: detalle del intento 1"
description: Trampas y modelo sugerido para acciones, costes y restauración.
task: TASK-0076
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:45:00Z }
---

# Detalle del intento 1 — TASK-0076

No sustituye a la tarea ni al requisito; solo concreta trampas observadas.

## Modelo sugerido (no obligatorio, pero coherente con arquitectura)

- `UnitStats` gana el atributo inherente de acciones (2 por defecto en roster y
  bestiario; Pícaro 3; Centinela 2, Bruto 1, Cobarde 2).
- `UnitEquipment` gana `actionsBonus?: number` (el +1 de objetos); `max` se
  calcula como inherente + bonus y se recorta a `MAX_ACTIONS = 4`.
- `Unit.actions { max, remaining }` se crea con `remaining = max`. No añadir un
  `actionAvailable` derivado ni mantener dos fuentes de verdad.
- La restauración de turno fija `remaining = max` junto a `mp = maxMp`, también
  para enemigos.
- Centraliza el gasto en un helper puro (por ejemplo `spendAction`/`hasAction`)
  para que ataque y `MoveTo` compartan la misma condición y decremento.
- El coste por comando se declara en el motor: `Attack` 1; `MoveTo` 1 solo si
  ejecuta ataque; `Move`, `PickUp`, `SelectWeapon`, `EndTurn`, `Restart` 0.

## Puntos delicados

- `resolveAttack` debe comprobar acción **antes** de tirar RNG y decrementar solo
  si el ataque se acepta. El rechazo `no-action` no altera estado, RNG ni eventos.
- `MoveTo` sobre enemigo: movimiento con MP + como máximo **un** ataque; nunca
  encadenar. Sin acción y ya adyacente: rechazo `no-action`; sin acción y no
  adyacente: solo movimiento. Mantener la atomicidad actual.
- La IA de este intento no encadena: `planEnemyAction` sigue devolviendo un plan y
  `resolveEndTurn` lo aplica una vez por enemigo. El enemigo puede terminar con
  `remaining > 0`; es correcto hasta TASK-0077.
- `EndTurn` no exige acciones ni termina antes; no hay auto-terminación.
- Serialización = `GameState` completo (incluye `actions`). Snapshot: clonar
  `actions` en `cloneUnit`; no exponer referencias mutables. Debug no necesita
  campos nuevos si las unidades ya los llevan.
- Preservar el determinismo y las fórmulas: no tocar `resolveHit`,
  `resolveDamage`, valores de roster/bestiario salvo el atributo de acciones.

## Migración de tests y host

- `rg actionAvailable` cubre motor, host y ~20 archivos de test. Migrar todos:
  `actionAvailable: true` → `actions` con `remaining = max`; `false` →
  `remaining: 0` conservando `max`.
- Helpers (`tests/unit/game/helpers.ts`, `tests/e2e/support.ts`, fixtures de
  percepción/feedback y `stateWithWeapon`) deben aceptar acciones sin romper la
  intención de cada test.
- `src/host/hud.ts` y `src/host/motion.ts`: adaptación mecánica para compilar
  (`remaining > 0` como acción disponible); no rediseñar el HUD ni añadir
  contador visible. Eso es TASK-0078.
- Tests nuevos mínimos (además de migrar los de REQ-009/010/017):
  dos ataques con la misma fórmula, Pícaro 3, ataque + interacción, movimiento y
  recogida sin acción, fin de turno manual, restauración de `remaining`, tope 4
  con +2, rechazo sin acción sin RNG/eventos y `MoveTo` de una pulsación.
- No ejecutar `test:e2e` (fuera de alcance), pero `pnpm run build` debe compilar
  todos los specs. No borrar aserciones para que compile.

## Flujo

- Rama ya creada: `task/TASK-0076`; el baseline documental está en `296b9eb`.
- Commits pequeños con `TASK-0076`; dejar el árbol limpio.
- Timeouts: `pnpm test` y `pnpm run build` 120 s; `pnpm run verify` 180 s;
  inspección 15 s. Usar pnpm, nunca npm/npx.
