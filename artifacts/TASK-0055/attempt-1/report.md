---
type: Task Report
title: "TASK-0055: informe de ejecución"
description: Roster de arquetipos, Cuchillo, nombre por instancia y rechazo sin arma.
task: TASK-0055
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T00:05:00Z }
artifacts: artifacts/TASK-0055/attempt-1/
verified:
---

# Estado

`success`: los nueve arquetipos de REQ-015, Cuchillo +4/1, `nombre`
serializable y rechazo `unarmed` sin consumir RNG. `pnpm run verify` pasa.

# Cambios

- `src/game/roster.ts` (nuevo): `ArchetypeId`, `ROSTER`, `rosterEntry` y
  `createPlayerFromArchetype`. Fuente única de stats, equipo, variantes,
  `futureWeapon`, rol y magia; `stats.magia` siempre `[]`.
- `src/game/equipment.ts`: `knife`/Cuchillo +4/1; daga sin cambios (+4/2).
- `src/game/types.ts`: `UnitEquipment.weaponId: WeaponId | null`, `Unit.nombre`
  y `RejectionReason` con `unarmed`.
- `src/game/combat.ts`: rechazo `unarmed` tras las validaciones existentes y
  antes de cualquier tirada.
- `src/game/engine.ts`: nombres estables `Aventurero` (provisional) y el del
  bestiario (enemigos); armas coherentes con `weaponId` nullable.
- `src/game/index.ts`: exporta el roster. `src/host/hud.ts`: HUD muestra
  `Sin arma`; sin UI nueva.
- Tests: `roster.test.ts` (nuevo), caso `Sin arma` en HUD, `nombre` en el
  helper y narrowing mecánico en fixtures armados; sin aserciones debilitadas.
- Commit SHA: `feb8c08` (código y tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/roster.test.ts tests/unit/host/hud.test.ts` | 27/27 | `test-output.txt` |
| `pnpm exec tsc --noEmit` | OK | `tsc-output.txt` |
| `pnpm run verify` | 751 tests, docs/config/build/bundle OK | `verify-output.txt` |

Los avisos de `docs:check` son previos.

# Evidencia visual

- No aplica: E2E y pantalla de inicio van en TASK-0056; sin assets ni UI nueva.

# Desviaciones

- `REQ-015` no fija el `futureWeapon` del Guerrero mágico (`espada mágica`), el
  nombre provisional (`Aventurero`) ni los IDs de variante: se eligieron estables.
- El `!` en tests solo hace narrowing donde el fixture está armado.

# Problemas conocidos y preguntas abiertas

- `createPlayerFromArchetype` usa `(0,0)` sin `position`; TASK-0056 debe pasar
  el spawn. Confirmar en REQ-016 si los IDs de variante deben ser assets.

# Fricción reutilizable

Ninguna entrada cumple un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3592 |
| `report_bytes` | 2557 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
